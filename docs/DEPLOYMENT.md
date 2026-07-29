# Деплой 15minYoga

> 👉 Для боевого запуска на домене используйте пошаговую карту [GO-LIVE.md](GO-LIVE.md)
> — там аудит хвостов, DNS, все параметры и финальный чек-лист.

Два независимых компонента: **статический лендинг** и **Telegram-бот** (долгоживущий процесс).

---

## 1. Лендинг → Vercel (или Cloudflare Pages / Netlify / GitHub Pages)

Лендинг — это статика, сборка не нужна.

### Локально
```bash
cd landing
python3 -m http.server 8080   # http://localhost:8080
```

### Vercel
```bash
npm i -g vercel
cd landing
vercel            # первый раз — привязать проект
vercel --prod     # выкатить в прод
```
`vercel.json` уже настроен: чистые URL, заголовки безопасности, кэш статики.

### Домен и e-mail
1. В панели хостинга добавить домен `15minyoga.com`, прописать DNS.
2. Завести почту `15minyoga.com@gmail.com` (Google Workspace / Zoho / провайдер домена).
3. Настроить **SPF / DKIM / DMARC** (нужно для доставляемости писем из бота/ESP).
4. Обновить ссылки в [`landing/js/config.js`](../landing/js/config.js) и
   [`config/project.config.json`](../config/project.config.json) (Instagram, бот, канал, e-mail).

> Перед публичным запуском: заменить плейсхолдеры `REPLACE_ME` в конфиге и добавить `assets/og-cover.jpg`.

---

## 2. Бот → Railway (или Fly.io / любой VPS)

Боту нужен **постоянный процесс** (long-polling) + воркер планировщика. Serverless не подходит.

### Локально
```bash
cd bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # заполнить
python main.py
```

### Railway
1. Создать проект из репозитория, root = `bot/`.
2. Start command: `python main.py`.
3. Variables — перенести всё из `.env` (BOT_TOKEN, ANTHROPIC_API_KEY, ADMIN_IDS, реквизиты…).
4. Добавить **PostgreSQL** add-on, прописать DSN (на проде вместо SQLite — см. ниже).
5. Deploy. Проверить логи: `15minYoga bot polling…` и список cron-джобов.

### Fly.io (альтернатива)
```bash
cd bot
fly launch        # создаст fly.toml (процесс-воркер, без публичного порта)
fly secrets set BOT_TOKEN=... ANTHROPIC_API_KEY=... ADMIN_IDS=...
fly deploy
```

### Переход с SQLite на Postgres (на проде)
MVP пишет в SQLite (`DATABASE_PATH`). Для прод-CRM:
- поднять Postgres (Supabase/Neon/Railway),
- заменить слой в [`bot/db.py`](../bot/db.py) на `asyncpg`/`SQLAlchemy` (схема 1:1 с текущей),
- Supabase даёт браузерную админку — автор правит базу без отдельной панели.

---

## 3. Внешний heartbeat (надёжность)

Бесплатный GitHub Actions cron раз в день дёргает health-проверку — если контейнер упал,
вы об этом узнаете. Пример `.github/workflows/heartbeat.yml`:
```yaml
name: heartbeat
on:
  schedule: [{ cron: "0 6 * * *" }]
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS "$HEALTH_URL" || echo "DOWN" # настроить уведомление
        env: { HEALTH_URL: ${{ secrets.HEALTH_URL }} }
```
(Добавить в бота лёгкий health-endpoint при переходе на webhook-режим.)

---

## 4. Чек-лист «боевой готовности»
- [ ] Лендинг открывается на домене по HTTPS, 4 языка, кнопки ведут в бота/Instagram.
- [ ] Бот отвечает на `/start`, ведёт квалификатор, шлёт реквизиты, принимает чек.
- [ ] `/confirm` активирует участника, ему уходит подтверждение и доступ.
- [ ] Напоминания приходят активным участникам по расписанию.
- [ ] Эскалация сложных вопросов доходит до автора.
- [ ] Секреты только в env (не в гите), `.env` в `.gitignore`.
- [ ] Бэкап БД настроен.
