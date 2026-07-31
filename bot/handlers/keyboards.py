"""Reusable inline keyboards."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from content.texts import T


def main_menu(lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=T("menu_about", lang), callback_data="m:about")
    b.button(text=T("menu_schedule", lang), callback_data="m:schedule")
    b.button(text=T("menu_price", lang), callback_data="m:price")
    b.button(text=T("menu_trial", lang), callback_data="m:trial")
    b.button(text=T("menu_question", lang), callback_data="m:question")
    b.adjust(2, 2, 1)
    return b.as_markup()


def plans_kb(lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="1 мес · 100 €", callback_data="plan:m1")
    b.button(text="6 мес · 500 €", callback_data="plan:m6")
    b.button(text="12 мес · 900 €", callback_data="plan:m12")
    b.adjust(1)
    return b.as_markup()


def methods_kb(plan_id: str, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="PayPal", callback_data=f"pm:{plan_id}:paypal")
    b.button(text="IBAN (€)", callback_data=f"pm:{plan_id}:iban")
    b.button(text="Карта / Card", callback_data=f"pm:{plan_id}:monobank")
    b.button(text="USDT", callback_data=f"pm:{plan_id}:crypto")
    b.adjust(2, 2)
    return b.as_markup()


def consent_kb(lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=T("consent_yes", lang), callback_data="consent:yes")
    b.button(text=T("consent_no", lang), callback_data="consent:no")
    b.adjust(2)
    return b.as_markup()
