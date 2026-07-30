/**
 * 15minYoga — участники, оплаты, лояльность.
 *
 * Хранилище — тот же Upstash Redis, что и у чата. Структура ключей:
 *
 *   m:<id>              — участник (имя, контакты, срок действия, бонусы)
 *   m:index             — все участники, отсортированы по дате появления
 *   m:renewal           — очередь продлений: вес = дата следующей оплаты
 *   m:email:<email>     — поиск участника по почте
 *   m:<id>:pay          — история оплат
 *   m:<id>:loy          — история начислений и списаний бонусов
 *   req:<id>, req:index — заявки на оплату, ожидающие подтверждения
 *   promo               — временная скидка на пакеты
 *
 * Деньги считаем в ЕВРОЦЕНТАХ (целые числа): дробные значения в рублях/евро
 * при сложении дают ошибки округления, а бонусы копятся годами.
 */
import { kv } from "./_lib.js";

/* ----------------------------- пакеты ----------------------------- */

export const PLANS = {
  m1:  { id: "m1",  months: 1,  cents: 10000, label: "1 месяц" },
  m6:  { id: "m6",  months: 6,  cents: 50000, label: "6 месяцев" },
  m12: { id: "m12", months: 12, cents: 90000, label: "12 месяцев" },
};

export function planById(id) {
  return PLANS[String(id || "").trim()] || null;
}

/* --------------------------- ступени пути --------------------------- */
/**
 * Ступень определяется СУММОЙ оплаченных месяцев, а не датой прихода:
 * человек, который занимался год, ушёл и вернулся, не теряет пройденное.
 * Процент возврата растёт со ступенью — так продлевать выгоднее, чем начинать заново.
 */
export const LEVELS = [
  { key: "start",   months: 0,  rate: 0.10, ru: "Пробуждение", en: "Awakening",   de: "Erwachen",     uk: "Пробудження" },
  { key: "steady",  months: 6,  rate: 0.11, ru: "Постоянство", en: "Steadiness",  de: "Beständigkeit", uk: "Постійність" },
  { key: "deep",    months: 12, rate: 0.12, ru: "Углубление",  en: "Depth",       de: "Vertiefung",   uk: "Заглиблення" },
  { key: "mature",  months: 36, rate: 0.14, ru: "Зрелость",    en: "Maturity",    de: "Reife",        uk: "Зрілість" },
  { key: "mastery", months: 60, rate: 0.15, ru: "Мастерство",  en: "Mastery",     de: "Meisterschaft", uk: "Майстерність" },
];

export function levelFor(paidMonths) {
  const m = Number(paidMonths) || 0;
  return [...LEVELS].reverse().find((l) => m >= l.months) || LEVELS[0];
}

export function nextLevel(paidMonths) {
  const m = Number(paidMonths) || 0;
  return LEVELS.find((l) => l.months > m) || null;
}

/* ------------------------------ даты ------------------------------ */

/**
 * Прибавить месяцы, не выходя за границы месяца: 31 января + 1 месяц = 28 (29) февраля,
 * а не 3 марта, как получилось бы при наивном сложении.
 */
export function addMonths(iso, months) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(months), 1,
                                   d.getUTCHours(), d.getUTCMinutes(), 0, 0));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString();
}

export function daysUntil(iso, from) {
  const ms = new Date(iso).getTime() - (from ? new Date(from).getTime() : Date.now());
  return Math.ceil(ms / 86400000);
}

/* ---------------------------- утилиты ---------------------------- */

export function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function normalizeEmail(s) {
  return String(s || "").trim().toLowerCase();
}

export function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(s));
}

export function money(cents) {
  return (Number(cents || 0) / 100).toFixed(2).replace(/\.00$/, "") + " €";
}

/* --------------------------- акции (промо) --------------------------- */

/** Активная скидка или null. Просроченную не возвращаем — проверка по дате. */
export async function getPromo() {
  const raw = await kv(["GET", "promo"]);
  if (!raw) return null;
  let p;
  try { p = JSON.parse(raw); } catch (e) { return null; }
  if (!p || !p.percent) return null;
  if (p.endsAt && new Date(p.endsAt).getTime() < Date.now()) return null;
  return p;
}

export async function setPromo(promo) {
  if (!promo) return await kv(["DEL", "promo"]);
  return await kv(["SET", "promo", JSON.stringify(promo)]);
}

