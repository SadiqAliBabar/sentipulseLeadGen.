
import os
import re
import time
import uuid
import traceback
import pandas as pd
from tqdm import tqdm
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from pymongo import MongoClient

import sys
from pathlib import Path
src_path = Path(__file__).resolve().parents[1]
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from sentipulse_ai_pipeline.modules.config import Config
from sentipulse_ai_pipeline.modules.colors import _G, _R, _Y, _C, _B, _M, _W, _DIM, _X
from sentipulse_ai_pipeline.modules.utils import (
    standardize_df,
    save_log_to_buffer,
    save_logs_to_mongodb,
    apply_rating_based_sentiment,
    align_ratings_with_sentiment,
    set_log_context,
    brandname_to_snake_case,
)
from sentipulse_ai_pipeline.modules.sentiment import run_sentiment_analysis_pipeline

load_dotenv(override=True)
Config.validate()

karachi_tz = ZoneInfo("Asia/Karachi")

TW = 64  # terminal width (chars)

# Platform display name map — module-level constant, not rebuilt every loop iteration
_PLATFORM_DISPLAY_MAP: dict[str, str] = {
    "inhouse":   "in-house",
    "ubereats":  "uber eats",
    "google":    "google",
    "opentable": "opentable",
    "foodpanda": "foodpanda",
    "doordash":  "doordash",
    "talabat":   "talabat",
    "facebook":  "facebook",
}

# ── Print / layout helpers ─────────────────────────────────────────────────────

def _p(s=""):
    tqdm.write(str(s))

def _rule(char="═"):
    _p(f"{_DIM}{char * TW}{_X}")

def _brand_open(name: str, db: str):
    _p(f"\n{_W}{_B}┌──  {name.upper()}  {_DIM}·  db: {db}{_X}")
    _p("│")

def _brand_close():
    _p("│")
    _p(f"{_DIM}└{'─' * TW}{_X}\n")

def _section(title: str):
    _p("│")
    fill = max(0, TW - 7 - len(title))
    _p(f"│  {_DIM}── {title} {'─' * fill}{_X}")

def _ln(s: str = ""):
    _p(f"│  {s}")

def _bar():
    _p("│")


# ── Utility helpers ────────────────────────────────────────────────────────────

def to_utc_aware(series: pd.Series) -> pd.Series:
    """Parse a Series of dates and ensure they are UTC-aware."""
    return pd.to_datetime(series, errors="coerce", utc=True)


def _now_iso() -> str:
    return datetime.now(karachi_tz).isoformat()


from sentipulse_ai_pipeline.modules.repositories import PipelineLogRepository

# ── Structured log writer ──────────────────────────────────────────────────────

