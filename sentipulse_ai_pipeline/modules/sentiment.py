import os
import re
import math
import time
import warnings
import json
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning, module="pymongo")

from tqdm import tqdm
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_groq import ChatGroq
from dotenv import load_dotenv

from sentipulse_ai_pipeline.modules.colors import _G, _R, _Y, _C, _M, _W, _DIM, _X
from sentipulse_ai_pipeline.modules.utils import (
    rescue_blank_sentiments_df_only,
    process_sentiment_batch_safely,
    save_log_to_buffer,
    save_logs_to_mongodb,
    apply_rating_based_sentiment,
    safe_batch_analysis,
    update_dataframe_with_results,
)

load_dotenv(override=True)

# ── LLM setup ─────────────────────────────────────────────────────────────────
llm = ChatGroq(
    model_name=os.getenv("LLM_MODEL_SENTIMENT", "openai/gpt-oss-120b"),
    temperature=0.1,
    max_tokens=8000,
    api_key=os.getenv("GROQ_API_KEY"),
).bind(response_format={"type": "json_object"})


# ── Token helpers ──────────────────────────────────────────────────────────────

def estimate_tokens(text) -> int:
    return int(len(str(text)) / 4)


# ── Prompt ────────────────────────────────────────────────────────────────────

BATCH_TEMPLATE = """⚡ CRITICAL: Begin your response IMMEDIATELY with `{{` — no preamble, no reasoning, no commentary before or after the JSON.

You are a professional language model trained for strict, structured, multilingual aspect-based sentiment analysis of restaurant customer reviews.

🌍 Reviews may contain **Roman Urdu**, **Urdu**, **English**, or a mix. You MUST interpret Roman Urdu and Urdu phrases contextually for accurate sentiment and aspect classification. Use transliteration + context understanding to capture tone, sentiment, and intent accurately.

🧠 Emojis (😊, 😡, 😐, 🤢, ❤️, 💸) MUST be treated as valid indicators of emotion:
- Do NOT ignore emojis — parse and interpret them based on their emotional context.
- Emojis can independently influence sentiment and rating.
- Examples:
  - 🤢 or 😡 → strong negative for "food" or "service"
  - ❤️ or 😍 → strong positive, often general or "ambiance"
  - 💸 → cost concern → negative for "price"
  - 😐 or 😶‍🌫️ → mild dissatisfaction → neutral

🔒 STRICT RULES:
- ❌ Do NOT return explanations, comments, summaries, or anything outside the final JSON array.
- ✅ Output MUST be a clean JSON array of objects — no markdown, no text headers, and no empty lines.
- ⚠️ Output length MUST exactly match number of reviews in input block.
- 🛑 If a review is unclear (e.g., "Aa", "Course", "...."), return the **neutral fallback object** (shown below).
- 🚫 NEVER return "mixed" as sentiment — select **dominant** sentiment or fallback to "neutral".
- 🔁 The `part` field MUST be a direct, **unaltered substring** copied character-for-character from the original review — preserve every typo, emoji, space, punctuation, and Urdu/Roman Urdu character exactly as written.
- 🚫 NEVER use `...` or ellipsis (`…`) in any `part` field — ellipsis means you are skipping middle text, which is forbidden.
- 🚫 NEVER join or concatenate text from different sentences or non-adjacent positions in the review — `part` must be one single continuous unbroken span of characters as it appears in the review.
- 🚫 NEVER correct spelling, fix grammar, translate, or rephrase any `part` — copy it exactly as the reviewer wrote it.
- ✅ If an aspect (e.g. "service") appears in multiple sentences, pick the ONE sentence or phrase that most clearly expresses the sentiment for that aspect — do not combine them.

---

🎯 PER-REVIEW ANALYSIS OBJECTIVES:

1. **Overall Sentiment**:
   - Must be: `"positive"`, `"neutral"`, or `"negative"` (lowercase, no quotes around key).
   - Choose `"neutral"` if uncertain or tone is flat.
   - NEVER use `"mixed"` or `"undefined"`
   - also "good","amazing","excellent", 'Good', 'Nice', these should be classified as positive.

2. **Part**:
   - Extract the **most sentiment-revealing phrase** from the review.
   - Must be **short**, continuous, and copied **character-for-character** from the review (preserve typos, emojis, Urdu/Roman Urdu exactly as written).
   - Avoid full reviews as part — use one decisive keyword or sentence only.
   - NEVER use `...` or join text from different parts of the review.

3. **Aspects**:
   - Valid options: `"food"`, `"service"`, `"ambiance"`, `"price"`, `"others"`
   - "others" only if no other aspect clearly applies.

4. **Aspect Details**:
   - For each aspect:
     - `"part"`: one short, continuous, verbatim phrase copied character-for-character from the review that best indicates that aspect's sentiment — if the aspect appears multiple times, pick the single most sentiment-revealing sentence; NEVER use `...`, NEVER join non-adjacent text
     - `"sentiment"`: one of `"positive"`, `"neutral"`, or `"negative"`
     - `"rating"`: integer (not float) strictly mapped as:
       • positive → 4 or 5
       • neutral → 3
       • negative → 1 or 2
     - ⚠️ `rating` MUST be an integer. Do NOT return decimals or floats (e.g., 4.0 ❌).

5. **Dominant Words**:
   - `positive_words`: 3–7 key positive terms/emojis take them with context (any language)
   - `negative_words`: 3–7 key negative terms/emojis take them with context
   - `neutral_words`: 3–7 neutral/functional/descriptive terms take them with context

6. Fallback for Empty/Vague Reviews:
If the review is unclear, short, or vague, return this default for that review within the results array:
{{
  "overall_sentiment": "neutral",
  "part": "",
  "overall_aspects": ["others"],
  "overall_rating": 3,
  "aspects": {{
    "others": {{
      "part": "",
      "sentiment": "neutral",
      "rating": 3
    }}
  }},
  "positive_words": [],
  "negative_words": [],
  "neutral_words": []
}}

---

📦 FINAL OUTPUT FORMAT (For the entire batch):

{{
  "results": [
    {{
      "overall_sentiment": "positive/neutral/negative",
      "part": "short phrase or emoji from review",
      "overall_aspects": ["food", "service", "price"],
      "overall_rating": 4,
      "aspects": {{
        "food": {{
          "part": "biryani was amazing 😍",
          "sentiment": "positive",
          "rating": 5
        }},
        "price": {{
          "part": "thoda mehnga laga 💸",
          "sentiment": "negative",
          "rating": 2
        }}
      }},
      "positive_words": ["mazedaar", "😍", "crunchy", "loved", "perfect"],
      "negative_words": ["slow service", "💸", "kacha", "overcooked"],
      "neutral_words": ["menu", "restaurant", "karahi", "biryani"]
    }}
  ]
}}

---

📌 Additional Clarifications:
- Roman Urdu Example: `"service bohat slow thi 😐"` → service → negative → rating 2
- Urdu Example: `"کھانے کا ذائقہ بہت عمدہ تھا ❤️"` → food → positive → rating 5
- Short review: `"Good"` → part = `"Good"` → overall_sentiment = "positive"
- Too short: `"Aa"` → neutral fallback

---

📥 Now analyze the following reviews and return ONLY a clean JSON object containing a "results" array. No markdown, no explanation, and no extra text. Ensure you output valid JSON.

⚡ Your response MUST start with `{{` and end with `}}`. Output nothing else.

{reviews_block}
"""

