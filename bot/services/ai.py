"""
Claude-powered support/sales agent.

- Loads the knowledge base into a cached system prompt.
- Returns a structured reply: answer text, intent, confidence, and whether to
  escalate to the author (low confidence or sensitive topic).
- Cheap Haiku for ordinary support; Sonnet for nuanced sales/objections.
"""
from __future__ import annotations

import json
from pathlib import Path

from anthropic import AsyncAnthropic

import config

_client: AsyncAnthropic | None = None

_KB_PATH = Path(__file__).resolve().parent.parent / "content" / "knowledge_ru.md"
try:
    KNOWLEDGE = _KB_PATH.read_text(encoding="utf-8")
except FileNotFoundError:
    KNOWLEDGE = ""

LANG_NAMES = {"ru": "Russian", "en": "English", "de": "German", "uk": "Ukrainian"}

SYSTEM = (
    "You are the 15minYoga Telegram assistant. Use ONLY the knowledge base below for facts "
    "(prices, schedule, payment, format). Never invent prices, links, bank details or class "
    "times. Be warm, calm, concise, never pushy. Never give medical advice. "
    "Reply in the user's language.\n\n"
    "When the question is sensitive (health, injuries, pregnancy, refunds, personal/spiritual "
    "doubts), or you are not confident the knowledge base answers it, set needs_human=true and "
    "keep your answer short and kind.\n\n"
    "=== KNOWLEDGE BASE ===\n" + KNOWLEDGE
)

REPLY_TOOL = {
    "name": "reply",
    "description": "Produce the assistant's reply with metadata.",
    "input_schema": {
        "type": "object",
        "properties": {
            "answer": {"type": "string", "description": "The message to send to the user, in their language."},
            "intent": {
                "type": "string",
                "enum": ["pricing", "schedule", "trial", "payment", "about", "philosophy",
                         "health", "support", "objection", "smalltalk", "other"],
            },
            "confidence": {"type": "number", "description": "0..1 confidence that the answer is correct & complete."},
            "needs_human": {"type": "boolean", "description": "true if the author should personally follow up."},
            "lead_score_delta": {"type": "integer", "description": "0-5 buying-intent signal from this message."},
        },
        "required": ["answer", "intent", "confidence", "needs_human"],
    },
}


def client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


async def answer(user_text: str, lang: str = "ru", history: list[dict] | None = None,
                 smart: bool = False) -> dict:
    """Return {answer, intent, confidence, needs_human, lead_score_delta}."""
    model = config.CLAUDE_MODEL_SMART if smart else config.CLAUDE_MODEL_FAST
    messages = list(history or [])
    messages.append({"role": "user", "content": user_text})

    try:
        resp = await client().messages.create(
            model=model,
            max_tokens=700,
            system=[{
                "type": "text",
                "text": SYSTEM,
                "cache_control": {"type": "ephemeral"},  # cache the big KB across calls
            }],
            tools=[REPLY_TOOL],
            tool_choice={"type": "tool", "name": "reply"},
            messages=messages,
        )
        for block in resp.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "reply":
                data = block.input
                data.setdefault("confidence", 0.5)
                data.setdefault("needs_human", False)
                data.setdefault("intent", "other")
                data.setdefault("lead_score_delta", 0)
                # force escalation on sensitive intents
                if data["intent"] == "health":
                    data["needs_human"] = True
                return data
    except Exception as e:  # network / API error → safe fallback
        return {
            "answer": "",
            "intent": "other",
            "confidence": 0.0,
            "needs_human": True,
            "lead_score_delta": 0,
            "error": str(e),
        }

    return {"answer": "", "intent": "other", "confidence": 0.0, "needs_human": True, "lead_score_delta": 0}
