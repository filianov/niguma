/**
 * POST /api/checkout — заявка на оплату пакета с лендинга.
 *
 * Два исхода, в зависимости от выбранного способа:
 *
 *   Карта (LiqPay) — возвращаем данные формы, браузер сразу открывает страницу
 *   оплаты. Подтверждение приходит от LiqPay на /api/liqpay-callback.
 *
 *   Счёт, PayPal, криптовалюта — возвращаем реквизиты, чтобы человек мог
 *   заплатить не дожидаясь ответа. Заявка при этом уходит менеджеру: оплату
 *   он подтверждает вручную, когда деньги придут.
 *
 * Реквизиты живут только в переменных окружения и отдаются в ответ на конкретную
 * заявку — на страницах сайта их нет и поисковиками они не индексируются.
 */
import {
  PLANS, planById, createRequest, getPromo, priceWithPromo,
  validEmail, normalizeEmail, money, findByEmail,
} from "./_membership.js";
import { methodById, isConfigured, paymentInstructions, methodsForClient, getRates, eurToUah } from "./_payments.js";
import { checkoutForm, liqpayEnabled } from "./_liqpay.js";
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

  const method = methodById(body.method);
  if (!method || !isConfigured(method)) {
    return res.status(400).json({ ok: false, error: "bad_method" });
  }

  const name = String(body.name || "").trim().slice(0, 120);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const telegram = String(body.telegram || "").trim().slice(0, 80);
  const comment = String(body.comment || "").trim().slice(0, 500);
  const lang = ["ru", "en", "de", "uk"].includes(body.lang) ? body.lang : "ru";

  const promo = await getPromo();
  const price = priceWithPromo(plan, promo);

  const request = await createRequest({
    planId: plan.id, name, email, phone, telegram, lang, comment,
    method: method.id,
    promo: price.off ? { percent: promo.percent, off: price.off } : null,
  });

  const existing = await findByEmail(email);

  await sendToOperator(
    "💶 <b>Заявка на оплату</b>\n\n" +
    "<b>" + escapeHtml(plan.label) + "</b> — " + money(price.final) +
    (price.off ? " <s>" + money(price.base) + "</s> (скидка " + promo.percent + "%)" : "") + "\n" +
    "Способ: <b>" + escapeHtml(method.ru.name) + "</b>" +
    (method.mode === "instant" ? " — оплата на сайте, подтверждать вручную не нужно" : "") + "\n\n" +
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
    "\n\n<i>заявка " + escapeHtml(request.id) + " · " + lang + "</i>"
  );

  const out = {
    ok: true,
    requestId: request.id,
    mode: method.mode,
    method: { id: method.id, name: method[lang].name },
    plan: { id: plan.id, label: plan.label, months: plan.months },
    price: { base: price.base, final: price.final, off: price.off },
  };

  // карта — отдаём данные формы, браузер уводит на страницу оплаты
  if (method.mode === "instant") {
    const form = await checkoutForm({
      requestId: request.id, cents: price.final,
      planLabel: plan.label, lang, email,
    });
    if (!form) {
      // ключи есть, но курс не получен — не отправляем человека на страницу
      // оплаты с неизвестной суммой, честно предлагаем другой способ
      out.mode = "manual";
      out.fallbackReason = "rate_unavailable";
    } else {
      out.checkout = form;
    }
  }

  // остальные способы — реквизиты сразу, чтобы не ждать ответа
  if (out.mode === "manual") {
    out.instructions = await paymentInstructions(method.id, price.final, lang);
  }

  return res.status(200).json(out);
}

/**
 * Пакеты и действующая скидка — для отрисовки блока цен на лендинге.
 *
 * Вместе с ценой в евро отдаём её эквивалент в гривне: этого требуют правила
 * приёма карт в Украине. Курс — коммерческий курс покупки ПриватБанка, тот же,
 * по которому идут расчёты; дату показываем рядом, чтобы цена не выглядела
 * взятой с потолка.
 */
export async function plansWithPromo(lang) {
  const promo = await getPromo();
  const rates = await getRates();
  const L = ["ru", "en", "de", "uk"].includes(lang) ? lang : "ru";

  return {
    promo: promo ? { percent: promo.percent, endsAt: promo.endsAt || null, plans: promo.plans || [] } : null,
    plans: Object.values(PLANS).map((p) => {
      const price = priceWithPromo(p, promo);
      const uah = eurToUah(price.final, rates);
      return {
        id: p.id, months: p.months, label: p.label,
        title: (p.title && p.title[L]) || p.label,
        desc: (p.desc && p.desc[L]) || "",
        base: price.base, final: price.final, off: price.off,
        uah: uah || null,
      };
    }),
    rate: rates.eurUah
      ? { eurUah: rates.eurUah, source: rates.source, at: new Date(rates.at || Date.now()).toISOString().slice(0, 10) }
      : null,
    cardPaymentReady: liqpayEnabled,
  };
}

export { methodsForClient };