prompt = PromptTemplate.from_template(BATCH_TEMPLATE)
chain  = ({"reviews_block": RunnablePassthrough()} | prompt | llm | StrOutputParser())


# ── Analysis helpers ──────────────────────────────────────────────────────────

def _is_gibberish(text: str) -> bool:
    """True when a review has fewer than 2 meaningful characters (letters, digits, non-ASCII)."""
    return sum(1 for ch in text if ch.isalpha() or ch.isdigit() or ord(ch) > 127) < 2


def prepare_reviews_batch(review_texts: list) -> list[str]:
    cleaned = []
    for text in review_texts:
        if pd.isna(text) or not str(text).strip():
            cleaned.append("")
        else:
            t = str(text).strip()
            cleaned.append("" if _is_gibberish(t) else t)
    return cleaned


def _extract_all_json_blocks(text: str) -> list[str]:
    """Return every balanced { … } block found in text (strips reasoning preamble)."""
    blocks = []
    pos = 0
    while pos < len(text):
        start = text.find("{", pos)
        if start == -1:
            break
        depth = 0
        in_string = False
        escape_next = False
        end = -1
        for i, ch in enumerate(text[start:], start):
            if escape_next:
                escape_next = False
                continue
            if ch == "\\" and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end != -1:
            blocks.append(text[start:end])
            pos = end
        else:
            blocks.append(text[start:])
            break
    return blocks or [text]


