/**
 * 15minYoga — приём заявок с формы на лендинге.
 *
 * POST /api/lead  { email, lang, consent, source }
 *   → мгновенное уведомление в Telegram владельцу
 *   → дубль письмом на почту проекта
 *
 * Каналы независимы: если один не настроен или упал, второй всё равно
 * отработает, а посетитель в любом случае получает успешный ответ —
 * заявку нельзя терять из-за проблем на нашей стороне.
 *
 * Переменные окружения (Vercel → Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN  — токен бота от @BotFather
 *   TELEGRAM_ADMIN_ID   — ваш Telegram ID (от @userinfobot)
 *   RESEND_API_KEY      — ключ resend.com (для письма); без него шлём только в Telegram
 *   LEAD_EMAIL_TO       — куда дублировать (по умолчанию 15minyoga.com@gmail.com)
 *   LEAD_EMAIL_FROM     — отправитель; до верификации домена: onboarding@resend.dev
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LANG_NAMES = { ru: "русский", en: "English", de: "Deutsch", uk: "українська" };

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * TELEGRAM_ADMIN_ID может содержать несколько адресов через запятую.
 *
 * Здесь переменная бралась целиком и уходила в chat_id как есть: при двух
 * получателях Telegram видел «336159774,-100…», отвечал ошибкой, и заявки
 * с формы не приходили никуда — молча, без следа на сайте. Остальной код
 * давно рассылает по списку (_lib.js), эта функция осталась в стороне.
 */
async function notifyTelegram({ email, lang, source, when }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = String(process.env.TELEGRAM_ADMIN_ID || "")
    .split(",").map((x) => x.trim()).filter(Boolean);
  if (!token || !chats.length) return { ok: false, skipped: "no telegram env" };

  const text =
    "🌱 <b>Новая заявка с сайта</b>\n\n" +
    "✉️ <b>" + esc(email) + "</b>\n" +
    "🌍 Язык: " + esc(LANG_NAMES[lang] || lang || "—") + "\n" +
    "🔗 Источник: " + esc(source || "лендинг") + "\n" +
    "🕒 " + esc(when);

  let sent = 0;
  for (const chat of chats) {
    const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (r.ok) sent++;
  }
  return { ok: sent > 0, sent, of: chats.length };
}

async function notifyEmail({ email, lang, source, when }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: "no resend key" };

  const to = process.env.LEAD_EMAIL_TO || "15minyoga.com@gmail.com";
  const from = process.env.LEAD_EMAIL_FROM || "15minYoga <onboarding@resend.dev>";

  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#3B382F">' +
    '<h2 style="color:#6B705C;margin:0 0 16px">Новая заявка с сайта 15minyoga.com</h2>' +
    '<table style="border-collapse:collapse;font-size:15px">' +
    '<tr><td style="padding:6px 14px 6px 0;color:#837C6D">E-mail</td><td><b>' + esc(email) + "</b></td></tr>" +
    '<tr><td style="padding:6px 14px 6px 0;color:#837C6D">Язык</td><td>' + esc(LANG_NAMES[lang] || lang || "—") + "</td></tr>" +
    '<tr><td style="padding:6px 14px 6px 0;color:#837C6D">Источник</td><td>' + esc(source || "лендинг") + "</td></tr>" +
    '<tr><td style="padding:6px 14px 6px 0;color:#837C6D">Время</td><td>' + esc(when) + "</td></tr>" +
    "</table>" +
    '<p style="margin-top:22px;color:#837C6D;font-size:13px">Человек подтвердил согласие на получение писем ' +
    "о новых потоках. Ответьте ему с этого адреса — и он попадёт в переписку.</p></div>";

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,          // ответ уходит прямо человеку
      subject: "Заявка с 15minyoga.com — " + email,
      html,
    }),
  });
  return { ok: r.ok, status: r.status };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const email = String(body.email || "").trim().toLowerCase();
  const lang = String(body.lang || "").slice(0, 5);
  const source = String(body.source || "landing").slice(0, 60);

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: "invalid_email" });
  }
  if (!body.consent) {
    return res.status(400).json({ ok: false, error: "consent_required" });
  }

  const when = new Date().toLocaleString("ru-RU", {
    timeZone: "Europe/Vienna", dateStyle: "medium", timeStyle: "short",
  }) + " (Вена)";

  const payload = { email, lang, source, when };

  // оба канала параллельно; падение одного не мешает другому
  const [tg, mail] = await Promise.allSettled([
    notifyTelegram(payload),
    notifyEmail(payload),
  ]);

  const delivered =
    (tg.status === "fulfilled" && tg.value.ok) ||
    (mail.status === "fulfilled" && mail.value.ok);

  if (!delivered) {
    // ни один канал не сработал — пишем в лог Vercel, чтобы заявка не пропала бесследно
    console.error("LEAD NOT DELIVERED", JSON.stringify(payload), JSON.stringify({ tg, mail }));
  }

  // посетителю всегда отвечаем успехом: он свою часть выполнил
  return res.status(200).json({ ok: true, delivered });
}
