"""
Back-office datastore (the single source of truth).

MVP uses SQLite via aiosqlite — zero-setup, file-based, trivially exportable.
For production swap the DSN to managed Postgres (see docs/INFRASTRUCTURE.md);
the schema and queries map 1:1.

Tables follow the minimal, GDPR-friendly data model:
  lead, member, subscription, payment, practice_log, seed_log, message_log
"""
from __future__ import annotations

import datetime as dt
from typing import Any, Optional

import aiosqlite

import config

_db: Optional[aiosqlite.Connection] = None


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


SCHEMA = """
CREATE TABLE IF NOT EXISTS lead (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    first_name TEXT,
    language TEXT DEFAULT 'ru',
    source TEXT,
    goal TEXT,
    experience TEXT,
    email TEXT,
    consent_marketing INTEGER DEFAULT 0,
    consent_ts TEXT,
    lead_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',            -- new|nurturing|trial|converted|lost
    drip_step INTEGER DEFAULT 0,
    drip_due TEXT,
    created_at TEXT,
    last_activity_at TEXT
);

CREATE TABLE IF NOT EXISTS member (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    telegram_id INTEGER UNIQUE,
    display_name TEXT,
    language TEXT DEFAULT 'ru',
    timezone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',         -- active|paused|churned
    seeds INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date TEXT,
    rain_day_at TEXT,
    joined_at TEXT
);

CREATE TABLE IF NOT EXISTS subscription (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    cohort TEXT,
    plan TEXT,
    status TEXT DEFAULT 'pending',        -- pending|active|expired|cancelled
    start_date TEXT,
    end_date TEXT,
    price REAL,
    currency TEXT DEFAULT 'EUR',
    payment_method TEXT,
    renewed_from INTEGER,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER,
    member_id INTEGER,
    telegram_id INTEGER,
    amount REAL,
    currency TEXT,
    method TEXT,                          -- paypal|stripe|iban|monobank|wise|stars
    status TEXT DEFAULT 'pending',        -- pending|confirmed|refunded
    proof_ref TEXT,
    plan TEXT,
    confirmed_by INTEGER,
    created_at TEXT,
    confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS practice_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    session TEXT,                         -- daily|weekly
    practice_date TEXT,
    source TEXT DEFAULT 'self',           -- self|live|recording
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS seed_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    event_type TEXT,                      -- practice|seed|coffee|dedicate|rejoice|invite|video|weekly|confirm
    points INTEGER DEFAULT 0,
    balance_after INTEGER,
    note TEXT,
    related_ref TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS message_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_type TEXT,                  -- lead|member
    recipient_id INTEGER,
    telegram_id INTEGER,
    channel TEXT DEFAULT 'telegram',
    direction TEXT,                       -- in|out
    automation TEXT,                      -- drip_day2|reminder_t1h|support|broadcast...
    intent TEXT,
    llm_confidence REAL,
    escalated INTEGER DEFAULT 0,
    body TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_status ON lead(status);
CREATE INDEX IF NOT EXISTS idx_lead_drip_due ON lead(drip_due);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(status);
"""


async def init() -> None:
    global _db
    _db = await aiosqlite.connect(config.DATABASE_PATH)
    _db.row_factory = aiosqlite.Row
    await _db.executescript(SCHEMA)
    await _db.commit()


async def close() -> None:
    if _db:
        await _db.close()


def conn() -> aiosqlite.Connection:
    assert _db is not None, "db.init() not called"
    return _db


# -------------------- leads --------------------
async def upsert_lead(telegram_id: int, **fields: Any) -> dict:
    cur = await conn().execute("SELECT * FROM lead WHERE telegram_id=?", (telegram_id,))
    row = await cur.fetchone()
    now = _now()
    if row is None:
        cols = ["telegram_id", "created_at", "last_activity_at"] + list(fields.keys())
        vals = [telegram_id, now, now] + list(fields.values())
        ph = ",".join("?" * len(cols))
        await conn().execute(f"INSERT INTO lead ({','.join(cols)}) VALUES ({ph})", vals)
    else:
        fields["last_activity_at"] = now
        sets = ",".join(f"{k}=?" for k in fields)
        await conn().execute(
            f"UPDATE lead SET {sets} WHERE telegram_id=?", list(fields.values()) + [telegram_id]
        )
    await conn().commit()
    cur = await conn().execute("SELECT * FROM lead WHERE telegram_id=?", (telegram_id,))
    return dict(await cur.fetchone())


async def get_lead(telegram_id: int) -> Optional[dict]:
    cur = await conn().execute("SELECT * FROM lead WHERE telegram_id=?", (telegram_id,))
    row = await cur.fetchone()
    return dict(row) if row else None


async def bump_lead_score(telegram_id: int, delta: int) -> None:
    await conn().execute(
        "UPDATE lead SET lead_score = lead_score + ?, last_activity_at=? WHERE telegram_id=?",
        (delta, _now(), telegram_id),
    )
    await conn().commit()


async def leads_due_for_drip(now_iso: str) -> list[dict]:
    cur = await conn().execute(
        "SELECT * FROM lead WHERE status IN ('new','nurturing') "
        "AND drip_due IS NOT NULL AND drip_due <= ? ORDER BY drip_due",
        (now_iso,),
    )
    return [dict(r) for r in await cur.fetchall()]


