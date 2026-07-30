/**
 * POST /api/liqpay-callback — LiqPay сообщает результат оплаты.
 *
 * Это единственное место, где оплата подтверждается без участия менеджера,
 * поэтому проверка подписи обязательна: без неё кто угодно мог бы прислать
 * «оплата прошла» и получить доступ бесплатно.
 *
 * Повторные вызовы безопасны: LiqPay может прислать подтверждение несколько
 * раз, а уже подтверждённую заявку мы второй раз не проводим — иначе доступ
 * продлился бы дважды за одну оплату.
 */
import { verifyCallback } from "./_liqpay.js";
import {
  getRequest, setRequestStatus, ensureMember, confirmPayment, planById, money,
} from "./_membership.js";
import { sendToOperator, escapeHtml } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  // LiqPay присылает form-urlencoded: data + signature
  let data = "", signature = "";
  const body = req.body;
  if (body && typeof body === "object") {
    data = String(body.data || "");
    signature = String(body.signature || "");
  } else if (typeof body === "string") {
    const p = new URLSearchParams(body);
    data = p.get("data") || "";
    signature = p.get("signature") || "";
  }

  const result = verifyCallback(data, signature);
  if (!result) {
    console.error("[liqpay] подпись не совпала — подтверждение отклонено");
    return res.status(400).json({ ok: false, error: "bad_signature" });
  }

  if (!result.paid) {
    // отказ или ожидание — фиксируем и ждём, LiqPay пришлёт итог позже
    console.error("[liqpay] статус " + result.status + " по заявке " + result.requestId);
    return res.status(200).json({ ok: true, status: result.status });
  }

  const request = await getRequest(result.requestId);
  if (!request) {
    console.error("[liqpay] заявка не найдена: " + result.requestId);
    return res.status(200).json({ ok: true, note: "request_not_found" });
  }
  if (request.status === "paid") {
    return res.status(200).json({ ok: true, note: "already_paid" });   // повтор — не проводим второй раз
  }

  const plan = planById(request.planId);
  if (!plan) return res.status(200).json({ ok: true, note: "bad_plan" });

  const member = await ensureMember({
    name: request.name, email: request.email, phone: request.phone,
    telegram: request.telegram, lang: request.lang,
  });

  const paid = await confirmPayment(member.id, {
    planId: plan.id,
    method: "Карта (LiqPay)",
    note: "LiqPay " + result.status + (result.transactionId ? " · " + result.transactionId : "") +
          " · получено " + result.amount + " " + result.currency,
  });

  await setRequestStatus(request.id, "paid", {
    memberId: member.id,
    confirmedAt: new Date().toISOString(),
    method: "card",
    liqpayStatus: result.status,
    liqpayAmount: String(result.amount || ""),
    liqpayCurrency: String(result.currency || ""),
  });

  await sendToOperator(
    "💳 <b>Оплата картой прошла</b>\n\n" +
    escapeHtml(member.name || member.email) + " — " + escapeHtml(plan.label) + "\n" +
    "Получено: " + escapeHtml(String(result.amount)) + " " + escapeHtml(String(result.currency)) + "\n" +
    "Доступ до <b>" + paid.payment.nextDueAt.slice(0, 10) + "</b>\n" +
    "Ступень: " + paid.member.level.ru + " · бонусов " + money(paid.member.bonusCents) +
    "\n\n<i>подтверждать вручную не нужно — оплата уже проведена</i>"
  );

  return res.status(200).json({ ok: true, paid: true });
}
