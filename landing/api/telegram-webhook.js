/**
 * POST /api/telegram-webhook — Telegram присылает сюда ваши ответы.
 *
 * Оператор отвечает **реплаем** на уведомление бота → по id исходного сообщения
 * находим сессию на сайте и кладём ответ в её ленту. Посетитель увидит его
 * в чате в течение нескольких секунд.
 *
 * Защита: Telegram передаёт секрет в заголовке X-Telegram-Bot-Api-Secret-Token,
 * значение берётся из TELEGRAM_WEBHOOK_SECRET.
 *
 * Подключить один раз (подставьте свои значения):
 *   https://api.telegram.org/bot<ТОКЕН_ЧАТ_БОТА>/setWebhook
 *     ?url=https://15minyoga.com/api/telegram-webhook
 *     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
import { pushMessage, setHandover, sessionByTelegramMessage } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const got = req.headers["x-telegram-bot-api-secret-token"] || "";
  if (expected && got !== expected) {
    // отвечаем 200, чтобы Telegram не повторял доставку, но ничего не делаем
    return res.status(200).json({ ok: true, ignored: "bad_secret" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const msg = body && body.message;

  // нас интересует только ответ реплаем с текстом
  if (!msg || !msg.text || !msg.reply_to_message) {
    return res.status(200).json({ ok: true, ignored: "not_a_reply" });
  }

  const sessionId = await sessionByTelegramMessage(msg.reply_to_message.message_id);
  if (!sessionId) {
    return res.status(200).json({ ok: true, ignored: "unknown_session" });
  }

  const text = String(msg.text).trim().slice(0, 2000);
  if (!text) return res.status(200).json({ ok: true, ignored: "empty" });

  // с этого момента отвечает человек — бот больше не вмешивается
  await setHandover(sessionId, true);
  await pushMessage(sessionId, "operator", text);

  return res.status(200).json({ ok: true, delivered: true });
}
