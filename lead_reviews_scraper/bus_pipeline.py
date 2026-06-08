"""
lead_reviews_scraper/bus_pipeline.py
=====================================
Scrapes ALL Google Maps reviews for a list of leads, saves them to MongoDB
with incremental flushes, and supports resuming interrupted runs.

Run:
    uv run lead_reviews_scraper/bus_pipeline.py
"""

import logging
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv(override=True)

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRAPER_REPO = Path(__file__).parent / "google-reviews-scraper-pro"
if str(SCRAPER_REPO) not in sys.path:
    sys.path.insert(0, str(SCRAPER_REPO))

from pymongo import MongoClient

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_WORKERS = 5
FLUSH_EVERY_N = 100
FLUSH_INTERVAL_SEC = 30
KARACHI_TZ = ZoneInfo("Asia/Karachi")

# ── MongoDB ───────────────────────────────────────────────────────────────────
_mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db = _mongo["sentipulseLeadGen"]

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def _tag(brand_name: str, branch_name: str) -> str:
    return f"[{brand_name}/{branch_name}]"


def _collection_name(brand_name: str) -> str:
    return brand_name.strip().lower().replace(" ", "_") + "_google_reviews"


def _state_id(branch_name: str) -> str:
    return f"__state__{branch_name}"


# ── Review formatter ──────────────────────────────────────────────────────────


def _format_review(
    scraper, raw: dict, brand_name: str, branch_name: str, lead_url: str
) -> dict:
    legacy = scraper._db_review_to_legacy(raw)
    desc = legacy.get("description", {})
    text = next(iter(desc.values()), "") if isinstance(desc, dict) else ""
    owner_responses = legacy.get("owner_responses", {})
    owner_text, owner_date = "", ""
    if isinstance(owner_responses, dict) and owner_responses:
        first = next(iter(owner_responses.values()), {})
        if isinstance(first, dict):
            owner_text = first.get("text", "")
            owner_date = first.get("date", "")
    return {
        "_id": legacy.get("review_id", ""),
        "review_id": legacy.get("review_id", ""),
        "brand_name": brand_name,
        "branch_name": branch_name,
        "lead_url": lead_url,
        "user": legacy.get("author", ""),
        "rating": legacy.get("rating", 0),
        "date_raw": raw.get("raw_date", ""),
        "date": legacy.get("review_date", ""),
        "text": text,
        "language": raw.get("lang", "und"),
        "likes_count": legacy.get("likes", 0),
        "photos": legacy.get("user_images", []),
        "reviewer_profile": legacy.get("author_profile_url", ""),
        "reviewerPhotoUrl": legacy.get("profile_picture", ""),
        "owner_reply": {"text": owner_text, "date_raw": owner_date}
        if owner_text
        else None,
        "scraped_at": datetime.now(KARACHI_TZ).isoformat(),
    }


# ── MongoDB helpers ───────────────────────────────────────────────────────────


def _upsert_reviews(col, docs: list) -> None:
    for doc in docs:
        col.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)


def _read_state(col, branch_name: str) -> dict:
    return col.find_one({"_id": _state_id(branch_name)}) or {}


def _write_state(
    col, brand_name: str, branch_name: str, lead_url: str, **fields
) -> None:
    col.update_one(
        {"_id": _state_id(branch_name)},
        {
            "$set": {
                "brand_name": brand_name,
                "branch_name": branch_name,
                "lead_url": lead_url,
                **fields,
            }
        },
        upsert=True,
    )


def _load_mongo_known_ids(col, branch_name: str) -> set:
    cursor = col.find(
        {"branch_name": branch_name, "_id": {"$not": {"$regex": r"^__state__"}}},
        {"_id": 1},
    )
    return {doc["_id"] for doc in cursor}


# ── Pre-seed SQLite with already-saved IDs ────────────────────────────────────


