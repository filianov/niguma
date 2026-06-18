"""
Scheduled automation (APScheduler, in-process).

Jobs:
  - daily class reminders   (T-60 and T-10 before the 07:00 weekday practice)
  - weekly deep-session reminder (Saturday)
  - nurture drip pump       (every 15 min, sends due steps)
  - evening coffee nudge    (gamification step 3)
  - weekly cohort broadcast (Monday morning)

All jobs are idempotent and fail-safe: errors are swallowed per-recipient so one
bad chat never breaks the batch. A free external cron (GitHub Actions) can hit a
health endpoint as an independent heartbeat — see docs/INFRASTRUCTURE.md.
"""
from __future__ import annotations

import pytz
from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler

import config
import db
from content.texts import T
from services import funnel


async def _remind_members(bot: Bot, *, weekly: bool, mins: int) -> None:
    link = config.STREAM_LINK_WEEKLY if weekly else config.STREAM_LINK
    key = "remind_weekly" if weekly else "remind_daily"
    cur = await db.conn().execute("SELECT telegram_id, language FROM member WHERE status='active'")
    for tg_id, lang in await cur.fetchall():
        lang = lang or "ru"
        text = T(key, lang, mins=mins, link=link or "—")
        try:
            await bot.send_message(tg_id, text, disable_web_page_preview=True)
            await db.log_message("out", tg_id, text, recipient_type="member",
                                 automation=f"reminder_{'weekly' if weekly else 'daily'}_t{mins}")
        except Exception:
            pass


async def _coffee_nudge(bot: Bot) -> None:
    cur = await db.conn().execute("SELECT telegram_id, language FROM member WHERE status='active'")
    for tg_id, lang in await cur.fetchall():
        lang = lang or "ru"
        try:
            await bot.send_message(tg_id, T("g_coffee_intro", lang))
        except Exception:
            pass


def setup(bot: Bot) -> AsyncIOScheduler:
    tz = pytz.timezone(config.TIMEZONE)
    sched = AsyncIOScheduler(timezone=tz)

    # Daily weekday practice 07:00 -> remind at 06:00 (T-60) and 06:50 (T-10)
    sched.add_job(_remind_members, "cron", day_of_week="mon-fri", hour=6, minute=0,
                  kwargs={"bot": bot, "weekly": False, "mins": 60}, id="daily_t60", replace_existing=True)
    sched.add_job(_remind_members, "cron", day_of_week="mon-fri", hour=6, minute=50,
                  kwargs={"bot": bot, "weekly": False, "mins": 10}, id="daily_t10", replace_existing=True)

    # Weekly deep session Saturday 08:00 -> remind at 07:00
    sched.add_job(_remind_members, "cron", day_of_week="sat", hour=7, minute=0,
                  kwargs={"bot": bot, "weekly": True, "mins": 60}, id="weekly_t60", replace_existing=True)

    # Evening coffee meditation nudge ~21:00
    sched.add_job(_coffee_nudge, "cron", hour=21, minute=0,
                  kwargs={"bot": bot}, id="coffee", replace_existing=True)

    # Nurture drip pump — every 15 minutes
    sched.add_job(funnel.send_due_drip, "interval", minutes=15,
                  kwargs={"bot": bot}, id="drip", replace_existing=True)

    # Weekly cohort broadcast — Monday 10:00
    sched.add_job(funnel.broadcast_new_cohort, "cron", day_of_week="mon", hour=10, minute=0,
                  kwargs={"bot": bot}, id="cohort", replace_existing=True)

    return sched
