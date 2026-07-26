"""Gamification commands — the Seed Garden (Сад семян)."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

import config
import db
from content.texts import T
from handlers.start import norm_lang
from services import gamification as g

router = Router()


class Seed(StatesGroup):
    who = State()
    problem = State()


class Dedicate(StatesGroup):
    target = State()


class Coffee(StatesGroup):
    note = State()


JOIN_HINT = {
    "ru": "🌱 Сад семян открывается участникам потока. Напишите «оплата», чтобы присоединиться.",
    "en": "🌱 The Seed Garden opens for group members. Write “payment” to join.",
    "de": "🌱 Der Samen-Garten öffnet sich für Kursteilnehmer. Schreiben Sie „Zahlung“, um beizutreten.",
    "uk": "🌱 Сад насіння відкривається учасникам потоку. Напишіть «оплата», щоб приєднатися.",
}


async def _member_or_hint(message: Message) -> dict | None:
    m = await db.get_member(message.from_user.id)
    if not m:
        await message.answer(JOIN_HINT.get(norm_lang(message.from_user.language_code), JOIN_HINT["ru"]))
    return m


async def _maybe_level_up(message: Message, res: dict, lang: str) -> None:
    if res.get("leveled_up"):
        await message.answer(
            T("g_level_up", lang, level=res["level_name"], meaning=res["level_meaning"]),
            parse_mode="Markdown")


@router.message(Command("practice"))
async def cmd_practice(message: Message) -> None:
    m = await _member_or_hint(message)
    if not m:
        return
    lang = m.get("language", "ru")
    res = await g.log_daily_practice(m)
    if res.get("already"):
        await message.answer("🌱 " + {"ru": "Сегодня уже отмечено. Серия идёт!",
                                       "en": "Already logged today. The streak continues!",
                                       "de": "Heute schon erfasst. Die Serie läuft!",
                                       "uk": "Сьогодні вже відмічено. Серія триває!"}.get(lang, ""))
        return
    await message.answer(T("g_practice_logged", lang, pts=res["points"], streak=res["streak"]))
    await _maybe_level_up(message, res, lang)


@router.message(Command("seed"))
async def cmd_seed(message: Message, state: FSMContext) -> None:
    m = await _member_or_hint(message)
    if not m:
        return
    lang = m.get("language", "ru")
    if not await g.can_log_seed(m):
        await message.answer({"ru": "На сегодня семена записаны 🌱 Возвращайтесь завтра — пусть прорастут.",
                              "en": "Today's seeds are logged 🌱 Come back tomorrow.",
                              "de": "Die heutigen Samen sind erfasst 🌱 Kommen Sie morgen wieder.",
                              "uk": "На сьогодні насіння записано 🌱 Повертайтеся завтра."}.get(lang))
        return
    await message.answer(T("g_seed_who", lang), parse_mode="Markdown")
    await state.set_state(Seed.who)


@router.message(Seed.who)
async def seed_who(message: Message, state: FSMContext) -> None:
    lang = norm_lang(message.from_user.language_code)
    await state.update_data(who=message.text[:200])
    await message.answer(T("g_seed_problem", lang), parse_mode="Markdown")
    await state.set_state(Seed.problem)


@router.message(Seed.problem)
async def seed_problem(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await state.clear()
    m = await db.get_member(message.from_user.id)
    lang = m.get("language", "ru")
    note = f"helped {data.get('who','')}: {message.text[:200]}"
    res = await g.award(m, "seed", note=note)
    await message.answer(T("g_seed_logged", lang, pts=res["points"]))
    await _maybe_level_up(message, res, lang)


@router.message(Command("coffee"))
async def cmd_coffee(message: Message, state: FSMContext) -> None:
    m = await _member_or_hint(message)
    if not m:
        return
    lang = m.get("language", "ru")
    await message.answer(T("g_coffee_intro", lang))
    await state.set_state(Coffee.note)


@router.message(Coffee.note)
async def coffee_note(message: Message, state: FSMContext) -> None:
    await state.clear()
    m = await db.get_member(message.from_user.id)
    lang = m.get("language", "ru")
    res = await g.award(m, "coffee")  # content stays private, not stored verbatim
    await message.answer(T("g_coffee_done", lang, pts=res["points"]))
    await _maybe_level_up(message, res, lang)


@router.message(Command("dedicate"))
async def cmd_dedicate(message: Message, state: FSMContext) -> None:
    m = await _member_or_hint(message)
    if not m:
        return
    lang = m.get("language", "ru")
    await message.answer(T("g_dedicate_ask", lang), parse_mode="Markdown")
    await state.set_state(Dedicate.target)


@router.message(Dedicate.target)
async def dedicate_target(message: Message, state: FSMContext) -> None:
    await state.clear()
    m = await db.get_member(message.from_user.id)
    lang = m.get("language", "ru")
    res = await g.award(m, "dedicate", note=f"dedicated to {message.text[:120]}")
    await message.answer(T("g_dedicate_done", lang, pts=res["points"]))
    await _maybe_level_up(message, res, lang)


@router.message(Command("garden"))
async def cmd_garden(message: Message) -> None:
    m = await _member_or_hint(message)
    if not m:
        return
    lang = m.get("language", "ru")
    seeds = m["seeds"]
    await message.answer(
        T("g_garden", lang, art=g.garden_art(seeds), level=g.level_name(seeds, lang),
          seeds=seeds, streak=m.get("streak", 0), longest=m.get("longest_streak", 0)),
        parse_mode="Markdown")


@router.message(Command("invite"))
async def cmd_invite(message: Message) -> None:
    m = await _member_or_hint(message)
    if not m:
        return
    lang = m.get("language", "ru")
    username = config.SOCIAL.get("telegram", {}).get("botUsername", "yoga15min_bot")
    link = f"https://t.me/{username}?start=ref_{message.from_user.id}"
    await message.answer(T("g_invite", lang, link=link), disable_web_page_preview=True)