def _preseed_sqlite(scraper, place_id: str, mongo_known_ids: set) -> None:
    stub = {
        "review_id": "",
        "text": {},
        "rating": 0,
        "likes": 0,
        "lang": "und",
        "date": "",
        "review_date": "",
        "author": "",
        "profile": "",
        "avatar": "",
        "owner_text": "",
        "photos": [],
    }
    for rid in mongo_known_ids:
        stub["review_id"] = rid
        try:
            scraper.review_db.upsert_review(
                place_id, stub, session_id=None, scrape_mode="update"
            )
        except Exception:
            pass


# ── Background flush thread ───────────────────────────────────────────────────


def _flush_loop(
    scraper_ref: list,
    col,
    brand_name: str,
    branch_name: str,
    lead_url: str,
    mongo_known_ids: set,
    flushed_ids: set,
    stop_event: threading.Event,
    tag: str,
):
    while not stop_event.is_set():
        stop_event.wait(FLUSH_INTERVAL_SEC)
        try:
            _do_flush(
                scraper_ref,
                col,
                brand_name,
                branch_name,
                lead_url,
                mongo_known_ids,
                flushed_ids,
                tag,
                force=True,
            )
        except Exception as exc:
            logger.warning(f"{tag} Flush error (will retry): {exc}")


def _do_flush(
    scraper_ref: list,
    col,
    brand_name: str,
    branch_name: str,
    lead_url: str,
    mongo_known_ids: set,
    flushed_ids: set,
    tag: str,
    force: bool = False,
) -> int:
    scraper = scraper_ref[0]
    if scraper is None or not scraper.place_id:
        return 0

    # Open a dedicated connection for this thread — ReviewDB connections must not
    # be shared across threads (Python sqlite3 raises ProgrammingError otherwise).
    from modules.review_db import ReviewDB
    try:
        db_path = scraper.review_db.backend.db_path
        place_id = scraper.place_id
        reader = ReviewDB(db_path)
        try:
            raw_reviews = reader.get_reviews(place_id)
        finally:
            reader.close()
    except Exception as exc:
        logger.debug(f"{tag} Could not read SQLite in flush thread: {exc}")
        return 0

    batch = []
    for raw in raw_reviews:
        rid = raw.get("review_id", "")
        if not rid or rid in mongo_known_ids or rid in flushed_ids:
            continue
        doc = _format_review(scraper, raw, brand_name, branch_name, lead_url)
        batch.append(doc)

    if not batch:
        return 0

    if not force and len(batch) < FLUSH_EVERY_N:
        return 0

    _upsert_reviews(col, batch)
    for doc in batch:
        flushed_ids.add(doc["_id"])

    total_saved = len(mongo_known_ids) + len(flushed_ids)
    _write_state(
        col,
        brand_name,
        branch_name,
        lead_url,
        status="in_progress",
        place_id=scraper.place_id or "",
        total_saved=total_saved,
    )
    logger.info(f"{tag} Flushed {len(batch)} reviews (total saved: {total_saved})")
    return len(batch)


# ── Per-lead worker ───────────────────────────────────────────────────────────


