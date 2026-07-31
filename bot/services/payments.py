"""
Payment flow (hybrid):
  - automated: PayPal / Stripe payment links (if configured) -> user pays, sends proof
  - manual:    EUR IBAN transfer + Monobank (UAH) -> details delivered privately by the bot

The bot never moves money. It delivers instructions, records a pending payment, and
pings the author to confirm. On confirmation the member is activated.
"""
from __future__ import annotations

import config

PLAN_BY_ID = {p["id"]: p for p in config.PRICING.get("plans", [])}


def plan_price(plan_id: str) -> float:
    p = PLAN_BY_ID.get(plan_id)
    return float(p["price"]) if p else 0.0


def plan_label(plan_id: str, lang: str = "ru") -> str:
    p = PLAN_BY_ID.get(plan_id)
    if not p:
        return plan_id
    return p["label"].get(lang) or p["label"].get("ru") or plan_id


HEADERS = {
    "paypal":   {"ru": "💳 PayPal", "en": "💳 PayPal", "de": "💳 PayPal", "uk": "💳 PayPal"},
    "stripe":   {"ru": "💳 Картой (Stripe)", "en": "💳 Card (Stripe)", "de": "💳 Karte (Stripe)", "uk": "💳 Карткою (Stripe)"},
    "iban":     {"ru": "🏦 Перевод на евро-счёт (IBAN)", "en": "🏦 Bank transfer (IBAN)",
                 "de": "🏦 Überweisung (IBAN)", "uk": "🏦 Переказ на євро-рахунок (IBAN)"},
    "monobank": {"ru": "💳 Перевод на карту", "en": "💳 Card transfer",
                 "de": "💳 Kartenüberweisung", "uk": "💳 Переказ на картку"},
    "crypto":   {"ru": "🪙 Криптовалютой (USDT)", "en": "🪙 Cryptocurrency (USDT)",
                 "de": "🪙 Kryptowährung (USDT)", "uk": "🪙 Криптовалютою (USDT)"},
}

NOT_CONFIGURED = {
    "ru": "Этот способ ещё настраивается. Напишите автору в Instagram — подскажем альтернативу.",
    "en": "This method is being set up. Message the author on Instagram for an alternative.",
    "de": "Diese Methode wird gerade eingerichtet. Schreiben Sie der Autorin auf Instagram.",
    "uk": "Цей спосіб ще налаштовується. Напишіть авторові в Instagram — підкажемо альтернативу.",
}


def method_text(method: str, plan_id: str, lang: str = "ru") -> str:
    price = plan_price(plan_id)
    label = plan_label(plan_id, lang)
    head = HEADERS.get(method, {}).get(lang, method)
    money = f"{label} — {int(price)} €"

    if method == "paypal":
        link = config.PAY_LINKS.get(plan_id) or config.PAYPAL_ME
        if not link:
            return NOT_CONFIGURED[lang]
        return f"*{head}*\n{money}\n\n{link}"

    if method == "stripe":
        link = config.PAY_LINKS.get(plan_id)
        if not link:
            return NOT_CONFIGURED[lang]
        return f"*{head}*\n{money}\n\n{link}"

    if method == "iban":
        if not config.EUR_IBAN:
            return NOT_CONFIGURED[lang]
        return (f"*{head}*\n{money}\n\n"
                f"Получатель / Beneficiary: {config.EUR_BENEFICIARY}\n"
                f"IBAN: `{config.EUR_IBAN}`\n"
                f"BIC: {config.EUR_BIC}\n"
                f"Банк / Bank: {config.EUR_BANK}\n"
                f"Назначение / Reference: 15minYoga {plan_id}")

    if method == "crypto":
        if not config.CRYPTO_WALLET:
            return NOT_CONFIGURED[lang]
        return (f"*{head}*\n{money}\n\n"
                f"Сеть / Network: {config.CRYPTO_NETWORK or 'USDT-TRC20'}\n"
                f"Адрес / Address: `{config.CRYPTO_WALLET}`")

    if method == "monobank":
        if not (config.MONOBANK_JAR or config.MONOBANK_CARD):
            return NOT_CONFIGURED[lang]
        body = f"*{head}*\n{money} (в гривне по курсу)\n\n"
        if config.MONOBANK_JAR:
            body += f"Банка: {config.MONOBANK_JAR}\n"
        if config.MONOBANK_CARD:
            body += f"Карта: `{config.MONOBANK_CARD}`\n"
        return body

    return NOT_CONFIGURED[lang]
