/**
 * GET /api/payment-methods?plan=m6&lang=ru — способы оплаты для блока на сайте.
 *
 * Отдаём только настроенные способы: показывать кнопку, за которой ничего нет,
 * хуже, чем не показывать её вовсе. Для карты и криптовалюты добавляем сумму
 * в нужной валюте, пересчитанную по курсу НБУ.
 *
 * Реквизиты здесь не отдаются никогда — они приходят в ответ на конкретную заявку.
 */
import { methodsForClient } from "./_payments.js";
import { planById, getPromo, priceWithPromo } from "./_membership.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }
  const lang = String((req.query && req.query.lang) || "ru");
  const plan = planById((req.query && req.query.plan) || "");
  let cents = 0;
  if (plan) {
    const promo = await getPromo();
    cents = priceWithPromo(plan, promo).final;
  }
  const methods = await methodsForClient(lang, cents);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, methods });
}
