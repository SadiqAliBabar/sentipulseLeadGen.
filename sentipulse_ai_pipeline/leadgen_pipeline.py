"""
leadgen_pipeline.py — SentipulseLeadGen sentiment pipeline

Targets the `sentipulseLeadGen` MongoDB database.
Auto-discovers every collection named  {brand}_google_reviews,
runs sentiment analysis on new reviews, and writes enriched docs to
{brand}_sentimented_output in the same database.

Run:
    uv run sentipulse_ai_pipeline/leadgen_pipeline.py
"""

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
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sentipulse_ai_pipeline.modules.config import Config
from sentipulse_ai_pipeline.modules.colors import _G, _R, _Y, _C, _B, _M, _W, _DIM, _X
from sentipulse_ai_pipeline.modules.utils import (
    save_log_to_buffer,
    save_logs_to_mongodb,
    apply_rating_based_sentiment,
    align_ratings_with_sentiment,
    set_log_context,
)
from sentipulse_ai_pipeline.modules.sentiment import run_sentiment_analysis_pipeline

load_dotenv(override=True)
Config.validate()

LEADGEN_DB     = "sentipulseLeadGen"
karachi_tz     = ZoneInfo("Asia/Karachi")
TW             = 64
CHECKPOINT_SIZE = 100


# ── Print helpers ─────────────────────────────────────────────────────────────

def _p(s=""):
    tqdm.write(str(s))

def _rule():
    _p(f"{_DIM}{'═' * TW}{_X}")

def _now():
    return datetime.now(karachi_tz).isoformat()

