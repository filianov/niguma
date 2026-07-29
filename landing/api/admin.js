/**
 * /api/admin — единственная точка входа для кабинета менеджера.
 *
 * Все действия идут одним обработчиком: на Vercel каждый файл — отдельная
 * функция, и дробить на десяток файлов ради одного меню незачем.
 *
 * Действие передаётся полем `action`. Кроме входа, каждое требует куки-сессии.
 */
import {
  checkPassword, makeToken, cookieHeader, isAuthed, denied, authConfigured,
} from "./_auth.js";
import {
  PLANS, planById, listRequests, getRequest, setRequestStatus,
  ensureMember, confirmPayment, listMembers, getMember, updateMember,
  listPayments, listLoyalty, adjustBonus, dueMembers,
  getPromo, setPromo, priceWithPromo, money, LEVELS, normalizeEmail,
} from "./_membership.js";
import { sendToOperator, escapeHtml } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const action = String(body.action || "");

  if (!authConfigured) {
    return res.status(503).json({
      ok: false,
      error: "not_configured",
      hint: "Задайте ADMIN_PASSWORD и ADMIN_SECRET в переменных окружения Vercel, затем Redeploy.",
    });
  }

  /* ------------------------------ вход ------------------------------ */
  if (action === "login") {
    if (!checkPassword(body.password)) {
      return res.status(401).json({ ok: false, error: "bad_password" });
    }
    res.setHeader("Set-Cookie", cookieHeader(makeToken()));
    return res.status(200).json({ ok: true });
  }

  if (action === "logout") {
    res.setHeader("Set-Cookie", cookieHeader(""));
    return res.status(200).json({ ok: true });
  }

  if (action === "session") {
    return res.status(200).json({ ok: true, authed: isAuthed(req) });
  }

  if (!isAuthed(req)) return denied(res);

  /* ---------------------------- сводка ---------------------------- */
  if (action === "overview") {
    const [requests, due, promo, members] = await Promise.all([
      listRequests("new", 50), dueMembers(14), getPromo(), listMembers(500),
    ]);
    const active = members.filter((m) => m.nextDueAt && new Date(m.nextDueAt).getTime() > Date.now());
    return res.status(200).json({
      ok: true,
      requests,
      due,
      promo,
      levels: LEVELS,
      plans: Object.values(PLANS).map((p) => {
        const price = priceWithPromo(p, promo);
        return { ...p, final: price.final, off: price.off };
      }),
      stats: {
        members: members.length,
        active: active.length,
        overdue: due.filter((m) => m.daysLeft !== null && m.daysLeft < 0).length,
        newRequests: requests.length,
        bonusOutstanding: members.reduce((a, m) => a + m.bonusCents, 0),
      },
    });
  }

  /* ---------------------------- участники ---------------------------- */
  if (action === "members") {
    const q = String(body.query || "").trim().toLowerCase();
    let list = await listMembers(500);
    if (q) {
      list = list.filter((m) =>
        (m.name + " " + m.email + " " + m.phone + " " + m.telegram).toLowerCase().includes(q));
    }
    return res.status(200).json({ ok: true, members: list });
  }

  if (action === "member") {
    const m = await getMember(String(body.id || ""));
    if (!m) return res.status(404).json({ ok: false, error: "not_found" });
    const [payments, loyalty] = await Promise.all([listPayments(m.id), listLoyalty(m.id)]);
    return res.status(200).json({ ok: true, member: m, payments, loyalty });
  }

  if (action === "member.update") {
    const id = String(body.id || "");
    const allowed = ["name", "email", "phone", "telegram", "lang", "note", "nextDueAt"];
    const patch = {};
    for (const k of allowed) if (k in body) patch[k] = k === "email" ? normalizeEmail(body[k]) : body[k];
    const m = await updateMember(id, patch);
    return res.status(200).json({ ok: Boolean(m), member: m });
  }

  if (action === "bonus.adjust") {
    const m = await adjustBonus(String(body.id || ""), Math.round(Number(body.deltaCents) || 0), body.reason);
    return res.status(200).json({ ok: Boolean(m), member: m });
  }

  /* ------------------------- заявки и оплаты ------------------------- */
  if (action === "requests") {
    return res.status(200).json({ ok: true, requests: await listRequests(body.status || null, 200) });
  }

  if (action === "request.confirm") {
    const request = await getRequest(String(body.id || ""));
    if (!request) return res.status(404).json({ ok: false, error: "not_found" });

    const plan = planById(body.planId || request.planId);
    if (!plan) return res.status(400).json({ ok: false, error: "bad_plan" });

    const member = await ensureMember({
      name: request.name, email: request.email, phone: request.phone,
      telegram: request.telegram, lang: request.lang,
    });

    const result = await confirmPayment(member.id, {
      planId: plan.id,
      cents: Number.isFinite(Number(body.cents)) ? Math.round(Number(body.cents)) : undefined,
      paidAt: body.paidAt,
      method: body.method,
      bonusUsedCents: Math.round(Number(body.bonusUsedCents) || 0),
      note: body.note,
    });
    if (!result) return res.status(400).json({ ok: false, error: "payment_failed" });

    await setRequestStatus(request.id, "paid", { memberId: member.id, confirmedAt: new Date().toISOString() });

    await sendToOperator(
      "✅ <b>Оплата подтверждена</b>\n\n" +
      escapeHtml(result.member.name || result.member.email) + " — " + escapeHtml(plan.label) + "\n" +
      "Доступ до <b>" + result.payment.nextDueAt.slice(0, 10) + "</b>\n" +
      "Ступень: " + result.member.level.ru + " · бонусов " + money(result.member.bonusCents)
    );

    return res.status(200).json({ ok: true, member: result.member, payment: result.payment });
  }

  if (action === "request.reject") {
    const r = await setRequestStatus(String(body.id || ""), "rejected",
      { note: String(body.note || ""), closedAt: new Date().toISOString() });
    return res.status(200).json({ ok: Boolean(r), request: r });
  }

  /** Оплата без заявки — человек написал напрямую или платит повторно. */
  if (action === "payment.manual") {
    const member = await ensureMember({
      name: body.name, email: body.email, phone: body.phone,
      telegram: body.telegram, lang: body.lang,
    });
    if (!member) return res.status(400).json({ ok: false, error: "bad_member" });
    const result = await confirmPayment(member.id, {
      planId: body.planId,
      cents: Number.isFinite(Number(body.cents)) ? Math.round(Number(body.cents)) : undefined,
      paidAt: body.paidAt, method: body.method,
      bonusUsedCents: Math.round(Number(body.bonusUsedCents) || 0),
      note: body.note,
    });
    if (!result) return res.status(400).json({ ok: false, error: "payment_failed" });
    return res.status(200).json({ ok: true, member: result.member, payment: result.payment });
  }

  /* ------------------------------ акции ------------------------------ */
  if (action === "promo.get") {
    return res.status(200).json({ ok: true, promo: await getPromo() });
  }

  if (action === "promo.set") {
    const percent = Math.round(Number(body.percent) || 0);
    if (percent < 1 || percent > 90) return res.status(400).json({ ok: false, error: "bad_percent" });
    const promo = {
      percent,
      endsAt: body.endsAt ? new Date(body.endsAt).toISOString() : null,
      plans: Array.isArray(body.plans) ? body.plans.filter((p) => PLANS[p]) : [],
      name: String(body.name || "").slice(0, 80),
    };
    await setPromo(promo);
    return res.status(200).json({ ok: true, promo });
  }

  if (action === "promo.clear") {
    await setPromo(null);
    return res.status(200).json({ ok: true, promo: null });
  }

  /* --------------------------- напоминания --------------------------- */
  /** Ручная отправка списка «кому пора» в чат поддержки. */
  if (action === "due.notify") {
    const list = await dueMembers(Math.max(1, Number(body.days) || 7));
    if (!list.length) return res.status(200).json({ ok: true, sent: 0 });
    await sendToOperator(renderDue(list));
    return res.status(200).json({ ok: true, sent: list.length });
  }

  return res.status(400).json({ ok: false, error: "unknown_action" });
}

/** Текст напоминания — общий для ручной отправки и для расписания. */
export function renderDue(list) {
  const overdue = list.filter((m) => m.daysLeft < 0);
  const soon = list.filter((m) => m.daysLeft >= 0);
  const line = (m) =>
    "• <b>" + escapeHtml(m.name || m.email) + "</b> — " +
    (m.daysLeft < 0 ? "просрочено " + Math.abs(m.daysLeft) + " дн." : "через " + m.daysLeft + " дн.") +
    " (" + m.nextDueAt.slice(0, 10) + ")\n" +
    "  " + escapeHtml(m.email) + (m.phone ? " · " + escapeHtml(m.phone) : "") +
    (m.telegram ? " · " + escapeHtml(m.telegram) : "") + "\n" +
    "  ступень «" + m.level.ru + "», бонусов " + money(m.bonusCents);

  return "🔔 <b>Пора продлевать</b>\n\n" +
    (overdue.length ? "<b>Просрочено:</b>\n" + overdue.map(line).join("\n") + "\n\n" : "") +
    (soon.length ? "<b>Скоро:</b>\n" + soon.map(line).join("\n") : "");
}
