import difflib
import pandas as pd
import numpy as np
from datetime import datetime
from zoneinfo import ZoneInfo
from pymongo import MongoClient
from dotenv import load_dotenv
from tqdm import tqdm
from sentipulse_ai_pipeline.modules.colors import _G, _R, _Y, _C, _W, _DIM, _X

load_dotenv(override=True)

_karachi_tz = ZoneInfo("Asia/Karachi")

# ── Log buffer — flushed to MongoDB at end of each client run ─────────────────
log_buffer: list[dict] = []

_log_context: dict = {
    "run_id": None,
    "brand": None,
    "platform": "system",
}


def set_log_context(run_id: str = None, brand: str = None, platform: str = None):
    if run_id:   _log_context["run_id"]   = run_id
    if brand:    _log_context["brand"]    = brand
    if platform: _log_context["platform"] = platform


def save_log_to_buffer(log_message: str, log_type: str, platform: str = None):
    """Append a diagnostic event to the in-memory buffer.

    Flushed to {db}_pipeline_events by save_logs_to_mongodb() at end of run.
    """
    try:
        log_buffer.append({
            "run_id":    _log_context["run_id"],
            "timestamp": datetime.now(_karachi_tz).isoformat(),
            "brand":     _log_context["brand"],
            "platform":  platform or _log_context["platform"],
            "log_type":  log_type,
            "status":    log_type,
            "message":   log_message,
        })
    except Exception as e:
        tqdm.write(f"{_R}✗ Error adding log to buffer: {e}{_X}")


def save_logs_to_mongodb(db_name: str, mongo_client: MongoClient):
    """Flush the in-memory buffer to {db_name}_pipeline_events.

    Diagnostic events are written to a *separate* collection from the
    structured per-branch summaries in {db_name}_pipeline_logs, so both
    collections are clean and independently queryable.
    """
    try:
        if not log_buffer:
            tqdm.write(f"{_DIM}  ☁  No buffered events to save{_X}")
            return
        col_name = f"{db_name}_pipeline_events"
        col = mongo_client[db_name][col_name]
        col.create_index([("run_id", 1), ("timestamp", -1)], background=True)
        result = col.insert_many(log_buffer)
        tqdm.write(f"{_DIM}  ☁  {len(result.inserted_ids)} events → {db_name}.{col_name}{_X}")
        log_buffer.clear()
    except Exception as e:
        tqdm.write(f"{_R}✗ Error saving events to MongoDB: {e}{_X}")


# ── Name helpers ──────────────────────────────────────────────────────────────

def brandname_to_snake_case(name: str) -> str:
    import re
    name = name.strip()
    name = re.sub(r"[\s\-]+", "_", name)
    name = re.sub(r"[^a-zA-Z0-9_]", "", name)
    return name.lower()


# ── System Review ID ──────────────────────────────────────────────────────────

# Platform short codes used in system_review_id
_PLATFORM_CODES = {
    "google":           "GOO",
    "foodpanda":        "FPD",
    "facebook":         "FB",
    "ubereats":         "UBR",
    "uber eats":        "UBR",
    "talabat":          "TLB",
    "tripadvisor":      "TA",
    "tripadvisormanual":"TA",
    "opentable":        "OT",
    "deliveroo":        "DLV",
}


def generate_system_review_id(collection, branchId: str, platform: str) -> str:
    """
    Generate the next sequential system_review_id for a given branchId + platform.

    Format: {branchId}-{PLATFORM_CODE}-{SEQ:05d}
    Example: BEN0001-0001-GOO-00001

    The sequence is determined by querying the collection for the current maximum
    sequential number for this branchId + platform prefix, then incrementing by 1.
    Thread-safety note: for high-concurrency scraping, use a MongoDB counter doc instead.
    """
    platform_code = _PLATFORM_CODES.get(platform.lower().strip(), platform[:3].upper())
    prefix = f"{branchId}-{platform_code}-"

    # Find the highest existing seq number for this branchId + platform
    last_doc = collection.find_one(
        {"system_review_id": {"$regex": f"^{prefix}"}},
        sort=[("system_review_id", -1)],
        projection={"system_review_id": 1},
    )

    next_seq = 1
    if last_doc:
        try:
            last_id = last_doc["system_review_id"]
            last_seq = int(last_id.replace(prefix, ""))
            next_seq = last_seq + 1
        except (ValueError, KeyError):
            pass

    return f"{prefix}{next_seq:05d}"


# ── DataFrame transforms ──────────────────────────────────────────────────────

