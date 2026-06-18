"""Onboarding: /start (with deep-link source), lead qualifier, consent, menu."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

import config
import db
from content.texts import T
from handlers import keyboards as kb
from services import funnel

router = Router()


class Onboard(StatesGroup):
    goal = State()
    experience = State()


def norm_lang(code: str | None) -> str:
    code = (code or "").split("-")[0].lower()
    return code if code in config.LOCALES else config.DEFAULT_LOCALE


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject, state: FSMContext) -> None:
    await state.clear()
    u = message.from_user
    lang = norm_lang(u.language_code)
    source = (command.args or "lead_landing").strip()[:64]

    await db.upsert_lead(
        u.id, username=u.username, first_name=u.first_name, language=lang,
        source=source, status="new",
    )
    await db.log_message("in", u.id, f"/start {source}", automation="start")

    await message.answer(T("welcome", lang), parse_mode="Markdown",
                         reply_markup=kb.main_menu(lang))
    # begin qualifier
    await message.answer(T("ask_goal", lang), parse_mode="Markdown")
    await state.set_state(Onboard.goal)


@router.message(Onboard.goal)
async def q_goal(message: Message, state: FSMContext) -> None:
    lang = norm_lang(message.from_user.language_code)
    await db.upsert_lead(message.from_user.id, goal=message.text[:300])
    await db.bump_lead_score(message.from_user.id, 2)
    await message.answer(T("ask_experience", lang), parse_mode="Markdown")
    await state.set_state(Onboard.experience)


@router.message(Onboard.experience)
async def q_experience(message: Message, state: FSMContext) -> None:
    lang = norm_lang(message.from_user.language_code)
    await db.upsert_lead(message.from_user.id, experience=message.text[:200])
    await state.clear()
    await message.answer(T("qualifier_done", lang))
    # start nurture drip + ask consent
    await funnel.start_drip(message.from_user.id)
    await message.answer(T("consent_ask", lang), reply_markup=kb.consent_kb(lang))


# ---------------- consent ----------------
@router.callback_query(F.data.startswith("consent:"))
async def on_consent(cq: CallbackQuery) -> None:
    import datetime as dt
    lang = norm_lang(cq.from_user.language_code)
    yes = cq.data.endswith("yes")
    await db.upsert_lead(cq.from_user.id, consent_marketing=1 if yes else 0,
                         consent_ts=dt.datetime.now(dt.timezone.utc).isoformat())
    if yes:
        await cq.message.answer(T("consent_thanks", lang))
    await cq.answer()


# ---------------- menu ----------------
@router.callback_query(F.data.startswith("m:"))
async def on_menu(cq: CallbackQuery, state: FSMContext) -> None:
    lang = norm_lang(cq.from_user.language_code)
    what = cq.data.split(":", 1)[1]

    if what == "about":
        await cq.message.answer(
            T("welcome", lang).split("\n\n", 1)[-1] if "\n\n" in T("welcome", lang) else T("welcome", lang),
            parse_mode="Markdown")
    elif what == "schedule":
        txt = {
            "ru": "🗓 *Расписание*\nБудни 7:00–7:15 — ежедневная практика (15 мин).\nРаз в неделю — глубокая часовая практика.\nЗаписи доступны участникам.",
            "en": "🗓 *Schedule*\nWeekdays 7:00–7:15 — daily practice (15 min).\nOnce a week — a deep one-hour session.\nRecordings available to participants.",
            "de": "🗓 *Zeitplan*\nWerktags 7:00–7:15 — tägliche Praxis (15 Min).\nEinmal pro Woche — vertiefende Stunde.\nAufzeichnungen verfügbar.",
            "uk": "🗓 *Розклад*\nБудні 7:00–7:15 — щоденна практика (15 хв).\nРаз на тиждень — глибока годинна практика.\nЗаписи доступні учасникам.",
        }.get(lang)
        await cq.message.answer(txt, parse_mode="Markdown")
    elif what == "price":
        await cq.message.answer(T("pay_intro", lang), parse_mode="Markdown",
                                reply_markup=kb.plans_kb(lang))
    elif what == "trial":
        txt = {
            "ru": "🎟 Приходите на бесплатное пробное занятие — ближайший будний день в 7:00. Напишите «да», и я пришлю детали и ссылку.",
            "en": "🎟 Join a free trial — the next weekday at 7:00. Reply “yes” and I'll send details and the link.",
            "de": "🎟 Kommen Sie zur kostenlosen Probestunde — nächster Werktag um 7:00. Antworten Sie „ja“.",
            "uk": "🎟 Приходьте на безкоштовне пробне заняття — найближчий будній день о 7:00. Напишіть «так».",
        }.get(lang)
        await cq.message.answer(txt)
        await db.bump_lead_score(cq.from_user.id, 3)
    elif what == "question":
        txt = {
            "ru": "Спрашивайте — отвечу о практике, расписании, оплате и философии 🌿",
            "en": "Ask away — I'll answer about practice, schedule, payment and philosophy 🌿",
            "de": "Fragen Sie — ich antworte zu Praxis, Zeitplan, Zahlung und Philosophie 🌿",
            "uk": "Питайте — відповім про практику, розклад, оплату та філософію 🌿",
        }.get(lang)
        await cq.message.answer(txt)
    await cq.answer()


@router.message(F.text.in_({"/menu", "/help"}))
async def cmd_menu(message: Message) -> None:
    lang = norm_lang(message.from_user.language_code)
    await message.answer(T("welcome", lang), parse_mode="Markdown",
                         reply_markup=kb.main_menu(lang))
