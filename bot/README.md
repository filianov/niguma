# 15minYoga — Telegram-агент

aiogram + Claude API. Служба поддержки, ответы лидам, воронка (drip), напоминания о занятиях,
выдача реквизитов, геймификация «Сад семян».

## Запуск
```bash
python3 -m pip install -r requirements.txt
cp .env.example .env     # заполнить BOT_TOKEN, ANTHROPIC_API_KEY, ADMIN_IDS, реквизиты
python3 main.py
```

## Команды участника
`/start` · `/menu` · `/pay` · `/practice` · `/seed` · `/coffee` · `/dedicate` · `/garden` · `/invite` · `/help`

## Команды автора (только ADMIN_IDS)
- `/stats` — лиды, участники, оплаты, выручка.
- `/pending` — оплаты, ожидающие подтверждения.
- `/confirm <id>` — подтвердить оплату → активировать участника.
- `/broadcast` — анонс нового потока тёплым лидам.
- `/say <telegram_id> <текст>` — личный ответ участнику от лица бота.

## Структура
```
bot/
├── main.py              точка входа (диспетчер, команды, планировщик, polling)
├── config.py            env + ../config/project.config.json
├── db.py                SQLite-слой (лиды, участники, подписки, платежи, логи)
├── handlers/            start · pay · practice · support · admin · keyboards
├── services/            ai · funnel · gamification · payments · scheduler · notify
└── content/             texts.py (4 языка) · knowledge_ru.md (база знаний агента)
```

## Как это работает
- **Лид:** `/start` (с deep-link источника) → квалификатор (цель/опыт) → согласие → drip.
- **Поддержка:** свободный текст → Claude (Haiku, для тёплых — Sonnet). Низкая уверенность или
  чувствительная тема → ответ короткий + эскалация автору + ссылка на Instagram.
- **Оплата:** `/pay` → тариф → способ → реквизиты/ссылка → чек → `/confirm` автором → доступ.
- **Геймификация:** очки-«семена» за практику, помощь, посвящение, щедрость; уровни и личный «сад».
- **Расписание:** напоминания T-60/T-10 будни, суббота — глубокая практика, вечерняя «кофейная медитация»,
  drip каждые 15 мин, анонс потока по понедельникам.

Подробности: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), [`../docs/GAMIFICATION.md`](../docs/GAMIFICATION.md).