def to_utc(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


# ── Per-brand pipeline ────────────────────────────────────────────────────────

def run_for_brand(db, brand: str, col_name: str, mongo_client: MongoClient):
    _p(f"\n{_W}{_B}┌──  {brand.upper()}  {_DIM}· source: {col_name}{_X}")
    _p("│")

    set_log_context(brand=brand, platform="google")

    output_col_name = f"{brand}_sentimented_output"
    source_col      = db[col_name]
    output_col      = db[output_col_name]

    source_col.create_index([("review_id", 1)], background=True)
    source_col.create_index([("date", -1)],     background=True)
    output_col.create_index([("review_id", 1)], unique=True, background=True)
    output_col.create_index([("date", -1)],     background=True)

    total_source = source_col.count_documents({})
    if total_source == 0:
        _p(f"│  {_Y}⚠  Empty collection — skipping{_X}")
        _p(f"{_DIM}└{'─' * TW}{_X}\n")
        return

    _p(f"│  Source docs : {_C}{total_source:,}{_X}")

    # Incremental gate — skip review_ids already written to output
    done_ids: set = set(output_col.distinct("review_id"))
    _p(f"│  Already done: {_DIM}{len(done_ids):,}{_X}")

    docs = list(source_col.find({}))
    df   = pd.DataFrame(docs)
    df["date"] = to_utc(df["date"])
    df = df.dropna(subset=["date"])

    if done_ids and "review_id" in df.columns:
        df = df[~df["review_id"].isin(done_ids)]

    if df.empty:
        _p(f"│  {_Y}⏭  No new reviews — skipping{_X}")
        _p(f"{_DIM}└{'─' * TW}{_X}\n")
        save_logs_to_mongodb(LEADGEN_DB, mongo_client)
        return

    # Dedup within the new batch (same review_id)
    before = len(df)
    df = df.drop_duplicates(subset=["review_id"], keep="first")
    df = df.sort_values("date", na_position="last").reset_index(drop=True)
    _p(f"│  New reviews : {_G}{len(df):,}{_X}  {_DIM}({before - len(df)} dupes dropped){_X}")

    # Carry platform/restaurant labels into output docs
    df["sent_platform"]   = "google"
    df["sent_restaurant"] = df["brand_name"].fillna(brand) if "brand_name" in df.columns else brand

    # ── Sentiment chunks ──────────────────────────────────────────────────────
    _p("│")
    _p(f"│  {_DIM}── Sentiment Analysis {'─' * 30}{_X}")

    total   = len(df)
    chunks  = [df.iloc[i : i + CHECKPOINT_SIZE] for i in range(0, total, CHECKPOINT_SIZE)]
    _p(f"│  {len(chunks)} chunk(s)  ×  {CHECKPOINT_SIZE} reviews each")
    _p("│")

    start_t           = time.time()
    total_inserted    = 0
    total_skipped_dup = 0

    for chunk_idx, chunk_df in enumerate(chunks):
        chunk_num   = chunk_idx + 1
        chunk_start = chunk_idx * CHECKPOINT_SIZE + 1
        chunk_end   = min((chunk_idx + 1) * CHECKPOINT_SIZE, total)
        _p(f"│  {_DIM}── Chunk {chunk_num}/{len(chunks)}  (reviews {chunk_start}–{chunk_end}){_X}")

        try:
            chunk_out = run_sentiment_analysis_pipeline(chunk_df.copy(), db_name=LEADGEN_DB)
            chunk_out = apply_rating_based_sentiment(chunk_out)
            chunk_out = align_ratings_with_sentiment(chunk_out)
            chunk_out = chunk_out.dropna(subset=["date"])
            chunk_out = chunk_out.drop(columns=["_id"], errors="ignore")

            records   = chunk_out.fillna("").to_dict("records")
            to_insert = []
            for rec in records:
                rid = rec.get("review_id")
                if rid and rid not in done_ids:
                    to_insert.append(rec)
                    done_ids.add(rid)

            chunk_new = len(to_insert)
            chunk_dup = len(records) - chunk_new
            total_inserted    += chunk_new
            total_skipped_dup += chunk_dup

            if to_insert:
                output_col.insert_many(to_insert, ordered=False)

            dup_note = f"  {_DIM}+{chunk_dup} dups{_X}" if chunk_dup else ""
            _p(f"│    Chunk {chunk_num:>2}/{len(chunks)}  {_G}✓{_X}  {_W}{chunk_new:>4}{_X} inserted{dup_note}")
            save_log_to_buffer(
                f"Chunk {chunk_num}/{len(chunks)}: {chunk_new} inserted, {chunk_dup} skipped", "info"
            )

        except Exception as exc:
            _p(f"│    {_R}✗ Chunk {chunk_num} ERROR ({type(exc).__name__}): {exc}{_X}")
            save_log_to_buffer(f"Chunk {chunk_num} failed: {exc}\n{traceback.format_exc()}", "error")

    elapsed = round(time.time() - start_t, 1)
    _p("│")
    if total_inserted:
        _p(f"│  {_G}✓  {total_inserted:,} inserted  ·  {total_skipped_dup} skipped  ·  {elapsed}s{_X}")
    else:
        _p(f"│  {_Y}⚠  All records already in DB — nothing inserted  ({elapsed}s){_X}")

    _p(f"│  Output → {_C}{LEADGEN_DB}.{output_col_name}{_X}")
    _p(f"{_DIM}└{'─' * TW}{_X}\n")
    save_logs_to_mongodb(LEADGEN_DB, mongo_client)


# ── Entry point ───────────────────────────────────────────────────────────────

def run_pipeline():
    mongo_client = MongoClient(Config.MONGO_URI)
    try:
        db        = mongo_client[LEADGEN_DB]
        run_start = datetime.now(karachi_tz)
        run_id    = str(uuid.uuid4())
        set_log_context(run_id=run_id)

        _rule()
        _p(f"  {_W}{_G}SENTIPULSE LEADGEN PIPELINE{_X}")
        _p(f"  {_DIM}{run_start.strftime('%Y-%m-%d  %H:%M:%S')}  ·  Run: {run_id[:8]}…{_X}")
        _p(f"  {_DIM}DB: {LEADGEN_DB}{_X}")
        _rule()

        all_cols    = db.list_collection_names()
        review_cols = [
            (re.sub(r"_google_reviews$", "", c), c)
            for c in sorted(all_cols)
            if c.endswith("_google_reviews")
        ]

        _p(f"\n  {_C}{len(review_cols)} _google_reviews collection(s) found{_X}")
        for brand, col in review_cols:
            _p(f"    {_DIM}· {col}  →  {brand}_sentimented_output{_X}")

        if not review_cols:
            _p(f"  {_Y}⚠  No *_google_reviews collections in {LEADGEN_DB} — exiting{_X}\n")
            return

        for brand, col_name in review_cols:
            run_for_brand(db, brand, col_name, mongo_client)

        elapsed = round((datetime.now(karachi_tz) - run_start).total_seconds(), 1)
        _rule()
        _p(f"  {_W}{_G}✓  PIPELINE COMPLETE  ·  {len(review_cols)} brand(s)  ·  {elapsed}s{_X}")
        _rule()
        _p("")

    finally:
        mongo_client.close()


if __name__ == "__main__":
    run_pipeline()
