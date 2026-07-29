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

import CONTENT from "./_chat-content.js";

const HANDOVER_TOPICS = new Set(["operator", "health"]);

/** Простое сопоставление по ключевым словам. Возвращает тему или null. */
function detectTopic(text, lang) {
  const dict = (CONTENT[lang] || CONTENT.ru).keywords || {};
  const t = " " + text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ") + " ";
  let best = null, bestScore = 0;
  for (const topic of Object.keys(dict)) {
    let score = 0;
    for (const kw of dict[topic]) {
      const k = String(kw).toLowerCase().trim();
      if (!k) continue;
      if (t.includes(" " + k + " ") || t.includes(" " + k)) score += k.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = topic; }
  }
  return bestScore > 0 ? best : null;
}

/** Необязательное «оживление» ответа: те же факты, другая формулировка. */
async function rephrase(answer, question, lang) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return answer;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.SUPPORT_MODEL || "claude-haiku-4-5",
        max_tokens: 220,
        system:
          "You are the 15minYoga website assistant. You will be given a VERIFIED answer and the " +
          "visitor's question. Rewrite the verified answer so it responds naturally to that exact " +
          "question, in the same language. You may NOT add any fact that is not in the verified " +
          "answer — no prices, times, promises or medical advice. Keep it to 1-3 short sentences, " +
          "calm and warm. Return only the rewritten answer.",
        messages: [{
          role: "user",
          content: "Visitor question: " + question + "\n\nVerified answer: " + answer,
        }],
      }),
    });
    if (!r.ok) return answer;
    const data = await r.json();
    const out = data && data.content && data.content[0] && data.content[0].text;
    return out && out.trim().length > 4 ? out.trim() : answer;
  } catch (e) {
    return answer;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const text = String(body.text || "").trim().slice(0, 1500);
  const lang = ["ru", "en", "de", "uk"].includes(body.lang) ? body.lang : "ru";
  const sessionId = validSessionId(body.sessionId) ? body.sessionId : newSessionId();

  if (!text) return res.status(400).json({ ok: false, error: "empty" });

  const pack = CONTENT[lang] || CONTENT.ru;

  await setSessionMeta(sessionId, lang);
  await pushMessage(sessionId, "user", text);

  const handedOver = await isHandover(sessionId);
  const topic = detectTopic(text, lang);
  const wantsHuman = HANDOVER_TOPICS.has(topic);

  // всегда уведомляем оператора — это его «входящие»
  const header = handedOver
    ? "💬 <b>Сообщение в чате</b>"
    : wantsHuman
      ? "🔔 <b>Просят живого оператора</b>"
      : "💬 <b>Вопрос в чате на сайте</b>";
  const msgId = await sendToOperator(
    header + "\n\n" + escapeHtml(text) +
    "\n\n<i>сессия " + escapeHtml(sessionId) + " · " + lang + "</i>" +
    "\n↩️ Ответьте <b>реплаем</b> на это сообщение — посетитель увидит ответ в чате."
  );
  if (msgId) await linkTelegramMessage(msgId, sessionId);

  // диалог уже у человека — бот не вмешивается
  if (handedOver) {
    return res.status(200).json({ ok: true, sessionId, silent: true });
  }

  if (wantsHuman) {
    await setHandover(sessionId, true);
    const reply = topic === "health" ? pack.answers.health : pack.answers.operator;
    await pushMessage(sessionId, "bot", reply);
    return res.status(200).json({ ok: true, sessionId, reply, handover: true });
  }

  const base = topic ? pack.answers[topic] : pack.answers.fallback;
  const reply = topic ? await rephrase(base, text, lang) : base;
  await pushMessage(sessionId, "bot", reply);

  return res.status(200).json({
    ok: true,
    sessionId,
    reply,
    topic: topic || "fallback",
    // без хранилища ответ оператора в чат не вернётся — виджет предложит Telegram
    canReceiveOperator: kvEnabled,
  });
}