def standardize_df(df: pd.DataFrame, platform: str) -> pd.DataFrame:
    try:
        if "_id" in df.columns:
            df = df.drop(columns=["_id"])

        # Always run price-bin standardization, not gated on _id presence
        df = standardize_price_bins(df, platform)

        if "text" not in df.columns:
            df["text"] = ""

        df["text"] = df["text"].astype(str).str.strip()
        placeholders = {"", "none", "null", "nan", "n/a", "na"}
        df.loc[df["text"].str.lower().isin(placeholders), "text"] = "None"

        if "date" not in df.columns:
            df["date"] = pd.NaT
        df = df.dropna(subset=["date"])
        df = df.sort_values(by="date", ascending=True)

        if "restaurant" not in df.columns:
            df["restaurant"] = ""
        if "platform" not in df.columns:
            df["platform"] = ""

        return df

    except Exception as e:
        save_log_to_buffer(f"Error standardizing dataframe: {e}", "error")
        raise


def standardize_price_bins(df: pd.DataFrame, platform: str) -> pd.DataFrame:
    if platform != "foodpanda" or "price_per_person" not in df.columns:
        return df

    def bin_price(value):
        try:
            if pd.isna(value):
                return np.nan
            v = float(value)
            if v <= 500:    return "Rs 0–500"
            elif v <= 1000: return "Rs 500–1000"
            elif v <= 1500: return "Rs 1000–1500"
            elif v <= 2000: return "Rs 1500–2000"
            elif v <= 2500: return "Rs 2000–2500"
            elif v <= 3000: return "Rs 2500–3000"
            elif v <= 3500: return "Rs 3000–3500"
            elif v <= 4000: return "Rs 3500–4000"
            elif v <= 5000: return "Rs 4000–5000"
            else:           return "Rs 5000+"
        except Exception:
            return np.nan

    df["price_per_person"] = df["price_per_person"].apply(bin_price)
    return df


def apply_rating_based_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    try:
        def is_invalid_text(val):
            if not isinstance(val, str):
                return True
            return val.strip().lower() in ("", "none", "null", "nan", "n/a", "na")

        mask = df["text"].apply(is_invalid_text) & df["rating"].notna()

        df.loc[mask, "sent_sentiment"] = df.loc[mask, "rating"].apply(
            lambda x: "positive" if x in [4, 5] else ("negative" if x in [1, 2] else "neutral")
        )
        df.loc[mask, "text"]         = "None"
        df.loc[mask, "sent_part"]    = "None"
        df.loc[mask, "sent_ratings"] = df.loc[mask, "rating"].round().astype(int)

        rating_only = int(mask.sum())
        if rating_only:
            tqdm.write(f"{_DIM}  Rating-based fallback: {rating_only} review(s) with no text{_X}")

        return df

    except Exception as e:
        tqdm.write(f"{_R}✗ Error in apply_rating_based_sentiment: {e}{_X}")
        return df


def align_ratings_with_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """Enforce rating/sentiment consistency using vectorized operations."""
    try:
        sentiment = df["sent_sentiment"].astype(str).str.strip().str.lower()
        rating    = pd.to_numeric(df["sent_ratings"], errors="coerce")
        valid     = rating.notna()

        # Positive → must be 4 or 5
        pos_wrong = valid & (sentiment == "positive") & ~rating.isin([4, 5])
        if pos_wrong.any():
            df.loc[pos_wrong, "sent_ratings"] = np.where(rating[pos_wrong] <= 3, 4, 5)

        # Neutral → must be 3
        neu_wrong = valid & (sentiment == "neutral") & (rating != 3)
        if neu_wrong.any():
            df.loc[neu_wrong, "sent_ratings"] = 3

        # Negative → must be 1 or 2
        neg_wrong = valid & (sentiment == "negative") & ~rating.isin([1, 2])
        if neg_wrong.any():
            df.loc[neg_wrong, "sent_ratings"] = np.where(rating[neg_wrong] >= 4, 2, 1)

        return df

    except Exception as e:
        tqdm.write(f"{_R}✗ Error aligning ratings: {e}{_X}")
        return df


# ── Text / LLM helpers ────────────────────────────────────────────────────────