def write_pipeline_log(
    mongo_client: MongoClient,
    brand_db: str,
    run_id: str,
    brand: str,
    platform: str,
    branch: str,
    summary: dict,
):
    """Write a single structured run-summary document to {brand_db}_pipeline_logs.

    These are the authoritative per-branch/platform outcome records used by
    the pipeline agent for stats aggregation and email reporting. Diagnostic
    events (info/warning/error messages) live in {brand_db}_pipeline_events.
    """
    status    = summary.get("status", "unknown")
    inserted  = summary.get("reviews_inserted", 0)
    skipped   = summary.get("duplicates_skipped", 0)
    processed = summary.get("new_reviews_to_process", 0)
    stop_reason = summary.get("stop_reason", "")

    duration_seconds = 0.0
    try:
        dt_start = datetime.fromisoformat(summary.get("started_at", ""))
        dt_end   = datetime.fromisoformat(summary.get("ended_at", ""))
        duration_seconds = round((dt_end - dt_start).total_seconds(), 1)
    except Exception:
        pass

    if status == "success":
        headline = f"✅ SUCCESS: {processed} processed | {inserted} inserted | {skipped} skipped"
    elif status == "skipped":
        headline = f"⏭️ SKIPPED: {stop_reason}"
    elif status == "partial":
        headline = f"⚠️ PARTIAL: {inserted} inserted | {skipped} skipped. Reason: {stop_reason}"
    else:
        err_type     = summary.get("error_type", "UnknownError")
        failing_step = summary.get("failing_step", "unknown step")
        headline = f"❌ FAILED: {err_type} during {failing_step}"

    incident_report = None
    if status == "failure":
        error = summary.get("error", "") or ""
        incident_report = {
            "error_type":    summary.get("error_type", "UnknownError"),
            "failing_step":  summary.get("failing_step", "unknown step"),
            "short_reason":  error[:300],
            "traceback_link": "See 'technical_details' field",
        }

    doc = {
        "run_id":           run_id,
        "timestamp":        summary.get("ended_at") or summary.get("started_at"),
        "brand":            brand,
        "brand_db":         brand_db,
        "platform":         platform,
        "branch":           branch,
        "headline":         headline,
        "incident_report":  incident_report,
        "stats": {
            "total_source_reviews":   summary.get("total_source_reviews", 0),
            "new_reviews_to_process": processed,
            "reviews_inserted":       inserted,
            "duplicates_skipped":     skipped,
            "duration_seconds":       duration_seconds,
        },
        "status":           status,
        "stop_reason":      stop_reason,
        "technical_details": summary.get("error"),
        "started_at":       summary.get("started_at"),
        "ended_at":         summary.get("ended_at"),
    }

    log_repo = PipelineLogRepository(mongo_client, brand_db)
    log_repo.create_index([("run_id", 1), ("timestamp", -1)])
    log_repo.insert_one(doc)


# ── Incremental gate ───────────────────────────────────────────────────────────

def _has_new_reviews(
    source_db,
    review_collections: list,
    output_collection,
    brandname: str,
) -> tuple[bool, str]:
    latest_output_doc = output_collection.find_one(
        {"date": {"$exists": True, "$ne": None}},
        sort=[("date", -1)],
    )

    if latest_output_doc is None:
        return True, "No sentimented output yet — running full load."

    latest_output_date = to_utc_aware(pd.Series([latest_output_doc["date"]])).iloc[0]

    max_input_date = None
    for _, coll_name in review_collections:
        doc = source_db[coll_name].find_one(
            {"date": {"$exists": True, "$ne": None}},
            sort=[("date", -1)],
        )
        if doc and doc.get("date"):
            d = to_utc_aware(pd.Series([doc["date"]])).iloc[0]
            if max_input_date is None or d > max_input_date:
                max_input_date = d

    if max_input_date is None:
        return False, "All input collections are empty."

    if max_input_date <= latest_output_date:
        return False, (
            f"latest input {max_input_date.date()} ≤ latest output {latest_output_date.date()} "
            f"— no new reviews"
        )

    return True, (
        f"latest input {max_input_date.date()} > latest output {latest_output_date.date()} "
        f"— new reviews detected"
    )


# ── Per-client pipeline ────────────────────────────────────────────────────────

