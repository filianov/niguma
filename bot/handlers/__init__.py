"""Aggregate all routers into one for the dispatcher."""
from aiogram import Router

from handlers import admin, pay, practice, start, support


def get_router() -> Router:
    root = Router()
    # order matters: specific commands first, free-text support last
    root.include_router(start.router)
    root.include_router(practice.router)
    root.include_router(pay.router)
    root.include_router(admin.router)
    root.include_router(support.router)  # catch-all free text -> AI
    return root
