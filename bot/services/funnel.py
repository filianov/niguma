"""
Sales funnel — the nurture drip sequence + cohort broadcast.

The drip is a list of time-offset steps. Each lead carries `drip_step` and `drip_due`;
the scheduler picks up due leads and sends the next step in their language, then arms
the next one. Converted/unsubscribed leads are skipped.
"""
from __future__ import annotations

import datetime as dt

from aiogram import Bot

import config
import db

# (offset_days_from_previous, message{lang})
DRIP = [
    (0, {  # sent right after qualifier
        "ru": "🌿 Рада, что вы здесь. Короткая мысль на сегодня: качество решений рождается из состояния, "
              "а не из спешки. 15 минут утром — это и есть инвестиция в состояние.\n\nХотите прийти на "
              "бесплатное пробное занятие? Просто ответьте «да».",
        "en": "🌿 Glad you're here. A short thought: the quality of decisions is born from your state, not from "
              "rushing. 15 morning minutes are an investment in that state.\n\nWant to join a free trial class? "
              "Just reply “yes”.",
        "de": "🌿 Schön, dass Sie da sind. Ein kurzer Gedanke: Die Qualität von Entscheidungen entsteht aus dem "
              "Zustand, nicht aus Eile. 15 Minuten morgens sind eine Investition in diesen Zustand.\n\nMöchten "
              "Sie zu einer kostenlosen Probestunde? Antworten Sie einfach „ja“.",
        "uk": "🌿 Рада, що ви тут. Коротка думка: якість рішень народжується зі стану, а не зі поспіху. "
              "15 ранкових хвилин — це інвестиція в стан.\n\nХочете на безкоштовне пробне заняття? Просто "
              "відповідайте «так».",
    }),
    (2, {
        "ru": "Многие предприниматели говорят об одном и том же: ум перегружен, решения даются из стресса. "
              "Йога Нигумы работает именно с этим — снимает внутреннее напряжение и возвращает ясность. "
              "Спросите меня о чём угодно 🌱",
        "en": "Many entrepreneurs say the same thing: an overloaded mind, decisions made from stress. Niguma yoga "
              "works exactly there — releasing inner tension and restoring clarity. Ask me anything 🌱",
        "de": "Viele Unternehmer sagen dasselbe: ein überlasteter Geist, Entscheidungen aus Stress. Niguma-Yoga "
              "setzt genau dort an — löst innere Anspannung und stellt Klarheit wieder her. Fragen Sie mich alles 🌱",
        "uk": "Багато підприємців кажуть те саме: розум перевантажений, рішення даються зі стресу. Йога Нігуми "
              "працює саме з цим — знімає внутрішнє напруження й повертає ясність. Питайте про що завгодно 🌱",
    }),
    (3, {
        "ru": "Формат напоминаю: будни 7:00–7:15 онлайн + глубокая практика раз в неделю. Записи остаются у вас. "
              "1 мес — 100 €, 6 мес — 500 €, 12 мес — 900 €. Готовы попробовать? Напишите «оплата» — подберём способ.",
        "en": "A reminder of the format: weekdays 7:00–7:15 online + a deep session once a week. Recordings stay "
              "with you. 1 mo — 100 €, 6 mo — 500 €, 12 mo — 900 €. Ready to try? Write “payment” and we'll pick a method.",
        "de": "Zur Erinnerung: werktags 7:00–7:15 online + eine vertiefende Einheit pro Woche. Aufzeichnungen bleiben "
              "bei Ihnen. 1 Mon — 100 €, 6 Mon — 500 €, 12 Mon — 900 €. Bereit? Schreiben Sie „Zahlung“.",
        "uk": "Нагадую формат: будні 7:00–7:15 онлайн + глибока практика раз на тиждень. Записи лишаються у вас. "
              "1 міс — 100 €, 6 міс — 500 €, 12 міс — 900 €. Готові спробувати? Напишіть «оплата».",
    }),
    (4, {
        "ru": "Древняя мысль, которую исповедует автор проекта: щедрость — причина процветания. Когда мы помогаем "
              "другим с тем, что важно нам самим, мы сажаем семя своего успеха. На практике мы тренируем именно это "
              "состояние. Ближайший поток стартует в понедельник 🌿",
        "en": "An ancient idea the author lives by: generosity is the cause of prosperity. When we help others with "
              "what matters to us, we plant the seed of our own success. The practice trains exactly this state. "
              "The next group starts Monday 🌿",
        "de": "Ein alter Gedanke, dem die Autorin folgt: Großzügigkeit ist die Ursache des Wohlstands. Wenn wir "
              "anderen mit dem helfen, was uns wichtig ist, pflanzen wir den Samen unseres Erfolgs. Der nächste Kurs "
              "startet am Montag 🌿",
        "uk": "Давня думка, яку сповідує автор проєкту: щедрість — причина процвітання. Коли ми допомагаємо іншим з "
              "тим, що важливе нам, ми саджаємо насіння власного успіху. Найближчий потік стартує в понеділок 🌿",
    }),
]


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