def _process_lead(lead: dict) -> None:
    from modules.scraper import GoogleReviewsScraper

    brand_name = lead["brand_name"]
    branch_name = lead["branch_name"]
    lead_url = lead["lead_url"]
    tag = _tag(brand_name, branch_name)

    col_name = _collection_name(brand_name)
    col = _db[col_name]

    # 1. Read state
    state = _read_state(col, branch_name)
    if state.get("status") == "completed":
        logger.info(f"{tag} Already completed — skipping")
        return

    # 2. Load existing IDs from MongoDB
    mongo_known_ids = _load_mongo_known_ids(col, branch_name)
    saved_place_id = state.get("place_id") or ""
    logger.info(f"{tag} Starting ({len(mongo_known_ids)} reviews already in MongoDB)")

    # 3. Build scraper config
    if mongo_known_ids and saved_place_id:
        scrape_mode = "update"
    else:
        scrape_mode = "full"

    config = {
        "url": lead_url,
        "headless": True,
        "sort_by": "newest",
        "scrape_mode": scrape_mode,
        "max_reviews": 0,
        "max_scroll_attempts": 500,
        "scroll_idle_limit": 20,
        "stop_threshold": 0,
        "convert_dates": True,
        "download_images": False,
        "use_mongodb": False,
        "backup_to_json": False,
        "db_path": str(SCRAPER_REPO / "reviews.db"),
    }

    scraper = GoogleReviewsScraper(config)

    # 4. Pre-seed SQLite with known IDs so scraper skips their DOM extraction
    if mongo_known_ids and saved_place_id:
        try:
            scraper.review_db.upsert_place(saved_place_id, "", lead_url, lead_url)
        except Exception as e:
            logger.warning(f"{tag} upsert_place failed: {e}")
        logger.info(f"{tag} Pre-seeding SQLite with {len(mongo_known_ids)} known IDs")
        _preseed_sqlite(scraper, saved_place_id, mongo_known_ids)

    # 5. Mark in_progress
    _write_state(
        col,
        brand_name,
        branch_name,
        lead_url,
        status="in_progress",
        place_id=saved_place_id,
        total_saved=len(mongo_known_ids),
        started_at=datetime.now(KARACHI_TZ).isoformat(),
    )

    # 6. Start background flush thread
    scraper_ref = [scraper]
    flushed_ids = set()
    stop_event = threading.Event()
    flush_thread = threading.Thread(
        target=_flush_loop,
        args=(
            scraper_ref,
            col,
            brand_name,
            branch_name,
            lead_url,
            mongo_known_ids,
            flushed_ids,
            stop_event,
            tag,
        ),
        daemon=True,
    )
    flush_thread.start()

    # 7. Run scraper (blocking)
    try:
        logger.info(f"{tag} Scraping started (mode={scrape_mode})")
        scraper.scrape()
        logger.info(f"{tag} Scraping finished")
    except Exception as e:
        logger.error(f"{tag} Scraper error: {e}")
        stop_event.set()
        flush_thread.join(timeout=10)
        _write_state(
            col,
            brand_name,
            branch_name,
            lead_url,
            status="failed",
            place_id=getattr(scraper, "place_id", "") or "",
            completed_at=datetime.now(KARACHI_TZ).isoformat(),
        )
        try:
            scraper.review_db.close()
        except Exception:
            pass
        return

    # 8. Stop flush thread, do final flush
    stop_event.set()
    flush_thread.join(timeout=10)

    _do_flush(
        scraper_ref,
        col,
        brand_name,
        branch_name,
        lead_url,
        mongo_known_ids,
        flushed_ids,
        tag,
        force=True,
    )

    total_saved = len(mongo_known_ids) + len(flushed_ids)
    _write_state(
        col,
        brand_name,
        branch_name,
        lead_url,
        status="completed",
        place_id=getattr(scraper, "place_id", "") or "",
        total_saved=total_saved,
        completed_at=datetime.now(KARACHI_TZ).isoformat(),
    )

    logger.info(f"{tag} Completed — {total_saved} total reviews saved")

    try:
        scraper.review_db.close()
    except Exception:
        pass


# ── Public entry point ────────────────────────────────────────────────────────


def run_leads_pipeline(leads: list[dict]) -> None:
    workers = min(len(leads), MAX_WORKERS)
    logger.info(f"Pipeline starting: {len(leads)} leads, {workers} workers")
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_process_lead, lead): lead for lead in leads}
        for fut in as_completed(futures):
            lead = futures[fut]
            tag = _tag(lead["brand_name"], lead["branch_name"])
            try:
                fut.result()
            except Exception as e:
                logger.error(f"{tag} Unhandled exception: {e}")
    logger.info("Pipeline complete")


# ── Usage example ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    leads = [
        {
            "brand_name": "Drip",
            "branch_name": "Drip, Gulberg, LHE",
            "lead_url": "https://www.google.com/maps/place/Drip+-+Coffee+Bakery+Kitchen+-+Gulberg/@30.1088618,72.4329249,7z/data=!4m6!3m5!1s0x39190500374c5e45:0x59ac49ac28e47338!8m2!3d31.5306832!4d74.3520506!16s%2Fg%2F11ww4sqjk1?entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D",
        },
    ]
    run_leads_pipeline(leads)
