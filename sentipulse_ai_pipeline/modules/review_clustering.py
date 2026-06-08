# Enhanced clustering.py with API rate limiting and centralized queue
import pandas as pd
import numpy as np
import os
import re
from difflib import SequenceMatcher
from collections import defaultdict
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sentence_transformers import SentenceTransformer
import optuna
import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from typing import List, Dict, Optional, Tuple, Any, Union
import concurrent.futures
import functools
import time
from tqdm import tqdm
import torch
import warnings
import threading
from queue import Queue, Empty
from dataclasses import dataclass

# Load environment variables
load_dotenv(override=True)

# Configuration - Read from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # Using GROQ_API_KEY_OFFICE as per .env
GROQ_MODEL = os.getenv("LLM_MODEL_CLUSTERING", "meta-llama/llama-4-maverick-17b-128e-instruct")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("SOURCE_DB_NAME", "sentipulreviews")
ASPECTS = ['food', 'service', 'price', 'ambiance', 'others']
SENTIMENTS = ['positive', 'negative', 'neutral']
PLATFORMS = ['google', 'foodpanda', 'uber_eats', 'zomato', 'opentable', 'all']

print("📦 Loading SentenceTransformer model globally...")




try:
    GLOBAL_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device="cpu")
except Exception as e:
    print(f"❌ Global model load failed: {e}")
    GLOBAL_MODEL = None


@dataclass
class APIRequest:
    """Data class for API requests in the queue"""
    texts: List[str]
    aspect_name: str
    sentiment: str
    cache_key: str
    future: concurrent.futures.Future


class APIRateLimiter:
    """Centralized API rate limiter with queue-based processing"""

    def __init__(self, requests_per_second: float = 5.0, max_concurrent: int = 8):
        """
        Initialize rate limiter
        Args:
            requests_per_second: Maximum API requests per second
            max_concurrent: Maximum concurrent API requests
        """
        self.requests_per_second = requests_per_second
        self.max_concurrent = max_concurrent
        self.min_interval = 1.0 / requests_per_second

        self.request_queue = Queue()
        self.last_request_time = 0
        self.active_requests = 0
        self.shutdown_flag = threading.Event()

        # Start worker thread
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

        # Thread locks
        self.rate_lock = threading.Lock()
        self.active_lock = threading.Lock()

        print(f"🚦 API Rate Limiter initialized: {requests_per_second} req/s, max {max_concurrent} concurrent")

    def _worker(self):
        """Worker thread that processes API requests from the queue"""
        while not self.shutdown_flag.is_set():
            try:
                # Get request from queue with timeout
                request = self.request_queue.get(timeout=1.0)

                # Wait for rate limiting
                self._wait_for_rate_limit()

                # Wait if too many concurrent requests
                self._wait_for_concurrency_limit()

                # Process the request
                self._process_request(request)

            except Empty:
                continue
            except Exception as e:
                print(f"❌ Worker thread error: {e}")

    def _wait_for_rate_limit(self):
        """Enforce rate limiting between requests"""
        with self.rate_lock:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time

            if time_since_last < self.min_interval:
                sleep_time = self.min_interval - time_since_last
                print(f"⏱️ Rate limiting: sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)

            self.last_request_time = time.time()

    def _wait_for_concurrency_limit(self):
        """Wait if too many concurrent requests are active"""
        while True:
            with self.active_lock:
                if self.active_requests < self.max_concurrent:
                    self.active_requests += 1
                    break
            time.sleep(0.1)

    def _process_request(self, request: APIRequest):
        """Process a single API request"""
        try:
            print(f"🌐 Processing API request for {request.aspect_name}-{request.sentiment}")
            result = self._make_api_call(request.texts, request.aspect_name, request.sentiment)
            request.future.set_result(result)

        except Exception as e:
            print(f"❌ API request failed: {e}")
            fallback = f"{request.aspect_name.capitalize()} {request.sentiment.capitalize()} Cluster"
            request.future.set_result(fallback)

        finally:
            with self.active_lock:
                self.active_requests -= 1

    def _make_api_call(self, texts: List[str], aspect_name: str, sentiment: str) -> str:
        """Make the actual API call to Groq"""
        sample_reviews = self._get_sample_reviews(texts, max_samples=100)
        sample_str = "\n".join([f"- \"{review}\"" for review in sample_reviews])

        prompt = f"""
        You are helping a restaurant owner understand what customers are actually saying in a cluster of reviews.
        You're analyzing {sentiment} comments specifically about {aspect_name}.
        Here is a sample of what customers are saying:
        <<<{sample_str}>>>
        Your task:
        - Generate a 2–6 word cluster name that:
          1. Clearly summarizes what customers are talking about (e.g., portion size, seating comfort, ambience, wait time, etc.)
          2. Captures the actual experience or issue customers are facing (e.g., small portions, noisy atmosphere, long waits)
          3. Is clear, simple, and action-focused — like how you'd explain the issue to a friend or staff
          4. Helps the owner instantly understand the situation or issue — NO technical jargon
          5. If there are only 5 or fewer reviews, be extra careful — consider the entire context, not just one review
          6. DO NOT use general labels like "poor service" or "bad quality"
          7. DO NOT use overly specific food or cuisine terms like "Chinese, soup, noodles" etc
          8. DO NOT base the name on only one review — the name must reflect the entire cluster
          9. Your answer MUST be only 2–6 words — NO extra explanation, no intro, no summary
        JUST reply with the 2–6 word CLUSTER NAME. NOTHING ELSE.
        """

        if not GROQ_API_KEY:
            print("Warning: GROQ_API_KEY not found. Using fallback cluster naming.")
            return f"{aspect_name.capitalize()} {sentiment.capitalize()} Cluster {np.random.randint(1, 100)}"

        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        data = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You create short but descriptive, action-focused labels for the clusers of restaurant reviews..."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "top_p": 1.0,
            "max_tokens": 50
        }

        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            resp.raise_for_status()
            cluster_name = resp.json()['choices'][0]['message']['content'].strip()
            cluster_name = re.sub(r'^["\']+|["\']+$|[.]$', '', cluster_name).strip()

            if " or " in cluster_name:
                cluster_name = cluster_name.split(" or ")[0].strip()

            words = cluster_name.split()
            if len(words) > 6:
                cluster_name = " ".join(words[:6])

            return cluster_name

        except requests.exceptions.Timeout:
            print(f"⏰ API timeout for {aspect_name}-{sentiment}")
            raise Exception("API timeout")
        except requests.exceptions.RequestException as e:
            print(f"🌐 API request error for {aspect_name}-{sentiment}: {e}")
            raise Exception(f"API request failed: {e}")

    def _get_sample_reviews(self, texts: List[str], max_samples: int = 100) -> List[str]:
        """Get sample reviews for API call"""
        if len(texts) <= max_samples:
            return texts
        sorted_texts = sorted(texts)
        indices = np.linspace(0, len(sorted_texts) - 1, max_samples, dtype=int)
        return [sorted_texts[i] for i in indices]

    def submit_request(self, texts: List[str], aspect_name: str, sentiment: str,
                       cache_key: str) -> concurrent.futures.Future:
        """Submit a cluster naming request to the queue"""
        future = concurrent.futures.Future()
        request = APIRequest(texts, aspect_name, sentiment, cache_key, future)
        self.request_queue.put(request)
        print(f"📝 Queued API request for {aspect_name}-{sentiment} (queue size: {self.request_queue.qsize()})")
        return future

    def shutdown(self):
        """Shutdown the rate limiter"""
        self.shutdown_flag.set()
        if self.worker_thread.is_alive():
            self.worker_thread.join(timeout=5)


