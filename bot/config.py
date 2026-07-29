"""
Central config for the 15minYoga Telegram agent.

Loads:
  - environment variables (.env)            -> secrets & deploy-specific values
  - ../config/project.config.json           -> shared product config (schedule,
                                               pricing, socials) used by BOTH the
                                               landing and the bot (single source
                                               of truth).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BOT_DIR = Path(__file__).resolve().parent
ROOT_DIR = BOT_DIR.parent
PROJECT_CONFIG_PATH = ROOT_DIR / "config" / "project.config.json"


def _load_project_config() -> dict:
    try:
        with open(PROJECT_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


PROJECT = _load_project_config()


def _ids(raw: str) -> list[int]:
    out = []
    for part in (raw or "").split(","):
        part = part.strip()
        if part.isdigit():
            out.append(int(part))
    return out


# --- Telegram ---
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_IDS = _ids(os.getenv("ADMIN_IDS", ""))
MEMBERS_CHANNEL_ID = os.getenv("MEMBERS_CHANNEL_ID", "")

# --- Claude ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL_FAST = os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5")
CLAUDE_MODEL_SMART = os.getenv("CLAUDE_MODEL_SMART", "claude-sonnet-5")
AI_ESCALATE_THRESHOLD = float(os.getenv("AI_ESCALATE_THRESHOLD", "0.55"))

# --- Class links ---
STREAM_LINK = os.getenv("STREAM_LINK", "")
STREAM_LINK_WEEKLY = os.getenv("STREAM_LINK_WEEKLY", "")

# --- Payments (manual) ---
EUR_IBAN = os.getenv("EUR_IBAN", "")
EUR_BENEFICIARY = os.getenv("EUR_BENEFICIARY", "")
EUR_BIC = os.getenv("EUR_BIC", "")
EUR_BANK = os.getenv("EUR_BANK", "")
MONOBANK_JAR = os.getenv("MONOBANK_JAR", "")
MONOBANK_CARD = os.getenv("MONOBANK_CARD", "")
PAYPAL_ME = os.getenv("PAYPAL_ME", "")

# --- Payments (automated) ---
PAY_LINKS = {
    "m1": os.getenv("PAY_LINK_M1", ""),
    "m6": os.getenv("PAY_LINK_M6", ""),
    "m12": os.getenv("PAY_LINK_M12", ""),
}

# --- Storage / misc ---
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BOT_DIR / "niguma.db"))
TIMEZONE = os.getenv("TIMEZONE", PROJECT.get("schedule", {}).get("timezone", "Europe/Berlin"))
DEFAULT_LOCALE = os.getenv("DEFAULT_LOCALE", PROJECT.get("brand", {}).get("defaultLocale", "ru"))
LOCALES = PROJECT.get("brand", {}).get("locales", ["ru", "en", "de", "uk"])

# --- Email ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "15minyoga.com@gmail.com")

# --- Derived shortcuts from project config ---
PRICING = PROJECT.get("pricing", {})
SCHEDULE = PROJECT.get("schedule", {})
SOCIAL = PROJECT.get("social", {})
SUPPORT = PROJECT.get("support", {})
FUNNEL = PROJECT.get("funnel", {})
BRAND = PROJECT.get("brand", {})

INSTAGRAM_DM = SUPPORT.get("instagramDM", "https://ig.me/m/15minyoga")


def require(*names: str) -> list[str]:
    """Return the list of required settings that are still empty."""
    missing = []
    for n in names:
        if not globals().get(n):
            missing.append(n)
    return missing
