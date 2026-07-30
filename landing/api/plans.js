/**
 * GET /api/plans — пакеты и действующая скидка для блока «Стоимость».
 *
 * Лендинг статический, поэтому цены рисуются из этого ответа: включили акцию
 * в админке — она появилась на сайте без пересборки. Если функция недоступна,
 * страница показывает базовые цены из переводов и остаётся рабочей.
 */
import { plansWithPromo } from "./checkout.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }
  const lang = String((req.query && req.query.lang) || "ru");
  const data = await plansWithPromo(lang);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, ...data });
}
