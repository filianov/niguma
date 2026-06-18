"""Escalation & admin notifications to the author."""
from __future__ import annotations

from aiogram import Bot

import config


async def notify_author(bot: Bot, text: str) -> None:
    for admin_id in config.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, text, disable_web_page_preview=True)
        except Exception:
            pass


async def escalate_question(bot: Bot, *, user, question: str, lang: str) -> None:
    uname = f"@{user.username}" if getattr(user, "username", None) else f"id{user.id}"
    name = getattr(user, "full_name", "") or ""
    await notify_author(
        bot,
        f"🆘 Вопрос для вас ({lang}) от {name} {uname}:\n\n«{question}»\n\n"
        f"Ответьте пользователю напрямую в Telegram (id {user.id}) или в Instagram.",
    )


async def notify_payment(bot: Bot, *, user, plan: str, method: str, payment_id: int) -> None:
    uname = f"@{user.username}" if getattr(user, "username", None) else f"id{user.id}"
    await notify_author(
        bot,
        f"💰 Новая оплата на подтверждение #{payment_id}\n"
        f"Участник: {getattr(user,'full_name','')} {uname} (id {user.id})\n"
        f"Тариф: {plan} · способ: {method}\n\n"
        f"Подтвердить: /confirm {payment_id}",
    )