def run_pipeline_for_client(client_doc: dict, mongo_client: MongoClient, run_id: str):
    brandname = client_doc.get("brandName") or client_doc.get("brandname", "")
    db_name   = brandname_to_snake_case(brandname)
    set_log_context(brand=brandname)
    collection_prefix = db_name

    _brand_open(brandname, db_name)

    source_db         = mongo_client[db_name]
    output_collection = source_db[f"{collection_prefix}_sentimented_output"]
    output_collection.create_index([("text", 1), ("date", 1)])
    output_collection.create_index(
        [("sent_restaurant", 1), ("sent_platform", 1), ("branch_name", 1), ("date", -1)]
    )
    checkpoint_log_col = source_db[f"{db_name}_checkpoint_log"]
    checkpoint_log_col.create_index([("run_id", 1), ("checkpoint", 1)], background=True)

    all_collections  = source_db.list_collection_names()
    review_collections = []
    for name in all_collections:
        match = re.match(rf"^{re.escape(collection_prefix)}_(.+)_reviews$", name)
        if match:
            review_collections.append((match.group(1), name))

    if not review_collections:
        _ln(f"{_Y}⚠  No review collections found — skipping{_X}")
        _brand_close()
        write_pipeline_log(
            mongo_client, db_name, run_id, brandname, "all_platforms", "all_branches",
            {"status": "skipped", "stop_reason": "No review collections found in DB",
             "started_at": _now_iso(), "ended_at": _now_iso()},
        )
        return

    # Index source collections now so _has_new_reviews queries (and later load
    # queries) hit indexes instead of doing full collection scans.
    for _, coll_name in review_collections:
        source_db[coll_name].create_index([("date", -1)], background=True)
        source_db[coll_name].create_index([("branch_name", 1), ("date", -1)], background=True)

    platforms_str = "  ·  ".join(p for p, _ in review_collections)
    _ln(f"Collections: {_C}{platforms_str}{_X}")

    # ── Incremental gate ─────────────────────────────────────────
    should_run, gate_reason = _has_new_reviews(
        source_db, review_collections, output_collection, brandname
    )
    if not should_run:
        _bar()
        _ln(f"{_Y}⏭  Skipped{_X}  {_DIM}{gate_reason}{_X}")
        _brand_close()
        write_pipeline_log(
            mongo_client, db_name, run_id, brandname, "all_platforms", "all_branches",
            {"status": "skipped", "stop_reason": gate_reason,
             "started_at": _now_iso(), "ended_at": _now_iso()},
        )
        return

    _ln(f"{_DIM}{gate_reason}{_X}")

    client_start = time.time()
    merged_df    = pd.DataFrame()
    branch_start_times:  dict[tuple, str] = {}
    branch_source_counts: dict[tuple, int] = {}

    # ── Load phase ───────────────────────────────────────────────
    for platform, coll_name in review_collections:
        platform_start_iso  = _now_iso()
        platform_display    = _PLATFORM_DISPLAY_MAP.get(platform.lower(), platform.lower())
        set_log_context(platform=platform_display)

        _bar()
        _ln(f"{_M}▸ {platform.upper()}{_X}")

        try:
            total_source = source_db[coll_name].count_documents({})

            if total_source == 0:
                _ln(f"  {_DIM}Empty collection — skipping{_X}")
                write_pipeline_log(
                    mongo_client, db_name, run_id, brandname, platform_display, "",
                    {"status": "skipped", "stop_reason": "Empty collection",
                     "started_at": platform_start_iso, "ended_at": _now_iso(),
                     "total_source_reviews": 0},
                )
                continue

            # Discover branches before loading docs — no full scan needed
            source_branches = source_db[coll_name].distinct("branch_name")
            if not source_branches:
                _ln(f"  {_Y}⚠  'branch_name' field missing or empty — skipping{_X}")
                write_pipeline_log(
                    mongo_client, db_name, run_id, brandname, platform_display, "",
                    {"status": "skipped", "stop_reason": "Missing branch_name field",
                     "started_at": platform_start_iso, "ended_at": _now_iso(),
                     "total_source_reviews": total_source},
                )
                continue

            # Load all docs from the source collection.
            # Per-branch ID-based exclusion is applied inside the branch loop below,
            # which correctly handles first-run, incremental, and resume scenarios.
            docs = list(source_db[coll_name].find({}))

            if not docs:
                _ln(f"  {_DIM}No docs after date filter — skipping{_X}")
                continue

            df = pd.DataFrame(docs)
            df["date"] = to_utc_aware(df["date"])
            df = df.dropna(subset=["date"])

            if "branch_name" not in df.columns:
                _ln(f"  {_Y}⚠  'branch_name' column missing — skipping{_X}")
                write_pipeline_log(
                    mongo_client, db_name, run_id, brandname, platform_display, "",
                    {"status": "skipped", "stop_reason": "Missing branch_name column",
                     "started_at": platform_start_iso, "ended_at": _now_iso(),
                     "total_source_reviews": total_source},
                )
                continue

            unique_branches = df["branch_name"].unique()
            branch_data_list = []

            for branch in unique_branches:
                branch_start_iso     = _now_iso()
                branch_df            = df[df["branch_name"] == branch].copy()
                total_branch_reviews = source_db[coll_name].count_documents({"branch_name": branch})

                # ── ID-based exclusion ────────────────────────────────────────
                # Pull IDs already processed for this specific branch
                branch_existing_ids: set[str] = set(
                    output_collection.distinct(
                        "system_review_id",
                        {
                            "sent_restaurant": brandname,
                            "sent_platform":   platform_display,
                            "branch_name":     branch,
                            "system_review_id": {"$exists": True, "$ne": None},
                        },
                    )
                )

                if branch_existing_ids and "system_review_id" in branch_df.columns:
                    initial_count = len(branch_df)
                    branch_df = branch_df[
                        ~branch_df["system_review_id"].isin(branch_existing_ids)
                    ]
                    already_done = initial_count - len(branch_df)
                    new_count = len(branch_df)

                    if new_count:
                        skip_note = f"  {_DIM}({already_done} already done){_X}" if already_done else ""
                        _ln(f"  {branch:<28}  {_DIM}{total_branch_reviews:>5,} total{_X}  →  {_G}{new_count:>4,} new{_X}{skip_note}")
                    else:
                        _ln(f"  {branch:<28}  {_DIM}{total_branch_reviews:>5,} total  →  0 new  (skipped){_X}")
                elif not branch_existing_ids:
                    # Fallback: no system_review_ids in output at all (first run or old data)
                    # Use the old date-based approach as a safety net
                    existing_doc = output_collection.find_one(
                        {"sent_restaurant": brandname, "sent_platform": platform_display, "branch_name": branch},
                        sort=[("date", -1)],
                    )
                    if existing_doc and existing_doc.get("date"):
                        existing_max_dt = to_utc_aware(pd.Series([existing_doc["date"]])).iloc[0]
                        initial_count = len(branch_df)
                        branch_df = branch_df[branch_df["date"] >= existing_max_dt]
                        done_docs = list(output_collection.find(
                            {"sent_restaurant": brandname, "sent_platform": platform_display,
                             "branch_name": branch, "date": {"$gte": existing_max_dt.to_pydatetime().replace(tzinfo=None)}},
                            {"text": 1, "_id": 0},
                        ))
                        done_texts = {str(d.get("text", "")).strip() for d in done_docs}
                        branch_df = branch_df[~branch_df["text"].astype(str).str.strip().isin(done_texts)]
                        already_done = initial_count - len(branch_df)
                        new_count = len(branch_df)
                        if new_count:
                            _ln(f"  {branch:<28}  {_DIM}{total_branch_reviews:>5,} total{_X}  →  {_G}{new_count:>4,} new{_X}  {_DIM}({already_done} already done){_X}")
                        else:
                            _ln(f"  {branch:<28}  {_DIM}{total_branch_reviews:>5,} total  →  0 new  (skipped){_X}")
                    else:
                        _ln(f"  {branch:<28}  {_G}NEW{_X}  {_DIM}loading all {total_branch_reviews:,} historic reviews{_X}")
                else:
                    _ln(f"  {branch:<28}  {_G}NEW{_X}  {_DIM}loading all {total_branch_reviews:,} historic reviews{_X}")

                if branch_df.empty:
                    write_pipeline_log(
                        mongo_client, db_name, run_id, brandname, platform_display, branch,
                        {"status": "skipped", "stop_reason": "No new reviews since last run",
                         "started_at": branch_start_iso, "ended_at": _now_iso(),
                         "total_source_reviews": total_branch_reviews,
                         "new_reviews_to_process": 0, "reviews_inserted": 0,
                         "duplicates_skipped": 0},
                    )
                else:
                    branch_data_list.append(branch_df)
                    branch_start_times[(platform_display, branch)]  = branch_start_iso
                    branch_source_counts[(platform_display, branch)] = total_branch_reviews

            if branch_data_list:
                platform_df               = pd.concat(branch_data_list, ignore_index=True)
                platform_df["sent_restaurant"] = brandname
                platform_df["sent_platform"]   = platform_display
                platform_df = standardize_df(platform_df, platform)
                merged_df   = pd.concat([merged_df, platform_df], ignore_index=True)

        except Exception as exc:
            tb       = traceback.format_exc()
            err_type = type(exc).__name__
            save_log_to_buffer(f"Error loading {coll_name}: {exc}", "error")
            _ln(f"  {_R}✗ ERROR ({err_type}): {exc}{_X}")
            write_pipeline_log(
                mongo_client, db_name, run_id, brandname, platform_display, "",
                {"status": "failure", "error_type": err_type,
                 "failing_step": f"loading {coll_name}", "error": tb,
                 "stop_reason": f"Crash — {err_type}",
                 "started_at": platform_start_iso, "ended_at": _now_iso()},
            )

    # ── Guard: nothing to process ────────────────────────────────
    if merged_df.empty:
        _bar()
        _ln(f"{_Y}⚠  No new data across all platforms — nothing to process{_X}")
        _brand_close()
        write_pipeline_log(
            mongo_client, db_name, run_id, brandname, "all_platforms", "all_branches",
            {"status": "skipped",
             "stop_reason": "No new data across all platforms after incremental filter",
             "started_at": _now_iso(), "ended_at": _now_iso()},
        )
        return

    # ── Sentiment + insertion phase ──────────────────────────────
    CHECKPOINT_SIZE = 100
    _section("Sentiment Analysis")

    sentiment_start_iso = _now_iso()
    try:
        initial_len = len(merged_df)
        
        # Deduplication columns: prefer branchId over branch_name for consistency across name changes
        if "branchId" in merged_df.columns:
            dedup_cols = ["text", "date", "branchId"]
        else:
            dedup_cols = ["text", "date", "branch_name"]
            
        if "user" in merged_df.columns:
            dedup_cols.append("user")
        elif "reviewer_name" in merged_df.columns:
            dedup_cols.append("reviewer_name")

        merged_df = merged_df.drop_duplicates(subset=dedup_cols, keep="first")
        saved     = initial_len - len(merged_df)
        _ln(f"Dedup: {_W}{initial_len:,}{_X} → {_W}{_G}{len(merged_df):,}{_X} unique  {_DIM}({saved:,} saved){_X}")

        # Sort oldest-first so checkpoint date boundaries are correct on re-run
        merged_df = merged_df.sort_values("date", na_position="last").reset_index(drop=True)

        total_reviews = len(merged_df)
        chunks        = [merged_df.iloc[i : i + CHECKPOINT_SIZE] for i in range(0, total_reviews, CHECKPOINT_SIZE)]
        total_chunks  = len(chunks)

        _ln(f"Chunks: {_W}{total_chunks}{_X}  {_DIM}×  {CHECKPOINT_SIZE} reviews each{_X}")
        _bar()

        set_log_context(platform="sentiment")

        total_inserted       = 0
        total_skipped_dup    = 0
        branch_inserted_counts: dict[tuple, int] = {}
        all_processed_dfs    = []

        for chunk_idx, chunk_df in enumerate(chunks):
            checkpoint_num = chunk_idx + 1
            chunk_start    = chunk_idx * CHECKPOINT_SIZE + 1
            chunk_end      = min((chunk_idx + 1) * CHECKPOINT_SIZE, total_reviews)

            _bar()
            _ln(f"{_DIM}── Chunk {checkpoint_num}/{total_chunks}  (reviews {chunk_start}–{chunk_end}){_X}")

            chunk_final = run_sentiment_analysis_pipeline(chunk_df.copy(), db_name=db_name)
            chunk_final = apply_rating_based_sentiment(chunk_final)
            chunk_final = align_ratings_with_sentiment(chunk_final)
            chunk_final = chunk_final.dropna(subset=["date"])
            chunk_final = chunk_final.drop(columns=["_id"], errors="ignore")
            all_processed_dfs.append(chunk_final)

            records       = chunk_final.fillna("").to_dict("records")
            chunk_filtered = []

            if records:
                # Convert to plain Python datetimes — PyMongo rejects pd.Timestamp in $in
                batch_dates   = [
                    d.to_pydatetime() for d in chunk_final["date"].dropna().unique()
                ]
                existing_docs = list(output_collection.find(
                    {"date": {"$in": batch_dates}},
                    {"text": 1, "date": 1, "branch_name": 1, "branchId": 1},
                ))

                existing_fingerprints: set[tuple] = set()
                if existing_docs:
                    ex_df = pd.DataFrame(existing_docs)
                    ex_dates = to_utc_aware(ex_df["date"])
                    for i, d in enumerate(existing_docs):
                        # Use branchId if available, fallback to branch_name
                        b_id = d.get("branchId") or d.get("branch_name", "")
                        existing_fingerprints.add((
                            str(d.get("text")).strip(), ex_dates.iloc[i], b_id
                        ))

                rec_dates = to_utc_aware(pd.Series([r["date"] for r in records]))
                for i, rec in enumerate(records):
                    # Use branchId if available, fallback to branch_name
                    b_id = rec.get("branchId") or rec.get("branch_name", "")
                    fp = (str(rec.get("text")).strip(), rec_dates.iloc[i], b_id)
                    if fp not in existing_fingerprints:
                        chunk_filtered.append(rec)
                        existing_fingerprints.add(fp)

                chunk_new = len(chunk_filtered)
                chunk_dup = len(records) - chunk_new
                total_inserted    += chunk_new
                total_skipped_dup += chunk_dup

                for rec in chunk_filtered:
                    key = (rec.get("sent_platform", ""), rec.get("branch_name", ""))
                    branch_inserted_counts[key] = branch_inserted_counts.get(key, 0) + 1

                if chunk_filtered:
                    output_collection.insert_many(chunk_filtered)
                    checkpoint_log_col.insert_one({
                        "run_id":        run_id,
                        "brand":         brandname,
                        "checkpoint":    checkpoint_num,
                        "total_chunks":  total_chunks,
                        "reviews_range": f"{chunk_start}–{chunk_end}",
                        "inserted":      chunk_new,
                        "dups_skipped":  chunk_dup,
                        "status":        "saved",
                        "saved_at":      _now_iso(),
                    })
                    dup_note = f"  {_DIM}+{chunk_dup} dups{_X}" if chunk_dup else ""
                    _ln(f"  Chunk {checkpoint_num:>2}/{total_chunks}  {_G}✓{_X}  {_W}{chunk_new:>4}{_X} inserted{dup_note}")
                    save_log_to_buffer(
                        f"Checkpoint {checkpoint_num}/{total_chunks}: inserted {chunk_new}, skipped {chunk_dup} dups",
                        "info",
                    )
                else:
                    checkpoint_log_col.insert_one({
                        "run_id":        run_id,
                        "brand":         brandname,
                        "checkpoint":    checkpoint_num,
                        "total_chunks":  total_chunks,
                        "reviews_range": f"{chunk_start}–{chunk_end}",
                        "inserted":      0,
                        "dups_skipped":  chunk_dup,
                        "status":        "all_duplicates",
                        "saved_at":      _now_iso(),
                    })
                    _ln(f"  Chunk {checkpoint_num:>2}/{total_chunks}  {_Y}all dups{_X}  {_DIM}({chunk_dup} skipped){_X}")

        _bar()
        if total_inserted:
            elapsed = round(time.time() - client_start, 1)
            _ln(f"{_G}✓  {total_inserted:,} inserted  ·  {total_skipped_dup} dups skipped  ·  {elapsed}s{_X}")
        else:
            _ln(f"{_Y}⚠  All records already in DB — nothing inserted{_X}")

        final_df = pd.concat(all_processed_dfs, ignore_index=True) if all_processed_dfs else pd.DataFrame()

        if not final_df.empty and "sent_platform" in final_df.columns and "branch_name" in final_df.columns:
            for (plat_disp, branch), grp in final_df.groupby(["sent_platform", "branch_name"]):
                key             = (plat_disp, branch)
                processed_count = len(grp)
                br_inserted     = branch_inserted_counts.get(key, 0)
                br_skipped      = processed_count - br_inserted
                write_pipeline_log(
                    mongo_client, db_name, run_id, brandname, plat_disp, branch,
                    {"status": "success",
                     "total_source_reviews":   branch_source_counts.get(key, 0),
                     "new_reviews_to_process": processed_count,
                     "reviews_inserted":       br_inserted,
                     "duplicates_skipped":     br_skipped,
                     "started_at":             branch_start_times.get(key, sentiment_start_iso),
                     "ended_at":               _now_iso()},
                )
        else:
            write_pipeline_log(
                mongo_client, db_name, run_id, brandname, "all_platforms", "all_branches",
                {"status": "success",
                 "new_reviews_to_process": total_reviews,
                 "reviews_inserted":       total_inserted,
                 "duplicates_skipped":     total_skipped_dup,
                 "started_at":             sentiment_start_iso,
                 "ended_at":               _now_iso()},
            )

    except Exception as exc:
        tb       = traceback.format_exc()
        err_type = type(exc).__name__
        save_log_to_buffer(f"Pipeline failed for {brandname}: {exc}", "error")
        _bar()
        _ln(f"{_R}✗ PIPELINE ERROR ({err_type}): {exc}{_X}")
        write_pipeline_log(
            mongo_client, db_name, run_id, brandname, "sentiment", "",
            {"status": "failure", "error_type": err_type,
             "failing_step": "sentiment analysis / insertion", "error": tb,
             "stop_reason": f"Crash — {err_type}",
             "started_at": sentiment_start_iso, "ended_at": _now_iso()},
        )

    _brand_close()


