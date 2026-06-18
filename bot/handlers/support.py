"""Catch-all: free text -> Claude support/sales agent, with escalation."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

import config
import db
from content.texts import T
from handlers.start import norm_lang
from services import ai, notify

router = Router()


@router.message(F.text & ~F.text.startswith("/"))
async def on_text(message: Message) -> None:
    user = message.from_user
    lang = norm_lang(user.language_code)
    member = await db.get_member(user.id)
    lead = await db.get_lead(user.id)
    if member:
        lang = member.get("language", lang)
    elif lead:
        lang = lead.get("language", lang)

    await db.log_message("in", user.id, message.text,
                         recipient_type="member" if member else "lead", automation="support")

    await message.bot.send_chat_action(message.chat.id, "typing")

    # warmer leads / members get the smarter model for nuanced answers
    smart = bool((lead and (lead.get("lead_score", 0) or 0) >= 6) or member)
    res = await ai.answer(message.text, lang=lang, smart=smart)

    answer = (res.get("answer") or "").strip()
    confidence = res.get("confidence", 0.0)
    needs_human = res.get("needs_human", False)

    # update lead score from buying-intent signal
    delta = int(res.get("lead_score_delta", 0) or 0)
    if delta and lead:
        await db.bump_lead_score(user.id, delta)

    escalate = needs_human or confidence < config.AI_ESCALATE_THRESHOLD or not answer

    if answer:
        await message.answer(answer, disable_web_page_preview=True)
    if escalate:
        ig = config.INSTAGRAM_DM
        await message.answer(T("support_escalated", lang, ig=ig), disable_web_page_preview=True)
        await notify.escalate_question(message.bot, user=user, question=message.text, lang=lang)

    await db.log_message("out", user.id, answer or "[escalated]",
                         recipient_type="member" if member else "lead",
                         automation="support", intent=res.get("intent", ""),
                         confidence=confidence, escalated=escalate)
