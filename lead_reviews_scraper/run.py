"""
lead_reviews_scraper/run.py
============================
Scrapes Google Maps reviews for leads that pass the criteria filter,
then stores the results back into each lead's MongoDB document.

Uses the google-reviews-scraper-pro repo (cloned locally) as the
scraping engine — no API keys, no login required.

Run:
    python -m lead_reviews_scraper.run --category gyms
    python -m lead_reviews_scraper.run --category gyms --max-reviews 20
    python -m lead_reviews_scraper.run --category gyms --limit 5 --headless

Options:
    --category      Collection to process (default: gyms)
    --limit         Max leads to process in this run (default: all)
    --max-reviews   Max reviews to scrape per business (default: 50)
    --headless      Run Chrome headless (default: True)
    --re-scrape     Re-scrape leads that already have reviews (default: False)
"""

import sys
import os
import logging
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(override=True)

# ── Add the cloned repo to sys.path so its modules are importable ─────────────
SCRAPER_REPO = Path(__file__).parent / "google-reviews-scraper-pro"
if str(SCRAPER_REPO) not in sys.path:
    sys.path.insert(0, str(SCRAPER_REPO))

from pymongo import MongoClient

try:
    from zoneinfo import ZoneInfo
    KARACHI_TZ = ZoneInfo("Asia/Karachi")
    datetime.now(KARACHI_TZ)
except Exception:
    KARACHI_TZ = timezone(timedelta(hours=5))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── MongoDB connection ────────────────────────────────────────────────────────
_mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db    = _mongo[os.getenv("MONGO_DB", "lead_generation_project")]


# ── Scraper config builder ────────────────────────────────────────────────────

def _build_scraper_config(url: str, max_reviews: int, headless: bool) -> dict:
    """
    Build the config dict that GoogleReviewsScraper expects.
    We disable MongoDB sync and image downloads — we handle
    storage ourselves so we can write back into the lead's document.
    """
    return {
        "url":              url,
        "headless":         headless,
        "sort_by":          "newest",
        "scrape_mode":      "full",          # always grab fresh data
        "max_reviews":      max_reviews,
        "max_scroll_attempts": 50,
        "scroll_idle_limit":   10,
        "stop_threshold":      3,
        "convert_dates":    True,            # "2 weeks ago" → ISO timestamp
        "download_images":  False,           # skip image downloads
        "use_mongodb":      False,           # we write to mongo ourselves
        "backup_to_json":   False,
        # SQLite DB stored inside the scraper folder (isolated)
        "db_path": str(SCRAPER_REPO / "reviews.db"),
    }


# ── Review formatter ──────────────────────────────────────────────────────────

def _format_review(scraper, r: dict) -> dict:
    """
    Reshape a raw scraper review dict into a clean, consistent
    structure for storage in our lead's MongoDB document.
    Uses the scraper's internal legacy formatter.
    """
    legacy = scraper._db_review_to_legacy(r)
    
    # Extract text from the description dict (which is language-mapped)
    desc = legacy.get("description", {})
    text = ""
    if isinstance(desc, dict) and desc:
        # Take the first available language's text
        text = next(iter(desc.values()), "")
    
    # Extract owner reply text
    owner_responses = legacy.get("owner_responses", {})
    owner_text = ""
    owner_date = ""
    if isinstance(owner_responses, dict) and owner_responses:
        # Get the first response found
        first_resp = next(iter(owner_responses.values()), {})
        if isinstance(first_resp, dict):
            owner_text = first_resp.get("text", "")
            owner_date = first_resp.get("date", "")
        else:
            owner_text = str(first_resp)

    return {
        "review_id":     legacy.get("review_id", ""),
        "author":        legacy.get("author", ""),
        "rating":        legacy.get("rating", 0),
        "date_raw":      r.get("raw_date", ""),           # Original string like "2 weeks ago"
        "date_iso":      legacy.get("review_date", ""),   # Parsed ISO date
        "text":          text,
        "language":      r.get("lang", "und"),
        "likes":         legacy.get("likes", 0),
        "photos":        legacy.get("user_images", []),
        "profile_url":   legacy.get("author_profile_url", ""),
        "avatar_url":    legacy.get("profile_picture", ""),
        "owner_reply": {
            "text":      owner_text,
            "date_raw":  owner_date,
        } if owner_text else None,
    }


# ── Per-lead scraper ──────────────────────────────────────────────────────────

