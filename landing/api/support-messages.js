/**
 * GET /api/support-messages?sessionId=...&from=N
 *
 * Виджет опрашивает этот адрес, чтобы показать ответы оператора.
 * Отдаём только сообщения начиная с индекса `from` — трафик минимальный.
 */
import { getMessages, isHandover, validSessionId, kvEnabled } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const sessionId = String(req.query.sessionId || "");
  const from = Math.max(0, parseInt(req.query.from, 10) || 0);

  if (!validSessionId(sessionId)) {
    return res.status(400).json({ ok: false, error: "bad_session" });
  }
  if (!kvEnabled) {
    // хранилище не подключено — поллинг бессмыслен, честно сообщаем виджету
    return res.status(200).json({ ok: true, messages: [], total: from, disabled: true });
  }

  const all = await getMessages(sessionId, 0);
  const fresh = all.slice(from);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    messages: fresh,
    total: all.length,
    handover: await isHandover(sessionId),
  });
}