def _fuzzy_find_span(llm_part: str, original: str, min_ratio: float = 0.65) -> str | None:
    """
    Slide a character window over `original` and return the best-matching
    exact substring, or None if nothing scores >= min_ratio.

    Steps:
      1. Try window sizes from 70% to 130% of len(llm_part).
      2. Score every (size, position) pair with SequenceMatcher.ratio().
      3. Snap the winning window to word boundaries (no partial words at edges).
      4. Return None if the result is shorter than 3 chars (meaningless).
    """
    target_len = len(llm_part)
    if target_len == 0:
        return None

    lo_llm  = llm_part.lower()
    lo_orig = original.lower()
    orig_len = len(original)

    min_wlen = max(1, int(target_len * 0.7))
    max_wlen = min(int(target_len * 1.3) + 1, orig_len)

    best_ratio = 0.0
    best_start = -1
    best_wlen  = -1

    for wlen in range(min_wlen, max_wlen + 1):
        for start in range(orig_len - wlen + 1):
            ratio = difflib.SequenceMatcher(
                None, lo_llm, lo_orig[start : start + wlen], autojunk=False
            ).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_start = start
                best_wlen  = wlen

    if best_ratio < min_ratio or best_start == -1:
        return None

    raw_end = best_start + best_wlen

    # ── Right snap: cut at end of last complete word inside the window ────────
    right = raw_end
    if right < orig_len and original[right - 1] != " " and original[right] != " ":
        # We are mid-word — walk left to the previous space
        pos = right - 1
        while pos > best_start and original[pos] != " ":
            pos -= 1
        right = pos  # points to the space; original[best_start:pos] excludes the partial word

    # Strip trailing spaces
    while right > best_start and original[right - 1] == " ":
        right -= 1

    # ── Left snap: cut at start of first complete word inside the window ──────
    left = best_start
    if left > 0 and original[left - 1] != " ":
        # We are mid-word — walk right to the next space, then past it
        pos = left
        while pos < right and original[pos] != " ":
            pos += 1
        while pos < right and original[pos] == " ":
            pos += 1
        left = pos

    # ── Guards ────────────────────────────────────────────────────────────────
    if right <= left:
        # Snapping crossed — fall back to raw unsnapped window
        raw = original[best_start:raw_end].strip()
        return raw if len(raw) >= 3 else None

    result = original[left:right].strip()
    return result if len(result) >= 3 else None


def extract_part_with_fallback(llm_part: str, original_review: str, row_index: int, *, empty_on_miss: bool = False) -> str:
    """
    Try to locate the LLM-extracted phrase inside the original review and
    return a verbatim substring so dashboard highlighting always works.

    Tiers (in order):
      1. Exact match
      2. Case-insensitive match
      3. First/last word anchor search
      4. Fuzzy sliding window (handles misspellings)
      5. Full review — or "" when empty_on_miss=True (used for aspect parts)
    """
    if not original_review or not isinstance(original_review, str):
        return original_review or ""

    original_review = original_review.strip()
    last_resort = "" if empty_on_miss else original_review

    if not llm_part or not isinstance(llm_part, str):
        return last_resort

    llm_part = llm_part.strip()

    # Tier 1: exact match
    if llm_part in original_review:
        return llm_part

    # Tier 2: case-insensitive match
    if llm_part.lower() in original_review.lower():
        start = original_review.lower().find(llm_part.lower())
        return original_review[start : start + len(llm_part)]

    # Tier 3: first/last word anchor search
    words = llm_part.split()
    if len(words) >= 4:
        first_anchor = " ".join(words[:2])
        last_anchor  = " ".join(words[-2:])
    elif len(words) >= 2:
        first_anchor = words[0]
        last_anchor  = words[-1]
    else:
        first_anchor = last_anchor = None

    if first_anchor and last_anchor:
        try:
            lo = original_review.lower()
            fs = lo.find(first_anchor.lower())
            ls = lo.rfind(last_anchor.lower())
            if fs != -1 and ls != -1 and fs <= ls:
                return original_review[fs : ls + len(last_anchor)].strip()
        except Exception:
            pass

    # Tier 4: fuzzy sliding window
    fuzzy_result = _fuzzy_find_span(llm_part, original_review)
    if fuzzy_result is not None:
        return fuzzy_result

    # Tier 5: last resort
    return last_resort


def safe_batch_analysis(analyze_fn, batch_reviews, batch_indices, batch_number, total_batches=None):
    try:
        results = analyze_fn(batch_reviews)

        if not results:
            tqdm.write(f"{_R}  ✗ Batch {batch_number}: no results returned{_X}")
            return None

        if len(results) != len(batch_reviews):
            tqdm.write(
                f"{_R}  ✗ Batch {batch_number}: count mismatch "
                f"(expected {len(batch_reviews)}, got {len(results)}){_X}"
            )
            return None

        for i, result in enumerate(results):
            if not isinstance(result, dict):
                tqdm.write(f"{_R}  ✗ Batch {batch_number}: invalid result type at position {i}{_X}")
                return None

        return results

    except Exception as e:
        tqdm.write(f"{_R}  ✗ Batch {batch_number} failed: {e}{_X}")
        return None


