/**
 * GET /api/cron-renewals — ежедневная сводка «кому пора продлевать».
 *
 * Запускается расписанием Vercel (см. crons в vercel.json). Присылает в чат
 * поддержки список тех, у кого срок истекает в ближайшую неделю или уже истёк,
 * с контактами — чтобы менеджеру оставалось только написать.
 *
 * Если за день никого нет, молчим: ежедневное «никого» быстро приучает
 * не читать эти сообщения.
 *
 * Защита: Vercel передаёт CRON_SECRET в заголовке Authorization. Пока секрет
 * не задан, запуск открыт — это удобно на старте и безопасно, потому что
 * функция ничего не меняет, только читает и отправляет сводку вам же.
 */
import { dueMembers } from "./_membership.js";
import { renderDue } from "./admin.js";
import { sendToOperator } from "./_lib.js";

const DAYS_AHEAD = 7;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET || "";
  if (secret) {
    const got = String((req.headers && req.headers.authorization) || "");
    if (got !== "Bearer " + secret) return res.status(401).json({ ok: false });
  }

  const list = await dueMembers(DAYS_AHEAD);
  if (!list.length) return res.status(200).json({ ok: true, due: 0, sent: false });

  await sendToOperator(renderDue(list));
  return res.status(200).json({ ok: true, due: list.length, sent: true });
}