def _scrape_lead(doc: dict, max_reviews: int, headless: bool) -> dict | None:
    """
    Run the google-reviews-scraper-pro engine against one lead's
    Google Maps link. Returns a structured result dict or None on failure.
    """
    from modules.scraper import GoogleReviewsScraper

    url = doc.get("link") or doc.get("url") or doc.get("maps_url")
    if not url:
        logger.warning("  No Google Maps link found — skipping")
        return None

    config = _build_scraper_config(url, max_reviews, headless)
    scraper = GoogleReviewsScraper(config)

    try:
        scraper.scrape()

        # Pull scraped reviews out of the scraper's SQLite DB
        raw_reviews: list = scraper.review_db.get_reviews(
            scraper.place_id
        ) if scraper.place_id else []

        reviews = [_format_review(scraper, r) for r in raw_reviews]
        
        # Respect the max_reviews limit (take newest X reviews)
        if max_reviews > 0:
            reviews = reviews[:max_reviews]

        ratings = [r["rating"] for r in reviews if r["rating"]]

        return {
            "place_id":        scraper.place_id or "",
            "total_scraped":   len(reviews),
            "avg_rating":      round(sum(ratings) / len(ratings), 2) if ratings else None,
            "latest_review":   reviews[0] if reviews else None,   # sorted newest first
            "reviews":         reviews,
            "scraped_at":      datetime.now(KARACHI_TZ).isoformat(),
        }

    except Exception as e:
        logger.error(f"  Scraper error: {e}")
        return None
    finally:
        try:
            scraper.review_db.close()
        except Exception:
            pass


# ── Main runner ───────────────────────────────────────────────────────────────

def run_reviews(
    category:    str,
    limit:       int | None = None,
    max_reviews: int        = 50,
    headless:    bool       = True,
    re_scrape:   bool       = False,
):
    collection_name = category.strip().lower().replace(" ", "_") + "_lead_discovery"
    col = _db[collection_name]
    db_name = os.getenv("MONGO_DB", "lead_generation_project")

    # ── Filter: skip leads where BOTH criteria flags are False ────────────────
    criteria_filter = {"$or": [
        {"filteredByCriteria":            True},
        {"filteredByCriteriaWithWebsite": True},
    ]}

    if re_scrape:
        query_filter = criteria_filter
    else:
        # Only process leads that haven't been review-scraped yet
        query_filter = {**criteria_filter, "google_reviews": {"$exists": False}}

    total_pending  = col.count_documents(query_filter)
    total_criteria = col.count_documents(criteria_filter)
    total_in_col   = col.count_documents({})
    docs = list(col.find(query_filter, limit=limit or 0))

    if not docs:
        logger.info(f"No pending leads in '{db_name}.{collection_name}'. All already scraped.")
        return

    logger.info("=" * 70)
    logger.info(f"  REVIEW SCRAPER — {category.upper()}")
    logger.info(f"  Collection   : {db_name} > {collection_name}")
    logger.info(f"  Filter       : filteredByCriteria=True OR filteredByCriteriaWithWebsite=True")
    logger.info(f"  Total in col : {total_in_col}  |  Match criteria: {total_criteria}")
    logger.info(f"  Pending      : {total_pending}  |  Processing: {len(docs)}")
    logger.info(f"  Max reviews  : {max_reviews}  |  Headless: {headless}")
    logger.info("=" * 70)

    succeeded = 0
    failed    = 0

    for i, doc in enumerate(docs, 1):
        name   = doc.get("name", "Unknown")
        doc_id = doc["_id"]

        logger.info(f"[{i}/{len(docs)}] Scraping reviews: {name}")

        result = _scrape_lead(doc, max_reviews, headless)

        if result:
            col.update_one(
                {"_id": doc_id},
                {"$set": {
                    "google_reviews": {
                        "place_id":      result["place_id"],
                        "total_scraped": result["total_scraped"],
                        "avg_rating":    result["avg_rating"],
                        "latest_review": result["latest_review"],
                        "scraped_at":    result["scraped_at"],
                        "reviews":       result["reviews"],
                    },
                    "reviews_scraped_at": result["scraped_at"],
                }},
            )
            logger.info(
                f"[{i}/{len(docs)}] ✔ Saved {result['total_scraped']} reviews "
                f"(avg ⭐ {result['avg_rating']}) — {name}"
            )
            succeeded += 1
        else:
            col.update_one(
                {"_id": doc_id},
                {"$set": {
                    "google_reviews":     {"error": "scrape_failed", "scraped_at": datetime.now(KARACHI_TZ).isoformat()},
                    "reviews_scraped_at": datetime.now(KARACHI_TZ).isoformat(),
                }},
            )
            logger.warning(f"[{i}/{len(docs)}] ✘ Failed — {name}")
            failed += 1

    logger.info("")
    logger.info("=" * 70)
    logger.info(f"  REVIEW SCRAPE COMPLETE — {category.upper()}")
    logger.info(f"  Succeeded : {succeeded}")
    logger.info(f"  Failed    : {failed}")
    logger.info("=" * 70)


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Google Maps review scraper for leads")
    p.add_argument("--category",    type=str,  default="gyms",   help="Collection category to process")
    p.add_argument("--limit",       type=int,  default=None,     help="Max leads to process")
    p.add_argument("--max-reviews", type=int,  default=50,       help="Max reviews to scrape per business")
    p.add_argument("--headless",    action=argparse.BooleanOptionalAction, default=True)
    p.add_argument("--re-scrape", "--rerun", action="store_true", default=False, help="Re-scrape and update leads that already have reviews")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_reviews(
        category    = args.category,
        limit       = args.limit,
        max_reviews = args.max_reviews,
        headless    = args.headless,
        re_scrape   = args.re_scrape,
    )