# -------------------- members --------------------
async def get_member(telegram_id: int) -> Optional[dict]:
    cur = await conn().execute("SELECT * FROM member WHERE telegram_id=?", (telegram_id,))
    row = await cur.fetchone()
    return dict(row) if row else None


async def create_member_from_lead(lead: dict) -> dict:
    now = _now()
    await conn().execute(
        "INSERT OR IGNORE INTO member (lead_id, telegram_id, display_name, language, email, status, joined_at) "
        "VALUES (?,?,?,?,?,'active',?)",
        (lead["id"], lead["telegram_id"], lead.get("first_name"), lead.get("language", "ru"),
         lead.get("email"), now),
    )
    await conn().execute("UPDATE lead SET status='converted' WHERE id=?", (lead["id"],))
    await conn().commit()
    return await get_member(lead["telegram_id"])


async def update_member(telegram_id: int, **fields: Any) -> None:
    if not fields:
        return
    sets = ",".join(f"{k}=?" for k in fields)
    await conn().execute(
        f"UPDATE member SET {sets} WHERE telegram_id=?", list(fields.values()) + [telegram_id]
    )
    await conn().commit()


async def active_member_ids() -> list[int]:
    cur = await conn().execute("SELECT telegram_id FROM member WHERE status='active'")
    return [r[0] for r in await cur.fetchall()]


# -------------------- payments / subscriptions --------------------
async def create_pending_payment(telegram_id: int, plan: str, amount: float,
                                 currency: str, method: str, proof_ref: str = "") -> int:
    cur = await conn().execute(
        "INSERT INTO payment (telegram_id, plan, amount, currency, method, status, proof_ref, created_at) "
        "VALUES (?,?,?,?,?,'pending',?,?)",
        (telegram_id, plan, amount, currency, method, proof_ref, _now()),
    )
    await conn().commit()
    return cur.lastrowid


async def pending_payments() -> list[dict]:
    cur = await conn().execute("SELECT * FROM payment WHERE status='pending' ORDER BY created_at")
    return [dict(r) for r in await cur.fetchall()]


async def confirm_payment(payment_id: int, admin_id: int) -> Optional[dict]:
    cur = await conn().execute("SELECT * FROM payment WHERE id=?", (payment_id,))
    pay = await cur.fetchone()
    if not pay:
        return None
    await conn().execute(
        "UPDATE payment SET status='confirmed', confirmed_by=?, confirmed_at=? WHERE id=?",
        (admin_id, _now(), payment_id),
    )
    await conn().commit()
    return dict(pay)


# -------------------- logs --------------------
async def log_message(direction: str, telegram_id: int, body: str, *,
                      recipient_type: str = "lead", automation: str = "",
                      intent: str = "", confidence: float | None = None,
                      escalated: bool = False, channel: str = "telegram") -> None:
    await conn().execute(
        "INSERT INTO message_log (recipient_type, telegram_id, channel, direction, automation, "
        "intent, llm_confidence, escalated, body, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (recipient_type, telegram_id, channel, direction, automation, intent,
         confidence, 1 if escalated else 0, body[:4000], _now()),
    )
    await conn().commit()


async def add_practice(member_id: int, session: str, source: str = "self") -> None:
    today = dt.date.today().isoformat()
    await conn().execute(
        "INSERT INTO practice_log (member_id, session, practice_date, source, created_at) VALUES (?,?,?,?,?)",
        (member_id, session, today, source, _now()),
    )
    await conn().commit()


async def add_seed(member_id: int, event_type: str, points: int, balance_after: int,
                   note: str = "", related_ref: str = "") -> None:
    await conn().execute(
        "INSERT INTO seed_log (member_id, event_type, points, balance_after, note, related_ref, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (member_id, event_type, points, balance_after, note, related_ref, _now()),
    )
    await conn().commit()


async def seeds_this_today(member_id: int, event_type: str) -> int:
    today = dt.date.today().isoformat()
    cur = await conn().execute(
        "SELECT COUNT(*) FROM seed_log WHERE member_id=? AND event_type=? AND substr(created_at,1,10)=?",
        (member_id, event_type, today),
    )
    return (await cur.fetchone())[0]


# -------------------- analytics --------------------
async def stats() -> dict:
    async def one(q: str) -> int:
        cur = await conn().execute(q)
        return (await cur.fetchone())[0]

    return {
        "leads": await one("SELECT COUNT(*) FROM lead"),
        "nurturing": await one("SELECT COUNT(*) FROM lead WHERE status='nurturing'"),
        "members_active": await one("SELECT COUNT(*) FROM member WHERE status='active'"),
        "pending_payments": await one("SELECT COUNT(*) FROM payment WHERE status='pending'"),
        "confirmed_payments": await one("SELECT COUNT(*) FROM payment WHERE status='confirmed'"),
        "revenue_eur": await one(
            "SELECT COALESCE(SUM(amount),0) FROM payment WHERE status='confirmed' AND currency='EUR'"
        ),
    }