# Add caching support
class LRUCache:
    """Simple LRU cache for embedding and cluster naming results"""

    def __init__(self, capacity=1000):
        self.cache = {}
        self.capacity = capacity
        self.usage_count = 0
        self.lock = threading.Lock()

    def get(self, key):
        with self.lock:
            if key in self.cache:
                self.cache[key]['count'] = self.usage_count
                self.usage_count += 1
                return self.cache[key]['value']
            return None

    def put(self, key, value):
        with self.lock:
            if len(self.cache) >= self.capacity:
                # Remove least recently used item
                lru_key = min(self.cache.items(), key=lambda x: x[1]['count'])[0]
                del self.cache[lru_key]

            self.cache[key] = {'value': value, 'count': self.usage_count}
            self.usage_count += 1


class RestaurantReviewClustering:
    """
    Enhanced restaurant review clustering with API rate limiting
    """

    def __init__(self, restaurant_name: str, db_name: str, random_seed: int = 42):
        """
        Initialize the clustering system with API rate limiting.
        Args:
            restaurant_name: Display name of the restaurant/brand.
            db_name: The exact MongoDB database name for this client (e.g. 'sweet_affairs').
        """
        self.restaurant_name = restaurant_name
        self.db_name = db_name
        self.collection_name = f"{db_name}_sentimented_output"

        # Initialize model
        self.model = GLOBAL_MODEL
        if not self.model:
            raise RuntimeError("SentenceTransformer model not available.")

        self.mongo_client = None
        self.random_seed = random_seed
        np.random.seed(self.random_seed)

        # Initialize caches
        self.embedding_cache = LRUCache(capacity=10000)
        self.cluster_name_cache = LRUCache(capacity=1000)

        # Initialize API rate limiter
        self.api_limiter = APIRateLimiter(requests_per_second=5.0, max_concurrent=8)

        # Create thread pool for clustering (not API calls)
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=5)

        # MongoDB connection
        try:
            self.mongo_client = MongoClient(MONGO_URI)
            self.mongo_client.server_info()
            print("✅ MongoDB connection successful")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            self.mongo_client = None

    def __del__(self):
        """Clean up resources when the object is destroyed"""
        if hasattr(self, 'api_limiter'):
            self.api_limiter.shutdown()
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)

    # STEP 2: Add these two methods to your RestaurantReviewClustering class
    def merge_similar_clusters(self, cluster_names: Dict[int, str],
                               cluster_texts: Dict[int, List[str]],
                               labels: np.ndarray,
                               similarity_threshold: float = 0.75) -> Tuple[Dict[int, str], np.ndarray]:
        """Merge clusters with similar names"""
        print(f"🔄 Checking for similar clusters to merge (threshold: {similarity_threshold})...")

        if len(cluster_names) <= 1:
            return cluster_names, labels

        # Find clusters to merge
        clusters_to_merge = []
        processed_clusters = set()
        cluster_ids = list(cluster_names.keys())

        for i, cluster_id1 in enumerate(cluster_ids):
            if cluster_id1 in processed_clusters:
                continue

            similar_group = [cluster_id1]

            for j, cluster_id2 in enumerate(cluster_ids[i + 1:], i + 1):
                if cluster_id2 in processed_clusters:
                    continue

                similarity = self.calculate_similarity(
                    cluster_names[cluster_id1],
                    cluster_names[cluster_id2]
                )

                print(
                    f"📊 Similarity between '{cluster_names[cluster_id1]}' and '{cluster_names[cluster_id2]}': {similarity:.3f}")

                if similarity >= similarity_threshold:
                    similar_group.append(cluster_id2)
                    print(f"✅ Will merge: '{cluster_names[cluster_id1]}' ← '{cluster_names[cluster_id2]}'")

            if len(similar_group) > 1:
                clusters_to_merge.append(similar_group)
                processed_clusters.update(similar_group)
            else:
                processed_clusters.add(cluster_id1)

        if not clusters_to_merge:
            print("ℹ️ No similar clusters found for merging")
            return cluster_names, labels

        # Create mapping from old to new cluster IDs
        cluster_mapping = {}
        new_cluster_names = {}
        new_cluster_id = 0

        # Handle merged clusters
        for merge_group in clusters_to_merge:
            # Choose the best name (longest or most descriptive)
            best_name = max([cluster_names[cid] for cid in merge_group],
                            key=lambda name: (len(name.split()), len(name)))

            print(f"🔄 Merging clusters {merge_group} into cluster {new_cluster_id}: '{best_name}'")

            for old_cluster_id in merge_group:
                cluster_mapping[old_cluster_id] = new_cluster_id

            new_cluster_names[new_cluster_id] = best_name
            new_cluster_id += 1

        # Handle non-merged clusters
        for cluster_id in cluster_names.keys():
            if cluster_id not in cluster_mapping:
                cluster_mapping[cluster_id] = new_cluster_id
                new_cluster_names[new_cluster_id] = cluster_names[cluster_id]
                new_cluster_id += 1

        # Update labels
        new_labels = np.array([cluster_mapping[label] for label in labels])

        print(f"📊 Cluster merging results:")
        print(f"   Original clusters: {len(cluster_names)} → Final clusters: {len(new_cluster_names)}")

        return new_cluster_names, new_labels

    def calculate_similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between two cluster names"""
        if not name1 or not name2:
            return 0.0

        # Normalize strings
        name1_norm = re.sub(r'\s+', ' ', name1.lower().strip())
        name2_norm = re.sub(r'\s+', ' ', name2.lower().strip())

        # Exact match
        if name1_norm == name2_norm:
            return 1.0

        # Sequence similarity
        seq_similarity = SequenceMatcher(None, name1_norm, name2_norm).ratio()

        # Word-level Jaccard similarity
        words1 = set(name1_norm.split())
        words2 = set(name2_norm.split())

        if len(words1) == 0 and len(words2) == 0:
            return 1.0
        if len(words1) == 0 or len(words2) == 0:
            return 0.0

        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        jaccard_similarity = intersection / union if union > 0 else 0.0

        # Handle spelling variants
        spelling_variants = {
            'ambiance': ['ambience'], 'ambience': ['ambiance'],
            'experience': ['experiences'], 'experiences': ['experience'],
            'service': ['services'], 'services': ['service'],
        }

        def normalize_variants(text):
            words = text.split()
            normalized_words = []
            for word in words:
                canonical = word
                for canonical_form, variants in spelling_variants.items():
                    if word in variants:
                        canonical = canonical_form
                        break
                normalized_words.append(canonical)
            return ' '.join(normalized_words)

        name1_variants = normalize_variants(name1_norm)
        name2_variants = normalize_variants(name2_norm)

        if name1_variants == name2_variants:
            return 1.0

        # Combined similarity
        combined_similarity = (seq_similarity * 0.4 + jaccard_similarity * 0.6)
        return combined_similarity

    def name_cluster_with_llm(self, texts: List[str], aspect_name: str, sentiment: str = "positive") -> str:
        """Name a cluster using LLM with centralized rate limiting"""
        # Create a deterministic key for caching
        texts_sorted = sorted(texts)
        cache_key = f"{aspect_name}_{sentiment}_{hash(tuple(texts_sorted[:5]))}"

        # Check cache first
        cached_name = self.cluster_name_cache.get(cache_key)
        if cached_name is not None:
            print(f"🎯 Cache hit for {aspect_name}-{sentiment}")
            return cached_name

        # Submit request to rate limiter
        print(f"🚀 Submitting API request for {aspect_name}-{sentiment}")
        future = self.api_limiter.submit_request(texts, aspect_name, sentiment, cache_key)

        try:
            # Wait for result with timeout
            result = future.result(timeout=60)  # 60 second timeout

            # Store in cache
            self.cluster_name_cache.put(cache_key, result)
            print(f"✅ Got cluster name for {aspect_name}-{sentiment}: {result}")
            return result

        except concurrent.futures.TimeoutError:
            print(f"⏰ Timeout waiting for cluster name for {aspect_name}-{sentiment}")
            fallback = f"{aspect_name.capitalize()} {sentiment.capitalize()} Cluster"
            self.cluster_name_cache.put(cache_key, fallback)
            return fallback
        except Exception as e:
            print(f"❌ Error getting cluster name for {aspect_name}-{sentiment}: {e}")
            fallback = f"{aspect_name.capitalize()} {sentiment.capitalize()} Cluster"
            self.cluster_name_cache.put(cache_key, fallback)
            return fallback

    # Include all other methods from the original class with minimal changes
    def normalize_cluster_review_columns(self, df: pd.DataFrame, sentiment: str) -> pd.DataFrame:
        """Ensures *_<sentiment>_cluster_reviews columns are filled across all rows"""
        pattern_suffix = f"_{sentiment}_cluster_reviews"

        for col in df.columns:
            if col.endswith(pattern_suffix):
                unique_vals = df[col].dropna().unique()
                if len(unique_vals) == 1:
                    fill_value = unique_vals[0]
                    df[col] = fill_value
                elif len(unique_vals) > 1:
                    print(f"⚠️ Warning: Multiple values found in {col}, skipping normalization.")
                else:
                    print(f"⚠️ Warning: Column {col} is entirely NaN.")
                    df[col] = 0

        return df

    def _batch_encode(self, texts: List[str], batch_size=64):
        """Encode texts in batches to improve efficiency"""
        if not self.model:
            raise RuntimeError("Model not initialized properly")

        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                batch_embeddings = self.model.encode(batch, show_progress_bar=False, convert_to_numpy=True)
                all_embeddings.append(batch_embeddings)
            except Exception as e:
                print(f"Error encoding batch {i // batch_size}: {e}")
                fallback_embeddings = np.zeros((len(batch), 384))
                all_embeddings.append(fallback_embeddings)

        return np.vstack(all_embeddings) if all_embeddings else np.array([])

    def encode_with_cache(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings with caching for efficiency"""
        if not self.model:
            raise RuntimeError("Model not initialized properly")

        embeddings = []
        texts_to_encode = []
        indices_to_fill = []

        for i, text in enumerate(texts):
            text_hash = hash(text)
            cached_embedding = self.embedding_cache.get(text_hash)
            if cached_embedding is not None:
                embeddings.append(cached_embedding)
            else:
                texts_to_encode.append(text)
                indices_to_fill.append(i)

        if not texts_to_encode:
            return np.array(embeddings)

        new_embeddings = self._batch_encode(texts_to_encode)

        for text, embedding in zip(texts_to_encode, new_embeddings):
            self.embedding_cache.put(hash(text), embedding)

        final_embeddings = np.zeros((len(texts), new_embeddings.shape[1]))

        cached_idx = 0
        for i in range(len(texts)):
            if i in indices_to_fill:
                final_embeddings[i] = new_embeddings[indices_to_fill.index(i)]
            else:
                final_embeddings[i] = embeddings[cached_idx]
                cached_idx += 1

        return final_embeddings

    def optimize_clustering_params(self, embeddings, max_n_clusters, n_trials=10):
        """Optimize clustering parameters using Optuna"""

        def objective(trial):
            max_c = min(max_n_clusters, len(embeddings) - 1)
            if max_c < 2:
                return -1

            n = trial.suggest_int("n_clusters", 2, max_c)
            km = KMeans(n_clusters=n, n_init=10, random_state=self.random_seed)

            try:
                km.fit(embeddings)
                return silhouette_score(embeddings, km.labels_)
            except:
                return -1

        sampler = optuna.samplers.TPESampler(seed=self.random_seed, n_startup_trials=min(3, n_trials))
        study = optuna.create_study(direction='maximize', sampler=sampler)
        actual_trials = min(n_trials, 5)
        study.optimize(objective, n_trials=actual_trials)

        return study.best_params.get('n_clusters', 2)

    def cluster_reviews(
            self,
            df: pd.DataFrame,
            aspect: str,
            sentiment: str,
            n_trials: int = 5,
            visualize: bool = False
    ) -> pd.DataFrame:
        """Cluster reviews with rate-limited API calls"""
        part_col = f"sent_{aspect}_part"

        if part_col not in df.columns:
            print(f"❌ Column {part_col} not found")
            return df

        df_clean = df.dropna(subset=[part_col]).copy()
        print(f"📝 Data cleaning: {len(df)} -> {len(df_clean)} rows (removed NaN)")

        if len(df_clean) < 5:
            print(f"❌ Not enough clean data for clustering: {len(df_clean)} rows (minimum required: 5)")
            return df

        df_clean = df_clean.sort_values(by=part_col).reset_index(drop=True)
        texts = df_clean[part_col].astype(str).tolist()

        valid_texts = [text for text in texts if text.strip() and len(text.strip()) > 3]

        if len(valid_texts) < 5:
            print(f"❌ Not enough valid texts for clustering: {len(valid_texts)} valid texts (minimum required: 5)")
            return df

        print(f"✅ Proceeding with clustering: {len(valid_texts)} valid texts")

        # Generate embeddings
        start_time = time.time()
        try:
            embeddings = self.encode_with_cache(texts)
            print(f"⏱️ Embedding generation took {time.time() - start_time:.2f} seconds")

            if embeddings.size == 0 or len(embeddings) < 5:
                print(f"❌ Invalid embeddings generated: shape {embeddings.shape}")
                return df

        except Exception as e:
            print(f"❌ Error generating embeddings: {e}")
            return df

        # Optimize clustering parameters
        start_time = time.time()
        max_n_clusters = min(5, len(texts) - 1)

        if max_n_clusters < 2:
            print(f"❌ Cannot create clusters: max_n_clusters = {max_n_clusters}")
            return df

        n_clusters = self.optimize_clustering_params(embeddings, max_n_clusters, n_trials)
        print(f"⏱️ Parameter optimization took {time.time() - start_time:.2f} seconds")
        print(f"🎯 Optimal number of clusters: {n_clusters}")

        # Perform clustering
        start_time = time.time()
        try:
            km_final = KMeans(n_clusters=n_clusters, n_init=10, random_state=self.random_seed)
            km_final.fit(embeddings)
            labels = km_final.labels_
            print(f"⏱️ Final clustering took {time.time() - start_time:.2f} seconds")
        except Exception as e:
            print(f"❌ Error during K-means clustering: {e}")
            return df

        # Group texts by cluster
        cluster_texts = {i: [] for i in range(n_clusters)}
        for idx, lbl in enumerate(labels):
            cluster_texts[lbl].append(texts[idx])

        # Name clusters using rate-limited API calls
        start_time = time.time()
        print(f"🏷️ Naming {n_clusters} clusters with rate limiting...")

        cluster_names = {}
        naming_futures = {}

        # Submit all naming requests (they will be queued and rate-limited)
        for i in range(n_clusters):
            naming_futures[i] = concurrent.futures.Future()
            # Use the rate-limited method
            cluster_name = self.name_cluster_with_llm(cluster_texts[i], aspect, sentiment)
            naming_futures[i].set_result(cluster_name)
            cluster_names[i] = cluster_name

        print(f"⏱️ Cluster naming took {time.time() - start_time:.2f} seconds")

        # Print initial results
        for i, name in cluster_names.items():
            print(f"✅ Cluster {i}: {name}")

        # MERGE SIMILAR CLUSTERS - ADD THIS NEW CODE
        cluster_names, labels = self.merge_similar_clusters(
            cluster_names, cluster_texts, labels, similarity_threshold=0.75
        )

        # Recalculate distribution after merging
        counts = pd.Series(labels).value_counts(normalize=True) * 100

        # Add results to dataframe
        df_clean[f"{aspect}_{sentiment}_cluster"] = labels
        df_clean[f"{aspect}_{sentiment}_cluster_name"] = df_clean[f"{aspect}_{sentiment}_cluster"].map(cluster_names)
        df_clean[f"{aspect}_{sentiment}_distribution"] = df_clean[f"{aspect}_{sentiment}_cluster"].map(
            lambda x: f"{counts.get(x, 0):.1f}%")

        print(f"✅ Clustering completed successfully for {aspect}-{sentiment}")
        return df_clean

    # Continue with the rest of the methods (load_data, process_aspect, run_clustering, etc.)
    # These remain largely the same as in your original code
    def run_clustering(
            self,
            aspect: str,
            sentiment: str,
            start_date: str = None,
            end_date: str = None,
            restaurant_id: str = None,
            platform: str = "all",
            branch_name: str = None,  # NEW: branch_name parameter
            visualize: bool = False,
            save_output: bool = True,
            hash_inputs: bool = True
    ) -> pd.DataFrame:
        """
        Run clustering for a single aspect with optional platform and branch_name filtering

        Args:
            aspect: Aspect to analyze
            sentiment: Sentiment to filter by
            start_date: Start date for filtering
            end_date: End date for filtering
            restaurant_id: Restaurant ID for filtering
            platform: Platform to filter by ('google', 'foodpanda', 'uber_eats', 'zomato', 'all')
            branch_name: branch_name/branch to filter by (only works with Google platform)
            visualize: Whether to create visualizations
            save_output: Whether to save output to CSV
            hash_inputs: Whether to hash inputs for reproducibility
        """
        if aspect not in ASPECTS:
            raise ValueError(f"Aspect must be one of {ASPECTS}")
        if sentiment not in SENTIMENTS:
            raise ValueError(f"Sentiment must be one of {SENTIMENTS}")

        # Platform and branch info logging
        print(f"Filtering by Platform: {platform}, Branch: {branch_name if branch_name else 'All'}")

        if hash_inputs:
            import hashlib
            inp = f"{start_date}{end_date}{restaurant_id}{sentiment}{aspect}{platform}{branch_name}"
            h = hashlib.md5(inp.encode()).hexdigest()[:8]
            print(f"Input hash: {h}")
            seed_val = int(h, 16) % (2 ** 32 - 1)
            np.random.seed(seed_val)
            self.random_seed = seed_val

        df = self.load_data(aspect, sentiment, start_date, end_date, restaurant_id, platform, branch_name)

        if df.empty:
            print("No data after filtering")
            return df

        filter_desc = f"Clustering {aspect} - {sentiment}"
        if platform != "all":
            filter_desc += f" (Platform: {platform})"
        if platform.lower() == "google" and branch_name:
            filter_desc += f" (branch_name: {branch_name})"
        print(filter_desc)

        result_df = self.cluster_reviews(df, aspect, sentiment, visualize=visualize)

        if save_output and not result_df.empty:
            os.makedirs("dataWithClusters", exist_ok=True)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            platform_suffix = f"_{platform}" if platform != "all" else ""
            branch_name_suffix = f"_{branch_name.replace(' ', '_')}" if branch_name else ""
            out = f"dataWithClusters/{self.restaurant_name}_{aspect}_{sentiment}{platform_suffix}{branch_name_suffix}_{ts}_clustered_output.csv"
            result_df.to_csv(out, index=False)
            print(f"Saved to {out}")

        return result_df
    def process_aspect(
            self,
            aspect: str,
            sentiment: str,
            df: pd.DataFrame,
            visualize: bool = False
    ) -> pd.DataFrame:
        print(f"\n{'=' * 50}")
        print(f"Processing aspect: {aspect} - {sentiment}")
        print(f"{'=' * 50}")

        # Filter by aspect-specific sentiment FROM THE ORIGINAL DF
        asp_col = f"sent_{aspect}_sentiment"
        if sentiment and asp_col in df.columns:
            aspect_df = df[df[asp_col] == sentiment].copy()
            print(f"{aspect} sentiment filter: {len(aspect_df)} rows")
        else:
            aspect_df = df.copy()
            print(f"No sentiment filtering applied for {aspect}")

        # Compute review count
        review_count = len(aspect_df)
        review_count_col = f"{aspect}_{sentiment}_cluster_reviews"

        print(f"Review count for {aspect}-{sentiment}: {review_count}")

        # Create the base result dataframe with IDs and review count FROM ORIGINAL DF
        if '_id' in df.columns:
            result_df = df[['_id']].copy()
        else:
            result_df = df.reset_index()[['index']].copy()

        # Add the review count column to ALL rows of the original dataframe
        result_df[review_count_col] = review_count

        # *** KEY FIX: Check if we have enough data BEFORE proceeding ***
        part_col = f"sent_{aspect}_part"

        # Enhanced validation with better logging
        if aspect_df.empty:
            print(f"❌ Skipping clustering for {aspect}: No data after filtering")
            return result_df

        if part_col not in aspect_df.columns:
            print(f"❌ Skipping clustering for {aspect}: Missing column {part_col}")
            print(f"Available columns: {aspect_df.columns.tolist()}")
            return result_df

        # Remove NaN values and check count again
        aspect_df_clean = aspect_df.dropna(subset=[part_col])
        clean_count = len(aspect_df_clean)

        print(f"Clean review count (after removing NaN): {clean_count}")

        if clean_count < 5:
            print(f"❌ Skipping clustering for {aspect}: Insufficient clean data ({clean_count} < 5 reviews)")
            print("Clustering requires at least 5 reviews with valid text content.")
            return result_df

        print(f"✅ Proceeding with clustering for {aspect} ({clean_count} reviews)")

        # Proceed with clustering
        try:
            clustered_df = self.cluster_reviews(aspect_df, aspect, sentiment, visualize=visualize)

            cluster_cols = [
                f"{aspect}_{sentiment}_cluster",
                f"{aspect}_{sentiment}_cluster_name",
                f"{aspect}_{sentiment}_distribution"
            ]

            # Check if clustering was successful
            if not all(col in clustered_df.columns for col in cluster_cols):
                print(f"❌ Clustering failed for {aspect}: missing cluster columns")
                print(f"Expected: {cluster_cols}")
                print(f"Got: {clustered_df.columns.tolist()}")
                return result_df

            # Merge clustering results back to the full dataset
            if '_id' in clustered_df.columns:
                cluster_data = clustered_df[['_id'] + cluster_cols].copy()
                result_df = pd.merge(result_df, cluster_data, on='_id', how='left')
            else:
                clustered_df_indexed = clustered_df.reset_index()
                cluster_data = clustered_df_indexed[['index'] + cluster_cols].copy()
                result_df = pd.merge(result_df, cluster_data, on='index', how='left')

            # Print cluster distribution
            print(f"\n📊 Cluster Distribution for {aspect}:")
            name_counts = clustered_df[f"{aspect}_{sentiment}_cluster_name"].value_counts()
            for name, count in name_counts.items():
                if pd.notna(name):
                    print(f"- {name}: {count} reviews")

        except Exception as e:
            print(f"❌ Error during clustering for {aspect}: {e}")
            import traceback
            traceback.print_exc()
            return result_df

        return result_df

    def load_data(
            self,
            aspect: str,
            sentiment: str,
            start_date: str = None,
            end_date: str = None,
            restaurant_id: str = None,
            platform: str = "all",
            branch_name: str = None
    ) -> pd.DataFrame:
        """Load data from MongoDB with optional platform and branch_name filtering"""
        if not self.mongo_client:
            raise ConnectionError("MongoDB connection not available")

        db = self.mongo_client[self.db_name]
        col = db[self.collection_name]

        query: Dict[str, Any] = {}

        # Date filtering
        if start_date or end_date:
            dq: Dict[str, Any] = {}
            if start_date:
                try:
                    dq["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
                except ValueError:
                    print(f"Invalid start_date format: {start_date}")
                    return pd.DataFrame()

            if end_date:
                try:
                    # Set to end of day (23:59:59) to include all reviews from that date
                    end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
                    from datetime import timedelta
                    dq["$lte"] = end_datetime + timedelta(days=1, seconds=-1)
                except ValueError:
                    print(f"Invalid end_date format: {end_date}")
                    return pd.DataFrame()

            if dq:
                query["date"] = dq

        if restaurant_id:
            query["restaurant_id"] = restaurant_id

        if platform and platform.lower() != "all":
            query["sent_platform"] = platform.lower()
            print(f"Filtering by platform: {platform}")

        if branch_name and branch_name.lower() != "all":
            query["branch_name"] = branch_name
            print(f"Filtering by exact branch_name: {branch_name}")

        try:
            projection = {
                "sent_sentiment": 1,
                "sent_platform": 1,
                "branch_name": 1,
                "date": 1,
                "restaurant_id": 1,
                "text": 1,
                "sent_aspects": 1,
                "rating": 1,
                "sent_ratings": 1,
                "review_url": 1
            }

            for asp in ASPECTS:
                projection[f"sent_{asp}_part"] = 1
                projection[f"sent_{asp}_sentiment"] = 1

            docs = list(col.find(query, projection))
        except Exception as e:
            print(f"Error querying MongoDB: {e}")
            return pd.DataFrame()

        df = pd.DataFrame(docs) if docs else pd.DataFrame()

        filter_info = f"Loaded {len(df)} reviews"
        if platform != "all":
            filter_info += f" from platform: {platform}"
        if platform.lower() == "google" and branch_name:
            filter_info += f" at branch_name: {branch_name}"
        print(filter_info)

        asp_col = f"sent_{aspect}_sentiment"
        if sentiment and asp_col in df.columns:
            df = df[df[asp_col] == sentiment]
            print(f"{aspect} sentiment filter: {len(df)} left")

        return df

    # Add the rest of your methods here (process_aspect, run_clustering, run_multi_aspect_clustering, etc.)
    # They remain largely unchanged from your original implementation
    def run_multi_aspect_clustering(
            self,
            aspects: List[str],
            sentiment: str,
            start_date: str = None,
            end_date: str = None,
            restaurant_id: str = None,
            platform: str = "all",
            branch_name: str = None,
            visualize: bool = False,
            save_output: bool = True,
            hash_inputs: bool = True,
            parallel: bool = True
    ) -> pd.DataFrame:
        """
        Run clustering for multiple aspects with the specified sentiment and optional platform/branch_name filtering.
        """
        start_time_total = time.time()

        # Validate aspects
        valid_aspects = [aspect for aspect in aspects if aspect in ASPECTS]
        if not valid_aspects:
            raise ValueError(f"No valid aspects provided. Must be one or more of {ASPECTS}")

        if sentiment not in SENTIMENTS:
            raise ValueError(f"Sentiment must be one of {SENTIMENTS}")

        # Platform and branch info logging
        print(f"Processing Multi-Aspect: {aspects}, Platform: {platform}, Branch: {branch_name if branch_name else 'All'}")

        # Load data once WITHOUT ASPECT-SPECIFIC FILTERING - this is the key fix
        print("Loading data from MongoDB...")
        initial_df = self.load_data_without_aspect_filter(sentiment, start_date, end_date, restaurant_id, platform,
                                                          branch_name)
        if initial_df.empty:
            print("No data after filtering")
            return initial_df

        result_df = initial_df.copy()

        if parallel and len(valid_aspects) > 1:
            # Process aspects in parallel
            print(f"Processing {len(valid_aspects)} aspects in parallel...")
            futures = {}

            for aspect in valid_aspects:
                if hash_inputs:
                    import hashlib
                    inp = f"{start_date}{end_date}{restaurant_id}{sentiment}{aspect}{platform}{branch_name}"
                    h = hashlib.md5(inp.encode()).hexdigest()[:8]
                    print(f"Input hash for {aspect}: {h}")

                # Submit task to thread pool - pass the ORIGINAL unfiltered dataframe
                futures[aspect] = self.executor.submit(
                    self.process_aspect, aspect, sentiment, initial_df.copy(), visualize
                    # Use initial_df, not result_df
                )

            # Collect results
            aspect_results = {}
            for aspect, future in futures.items():
                try:
                    aspect_results[aspect] = future.result()
                except Exception as e:
                    print(f"Error processing aspect {aspect}: {e}")
                    aspect_results[aspect] = pd.DataFrame()

            # Merge all aspect results into the final DataFrame
            for aspect, aspect_df in aspect_results.items():
                if not aspect_df.empty:
                    print(f"Merging results for aspect: {aspect}")
                    print(f"Aspect DataFrame columns: {aspect_df.columns.tolist()}")
                    print(f"Aspect DataFrame shape: {aspect_df.shape}")

                    try:
                        if '_id' in result_df.columns and '_id' in aspect_df.columns:
                            # Merge on _id
                            result_df = pd.merge(result_df, aspect_df, on='_id', how='left',
                                                 suffixes=('', f'_{aspect}_temp'))
                            print(f"Successfully merged {aspect} on _id")
                        elif 'index' in aspect_df.columns:
                            # Reset index of result_df if needed and merge on index
                            if result_df.index.name != 'index':
                                result_df = result_df.reset_index()
                                result_df.rename(columns={'index': 'orig_index'}, inplace=True)

                            result_df = pd.merge(result_df, aspect_df, left_index=True, right_on='index', how='left',
                                                 suffixes=('', f'_{aspect}_temp'))

                            # Clean up the extra index column
                            if 'index' in result_df.columns:
                                result_df = result_df.drop('index', axis=1)
                            print(f"Successfully merged {aspect} on index")
                        else:
                            # Fallback: merge based on position (assuming same order)
                            print(f"Warning: Using position-based merge for {aspect}")
                            aspect_df_no_id = aspect_df.drop(
                                columns=[col for col in aspect_df.columns if col in ['_id', 'index']])

                            # Ensure same number of rows
                            if len(result_df) == len(aspect_df_no_id):
                                for col in aspect_df_no_id.columns:
                                    result_df[col] = aspect_df_no_id[col].values
                            else:
                                print(f"Error: Row count mismatch for {aspect}. Skipping merge.")

                    except Exception as e:
                        print(f"Error merging aspect {aspect}: {e}")
                        # Try to at least add the count column manually
                        count_col = f"{aspect}_{sentiment}_cluster_reviews"
                        if count_col in aspect_df.columns:
                            # Get the count value (should be the same for all rows in aspect_df)
                            count_value = aspect_df[count_col].iloc[0] if not aspect_df[count_col].empty else 0
                            result_df[count_col] = count_value
                            print(f"Manually added {count_col} with value {count_value}")

            print(f"Final DataFrame columns: {result_df.columns.tolist()}")
            print(f"Final DataFrame shape: {result_df.shape}")

            # Verify all expected count columns are present
            expected_count_columns = [f"{aspect}_{sentiment}_cluster_reviews" for aspect in valid_aspects]
            missing_columns = [col for col in expected_count_columns if col not in result_df.columns]
            if missing_columns:
                print(f"Warning: Missing count columns: {missing_columns}")

                # Add missing columns with 0 values
                for col in missing_columns:
                    result_df[col] = 0
                    print(f"Added missing column {col} with value 0")

        # Save the final output with all aspects' clustering results
        if save_output and not result_df.empty:
            os.makedirs("dataWithClusters", exist_ok=True)
            aspect_str = "_".join(valid_aspects)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            platform_suffix = f"_{platform}" if platform != "all" else ""
            branch_name_suffix = f"_{branch_name.replace(' ', '_')}" if branch_name else ""
            out = f"dataWithClusters/{self.restaurant_name}_multi_{aspect_str}_{sentiment}{platform_suffix}{branch_name_suffix}_{ts}_clustered_output.csv"
            result_df.to_csv(out, index=False)
            print(f"\nSaved multi-aspect clustering results to {out}")

        print(f"Total processing time: {time.time() - start_time_total:.2f} seconds")
        # Normalize review count columns to fill all rows
        result_df = self.normalize_cluster_review_columns(result_df, sentiment)
        return result_df

    def load_data_without_aspect_filter(
            self,
            sentiment: str,
            start_date: str = None,
            end_date: str = None,
            restaurant_id: str = None,
            platform: str = "all",
            branch_name: str = None
    ) -> pd.DataFrame:
        """
        Load data from MongoDB WITHOUT aspect-specific filtering - only applies date, restaurant, platform filters
        """
        if not self.mongo_client:
            raise ConnectionError("MongoDB connection not available")

        db = self.mongo_client[self.db_name]
        col = db[self.collection_name]

        query: Dict[str, Any] = {}

        # Date filtering
        if start_date or end_date:
            dq: Dict[str, Any] = {}
            if start_date:
                try:
                    dq["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
                except ValueError:
                    print(f"Invalid start_date format: {start_date}")
                    return pd.DataFrame()

            if end_date:
                try:
                    # Set to end of day (23:59:59) to include all reviews from that date
                    end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
                    from datetime import timedelta
                    dq["$lte"] = end_datetime + timedelta(days=1, seconds=-1)
                except ValueError:
                    print(f"Invalid end_date format: {end_date}")
                    return pd.DataFrame()

            if dq:
                query["date"] = dq

        # Restaurant ID filtering
        if restaurant_id:
            query["restaurant_id"] = restaurant_id

        # Platform filtering
        if platform and platform.lower() != "all":
            query["sent_platform"] = platform.lower()
            print(f"Filtering by platform: {platform}")

        # branch_name filtering (any platform)
        if branch_name and branch_name.lower() != "all":
            query["branch_name"] = branch_name
            print(f"Filtering by exact branch_name: {branch_name}")

        try:
            # Add projection to only fetch needed fields for better performance
            projection = {
                "sent_sentiment": 1,
                "sent_platform": 1,
                "branch_name": 1,
                "date": 1,
                "restaurant_id": 1,
                "text": 1,
                "sent_aspects": 1,
                "rating": 1,
                "sent_ratings": 1,
                "review_url": 1
            }

            # Add aspect-specific fields with sent_ prefix
            for asp in ASPECTS:
                projection[f"sent_{asp}_part"] = 1
                projection[f"sent_{asp}_sentiment"] = 1

            # Debug: Print the query being executed
            print(f"🔍 MongoDB Query: {query}")
            print(f"🔍 Collection: {self.collection_name}")
            
            docs = list(col.find(query, projection))
            print(f"🔍 Found {len(docs)} documents")
        except Exception as e:
            print(f"Error querying MongoDB: {e}")
            return pd.DataFrame()

        df = pd.DataFrame(docs) if docs else pd.DataFrame()

        filter_info = f"Loaded {len(df)} reviews (NO aspect filtering applied)"
        if platform != "all":
            filter_info += f" from platform: {platform}"
        if platform.lower() == "google" and branch_name:
            filter_info += f" at branch_name: {branch_name}"
        print(filter_info)

        return df


def main():
    restaurant_name = "ginyaki"
    script_start = time.time()
    clustering = RestaurantReviewClustering(restaurant_name=restaurant_name)
    print(f"Initialization took {time.time() - script_start:.2f} seconds")

    # Define list of aspects to analyze
    aspects_to_analyze = ["food", "service", "price", "ambiance",
                          "others"]  # Can be modified to include any subset of ASPECTS
    sentiment_to_analyze = "positive"

    # Platform filtering options
    # Options: "google", "foodpanda", "uber_eats", "zomato", "all"
    platform_to_analyze = "all"  # or any from: "google", "foodpanda", "uber_eats", "zomato", "all"
    branch_name_to_analyze = "all"  # Optional; only used when platform is Google

    # Optional: Date filtering
    start_date = "2026-01-21"  # Set to None to include all dates, or use format "YYYY-MM-DD"
    end_date = "2026-01-21"

    # Optional: restaurant_id
    restaurant_id = None  # or e.g., "63d10e32e3ccda0b066dfe26"

    # Run the clustering
    result_df = clustering.run_multi_aspect_clustering(
        aspects=aspects_to_analyze,
        sentiment=sentiment_to_analyze,
        start_date=start_date,
        end_date=end_date,
        restaurant_id=restaurant_id,
        platform=platform_to_analyze,
        branch_name=branch_name_to_analyze,
        visualize=False,
        save_output=True,
        hash_inputs=True,
        parallel=True
    )
    result_df.to_csv('dataWithClusters/ginyaki_clustering.csv')


    print("\n✅ Clustering completed.")


# if __name__ == "__main__":
#     main()