def parse_llm_output(output: str, expected_count: int) -> list:
    output = re.sub(r"```(?:json)?\s*", "", output)
    output = re.sub(r"```\s*$", "", output).strip()

    # Try every JSON block in the output; pick the first that parses with the
    # right count, or the one whose count is closest to expected_count.
    # "Closest" avoids picking a spurious large block (e.g. 93 items) over a
    # legitimate partial block (e.g. 3 items) when expected_count is 5.
    blocks = _extract_all_json_blocks(output)
    best_results: list | None = None
    last_error: Exception | None = None

    for block in blocks:
        try:
            parsed = json.loads(block)
        except json.JSONDecodeError as e:
            last_error = e
            continue

        if isinstance(parsed, dict) and "results" in parsed:
            candidates = parsed["results"]
        elif isinstance(parsed, list):
            candidates = parsed
        elif isinstance(parsed, dict) and expected_count == 1:
            candidates = [parsed]
        else:
            continue

        if not isinstance(candidates, list):
            continue

        if len(candidates) == expected_count:
            return candidates

        if best_results is None or (
            abs(len(candidates) - expected_count) < abs(len(best_results) - expected_count)
        ):
            best_results = candidates

    if best_results is not None:
        raise ValueError(
            f"Partial truncation: expected {expected_count} results, got {len(best_results)}."
        )

    raise ValueError(f"JSON parse error: {last_error}")


_NEUTRAL_FALLBACK = {
    "overall_sentiment": "neutral",
    "part": "",
    "overall_aspects": ["others"],
    "overall_rating": 3,
    "aspects": {"others": {"part": "", "sentiment": "neutral", "rating": 3}},
    "positive_words": [],
    "negative_words": [],
    "neutral_words": [],
}


def analyze_reviews_batch(review_texts: list, max_retries: int = 5) -> list:
    """Send a batch to the LLM with exponential-backoff retry.

    On exhausted retries the batch is split into single-review calls.
    If a single review also fails it receives the neutral fallback.
    """
    review_texts   = prepare_reviews_batch(review_texts)
    expected_count = len(review_texts)

    # All-empty batch — skip LLM entirely
    if all(t in ("", "None") for t in review_texts):
        tqdm.write(f"{_Y}⚠️ Batch of {expected_count} is all empty — returning fallbacks{_X}")
        return [dict(_NEUTRAL_FALLBACK) for _ in review_texts]

    for attempt in range(max_retries):
        try:
            reviews_str = "\n".join(f"Review {i+1}: {t}" for i, t in enumerate(review_texts))
            output      = chain.invoke(reviews_str)

            if not output or not output.strip():
                raise ValueError("Empty LLM output string.")

            return parse_llm_output(output, expected_count)

        except Exception as e:
            error_msg = str(e)
            is_503              = "503" in error_msg or "over capacity" in error_msg.lower()
            is_json_val_failed  = "json_validate_failed" in error_msg or "Failed to generate JSON" in error_msg
            wait_time           = 2 ** attempt

            # json_validate_failed is deterministic for a batch — retrying the same
            # reviews will produce the same malformed output.  Skip retries and go
            # straight to single-review fallback to avoid wasting 31 s.
            if is_json_val_failed and expected_count > 1:
                tqdm.write(f"{_Y}  ⚡ json_validate_failed — splitting batch of {expected_count} to singles immediately{_X}")
                save_log_to_buffer(f"json_validate_failed: splitting batch of {expected_count} to singles.", "warning")
                results = []
                for single in review_texts:
                    results.extend(analyze_reviews_batch([single], max_retries=2))
                return results

            if attempt < max_retries - 1:
                label = "503 API over capacity" if is_503 else f"parse error: {e}"
                tqdm.write(f"{_Y}  ⏳ Retry {attempt+1}/{max_retries} in {wait_time}s — {label}{_X}")
                save_log_to_buffer(f"Retrying batch (attempt {attempt+1}/{max_retries}): {e}", "warning")
                time.sleep(wait_time)
            else:
                # Retries exhausted — split down to singles
                if expected_count > 1:
                    tqdm.write(f"{_Y}  ⚠ Retries exhausted — splitting batch of {expected_count} into singles{_X}")
                    save_log_to_buffer(f"Splitting batch of {expected_count} due to persistent errors.", "warning")
                    results = []
                    for single in review_texts:
                        results.extend(analyze_reviews_batch([single], max_retries=2))
                    return results
                else:
                    tqdm.write(f"{_R}  ✗ Max retries on single review — returning neutral fallback{_X}")
                    save_log_to_buffer(f"Fallback to neutral. Error: {e}", "error")
                    return [dict(_NEUTRAL_FALLBACK)]

    return [dict(_NEUTRAL_FALLBACK) for _ in review_texts]


# ── Pipeline entry ─────────────────────────────────────────────────────────────

