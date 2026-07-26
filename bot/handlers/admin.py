"""Author-only commands: confirm payments, broadcast, stats."""
from __future__ import annotations

import datetime as dt

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandObject
from aiogram.types import Message

import config
import db
from content.texts import T
from services import funnel, payments

router = Router()


def is_admin(uid: int) -> bool:
    return uid in config.ADMIN_IDS


@router.message(Command("confirm"))
async def cmd_confirm(message: Message, command: CommandObject, bot: Bot) -> None:
    if not is_admin(message.from_user.id):
        return
    if not command.args or not command.args.strip().isdigit():
        await message.answer("Использование: /confirm <payment_id>")
        return
    pid = int(command.args.strip())
    pay = await db.confirm_payment(pid, message.from_user.id)
    if not pay:
        await message.answer(f"Платёж #{pid} не найден.")
        return

    tg_id = pay["telegram_id"]
    lang = "ru"

    # promote lead -> member (or create member directly)
    lead = await db.get_lead(tg_id)
    member = await db.get_member(tg_id)
    if member is None and lead is not None:
        member = await db.create_member_from_lead(lead)
        lang = lead.get("language", "ru")
    elif member is None:
        await db.conn().execute(
            "INSERT OR IGNORE INTO member (telegram_id, status, joined_at) VALUES (?, 'active', ?)",
            (tg_id, dt.datetime.now(dt.timezone.utc).isoformat()))
        await db.conn().commit()
        member = await db.get_member(tg_id)
    else:
        lang = member.get("language", "ru")
        await db.update_member(tg_id, status="active")

    # open an active subscription
    plan = payments.PLAN_BY_ID.get(pay["plan"], {})
    months = plan.get("months", 1)
    start = dt.date.today()
    end = start + dt.timedelta(days=30 * months)
    await db.conn().execute(
        "INSERT INTO subscription (member_id, plan, status, start_date, end_date, price, currency, "
        "payment_method, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (member["id"], pay["plan"], "active", start.isoformat(), end.isoformat(),
         pay["amount"], pay["currency"], pay["method"], dt.datetime.now(dt.timezone.utc).isoformat()))
    await db.conn().execute("UPDATE payment SET subscription_id=(SELECT MAX(id) FROM subscription), member_id=? WHERE id=?",
                            (member["id"], pid))
    await db.conn().commit()

    # tell the member
    try:
        await bot.send_message(tg_id, T("pay_confirmed", lang))
    except Exception:
        pass
    await message.answer(f"✅ Платёж #{pid} подтверждён. Участник активирован до {end.isoformat()}.")


@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    if not is_admin(message.from_user.id):
        return
    s = await db.stats()
    await message.answer(
        "📊 *15minYoga — статистика*\n"
        f"Лиды: {s['leads']} (в воронке {s['nurturing']})\n"
        f"Активные участники: {s['members_active']}\n"
        f"Оплаты: ожидают {s['pending_payments']}, подтверждено {s['confirmed_payments']}\n"
        f"Выручка (EUR, подтв.): {int(s['revenue_eur'])} €",
        parse_mode="Markdown")


@router.message(Command("pending"))
async def cmd_pending(message: Message) -> None:
    if not is_admin(message.from_user.id):
        return
    rows = await db.pending_payments()
    if not rows:
        await message.answer("Нет ожидающих оплат.")
        return
    lines = [f"#{p['id']} · id{p['telegram_id']} · {p['plan']}/{p['method']} · {int(p['amount'])}€"
             for p in rows]
    await message.answer("⏳ Ожидают подтверждения:\n" + "\n".join(lines) +
                         "\n\nПодтвердить: /confirm <id>")


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, bot: Bot) -> None:
    if not is_admin(message.from_user.id):
        return
    n = await funnel.broadcast_new_cohort(bot)
    await message.answer(f"📣 Анонс нового потока отправлен: {n} получателей.")


@router.message(Command("say"))
async def cmd_say(message: Message, command: CommandObject, bot: Bot) -> None:
    """/say <telegram_id> <text> — reply to a user personally as the bot."""
    if not is_admin(message.from_user.id):
        return
    if not command.args:
        await message.answer("Использование: /say <telegram_id> <текст>")
        return
    parts = command.args.split(maxsplit=1)
    if len(parts) < 2 or not parts[0].isdigit():
        await message.answer("Использование: /say <telegram_id> <текст>")
        return
    try:
        await bot.send_message(int(parts[0]), parts[1])
        await message.answer("✅ Отправлено.")
    except Exception as e:
        await message.answer(f"Не удалось отправить: {e}")
