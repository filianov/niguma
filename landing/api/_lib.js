/**
 * 15minYoga — общая логика для функций чата.
 *
 * Хранилище: Upstash Redis по REST (Vercel подставляет KV_REST_API_URL / KV_REST_API_TOKEN
 * при подключении Upstash из Marketplace). Если хранилища нет — чат продолжает работать
 * в одностороннем режиме: бот отвечает, сообщения уходят оператору в Telegram, а ответить
 * оператор может в Telegram-боте. Терять посетителя из-за отсутствия базы нельзя.
 */

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const kvEnabled = Boolean(KV_URL && KV_TOKEN);

/** Выполнить команду Redis через REST. Возвращает null при любой проблеме. */
async function kv(command) {
  if (!kvEnabled) return null;
  try {
    const r = await fetch(KV_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && "result" in data ? data.result : null;
  } catch (e) {
    return null;
  }
}

const TTL = 60 * 60 * 24 * 7;              // диалог живёт неделю
const key = (id) => "chat:" + id;
const metaKey = (id) => "chat:meta:" + id;

/** Добавить сообщение в диалог. role: "user" | "bot" | "operator" */
export async function pushMessage(sessionId, role, text) {
  const item = JSON.stringify({ role, text, ts: Date.now() });
  await kv(["RPUSH", key(sessionId), item]);
  await kv(["EXPIRE", key(sessionId), String(TTL)]);
}

/** Сообщения диалога начиная с индекса (для поллинга виджетом). */
export async function getMessages(sessionId, from = 0) {
  const list = await kv(["LRANGE", key(sessionId), String(from), "-1"]);
  if (!Array.isArray(list)) return [];
  return list.map((s) => {
    try { return JSON.parse(s); } catch (e) { return null; }
  }).filter(Boolean);
}

/** Пометить, что диалог передан живому оператору — бот с этого момента молчит. */
export async function setHandover(sessionId, on = true) {
  await kv(["HSET", metaKey(sessionId), "handover", on ? "1" : "0"]);
  await kv(["EXPIRE", metaKey(sessionId), String(TTL)]);
}

export async function isHandover(sessionId) {
  const v = await kv(["HGET", metaKey(sessionId), "handover"]);
  return v === "1";
}

/** Запомнить язык и последнюю активность — нужно оператору для контекста. */
export async function setSessionMeta(sessionId, lang) {
  await kv(["HSET", metaKey(sessionId), "lang", lang || "ru"]);
  await kv(["EXPIRE", metaKey(sessionId), String(TTL)]);
}

export async function getSessionMeta(sessionId) {
  const lang = await kv(["HGET", metaKey(sessionId), "lang"]);
  return { lang: lang || "ru" };
}

/**
 * Связь «сообщение оператору в Telegram» → «сессия на сайте».
 * Оператор отвечает реплаем, webhook по id исходного сообщения находит сессию.
 */
export async function linkTelegramMessage(messageId, sessionId) {
  await kv(["SETEX", "tg:msg:" + messageId, String(TTL), sessionId]);
}

export async function sessionByTelegramMessage(messageId) {
  return await kv(["GET", "tg:msg:" + messageId]);
}

/* ----------------------------- Telegram ----------------------------- */

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_ADMIN = process.env.TELEGRAM_ADMIN_ID || "";

export const telegramEnabled = Boolean(TG_TOKEN && TG_ADMIN);

export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Отправить сообщение в Telegram. Возвращает message_id или null. */
export async function sendTelegram(chatId, text, replyTo) {
  if (!TG_TOKEN || !chatId) return null;
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (replyTo) payload.reply_to_message_id = replyTo;
    const r = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (data && data.ok) return data.result.message_id;
    // Молчаливый отказ — худший вариант: «в личку приходит, а в канал нет» без объяснений.
    // Пишем причину в журнал Vercel (Logs), диагностика — /api/telegram-check.
    console.error("[telegram] не доставлено в " + chatId + ": " +
      (data && data.description ? data.description : "неизвестная ошибка"));
    return null;
  } catch (e) {
    console.error("[telegram] сеть при отправке в " + chatId + ": " + (e && e.message));
    return null;
  }
}

/**
 * Отправить операторам. TELEGRAM_ADMIN_ID может содержать несколько адресов через
 * запятую — личный чат, рабочую группу, канал поддержки. Уведомление уходит в каждый,
 * поэтому возвращаем МАССИВ message_id: ответить реплаем можно из любого чата,
 * и каждое сообщение нужно связать с диалогом посетителя.
 */
export async function sendToOperator(text) {
  if (!telegramEnabled) return [];
  const ids = [];
  for (const chat of adminIds()) {
    const id = await sendTelegram(chat, text);
    if (id) ids.push(id);
  }
  return ids;
}

/** Все администраторы (TELEGRAM_ADMIN_ID может содержать несколько id через запятую). */
export function adminIds() {
  return String(TG_ADMIN).split(",").map((s) => s.trim()).filter(Boolean);
}

export function isAdmin(chatId) {
  return adminIds().includes(String(chatId));
}

/**
 * Связь «уведомление о письме из Telegram» → «чат клиента в Telegram».
 * Нужна, чтобы вы могли ответить реплаем человеку, который пишет боту напрямую.
 */
export async function linkTelegramDirect(messageId, chatId) {
  await kv(["SETEX", "tg:dm:" + messageId, String(TTL), String(chatId)]);
}

export async function chatByTelegramMessage(messageId) {
  return await kv(["GET", "tg:dm:" + messageId]);
}

/** Короткий безопасный идентификатор сессии. */
export function newSessionId() {
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function validSessionId(id) {
  return typeof id === "string" && /^s[a-z0-9]{6,24}$/.test(id);
}
