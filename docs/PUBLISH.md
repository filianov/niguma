# 🚀 Как выложить Niguma на GitHub и показать

Пошаговая инструкция: загрузить проект на ваш GitHub и сделать так, чтобы лендинг
открывался по публичной ссылке (чтобы показать). Рассчитано на новичка.

> Что важно понять заранее:
> - **Лендинг** — это статический сайт, его можно показать по публичной ссылке (GitHub Pages или Vercel).
> - **Бот** — это программа-сервер, он **не работает** на GitHub Pages; для него нужен отдельный хостинг (Railway/Fly — см. [DEPLOYMENT.md](DEPLOYMENT.md)). Но код бота всё равно лежит в репозитории, и его видно.
> - На GitHub попадёт **только код**. Секреты (токены, реквизиты) НЕ загружаются — они в файле `.env`, который уже защищён `.gitignore`.

---

## Шаг 0. Проверка безопасности (1 минута)

Убедитесь, что в проекте нет настоящих паролей/токенов. В терминале:

```bash
cd "/Users/filianov/Clode projects/niguma"
ls -a | grep -E '^\.env$' && echo "⚠️ есть .env — он не попадёт в гит (он в .gitignore), это ок" || echo "✓ .env отсутствует"
grep -R "sk-ant" . --include=*.py --include=*.json 2>/dev/null && echo "⚠️ нашёлся ключ — убрать!" || echo "✓ ключей Claude в коде нет"
```

Реквизиты в `config/project.config.json` и `bot/.env.example` — это **заглушки** (`REPLACE_ME`),
их выкладывать безопасно. Настоящие значения вы позже впишете только в `.env` (он не коммитится).

---

## Вариант A — через GitHub Desktop (рекомендуется, у вас установлен)

### 1. Создать локальный репозиторий
1. Откройте **GitHub Desktop**.
2. Меню **File → Add Local Repository…**
3. Нажмите **Choose…** и выберите папку проекта:
   `/Users/filianov/Clode projects/niguma`
4. GitHub Desktop скажет, что это не репозиторий, и предложит ссылку
   **«create a repository»** — нажмите её.
5. В окне «Create a Repository»:
   - **Name:** `niguma`
   - **Description:** `Йога для тех, кто принимает решения — лендинг + Telegram-бот`
   - **Git Ignore:** оставьте `None` (у нас уже есть свой `.gitignore`)
   - Нажмите **Create Repository**.

### 2. Сделать первый коммит
1. Слева вы увидите список всех файлов (≈40 шт.) — это нормально.
2. Внизу слева в поле **Summary** напишите: `Initial commit — Niguma MVP`
3. Нажмите синюю кнопку **Commit to main**.

### 3. Опубликовать на GitHub
1. Вверху нажмите **Publish repository**.
2. В окне:
   - снимите/оставьте галочку **Keep this code private** —
     **снимите** (сделать Public), если хотите показать ссылкой и использовать GitHub Pages;
   - оставьте имя `niguma`.
3. Нажмите **Publish repository**.

Готово — код на GitHub. Кнопка **View on GitHub** откроет страницу репозитория (её уже можно показывать).

---

## Вариант B — через терминал (если удобнее команды)

GitHub CLI у вас не установлен, поэтому репозиторий создаём на сайте, потом подключаем.

### 1. Создать пустой репозиторий на github.com
Зайдите на <https://github.com/new> → имя `niguma` → **Public** →
**НЕ** ставьте галочки «Add README / .gitignore / license» → **Create repository**.
Скопируйте показанный адрес вида `https://github.com/ВАШ_ЛОГИН/niguma.git`.

### 2. Загрузить проект
```bash
cd "/Users/filianov/Clode projects/niguma"
git init
git add .
git commit -m "Initial commit — Niguma MVP"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/niguma.git
git push -u origin main
```
При первом пуше GitHub попросит авторизоваться в браузере — подтвердите.

> Совет: если хотите команду в одну строку через GitHub CLI — сначала установите его:
> `brew install gh && gh auth login`, затем из папки проекта: `gh repo create niguma --public --source=. --push`.

---

## Показать ЛЕНДИНГ по публичной ссылке

### Способ 1 — Vercel (рекомендуется, красивый URL, работает и с приватным репо)
1. Зайдите на <https://vercel.com> → **Sign up with GitHub**.
2. **Add New… → Project** → выберите репозиторий `niguma` → **Import**.
3. В настройках проекта задайте **Root Directory** = `landing` (нажмите Edit и выберите папку).
   Framework Preset оставьте **Other**. Build/Output — пусто (это статика).
4. **Deploy**. Через ~30 секунд получите ссылку вида `https://niguma.vercel.app` — её и показывайте.
5. Дальше Vercel сам передеплоивает сайт при каждом пуше в GitHub. `vercel.json` уже настроен.

### Способ 2 — GitHub Pages (бесплатно, нужен Public-репозиторий)
В проект уже добавлен workflow `.github/workflows/deploy-pages.yml`, который публикует папку `landing/`.
1. Откройте репозиторий на GitHub → **Settings → Pages**.
2. В разделе **Build and deployment → Source** выберите **GitHub Actions**.
3. Перейдите во вкладку **Actions** — там запустится «Deploy landing to GitHub Pages»
   (или запустите вручную кнопкой **Run workflow**).
4. После зелёной галочки ссылка появится в **Settings → Pages**, вид:
   `https://ВАШ_ЛОГИН.github.io/niguma/` — её показывайте.

> Если позже подключите свой домен `niguma.yoga` — это делается в настройках Vercel или Pages
> (раздел Custom domain), плюс DNS у регистратора. См. [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Показать БОТА (отдельно от сайта)

GitHub Pages бота не запускает. Чтобы бот реально отвечал в Telegram, его нужно поднять
на сервере (Railway / Fly.io) — пошагово в [DEPLOYMENT.md](DEPLOYMENT.md). Кратко:
1. На <https://railway.app> → **New Project → Deploy from GitHub repo** → `niguma`.
2. Root Directory = `bot`, Start command = `python main.py`.
3. В **Variables** вставить значения из `.env.example` (BOT_TOKEN, ANTHROPIC_API_KEY, ADMIN_IDS…).
4. Deploy. Для демонстрации без сервера можно просто показать код бота в репозитории.

---

## Как обновлять после изменений
- **GitHub Desktop:** внести правки → слева появятся изменения → Summary → **Commit to main** → **Push origin**.
- **Терминал:** `git add . && git commit -m "что изменил" && git push`.
Vercel/Pages подхватят изменения и передеплоят автоматически.

---

## Частые вопросы
- **Не загрузятся ли мои токены?** Нет. `.env` и `*.db` в `.gitignore`. В код вписаны только заглушки.
- **Можно ли держать репозиторий приватным и всё равно показать сайт?** Да — через **Vercel** (Pages бесплатно требует Public).
- **Папка `.claude/` попала в репозиторий — это ок?** Да, там только конфиг локального предпросмотра, секретов нет.
- **Что показывать собеседнику?** Ссылку на сайт (Vercel/Pages) + ссылку на репозиторий GitHub (код, README, дорожная карта).
