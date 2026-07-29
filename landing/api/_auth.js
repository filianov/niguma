/**
 * Доступ в админку: пароль → подписанная кука.
 *
 * Пароль хранится в ADMIN_PASSWORD и наружу никогда не выходит: в куке лежит
 * только метка времени и подпись HMAC-SHA256 на секрете ADMIN_SECRET.
 * Подделать её без секрета нельзя, а прочитав — нельзя узнать пароль.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.ADMIN_SECRET || PASSWORD;   // отдельный секрет желателен, но не обязателен
const COOKIE = "y15m_admin";
const TTL_MS = 12 * 60 * 60 * 1000;                     // смена длится 12 часов

export const authConfigured = Boolean(PASSWORD && SECRET);

function sign(payload) {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Сравнение, не зависящее от того, на каком символе строки разошлись. */
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export function checkPassword(given) {
  return authConfigured && safeEqual(given || "", PASSWORD);
}

export function makeToken() {
  const issued = String(Date.now());
  return issued + "." + sign(issued);
}

export function validToken(token) {
  if (!authConfigured || !token) return false;
  const [issued, mac] = String(token).split(".");
  if (!issued || !mac) return false;
  if (!safeEqual(mac, sign(issued))) return false;
  return Date.now() - Number(issued) < TTL_MS;
}

export function cookieHeader(token) {
  const base = COOKIE + "=" + (token || "") + "; Path=/; HttpOnly; SameSite=Strict; Secure";
  return token ? base + "; Max-Age=" + Math.floor(TTL_MS / 1000) : base + "; Max-Age=0";
}

export function tokenFromRequest(req) {
  const raw = (req.headers && req.headers.cookie) || "";
  const hit = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="));
  return hit ? hit.slice(COOKIE.length + 1) : "";
}

export function isAuthed(req) {
  return validToken(tokenFromRequest(req));
}

/** Ответ для неавторизованных. Причину не уточняем — меньше подсказок подбирающему. */
export function denied(res) {
  return res.status(401).json({ ok: false, error: "unauthorized" });
}