/** Цена пакета с учётом действующей скидки. */
export function priceWithPromo(plan, promo) {
  const base = plan.cents;
  if (!promo || !promo.percent) return { base, final: base, off: 0 };
  const applies = !promo.plans || !promo.plans.length || promo.plans.includes(plan.id);
  if (!applies) return { base, final: base, off: 0 };
  const off = Math.round(base * (Number(promo.percent) / 100));
  return { base, final: base - off, off };
}

/* --------------------------- участники --------------------------- */

const memberKey = (id) => "m:" + id;

export async function getMember(id) {
  const h = await kv(["HGETALL", memberKey(id)]);
  return hashToMember(id, h);
}

/** Upstash отдаёт HGETALL массивом [поле, значение, ...] либо объектом. */
function hashToMember(id, h) {
  if (!h) return null;
  let o = h;
  if (Array.isArray(h)) {
    if (!h.length) return null;
    o = {};
    for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1];
  }
  if (!o || !Object.keys(o).length) return null;
  const paidMonths = Number(o.paidMonths || 0);
  const level = levelFor(paidMonths);
  return {
    id,
    name: o.name || "",
    email: o.email || "",
    phone: o.phone || "",
    telegram: o.telegram || "",
    lang: o.lang || "ru",
    note: o.note || "",
    createdAt: o.createdAt || "",
    lastPaidAt: o.lastPaidAt || "",
    nextDueAt: o.nextDueAt || "",
    paidMonths,
    paidCents: Number(o.paidCents || 0),
    bonusCents: Number(o.bonusCents || 0),
    level,
    nextLevel: nextLevel(paidMonths),
    daysLeft: o.nextDueAt ? daysUntil(o.nextDueAt) : null,
  };
}

export async function findByEmail(email) {
  const id = await kv(["GET", "m:email:" + normalizeEmail(email)]);
  return id ? await getMember(id) : null;
}

/** Создать участника или вернуть существующего с тем же адресом почты. */
export async function ensureMember({ name, email, phone, telegram, lang }) {
  const mail = normalizeEmail(email);
  const found = mail ? await findByEmail(mail) : null;
  if (found) {
    // дополняем пустые поля, ранее введённое не затираем
    const patch = {};
    if (name && !found.name) patch.name = name;
    if (phone && !found.phone) patch.phone = phone;
    if (telegram && !found.telegram) patch.telegram = telegram;
    if (Object.keys(patch).length) await updateMember(found.id, patch);
    return await getMember(found.id);
  }

  const id = newId("m");
  const now = new Date().toISOString();
  await kv(["HSET", memberKey(id),
    "name", name || "", "email", mail, "phone", phone || "",
    "telegram", telegram || "", "lang", lang || "ru",
    "createdAt", now, "paidMonths", "0", "paidCents", "0", "bonusCents", "0"]);
  await kv(["ZADD", "m:index", String(Date.now()), id]);
  if (mail) await kv(["SET", "m:email:" + mail, id]);
  return await getMember(id);
}

export async function updateMember(id, patch) {
  const args = [];
  for (const [k, v] of Object.entries(patch || {})) args.push(k, String(v));
  if (!args.length) return null;
  await kv(["HSET", memberKey(id), ...args]);
  if (patch.nextDueAt) {
    await kv(["ZADD", "m:renewal", String(new Date(patch.nextDueAt).getTime()), id]);
  }
  return await getMember(id);
}

export async function listMembers(limit = 200) {
  const ids = await kv(["ZRANGE", "m:index", "0", String(limit - 1), "REV"]);
  if (!Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    const m = await getMember(id);
    if (m) out.push(m);
  }
  return out;
}

/** Кому пора продлевать: срок истекает в ближайшие `days` дней или уже истёк. */
export async function dueMembers(days = 7) {
  const until = Date.now() + days * 86400000;
  const ids = await kv(["ZRANGE", "m:renewal", "0", String(until), "BYSCORE"]);
  if (!Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    const m = await getMember(id);
    if (m) out.push(m);
  }
  return out.sort((a, b) => new Date(a.nextDueAt) - new Date(b.nextDueAt));
}

/* ----------------------------- оплаты ----------------------------- */

/**
 * Подтверждение оплаты — единственное место, где меняются деньги и сроки.
 * Здесь же начисляется возврат и пересчитывается ступень.
 *
 * Продление считаем от текущей даты окончания, если она ещё не прошла:
 * человек, заплативший заранее, не теряет оплаченные дни.
 */