# ── Entry point ────────────────────────────────────────────────────────────────

def run_pipeline():
    mongo_client = MongoClient(Config.MONGO_URI)
    try:
        sentipulse_db = mongo_client[Config.CENTRAL_DB_NAME]

        run_id      = str(uuid.uuid4())
        set_log_context(run_id=run_id)
        run_started = datetime.now(karachi_tz)

        _rule("═")
        _p(f"  {_W}{_G}SENTIPULSE PIPELINE{_X}")
        _p(f"  {_DIM}{run_started.strftime('%Y-%m-%d  %H:%M:%S')}  ·  Run: {run_id[:8]}…{_X}")
        _rule("═")

        clients = list(sentipulse_db[Config.CLIENTS_COLLECTION].find({"isActive": True}))
        _p(f"\n  {_C}{len(clients)} active brand(s) found in '{Config.CENTRAL_DB_NAME}'{_X}")

        if not clients:
            _p(f"  {_Y}⚠  No active clients — exiting{_X}\n")
            return

        for client_doc in clients:
            db_name = brandname_to_snake_case(
                client_doc.get("brandName") or client_doc.get("brandname", "")
            )
            try:
                run_pipeline_for_client(client_doc, mongo_client, run_id)
            finally:
                # Always flush buffered diagnostic events, even if the run crashed
                save_logs_to_mongodb(db_name, mongo_client)

        run_ended = datetime.now(karachi_tz)
        duration  = (run_ended - run_started).total_seconds()

        _rule("═")
        _p(f"  {_W}{_G}✓  PIPELINE COMPLETE{_X}")
        _p(f"  {_DIM}{len(clients)} brand(s) processed  ·  Total: {duration:.1f}s{_X}")
        _rule("═")
        _p("")

        _p(f"{_DIM}Activating Pipeline Agent…{_X}")
        try:
            from sentipulse_ai_pipeline.modules.pipeline_agent import PipelineAgent
            agent = PipelineAgent(mongo_uri=Config.MONGO_URI, run_id=run_id)
            agent.run()
        except Exception as exc:
            _p(f"{_Y}⚠  Pipeline Agent error: {exc}{_X}")
        _p("")

    finally:
        mongo_client.close()


if __name__ == "__main__":
    run_pipeline()
