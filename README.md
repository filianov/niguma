# 🌿 15minYoga — Йога для тех, кто принимает решения

Полная инфраструктура онлайн-проекта по йоге Леди Нигумы для предпринимателей и лидеров:
**лендинг + Telegram-агент + воронка продаж + геймификация + платежи**, готовые к запуску,
плюс пошаговая дорожная карта развития.

> 15 минут каждое утро для энергии, ясности и масштабного влияния.

---

## Что уже реализовано

| Блок | Что это | Где |
|------|---------|-----|
| 🖥 **Лендинг** | Mobile-first, в стиле Apple, светлый минимализм. 4 языка (RU/EN/DE/UK), дословный контент автора, переключатель языков, сбор e-mail, ссылки на бота и Instagram. | [`landing/`](landing/) |
| 🤖 **Telegram-агент** | aiogram + Claude API: служба поддержки, ответы новым лидам, воронка (drip), напоминания о занятиях, выдача реквизитов, геймификация. | [`bot/`](bot/) |
| 🌱 **Геймификация «Сад семян»** | Система по мудрости геше Майкла Роуча: каждое действие сажает «семя» (практика, помощь, щедрость, посвящение). | [`docs/GAMIFICATION.md`](docs/GAMIFICATION.md) |
| 💳 **Платежи (гибрид)** | PayPal/Stripe на лендинге + евро-счёт (IBAN) и Monobank через бота. Бот фиксирует оплату, автор подтверждает. | [`docs/PAYMENTS.md`](docs/PAYMENTS.md) |
| 🗃 **Back-office / CRM** | Единая база (SQLite→Postgres): лиды, участники, подписки, платежи, журнал практик, «семена», переписка. | [`bot/db.py`](bot/db.py) |
| 🎨 **Фирменный стиль** | Логотип «Четверть» (22 SVG + 14 PNG), палитра, правила применения. | [`brandbook/`](brandbook/BRANDBOOK.md) |
| ⚙️ **Конфиг** | Единый источник правды для лендинга и бота: расписание, цены, соцсети, методы оплаты. | [`config/project.config.json`](config/project.config.json) |

---

## Структура репозитория

```
niguma/
├── README.md                  ← вы здесь
├── config/
│   └── project.config.json    ← единый конфиг (расписание, цены, соцсети, оплата)
├── landing/                   ← статический сайт (деплой на Vercel/Cloudflare)
│   ├── index.html             ← разметка + data-i18n ключи
│   ├── css/styles.css         ← Apple-style, mobile-first
│   ├── js/
│   │   ├── translations.js    ← контент RU/EN/DE/UK
│   │   ├── config.js          ← ссылки кнопок (бот, Instagram…)
│   │   ├── i18n.js            ← движок локализации
│   │   └── main.js            ← интерактив + сбор лида
│   ├── legal/privacy.html
│   ├── assets/                ← favicon, og-обложка (добавить)
│   └── vercel.json
├── bot/                       ← Telegram-агент (Python/aiogram + Claude)
│   ├── main.py                ← точка входа
│   ├── config.py · db.py
│   ├── handlers/              ← start, pay, practice, support, admin
│   ├── services/              ← ai, funnel, gamification, payments, scheduler, notify
│   └── content/               ← тексты (4 языка) + база знаний агента
└── docs/
    ├── ARCHITECTURE.md        ← инфраструктура, стек, принципы автономии
    ├── PAYMENTS.md            ← платёжный стек, комплаенс (НДС/санкции)
    ├── GAMIFICATION.md        ← «Сад семян» по геше Майклу Роучу
    ├── FUNNEL.md              ← воронка продаж и автоматизации
    ├── GO-LIVE.md            ← пошаговый запуск на 15minyoga.com
    ├── ROADMAP.md             ← пошаговый план на 30 / 90 / 365 дней
    └── DEPLOYMENT.md          ← как развернуть лендинг и бота
```

---

## Быстрый старт

### 1. Лендинг (локально)
```bash
cd landing
python3 -m http.server 8080   # открыть http://localhost:8080
```
Деплой: `vercel --prod` (см. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).

### 2. Telegram-бот
```bash
cd bot
python3 -m pip install -r requirements.txt
cp .env.example .env          # заполнить BOT_TOKEN, ANTHROPIC_API_KEY, ADMIN_IDS …
python3 main.py
```

### 3. Что нужно завести (один раз)
- Бот в [@BotFather](https://t.me/BotFather) → `BOT_TOKEN`.
- Ключ [Anthropic Claude](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.
- Свой Telegram id ([@userinfobot](https://t.me/userinfobot)) → `ADMIN_IDS`.
- Платёжные реквизиты (IBAN, Monobank-банка, PayPal.me) → `.env` и/или `config`.
- Домен → потом e-mail `15minyoga.com@gmail.com`.

Полный чек-лист запуска и развития — в [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Принцип проекта

Максимально **автономная система повторяющихся циклов продаж**: построенная один раз
воронка перезапускается на каждый новый поток, а рутину (напоминания, прогрев, приём
заявок, ответы на вопросы) ведут AI-агенты. Время автора — только на живые занятия,
контент и редкие решения, которые агент эскалирует. Подробнее — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