export async function confirmPayment(memberId, { planId, cents, paidAt, method, bonusUsedCents, note }) {
  const member = await getMember(memberId);
  if (!member) return null;
  const plan = planById(planId);
  if (!plan) return null;

  const when = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString();
  const amount = Number.isFinite(Number(cents)) ? Number(cents) : plan.cents;
  const usedBonus = Math.max(0, Math.min(Number(bonusUsedCents || 0), member.bonusCents));

  const startFrom = member.nextDueAt && new Date(member.nextDueAt).getTime() > new Date(when).getTime()
    ? member.nextDueAt
    : when;
  const nextDueAt = addMonths(startFrom, plan.months);

  const paidMonths = member.paidMonths + plan.months;
  const level = levelFor(paidMonths);
  // возврат начисляем от реально уплаченного, без учёта списанных бонусов
  const earned = Math.round(Math.max(0, amount) * level.rate);

  const payment = {
    id: newId("p"), planId: plan.id, months: plan.months,
    cents: amount, bonusUsedCents: usedBonus, bonusEarnedCents: earned,
    paidAt: when, method: method || "", note: note || "",
    nextDueAt,
  };
  await kv(["RPUSH", "m:" + memberId + ":pay", JSON.stringify(payment)]);

  await kv(["HSET", memberKey(memberId),
    "lastPaidAt", when,
    "nextDueAt", nextDueAt,
    "paidMonths", String(paidMonths),
    "paidCents", String(member.paidCents + amount),
    "bonusCents", String(member.bonusCents - usedBonus + earned)]);
  await kv(["ZADD", "m:renewal", String(new Date(nextDueAt).getTime()), memberId]);

  if (usedBonus) await logLoyalty(memberId, -usedBonus, "оплата пакета " + plan.label);
  if (earned) await logLoyalty(memberId, earned, "возврат " + Math.round(level.rate * 100) + "% с оплаты");

  return { member: await getMember(memberId), payment };
}

export async function listPayments(memberId) {
  const list = await kv(["LRANGE", "m:" + memberId + ":pay", "0", "-1"]);
  if (!Array.isArray(list)) return [];
  return list.map((s) => { try { return JSON.parse(s); } catch (e) { return null; } })
             .filter(Boolean).reverse();
}

/* ---------------------------- лояльность ---------------------------- */

export async function logLoyalty(memberId, deltaCents, reason) {
  const item = JSON.stringify({ delta: Number(deltaCents), reason: reason || "", at: new Date().toISOString() });
  await kv(["RPUSH", "m:" + memberId + ":loy", item]);
}

export async function listLoyalty(memberId) {
  const list = await kv(["LRANGE", "m:" + memberId + ":loy", "0", "-1"]);
  if (!Array.isArray(list)) return [];
  return list.map((s) => { try { return JSON.parse(s); } catch (e) { return null; } })
             .filter(Boolean).reverse();
}

/** Ручная правка баланса из админки — с обязательной причиной в истории. */
export async function adjustBonus(memberId, deltaCents, reason) {
  const m = await getMember(memberId);
  if (!m) return null;
  const next = Math.max(0, m.bonusCents + Number(deltaCents));
  await kv(["HSET", memberKey(memberId), "bonusCents", String(next)]);
  await logLoyalty(memberId, Number(deltaCents), reason || "правка вручную");
  return await getMember(memberId);
}

/* ------------------------- заявки на оплату ------------------------- */

export async function createRequest({ planId, name, email, phone, telegram, lang, comment, promo, method }) {
  const id = newId("req");
  const now = new Date().toISOString();
  await kv(["HSET", "req:" + id,
    "planId", planId || "", "name", name || "", "email", normalizeEmail(email),
    "phone", phone || "", "telegram", telegram || "", "lang", lang || "ru",
    "comment", comment || "", "promo", promo ? JSON.stringify(promo) : "",
    "method", method || "", "status", "new", "createdAt", now]);
  await kv(["ZADD", "req:index", String(Date.now()), id]);
  return { id, createdAt: now };
}

export async function getRequest(id) {
  const h = await kv(["HGETALL", "req:" + id]);
  if (!h) return null;
  let o = h;
  if (Array.isArray(h)) {
    if (!h.length) return null;
    o = {};
    for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1];
  }
  if (!Object.keys(o).length) return null;
  return { id, ...o };
}

export async function listRequests(status, limit = 100) {
  const ids = await kv(["ZRANGE", "req:index", "0", String(limit - 1), "REV"]);
  if (!Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    const r = await getRequest(id);
    if (r && (!status || r.status === status)) out.push(r);
  }
  return out;
}

export async function setRequestStatus(id, status, extra) {
  const args = ["status", status];
  for (const [k, v] of Object.entries(extra || {})) args.push(k, String(v));
  await kv(["HSET", "req:" + id, ...args]);
  return await getRequest(id);
}
