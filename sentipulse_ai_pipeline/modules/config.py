import os
from dotenv import load_dotenv

load_dotenv(override=True)


class Config:

    # ── Central database (holds clients & platform lists) ──────────────────
    CENTRAL_DB_NAME: str = os.getenv("SENTIPULSE_DB_NAME", "sentipulse")

    # ── Collection names inside the central DB ─────────────────────────────
    CLIENTS_COLLECTION: str = os.getenv("CLIENTS_COLLECTION", "sentipulse_clients")
    PLATFORMS_COLLECTION: str = os.getenv("PLATFORMS_COLLECTION", "sentipulse_platform")

    # ── Product / branding ─────────────────────────────────────────────────
    PRODUCT_NAME: str = os.getenv("PRODUCT_NAME", "Sentipulse")
    OPERATOR_NAME: str = os.getenv("OPERATOR_NAME", "Nexalyze")
    OPERATOR_WEBSITE: str = os.getenv("OPERATOR_WEBSITE", "nexalyze.com")
    BOT_NAME: str = os.getenv("BOT_NAME", "NEXALYZE BOT")
    EMAIL_SALUTATION: str = os.getenv("EMAIL_SALUTATION", "Nexalyze Team")

    # ── Infrastructure ─────────────────────────────────────────────────────
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    APIFY_TOKEN: str = os.getenv("APIFY_TOKEN", "")

    # ── LLM models ─────────────────────────────────────────────────────────
    LLM_MODEL_SENTIMENT: str = os.getenv("LLM_MODEL_SENTIMENT", "openai/gpt-oss-120b")
    LLM_MODEL_CLUSTERING: str = os.getenv("LLM_MODEL_CLUSTERING", "meta-llama/llama-4-scout-17b-16e-instruct")

    # ── Email / SMTP ───────────────────────────────────────────────────────
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    EMAIL_USER: str = os.getenv("EMAIL_USER", "notifications@sentipulse.ai")
    EMAIL_PASS: str = os.getenv("EMAIL_PASS", "")
    EMAIL_RECIPIENT: str = os.getenv("EMAIL_RECIPIENT", "")

    @classmethod
    def validate(cls):
        if not cls.GROQ_API_KEY:
            raise ValueError("Missing GROQ_API_KEY in .env")
