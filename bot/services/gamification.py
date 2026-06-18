"""
The "Seed Garden" (Сад семян) — gamification by Geshe Michael Roach's system.

Every action plants a karmic seed. Points measure seeds planted (practice, helping,
dedication, generosity) — never ego rank. See docs/GAMIFICATION.md for the full design.
"""
from __future__ import annotations

import datetime as dt

import db

# --- point values per action (the "seed" ledger) ---
POINTS = {
    "practice": 10,    # daily 15-min practice
    "seed": 25,        # logged helping action (step 2)
    "confirm": 15,     # recipient confirmed your help
    "invite": 60,      # referred member joined
    "coffee": 15,      # evening coffee meditation (step 3)
    "dedicate": 20,    # dedicate merit (step 4)
    "dedicate_weekly": 40,
    "journal": 20,     # cause-and-effect observation
    "weekly_live": 70, # weekly deep session, live + contribution
    "weekly": 50,      # weekly deep session (recording)
    "video": 15,       # watched a philosophy video
    "rejoice": 5,      # rejoice in another's seed (both sides)
}

SEED_DAILY_CAP = 3  # anti-gaming cap on /seed logs per day
STREAK_MULT_CAP = 1.5
STREAK_MULT_DAYS = 30

# --- levels: (key, min, max, names{lang}, meaning{lang}) ---
LEVELS = [
    ("seed",   0,    250,  {"ru": "Семя", "en": "Seed", "de": "Samen", "uk": "Насіння"},
     {"ru": "Вы ясно решили, чего хотите, и начали поливать свою землю.",
      "en": "You have decided clearly what you want and begun to water your ground."}),
    ("sprout", 251,  800,  {"ru": "Росток", "en": "Sprout", "de": "Spross", "uk": "Паросток"},
     {"ru": "Складывается постоянство. Первые всходы становятся видны.",
      "en": "Consistency is forming. The first results become visible."}),
    ("roots",  801,  2000, {"ru": "Корни", "en": "Roots", "de": "Wurzeln", "uk": "Коріння"},
     {"ru": "Вы регулярно помогаете другим — практика питает не только вас.",
      "en": "You regularly help others — your practice feeds more than yourself."}),
    ("bloom",  2001, 4500, {"ru": "Цветение", "en": "Bloom", "de": "Blüte", "uk": "Цвітіння"},
     {"ru": "Щедрость и посвящение вошли в привычку. Ваш сад зацвёл.",
      "en": "Generosity and dedication are habitual. Your garden flowers."}),
    ("grove",  4501, 9000, {"ru": "Роща", "en": "Grove", "de": "Hain", "uk": "Гай"},
     {"ru": "Вы укрываете других — опора сообщества и постоянный даритель.",
      "en": "You shelter others — a steady giver and pillar of the community."}),
    ("diamond", 9001, 10**9, {"ru": "Алмазный садовник", "en": "Diamond Gardener",
                              "de": "Diamant-Gärtner", "uk": "Алмазний садівник"},
     {"ru": "Высший путь: ваши семена — это в основном дар, посвящение и сорадование.",
      "en": "The highest path: your seeds come mostly from giving, dedicating and rejoicing."}),
]

GARDEN_ART = {
    "seed":    "🟤\n. . seed . .",
    "sprout":  "🌱\n. sprouting .",
    "roots":   "🌿🌱\n. taking root .",
    "bloom":   "🌷🌻🌿\n. in bloom .",
    "grove":   "🌳🌳🌿🌷\n. a grove .",
    "diamond": "🌳💎🌳\n🌷🌿🌻🌿🌷\n. diamond grove .",
}


def level_for(seeds: int) -> dict:
    for key, lo, hi, names, meaning in LEVELS:
        if lo <= seeds <= hi:
            return {"key": key, "names": names, "meaning": meaning}
    return {"key": "seed", "names": LEVELS[0][3], "meaning": LEVELS[0][4]}


def level_name(seeds: int, lang: str = "ru") -> str:
    lv = level_for(seeds)
    return lv["names"].get(lang) or lv["names"]["ru"]


def level_meaning(seeds: int, lang: str = "ru") -> str:
    lv = level_for(seeds)
    return lv["meaning"].get(lang) or lv["meaning"]["ru"]


def garden_art(seeds: int) -> str:
    return GARDEN_ART.get(level_for(seeds)["key"], GARDEN_ART["seed"])


async def award(member: dict, event_type: str, points: int | None = None,
                note: str = "", related_ref: str = "") -> dict:
    """
    Add seeds to a member, persist the ledger entry, and report level-ups.
    Returns {points, balance, leveled_up, level_name, level_meaning}.
    """
    pts = POINTS.get(event_type, 0) if points is None else points
    before = member["seeds"]
    after = before + pts
    await db.update_member(member["telegram_id"], seeds=after)
    await db.add_seed(member["id"], event_type, pts, after, note, related_ref)

    leveled = level_for(before)["key"] != level_for(after)["key"] and pts > 0
    return {
        "points": pts,
        "balance": after,
        "leveled_up": leveled,
        "level_name": level_name(after, member.get("language", "ru")),
        "level_meaning": level_meaning(after, member.get("language", "ru")),
    }


async def log_daily_practice(member: dict) -> dict:
    """Handle the daily practice check-in: streak logic + seed award."""
    today = dt.date.today()
    last = member.get("last_practice_date")
    streak = member.get("streak", 0) or 0
    longest = member.get("longest_streak", 0) or 0

    if last == today.isoformat():
        # already logged today — idempotent, no double award
        return {"already": True, "streak": streak,
                "level_name": level_name(member["seeds"], member.get("language", "ru"))}

    yesterday = (today - dt.timedelta(days=1)).isoformat()
    streak = streak + 1 if last == yesterday else 1
    longest = max(longest, streak)

    # streak multiplier, capped
    mult = min(STREAK_MULT_CAP, 1 + 0.5 * min(streak, STREAK_MULT_DAYS) / STREAK_MULT_DAYS)
    pts = round(POINTS["practice"] * mult)

    await db.update_member(member["telegram_id"], streak=streak, longest_streak=longest,
                           last_practice_date=today.isoformat())
    await db.add_practice(member["id"], "daily", "self")
    member = await db.get_member(member["telegram_id"])
    res = await award(member, "practice", points=pts)
    res.update({"already": False, "streak": streak})
    return res


async def can_log_seed(member: dict) -> bool:
    return (await db.seeds_this_today(member["id"], "seed")) < SEED_DAILY_CAP
