"""Payment flow: choose plan -> choose method -> get instructions -> send proof."""
from __future__ import annotations

import re

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

import config
import db
from content.texts import T
from handlers import keyboards as kb
from handlers.start import norm_lang
from services import notify, payments

router = Router()

PAY_WORDS = re.compile(r"^\s*(оплат\w*|payment|pay|zahlung|bezahlen|купить|приєдн\w*|join)\s*$", re.I)


def _is_pay_word(message: Message) -> bool:
    return bool(message.text and PAY_WORDS.match(message.text))


@router.message(Command("pay"))
@router.message(_is_pay_word)
async def show_plans(message: Message) -> None:
    lang = norm_lang(message.from_user.language_code)
    await db.bump_lead_score(message.from_user.id, 4)
    await message.answer(T("pay_intro", lang), parse_mode="Markdown",
                         reply_markup=kb.plans_kb(lang))


@router.callback_query(F.data.startswith("plan:"))
async def choose_plan(cq: CallbackQuery) -> None:
    lang = norm_lang(cq.from_user.language_code)
    plan_id = cq.data.split(":", 1)[1]
    label = payments.plan_label(plan_id, lang)
    txt = {"ru": f"Выбран тариф: *{label}*. Способ оплаты?",
           "en": f"Plan: *{label}*. Payment method?",
           "de": f"Tarif: *{label}*. Zahlungsart?",
           "uk": f"Тариф: *{label}*. Спосіб оплати?"}.get(lang)
    await cq.message.answer(txt, parse_mode="Markdown", reply_markup=kb.methods_kb(plan_id, lang))
    await cq.answer()


@router.callback_query(F.data.startswith("pm:"))
async def choose_method(cq: CallbackQuery) -> None:
    lang = norm_lang(cq.from_user.language_code)
    _, plan_id, method = cq.data.split(":")
    # deliver instructions
    await cq.message.answer(payments.method_text(method, plan_id, lang),
                            parse_mode="Markdown", disable_web_page_preview=True)
    await cq.message.answer(T("pay_proof_ask", lang))

    # record a pending payment + ping the author
    pid = await db.create_pending_payment(
        cq.from_user.id, plan_id, payments.plan_price(plan_id), "EUR", method)
    await notify.notify_payment(cq.bot, user=cq.from_user, plan=plan_id, method=method, payment_id=pid)
    await db.log_message("out", cq.from_user.id, f"payment instructions {plan_id}/{method}",
                         automation="payment_instructions")
    await cq.answer()


@router.message(F.photo | F.document)
async def receive_proof(message: Message) -> None:
    """A photo/document from a user with a pending payment is treated as proof."""
    lang = norm_lang(message.from_user.language_code)
    pendings = [p for p in await db.pending_payments() if p["telegram_id"] == message.from_user.id]
    if not pendings:
        return  # not in a payment flow — ignore silently
    pay = pendings[-1]
    file_id = message.photo[-1].file_id if message.photo else message.document.file_id
    await db.conn().execute("UPDATE payment SET proof_ref=? WHERE id=?", (file_id, pay["id"]))
    await db.conn().commit()
    await message.answer(T("pay_proof_received", lang))
    await notify.notify_author(
        message.bot,
        f"🧾 Чек по оплате #{pay['id']} ({pay['plan']}/{pay['method']}) получен от "
        f"{message.from_user.full_name} (id {message.from_user.id}).\nПодтвердить: /confirm {pay['id']}",
    )
    if config.ADMIN_IDS:
        try:  # forward the proof to the author
            await message.forward(chat_id=config.ADMIN_IDS[0])
        except Exception:
            pass