async def start_drip(telegram_id: int) -> None:
    """Arm the first drip step (due now)."""
    await db.upsert_lead(telegram_id, status="nurturing", drip_step=0,
                         drip_due=_now().isoformat())


async def send_due_drip(bot: Bot) -> int:
    """Send all due drip steps. Returns number of messages sent."""
    sent = 0
    leads = await db.leads_due_for_drip(_now().isoformat())
    for lead in leads:
        step = lead.get("drip_step", 0) or 0
        if step >= len(DRIP):
            await db.upsert_lead(lead["telegram_id"], drip_due=None)
            continue
        _, msg = DRIP[step]
        lang = lead.get("language", "ru")
        text = msg.get(lang) or msg["ru"]
        try:
            await bot.send_message(lead["telegram_id"], text, disable_web_page_preview=True)
            await db.log_message("out", lead["telegram_id"], text, automation=f"drip_{step}")
            sent += 1
        except Exception:
            pass  # blocked bot, etc.

        # arm next step
        next_step = step + 1
        if next_step < len(DRIP):
            offset_days = DRIP[next_step][0]
            due = (_now() + dt.timedelta(days=offset_days)).isoformat()
            await db.upsert_lead(lead["telegram_id"], drip_step=next_step, drip_due=due)
        else:
            await db.upsert_lead(lead["telegram_id"], drip_step=next_step, drip_due=None)
    return sent


COHORT_BROADCAST = {
    "ru": "🌿 В понедельник стартует новый поток 15minYoga!\n\nБудни 7:00–7:15 + глубокая практика раз в неделю. "
          "Записи остаются у вас. Хотите присоединиться? Напишите «оплата» — подберём удобный способ.",
    "en": "🌿 A new 15minYoga group starts Monday!\n\nWeekdays 7:00–7:15 + a deep session weekly. Recordings stay with "
          "you. Want in? Write “payment” and we'll pick a convenient method.",
    "de": "🌿 Am Montag startet ein neuer 15minYoga-Kurs!\n\nWerktags 7:00–7:15 + wöchentliche vertiefende Einheit. "
          "Aufzeichnungen bleiben bei Ihnen. Dabei sein? Schreiben Sie „Zahlung“.",
    "uk": "🌿 У понеділок стартує новий потік 15minYoga!\n\nБудні 7:00–7:15 + глибока практика раз на тиждень. Записи "
          "лишаються у вас. Хочете приєднатися? Напишіть «оплата».",
}


async def broadcast_new_cohort(bot: Bot) -> int:
    """Announce the new cohort to warm leads who consented. Throttled by caller cadence."""
    cur = await db.conn().execute(
        "SELECT telegram_id, language FROM lead WHERE consent_marketing=1 AND status IN ('new','nurturing')"
    )
    rows = await cur.fetchall()
    sent = 0
    for r in rows:
        lang = r[1] or "ru"
        text = COHORT_BROADCAST.get(lang, COHORT_BROADCAST["ru"])
        try:
            await bot.send_message(r[0], text, disable_web_page_preview=True)
            await db.log_message("out", r[0], text, automation="cohort_broadcast")
            sent += 1
        except Exception:
            pass
    return sent