def run_sentiment_analysis_pipeline(df: pd.DataFrame, db_name: str = None, sample_size: int = None) -> pd.DataFrame:
    # Only send non-empty, non-None reviews to the LLM
    llm_mask = (
        df["text"].astype(str).str.strip() != ""
    ) & (
        df["text"].astype(str).str.strip().str.lower() != "none"
    )
    llm_df = df[llm_mask].copy()

    if sample_size:
        llm_df = llm_df.sample(min(sample_size, len(llm_df))).reset_index(drop=True)
        save_log_to_buffer(f"Sampled {len(llm_df)} reviews for LLM analysis", "info")
        tqdm.write(f"  Sampled {len(llm_df)} reviews for LLM analysis")
    else:
        save_log_to_buffer(f"Processing {len(llm_df)} valid reviews through LLM", "info")
        tqdm.write(f"  {_M}🧠 Processing {len(llm_df)} valid reviews through LLM{_X}")

    # Initialise all sentiment columns on the full dataframe
    df["sent_sentiment"]    = ""
    df["sent_part"]         = ""
    df["sent_aspects"]      = None
    df["sent_ratings"]      = 0.0
    df["sent_positive_words"] = None
    df["sent_negative_words"] = None
    df["sent_neutral_words"]  = None

    for cat in ["food", "ambiance", "price", "service", "others"]:
        df[f"sent_{cat}"]           = 0
        df[f"sent_{cat}_sentiment"] = ""
        df[f"sent_{cat}_rating"]    = 0.0
        df[f"sent_{cat}_part"]      = ""

    if llm_df.empty:
        tqdm.write(f"{_Y}  ⚠ No reviews require LLM (all empty/None) — skipping{_X}")
        return df

    # Dedup: process unique texts only to save LLM tokens
    unique_texts  = llm_df["text"].unique().tolist()
    tqdm.write(f"  {_C}Token dedup: {len(unique_texts)} unique  (from {len(llm_df)} total){_X}")

    batch_size        = 3  # reduced 5→3: gpt-oss-120b has ~8k ctx; prompt ~2k, leaving ~6k for output — 5 reviews can overflow
    all_unique_batches = [unique_texts[i:i+batch_size] for i in range(0, len(unique_texts), batch_size)]
    total_batches     = len(all_unique_batches)
    text_to_result:   dict[str, dict] = {}

    batch_bar = tqdm(
        enumerate(all_unique_batches),
        total=total_batches,
        desc=f"{_M}🧠 LLM Sentiment{_X}",
        unit="batch",
        colour="magenta",
        dynamic_ncols=True,
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} batches  [{elapsed}<{remaining}]",
    )

    for batch_idx, batch_texts in batch_bar:
        batch_number = batch_idx + 1
        total_tokens = sum(estimate_tokens(t) for t in batch_texts)

        if total_tokens > 1500:
            tqdm.write(f"{_Y}  ⚠ Batch {batch_number} large ({total_tokens} tok) — splitting{_X}")
            sub_batches = [batch_texts[i:i+2] for i in range(0, len(batch_texts), 2)]
            for sub_idx, sub_batch in enumerate(sub_batches):
                sub_label = f"{batch_number}{chr(65 + sub_idx)}"
                res = safe_batch_analysis(
                    analyze_fn=analyze_reviews_batch,
                    batch_reviews=sub_batch,
                    batch_indices=list(range(len(sub_batch))),
                    batch_number=sub_label,
                    total_batches=total_batches,
                )
                if res:
                    for text, r in zip(sub_batch, res):
                        text_to_result[text] = r
                else:
                    tqdm.write(f"{_R}  ✗ Sub-batch {sub_label} failed{_X}")
        else:
            results = safe_batch_analysis(
                analyze_fn=analyze_reviews_batch,
                batch_reviews=batch_texts,
                batch_indices=list(range(len(batch_texts))),
                batch_number=batch_number,
                total_batches=total_batches,
            )
            if results:
                for text, res in zip(batch_texts, results):
                    text_to_result[text] = res
            else:
                tqdm.write(f"{_R}  ✗ Batch {batch_number}/{total_batches} failed{_X}")

    # Map results back to every row (including duplicates)
    tqdm.write(f"  {_C}Mapping results back to all reviews…{_X}")
    all_results      = []
    aligned_indices  = []
    aligned_reviews  = []

    for idx, row in llm_df.iterrows():
        text = row["text"]
        if text in text_to_result:
            all_results.append(text_to_result[text])
            aligned_indices.append(idx)
            aligned_reviews.append(text)

    if all_results:
        update_dataframe_with_results(df, aligned_indices, all_results, aligned_reviews, "Final Merge")

    save_log_to_buffer("Sentiment analysis complete", "info")
    tqdm.write(f"  {_G}✓ Sentiment analysis complete{_X}")

    # Rescue any rows that still have blank sentiment
    df = rescue_blank_sentiments_df_only(df, analyze_fn=analyze_reviews_batch)

    return df
