/**
 * POST /api/support — сообщение посетителя из чата на сайте.
 *
 * Логика:
 *   1. Сообщение всегда уходит оператору в Telegram (чтобы ничего не потерялось).
 *   2. Если диалог уже передан человеку — бот молчит.
 *   3. Иначе определяем тему по ключевым словам и отвечаем выверенным текстом.
 *      Опционально (при ANTHROPIC_API_KEY) Claude переформулирует тот же факт живее,
 *      но выдумывать ничего не может — ему передаётся только найденный ответ.
 *   4. Темы health и operator всегда зовут человека.
 */
import {
  pushMessage, isHandover, setHandover, setSessionMeta,
  sendToOperator, linkTelegramMessage, escapeHtml,
  newSessionId, validSessionId, kvEnabled,
} from "./_lib.js";

import { answer, packFor, LANGS } from "./_answer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const text = String(body.text || "").trim().slice(0, 1500);
  const lang = LANGS.includes(body.lang) ? body.lang : "ru";
  const sessionId = validSessionId(body.sessionId) ? body.sessionId : newSessionId();

  if (!text) return res.status(400).json({ ok: false, error: "empty" });

  const pack = packFor(lang);

  await setSessionMeta(sessionId, lang);
  await pushMessage(sessionId, "user", text);

  const handedOver = await isHandover(sessionId);
  const found = await answer(text, lang);
  const wantsHuman = found.wantsHuman;

  // всегда уведомляем оператора — это его «входящие»
  const header = handedOver
    ? "💬 <b>Сообщение в чате</b>"
    : wantsHuman
      ? "🔔 <b>Просят живого оператора</b>"
      : "💬 <b>Вопрос в чате на сайте</b>";
  const msgIds = await sendToOperator(
    header + "\n\n" + escapeHtml(text) +
    "\n\n<i>сессия " + escapeHtml(sessionId) + " · " + lang + "</i>" +
    "\n↩️ Ответьте <b>реплаем</b> на это сообщение — посетитель увидит ответ в чате."
  );
  for (const m of msgIds) await linkTelegramMessage(m.chat, m.id, sessionId);

  // диалог уже у человека — бот не вмешивается
  if (handedOver) {
    return res.status(200).json({ ok: true, sessionId, silent: true });
  }

  if (wantsHuman) {
    await setHandover(sessionId, true);
    await pushMessage(sessionId, "bot", found.reply);
    return res.status(200).json({ ok: true, sessionId, reply: found.reply, handover: true });
  }

  await pushMessage(sessionId, "bot", found.reply);

  return res.status(200).json({
    ok: true,
    sessionId,
    reply: found.reply,
    topic: found.topic,
    // без хранилища ответ оператора в чат не вернётся — виджет предложит Telegram
    canReceiveOperator: kvEnabled,
  });
}
