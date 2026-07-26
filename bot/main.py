"""
15minYoga Telegram agent — entry point.

Run from the bot/ directory:
    python -m pip install -r requirements.txt
    cp .env.example .env   # then fill it in
    python main.py
"""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

import config
import db
import handlers
from services import scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("niguma")

COMMANDS = [
    BotCommand(command="start", description="Старт / About"),
    BotCommand(command="menu", description="Меню / Menu"),
    BotCommand(command="pay", description="Оплата / Payment"),
    BotCommand(command="practice", description="Отметить практику / Log practice"),
    BotCommand(command="seed", description="Дневник семян / Seed log"),
    BotCommand(command="coffee", description="Кофейная медитация / Coffee meditation"),
    BotCommand(command="dedicate", description="Посвящение / Dedicate"),
    BotCommand(command="garden", description="Мой сад / My garden"),
    BotCommand(command="invite", description="Пригласить друга / Invite"),
    BotCommand(command="help", description="Помощь / Help"),
]


async def main() -> None:
    missing = config.require("BOT_TOKEN", "ANTHROPIC_API_KEY")
    if missing:
        log.warning("Missing required settings: %s — fill .env before going live.", ", ".join(missing))
    if not config.ADMIN_IDS:
        log.warning("ADMIN_IDS is empty — escalations and /confirm will not reach anyone.")

    await db.init()

    bot = Bot(token=config.BOT_TOKEN, default=DefaultBotProperties(parse_mode=None))
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(handlers.get_router())

    await bot.set_my_commands(COMMANDS)

    sched = scheduler.setup(bot)
    sched.start()
    log.info("Scheduler started with jobs: %s", [j.id for j in sched.get_jobs()])

    try:
        log.info("15minYoga bot polling…")
        await dp.start_polling(bot)
    finally:
        sched.shutdown(wait=False)
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        log.info("Bye 🌿")