def update_dataframe_with_results(df, batch_indices, results, batch_reviews, batch_number):
    if not results or len(results) != len(batch_indices):
        tqdm.write(f"{_Y}  ⚠ Skipping batch {batch_number} — result/index mismatch{_X}")
        return 0

    aspect_fields = ["food", "ambiance", "price", "service", "others"]
    updated_count = 0

    for original_idx, result, original_review in zip(batch_indices, results, batch_reviews):
        try:
            if not result or not isinstance(result, dict):
                continue

            df.at[original_idx, "sent_sentiment"] = result.get("overall_sentiment", "neutral")
            df.at[original_idx, "sent_part"] = extract_part_with_fallback(
                result.get("part", "").strip(), original_review, original_idx
            )
            df.at[original_idx, "sent_aspects"]        = str(result.get("overall_aspects", []))
            df.at[original_idx, "sent_ratings"]        = result.get("overall_rating", 0)
            df.at[original_idx, "sent_positive_words"] = str(result.get("positive_words", []))
            df.at[original_idx, "sent_negative_words"] = str(result.get("negative_words", []))
            df.at[original_idx, "sent_neutral_words"]  = str(result.get("neutral_words", []))

            aspect_data = result.get("aspects", {})
            for aspect in aspect_fields:
                if aspect in aspect_data:
                    a = aspect_data[aspect]
                    df.at[original_idx, f"sent_{aspect}_part"]      = extract_part_with_fallback(
                        a.get("part", "").strip(), original_review, original_idx, empty_on_miss=True
                    )
                    df.at[original_idx, f"sent_{aspect}_sentiment"] = a.get("sentiment", "")
                    df.at[original_idx, f"sent_{aspect}_rating"]    = a.get("rating", 0.0)

            updated_count += 1

        except Exception as inner_e:
            tqdm.write(f"{_Y}  ⚠ Failed to update row {original_idx}: {inner_e}{_X}")
            continue

    return updated_count


def rescue_blank_sentiments_df_only(df: pd.DataFrame, analyze_fn, max_passes: int = 10) -> pd.DataFrame:
    """Iteratively re-run LLM on rows that came back with blank sentiment."""

    def _count_blank(frame: pd.DataFrame) -> int:
        return int((
            frame["sent_sentiment"].isna() |
            frame["sent_sentiment"].astype(str).str.strip().str.lower().isin(["", "none", "nan"])
        ).sum())

    for pass_num in range(1, max_passes + 1):
        blank_mask = (
            df["sent_sentiment"].isna() |
            df["sent_sentiment"].astype(str).str.strip().str.lower().isin(["", "none", "nan"])
        ) & (df["text"].astype(str).str.strip() != "None")

        blank_df    = df[blank_mask].copy()
        total_blank = len(blank_df)

        if total_blank == 0:
            tqdm.write(f"{_G}  ✓ No blank sentiments to rescue{_X}")
            break

        tqdm.write(f"\n{_Y}  ⟳ Rescue pass {pass_num}/{max_passes} — {total_blank} blank row(s){_X}")

        blank_indices  = blank_df.index.tolist()
        reviews_list   = blank_df["text"].tolist()
        batch_size     = 5
        index_batches  = [blank_indices[i:i+batch_size]  for i in range(0, len(blank_indices),  batch_size)]
        review_batches = [reviews_list[i:i+batch_size]   for i in range(0, len(reviews_list),   batch_size)]
        total_batches  = len(review_batches)
        total_updated  = 0

        rescue_bar = tqdm(
            enumerate(zip(index_batches, review_batches), start=1),
            total=total_batches,
            desc="  Rescuing",
            unit="batch",
            dynamic_ncols=True,
            bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]",
        )

        for batch_number, (idx_chunk, rev_chunk) in rescue_bar:
            results = safe_batch_analysis(analyze_fn, rev_chunk, idx_chunk, batch_number, total_batches)
            if results is None:
                continue
            total_updated += update_dataframe_with_results(df, idx_chunk, results, rev_chunk, batch_number)

        remaining = _count_blank(df)
        tqdm.write(f"  {_DIM}Pass {pass_num} done — fixed {total_updated}, remaining {remaining}{_X}")

        if remaining == 0:
            tqdm.write(f"{_G}  ✓ All blanks rescued after {pass_num} pass(es){_X}")
            break

        if pass_num == max_passes:
            tqdm.write(f"{_Y}  ⚠ {remaining} blank(s) remain after {max_passes} pass(es){_X}")

    return df


def process_sentiment_batch_safely(df, start_idx, end_idx, analyze_fn, batch_number, total_batches=None):
    batch_slice   = df.iloc[start_idx:end_idx].copy()
    batch_indices = batch_slice.index.tolist()
    batch_reviews = batch_slice["text"].tolist()

    results = safe_batch_analysis(analyze_fn, batch_reviews, batch_indices, batch_number, total_batches)
    if results is None:
        tqdm.write(f"{_R}  ✗ Batch {batch_number} failed — keeping original values{_X}")
        return df

    update_dataframe_with_results(df, batch_indices, results, batch_reviews, batch_number)
    return df
