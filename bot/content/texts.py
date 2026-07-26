"""
Localized bot copy (ru / en / de / uk) + a tiny T() helper.
Falls back to RU when a key/locale is missing.
"""
from __future__ import annotations

DEFAULT = "ru"

TEXTS: dict[str, dict[str, str]] = {
    # ---------------- onboarding / funnel ----------------
    "welcome": {
        "ru": "🌿 Здравствуйте! Это бот проекта *15minYoga* — йога для тех, кто принимает решения.\n\n"
              "Каждый будний день в 7:00 мы практикуем 15 минут аутентичной йоги Леди Нигумы, "
              "а раз в неделю — глубокую часовую практику.\n\n"
              "Я помогу: расскажу о проекте, отвечу на вопросы, подскажу как оплатить и буду "
              "напоминать о занятиях.\n\nС чего начнём?",
        "en": "🌿 Hello! This is the *15minYoga* bot — yoga for those who make decisions.\n\n"
              "Every weekday at 7:00 we practice 15 minutes of the authentic yoga of Lady Niguma, "
              "and once a week — a deeper one-hour session.\n\n"
              "I can tell you about the project, answer questions, help you pay and remind you of classes.\n\n"
              "Where shall we start?",
        "de": "🌿 Hallo! Das ist der *15minYoga*-Bot — Yoga für Menschen, die Entscheidungen treffen.\n\n"
              "An jedem Werktag um 7:00 üben wir 15 Minuten authentisches Yoga von Lady Niguma, "
              "und einmal pro Woche eine vertiefende einstündige Einheit.\n\n"
              "Ich erzähle Ihnen über das Projekt, beantworte Fragen, helfe bei der Zahlung und erinnere an die Einheiten.\n\n"
              "Womit fangen wir an?",
        "uk": "🌿 Вітаю! Це бот проєкту *15minYoga* — йога для тих, хто ухвалює рішення.\n\n"
              "Щодня в будні о 7:00 ми практикуємо 15 хвилин автентичної йоги Леді Нігуми, "
              "а раз на тиждень — глибоку годинну практику.\n\n"
              "Я розповім про проєкт, відповім на запитання, підкажу як оплатити та нагадуватиму про заняття.\n\n"
              "З чого почнемо?",
    },
    "menu_about": {"ru": "О проекте", "en": "About", "de": "Über das Projekt", "uk": "Про проєкт"},
    "menu_schedule": {"ru": "Расписание", "en": "Schedule", "de": "Zeitplan", "uk": "Розклад"},
    "menu_price": {"ru": "Стоимость и оплата", "en": "Pricing & payment", "de": "Preise & Zahlung", "uk": "Вартість і оплата"},
    "menu_trial": {"ru": "Пробное занятие", "en": "Free trial", "de": "Probestunde", "uk": "Пробне заняття"},
    "menu_question": {"ru": "Задать вопрос", "en": "Ask a question", "de": "Frage stellen", "uk": "Поставити запитання"},

    "ask_goal": {
        "ru": "Чтобы я был полезнее — пара коротких вопросов.\n\n*Что для вас сейчас самое важное?* "
              "(например: энергия, ясность в решениях, меньше стресса, дисциплина практики)",
        "en": "So I can be more useful — a couple of short questions.\n\n*What matters most to you right now?* "
              "(e.g. energy, clarity in decisions, less stress, a steady practice)",
        "de": "Damit ich nützlicher bin — ein paar kurze Fragen.\n\n*Was ist Ihnen gerade am wichtigsten?* "
              "(z. B. Energie, Klarheit bei Entscheidungen, weniger Stress, eine feste Praxis)",
        "uk": "Щоб я був кориснішим — кілька коротких запитань.\n\n*Що для вас зараз найважливіше?* "
              "(наприклад: енергія, ясність у рішеннях, менше стресу, дисципліна практики)",
    },
    "ask_experience": {
        "ru": "Спасибо. И последнее: *есть ли у вас опыт в йоге или медитации?*",
        "en": "Thank you. And last: *do you have experience with yoga or meditation?*",
        "de": "Danke. Und zuletzt: *Haben Sie Erfahrung mit Yoga oder Meditation?*",
        "uk": "Дякую. І останнє: *чи маєте ви досвід у йозі або медитації?*",
    },
    "qualifier_done": {
        "ru": "Отлично, записал 🌱 Я рядом — спрашивайте что угодно о практике, расписании и оплате. "
              "Когда будете готовы — выберите «Пробное занятие».",
        "en": "Great, noted 🌱 I'm here — ask me anything about the practice, schedule and payment. "
              "When you're ready, pick “Free trial”.",
        "de": "Super, notiert 🌱 Ich bin da — fragen Sie mich alles zu Praxis, Zeitplan und Zahlung. "
              "Wenn Sie bereit sind, wählen Sie „Probestunde“.",
        "uk": "Чудово, занотував 🌱 Я поруч — питайте будь-що про практику, розклад та оплату. "
              "Коли будете готові — оберіть «Пробне заняття».",
    },

    # ---------------- consent ----------------
    "consent_ask": {
        "ru": "Хотите получать анонсы новых потоков и полезные материалы? Отписаться можно в любой момент.",
        "en": "Would you like announcements of new groups and useful materials? You can opt out anytime.",
        "de": "Möchten Sie Ankündigungen neuer Kurse und nützliche Materialien erhalten? Jederzeit abbestellbar.",
        "uk": "Бажаєте отримувати анонси нових потоків і корисні матеріали? Відписатися можна будь-коли.",
    },
    "consent_yes": {"ru": "Да, согласен", "en": "Yes", "de": "Ja", "uk": "Так"},
    "consent_no": {"ru": "Нет, спасибо", "en": "No, thanks", "de": "Nein, danke", "uk": "Ні, дякую"},
    "consent_thanks": {
        "ru": "Спасибо! Буду присылать только важное 🌿",
        "en": "Thank you! I'll only send what matters 🌿",
        "de": "Danke! Ich sende nur das Wichtige 🌿",
        "uk": "Дякую! Надсилатиму лише важливе 🌿",
    },

    # ---------------- payments ----------------
    "pay_intro": {
        "ru": "*Стоимость*\n• 1 месяц — 100 €\n• 6 месяцев — 500 €\n• 12 месяцев — 900 €\n\nВыберите способ оплаты:",
        "en": "*Pricing*\n• 1 month — 100 €\n• 6 months — 500 €\n• 12 months — 900 €\n\nChoose a payment method:",
        "de": "*Preise*\n• 1 Monat — 100 €\n• 6 Monate — 500 €\n• 12 Monate — 900 €\n\nWählen Sie eine Zahlungsart:",
        "uk": "*Вартість*\n• 1 місяць — 100 €\n• 6 місяців — 500 €\n• 12 місяців — 900 €\n\nОберіть спосіб оплати:",
    },
    "pay_proof_ask": {
        "ru": "Когда оплатите — пришлите сюда скриншот или фото чека. Я передам на подтверждение и открою доступ 🌿",
        "en": "Once paid, send a screenshot or photo of the receipt here. I'll pass it for confirmation and open access 🌿",
        "de": "Senden Sie nach der Zahlung einen Screenshot oder ein Foto des Belegs hierher. Ich leite es zur Bestätigung weiter und schalte den Zugang frei 🌿",
        "uk": "Після оплати надішліть сюди скриншот або фото чека. Я передам на підтвердження та відкрию доступ 🌿",
    },
    "pay_proof_received": {
        "ru": "Спасибо! Чек получен ✅ Автор подтвердит оплату в ближайшее время, и я открою доступ к занятиям и записям.",
        "en": "Thank you! Receipt received ✅ The author will confirm shortly and I'll open access to classes and recordings.",
        "de": "Danke! Beleg erhalten ✅ Die Autorin bestätigt in Kürze und ich öffne den Zugang zu Einheiten und Aufzeichnungen.",
        "uk": "Дякую! Чек отримано ✅ Автор підтвердить найближчим часом, і я відкрию доступ до занять та записів.",
    },
    "pay_confirmed": {
        "ru": "🎉 Оплата подтверждена! Добро пожаловать в поток. Завтра в 7:00 — первое занятие, я пришлю ссылку заранее. "
              "Ваш сад практики посажен 🌱",
        "en": "🎉 Payment confirmed! Welcome to the group. Tomorrow at 7:00 is your first class — I'll send the link in advance. "
              "Your practice garden is planted 🌱",
        "de": "🎉 Zahlung bestätigt! Willkommen im Kurs. Morgen um 7:00 ist Ihre erste Einheit — ich sende den Link rechtzeitig. "
              "Ihr Praxis-Garten ist gepflanzt 🌱",
        "uk": "🎉 Оплату підтверджено! Ласкаво просимо до потоку. Завтра о 7:00 — перше заняття, я надішлю посилання заздалегідь. "
              "Ваш сад практики посаджено 🌱",
    },

    # ---------------- gamification (Seed Garden) ----------------
    "g_practice_logged": {
        "ru": "🌱 +{pts} семян. Практика засчитана! Серия: {streak} дн. подряд. Сегодняшнее семя посажено.",
        "en": "🌱 +{pts} seeds. Practice logged! Streak: {streak} days. Today's seed is planted.",
        "de": "🌱 +{pts} Samen. Praxis erfasst! Serie: {streak} Tage. Das heutige Samenkorn ist gepflanzt.",
        "uk": "🌱 +{pts} насінин. Практику зараховано! Серія: {streak} дн. поспіль. Сьогоднішнє насіння посаджено.",
    },
    "g_seed_who": {
        "ru": "Дневник семян 🌱 (шаг 2 — помоги тому, у кого та же задача).\n*Кому вы сегодня помогли?*",
        "en": "Seed Log 🌱 (step 2 — help someone with your same problem).\n*Who did you help today?*",
        "de": "Samen-Tagebuch 🌱 (Schritt 2 — hilf jemandem mit deinem Problem).\n*Wem haben Sie heute geholfen?*",
        "uk": "Щоденник насіння 🌱 (крок 2 — допоможи тому, у кого та сама задача).\n*Кому ви сьогодні допомогли?*",
    },
    "g_seed_problem": {
        "ru": "*Какую их задачу вы помогли решить?*",
        "en": "*What problem of theirs did you help solve?*",
        "de": "*Welches Problem haben Sie lösen helfen?*",
        "uk": "*Яку їхню задачу ви допомогли вирішити?*",
    },
    "g_seed_logged": {
        "ru": "🌱 +{pts} семян — сильнейшее семя процветания. Щедрость есть причина изобилия.",
        "en": "🌱 +{pts} seeds — the strongest seed of prosperity. Giving is the cause of abundance.",
        "de": "🌱 +{pts} Samen — das stärkste Samenkorn des Wohlstands. Geben ist die Ursache der Fülle.",
        "uk": "🌱 +{pts} насінин — найсильніше насіння процвітання. Щедрість є причиною достатку.",
    },
    "g_coffee_intro": {
        "ru": "☕ Кофейная медитация (шаг 3). Спокойно вспомните день: где вы действовали из намерения, а где из привычки? "
              "Какое семя хотите усилить завтра? Напишите пару строк — только для вас.",
        "en": "☕ Coffee meditation (step 3). Gently review the day: where did you act from intention vs. habit? "
              "Which seed will you strengthen tomorrow? Write a couple of lines — for your eyes only.",
        "de": "☕ Kaffee-Meditation (Schritt 3). Lassen Sie den Tag Revue passieren: wo aus Absicht, wo aus Gewohnheit? "
              "Welches Samenkorn stärken Sie morgen? Schreiben Sie ein paar Zeilen — nur für Sie.",
        "uk": "☕ Кавова медитація (крок 3). Спокійно згадайте день: де ви діяли з наміру, а де зі звички? "
              "Яке насіння хочете посилити завтра? Напишіть кілька рядків — лише для вас.",
    },
    "g_coffee_done": {
        "ru": "☕ +{pts} семян. День закрыт осознанно. Доброй ночи 🌙",
        "en": "☕ +{pts} seeds. The day is closed with awareness. Good night 🌙",
        "de": "☕ +{pts} Samen. Der Tag ist bewusst abgeschlossen. Gute Nacht 🌙",
        "uk": "☕ +{pts} насінин. День завершено усвідомлено. Доброї ночі 🌙",
    },
    "g_dedicate_ask": {
        "ru": "🙏 Посвящение (шаг 4). *Кому или чему вы посвящаете заслугу сегодняшней практики?* "
              "(человеку, делу, миру)",
        "en": "🙏 Dedication (step 4). *To whom or what do you dedicate the merit of today's practice?* "
              "(a person, a cause, the world)",
        "de": "🙏 Widmung (Schritt 4). *Wem oder was widmen Sie das Verdienst der heutigen Praxis?* "
              "(einer Person, einer Sache, der Welt)",
        "uk": "🙏 Присвята (крок 4). *Кому чи чому ви присвячуєте заслугу сьогоднішньої практики?* "
              "(людині, справі, світу)",
    },
    "g_dedicate_done": {
        "ru": "🙏 +{pts} семян. Заслуга посвящена и защищена. Намерение определяет силу семени.",
        "en": "🙏 +{pts} seeds. The merit is dedicated and protected. Intention defines the seed's potency.",
        "de": "🙏 +{pts} Samen. Das Verdienst ist gewidmet und geschützt. Absicht bestimmt die Kraft des Samens.",
        "uk": "🙏 +{pts} насінин. Заслугу присвячено й захищено. Намір визначає силу насіння.",
    },
    "g_garden": {
        "ru": "🌳 *Ваш сад*\n\n{art}\n\nУровень: *{level}*\nВсего семян: *{seeds}*\nСерия практики: *{streak}* дн. "
              "(рекорд {longest})\n\nСад растёт из того, что вы сажаете — практикой, помощью и щедростью.",
        "en": "🌳 *Your garden*\n\n{art}\n\nLevel: *{level}*\nTotal seeds: *{seeds}*\nStreak: *{streak}* days "
              "(best {longest})\n\nThe garden grows from what you plant — practice, help and generosity.",
        "de": "🌳 *Ihr Garten*\n\n{art}\n\nStufe: *{level}*\nSamen gesamt: *{seeds}*\nSerie: *{streak}* Tage "
              "(Rekord {longest})\n\nDer Garten wächst aus dem, was Sie pflanzen — Praxis, Hilfe und Großzügigkeit.",
        "uk": "🌳 *Ваш сад*\n\n{art}\n\nРівень: *{level}*\nВсього насінин: *{seeds}*\nСерія: *{streak}* дн. "
              "(рекорд {longest})\n\nСад росте з того, що ви саджаєте — практикою, допомогою та щедрістю.",
    },
    "g_level_up": {
        "ru": "✨ Новый уровень: *{level}*! {meaning}",
        "en": "✨ New level: *{level}*! {meaning}",
        "de": "✨ Neue Stufe: *{level}*! {meaning}",
        "uk": "✨ Новий рівень: *{level}*! {meaning}",
    },
    "g_invite": {
        "ru": "🎁 Подарите практику тому, кому она нужна. Ваша персональная ссылка:\n{link}\n\n"
              "+60 семян, когда друг присоединится. Дать доступ к учению — большое семя.",
        "en": "🎁 Give the practice to someone who needs it. Your personal link:\n{link}\n\n"
              "+60 seeds when a friend joins. Giving access to the teaching is a great seed.",
        "de": "🎁 Schenken Sie die Praxis jemandem, der sie braucht. Ihr persönlicher Link:\n{link}\n\n"
              "+60 Samen, wenn ein Freund beitritt. Zugang zur Lehre zu geben ist ein großes Samenkorn.",
        "uk": "🎁 Подаруйте практику тому, кому вона потрібна. Ваше персональне посилання:\n{link}\n\n"
              "+60 насінин, коли друг приєднається. Дати доступ до вчення — велике насіння.",
    },

    # ---------------- support / AI ----------------
    "support_escalated": {
        "ru": "Хороший вопрос — передал его автору, она ответит лично. А пока можете написать ей напрямую: {ig}",
        "en": "Good question — I've passed it to the author, she'll reply personally. Meanwhile you can message her directly: {ig}",
        "de": "Gute Frage — ich habe sie an die Autorin weitergeleitet, sie antwortet persönlich. Inzwischen können Sie ihr direkt schreiben: {ig}",
        "uk": "Гарне запитання — передав його авторові, вона відповість особисто. А поки можете написати їй напряму: {ig}",
    },

    # ---------------- reminders ----------------
    "remind_daily": {
        "ru": "🌅 Через {mins} минут — утренняя практика (7:00–7:15). Ссылка для входа:\n{link}\n\nДо встречи на коврике 🧘",
        "en": "🌅 In {mins} minutes — the morning practice (7:00–7:15). Join link:\n{link}\n\nSee you on the mat 🧘",
        "de": "🌅 In {mins} Minuten — die Morgenpraxis (7:00–7:15). Beitrittslink:\n{link}\n\nBis gleich auf der Matte 🧘",
        "uk": "🌅 За {mins} хвилин — ранкова практика (7:00–7:15). Посилання для входу:\n{link}\n\nДо зустрічі на килимку 🧘",
    },
    "remind_weekly": {
        "ru": "🕉 Сегодня — глубокая часовая практика. Ссылка:\n{link}\n\nОтличная возможность посадить большое семя — приходите вживую.",
        "en": "🕉 Today is the deep one-hour practice. Link:\n{link}\n\nA great chance to plant a big seed — join live.",
        "de": "🕉 Heute ist die vertiefende einstündige Praxis. Link:\n{link}\n\nEine gute Gelegenheit, ein großes Samenkorn zu pflanzen — live dabei sein.",
        "uk": "🕉 Сьогодні — глибока годинна практика. Посилання:\n{link}\n\nЧудова нагода посадити велике насіння — приходьте наживо.",
    },
}


def T(key: str, lang: str = DEFAULT, **kwargs) -> str:
    table = TEXTS.get(key, {})
    text = table.get(lang) or table.get(DEFAULT) or key
    if kwargs:
        try:
            text = text.format(**kwargs)
        except (KeyError, IndexError):
            pass
    return text
