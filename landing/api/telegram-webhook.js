/**
 * POST /api/telegram-webhook — всё, что происходит в Telegram-боте поддержки.
 *
 * Три сценария:
 *
 *   1. Вы отвечаете **реплаем** на уведомление о вопросе с сайта
 *      → ответ попадает в окно чата на сайте, бот там замолкает.
 *
 *   2. Вы отвечаете **реплаем** на уведомление о письме из Telegram
 *      → ответ уходит человеку в Telegram от имени бота.
 *
 *   3. Человек пишет боту напрямую
 *      → бот отвечает выверенной формулировкой (тот же словарь, что на сайте),
 *        а вам приходит уведомление с кнопкой «ответить реплаем».
 *        Вопросы о здоровье и просьбы позвать человека бот не берёт на себя.
 *
 * Защита: Telegram передаёт секрет в заголовке X-Telegram-Bot-Api-Secret-Token,
 * значение берётся из TELEGRAM_WEBHOOK_SECRET.
 *
 * Подключить один раз (подставьте свои значения):
 *   https://api.telegram.org/bot<ТОКЕН_ЧАТ_БОТА>/setWebhook
 *     ?url=https://15minyoga.com/api/telegram-webhook
 *     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
import {
  pushMessage, setHandover, sessionByTelegramMessage,
  linkTelegramDirect, chatByTelegramMessage,
  sendTelegram, sendToOperator, escapeHtml, isAdmin, kvEnabled,
} from "./_lib.js";
import { answer, packFor, langFromTelegram } from "./_answer.js";

const ok = (res, note) => res.status(200).json({ ok: true, note });

/** Откуда человек перешёл — параметр после /start в ссылке. */
const SOURCES = {
  lead_landing: "с сайта",
  lead_form: "из формы подписки",
  lead_chat: "из чата на сайте",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const got = req.headers["x-telegram-bot-api-secret-token"] || "";
  if (expected && got !== expected) {
    // отвечаем 200, чтобы Telegram не повторял доставку, но ничего не делаем
    return ok(res, "bad_secret");
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const msg = body && body.message;
  if (!msg || !msg.text) return ok(res, "not_a_text_message");

  const text = String(msg.text).trim().slice(0, 2000);
  if (!text) return ok(res, "empty");

  const chatId = msg.chat && msg.chat.id;
  const fromAdmin = isAdmin(msg.from && msg.from.id) || isAdmin(chatId);

  /* ---------- 1-2. вы отвечаете реплаем ---------- */
  if (fromAdmin && msg.reply_to_message) {
    const repliedTo = msg.reply_to_message.message_id;

    // ответ посетителю сайта
    const sessionId = await sessionByTelegramMessage(repliedTo);
    if (sessionId) {
      await setHandover(sessionId, true);      // дальше говорит человек
      await pushMessage(sessionId, "operator", text);
      return ok(res, "delivered_to_site");
    }

    // ответ человеку, который написал боту в Telegram
    const targetChat = await chatByTelegramMessage(repliedTo);
    if (targetChat) {
      await sendTelegram(targetChat, escapeHtml(text));
      return ok(res, "delivered_to_telegram");
    }

    await sendTelegram(chatId,
      "Не нашёл, кому адресован ответ — возможно, диалогу больше недели.\n" +
      "Ответьте реплаем на более свежее уведомление.");
    return ok(res, "unknown_target");
  }

  /* ---------- вы написали боту не реплаем ---------- */
  if (fromAdmin) {
    await sendTelegram(chatId,
      "Это бот поддержки сайта.\n\n" +
      "Чтобы ответить человеку, нажмите на его сообщение → <b>Ответить</b> и напишите текст. " +
      "Обычные сообщения сюда никуда не уходят.");
    return ok(res, "admin_hint");
  }

  /* ---------- 3. человек пишет боту напрямую ---------- */
  const lang = langFromTelegram(msg.from && msg.from.language_code);
  const pack = packFor(lang);

  // /start — приветствие из того же словаря, что и на сайте
  if (/^\/start\b/.test(text)) {
    await sendTelegram(chatId, escapeHtml(pack.answers.greeting || ""));
    const source = SOURCES[text.split(/\s+/)[1]] || "";
    const note = await sendToOperator(
      "👋 <b>Новый человек в боте</b>\n\n" +
      escapeHtml(nameOf(msg)) + "\n" +
      (source ? "пришёл " + source + " · " : "") + "<i>язык " + lang + "</i>" +
      "\n↩️ Ответьте <b>реплаем</b> — человек получит сообщение в Telegram."
    );
    if (note && chatId) await linkTelegramDirect(note, chatId);
    return ok(res, "greeted");
  }

  const found = await answer(text, lang);
  await sendTelegram(chatId, escapeHtml(found.reply));

  const note = await sendToOperator(
    (found.wantsHuman ? "🔔 <b>Просят человека — в Telegram</b>" : "💬 <b>Вопрос в Telegram-боте</b>") +
    "\n\n" + escapeHtml(text) +
    "\n\n" + escapeHtml(nameOf(msg)) + " · <i>язык " + lang + "</i>" +
    "\n↩️ Ответьте <b>реплаем</b> — человек получит сообщение в Telegram." +
    (kvEnabled ? "" : "\n⚠️ Хранилище не подключено: ответ реплаем не дойдёт, напишите человеку сами.")
  );
  if (note && chatId) await linkTelegramDirect(note, chatId);

  return ok(res, found.wantsHuman ? "handover" : "answered");
}

/** Человекочитаемая подпись отправителя для уведомления. */
function nameOf(msg) {
  const f = msg.from || {};
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ") || "без имени";
  return f.username ? name + " (@" + f.username + ")" : name;
}
