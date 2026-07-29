/**
 * POST /api/checkout — заявка на оплату пакета с лендинга.
 *
 * Денег здесь не касаемся: заявка попадает в админку, менеджер подтверждает
 * оплату вручную после того, как деньги действительно пришли. Так исключены
 * «оплаты», которых не было.
 *
 * Ответ посетителю всегда 200, если данные валидны: даже при сбое Telegram
 * заявка уже сохранена, и терять человека из-за чужой недоступности нельзя.
 */
import {
  PLANS, planById, createRequest, getPromo, priceWithPromo,
  validEmail, normalizeEmail, money, findByEmail,
} from "./_membership.js";
import { sendToOperator, escapeHtml } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const plan = planById(body.planId);
  if (!plan) return res.status(400).json({ ok: false, error: "bad_plan" });

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return res.status(400).json({ ok: false, error: "bad_email" });

  const name = String(body.name || "").trim().slice(0, 120);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const telegram = String(body.telegram || "").trim().slice(0, 80);
  const comment = String(body.comment || "").trim().slice(0, 500);
  const lang = ["ru", "en", "de", "uk"].includes(body.lang) ? body.lang : "ru";

  const promo = await getPromo();
  const price = priceWithPromo(plan, promo);

  const request = await createRequest({
    planId: plan.id, name, email, phone, telegram, lang, comment,
    promo: price.off ? { percent: promo.percent, off: price.off } : null,
  });

  // если человек уже занимался — покажем это менеджеру сразу
  const existing = await findByEmail(email);

  await sendToOperator(
    "💶 <b>Заявка на оплату</b>\n\n" +
    "<b>" + escapeHtml(plan.label) + "</b> — " + money(price.final) +
    (price.off ? " <s>" + money(price.base) + "</s> (скидка " + promo.percent + "%)" : "") + "\n\n" +
    "👤 " + escapeHtml(name || "без имени") + "\n" +
    "✉️ " + escapeHtml(email) + "\n" +
    (phone ? "📞 " + escapeHtml(phone) + "\n" : "") +
    (telegram ? "✈️ " + escapeHtml(telegram) + "\n" : "") +
    (comment ? "\n💬 " + escapeHtml(comment) + "\n" : "") +
    (existing
      ? "\n♻️ <b>Уже занимался(ась)</b>: оплачено " + existing.paidMonths + " мес, ступень «" +
        existing.level.ru + "», бонусов " + money(existing.bonusCents) +
        (existing.nextDueAt ? ", срок до " + existing.nextDueAt.slice(0, 10) : "")
      : "\n🆕 Новый участник") +
    "\n\n<i>заявка " + escapeHtml(request.id) + " · " + lang + "</i>" +
    "\nПодтвердить оплату — в админке: /admin"
  );

  return res.status(200).json({
    ok: true,
    requestId: request.id,
    plan: { id: plan.id, label: plan.label, months: plan.months },
    price: { base: price.base, final: price.final, off: price.off },
  });
}

/** Пакеты и действующая скидка — для отрисовки блока цен на лендинге. */
export async function plansWithPromo() {
  const promo = await getPromo();
  return {
    promo: promo ? { percent: promo.percent, endsAt: promo.endsAt || null, plans: promo.plans || [] } : null,
    plans: Object.values(PLANS).map((p) => {
      const price = priceWithPromo(p, promo);
      return { id: p.id, months: p.months, label: p.label, base: price.base, final: price.final, off: price.off };
    }),
  };
}
