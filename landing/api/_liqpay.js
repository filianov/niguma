/**
 * LiqPay (ПриватБанк) — оплата картой, Apple Pay и Google Pay.
 *
 * Модель проверена на другом проекте, здесь важны те же три вещи:
 *
 *   1. Подпись — base64(sha1(private + data + private)). Ключи обязательно
 *      через .trim(): случайный пробел при вставке в переменную окружения —
 *      самая частая причина ответа «Невірний підпис signature».
 *   2. version: 3, не 7. Седьмая версия требует другого алгоритма подписи,
 *      и с классической sha1 LiqPay её отвергает.
 *   3. server_url должен быть публичным адресом. Локальный адрес в проде
 *      означает, что подтверждение оплаты не придёт и заявка зависнет.
 *
 * Валюта: цены у нас в евро, а счёт украинского предпринимателя — в гривне,
 * поэтому сумма пересчитывается по курсу НБУ. Если ваш договор с LiqPay
 * допускает приём в евро, поставьте LIQPAY_CURRENCY=EUR — пересчёт отключится.
 */
import { createHash } from "node:crypto";
import { getRates, eurToUah } from "./_payments.js";

const PUB = String(process.env.LIQPAY_PUBLIC_KEY || "").trim();
const PRIV = String(process.env.LIQPAY_PRIVATE_KEY || "").trim();
const CURRENCY = String(process.env.LIQPAY_CURRENCY || "UAH").trim().toUpperCase();
const SITE = String(process.env.SITE_URL || "https://15minyoga.com").trim().replace(/\/$/, "");

export const liqpayEnabled = Boolean(PUB && PRIV);

export function sign(data) {
  return createHash("sha1").update(PRIV + data + PRIV).digest("base64");
}

/**
 * Данные для формы оплаты. Возвращает { data, signature, amount, currency }
 * или null, если ключи не заданы либо не удалось получить курс.
 */
export async function checkoutForm({ requestId, cents, planLabel, lang, email }) {
  if (!liqpayEnabled) return null;

  let amount, currency = CURRENCY;
  if (CURRENCY === "EUR") {
    amount = Number((cents / 100).toFixed(2));
  } else {
    const uah = eurToUah(cents, await getRates());
    if (!uah) return null;          // без курса сумму не выдумываем
    amount = uah;
  }

  const payload = {
    version: 3,
    public_key: PUB,
    action: "pay",
    amount,
    currency,
    description: "15minYoga — " + planLabel,
    order_id: requestId,
    language: ["uk", "en"].includes(lang) ? lang : "en",
    // apay/gpay включают Apple Pay и Google Pay на странице LiqPay
    paytypes: "card,apay,gpay,privat24,qr",
    result_url: SITE + "/pay/done?r=" + encodeURIComponent(requestId),
    server_url: SITE + "/api/liqpay-callback",
    product_name: ("15minYoga — " + planLabel).slice(0, 100),
    product_url: SITE.slice(0, 510),
    product_category: "Online yoga membership",
    ...(email ? { sender_email: String(email).slice(0, 120) } : {}),
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  return { data, signature: sign(data), amount, currency, action: "https://www.liqpay.ua/api/3/checkout" };
}

/**
 * Проверка ответа LiqPay. Возвращает разобранные данные только при верной
 * подписи: без этой проверки любой мог бы отправить нам «оплату прошла».
 */
export function verifyCallback(data, signature) {
  if (!PRIV || !data || !signature) return null;
  if (sign(data) !== signature) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
  } catch (e) {
    return null;
  }
  return {
    requestId: payload.order_id,
    status: payload.status,
    amount: payload.amount,
    currency: payload.currency,
    paid: ["success", "sandbox"].includes(payload.status),
    transactionId: payload.transaction_id || payload.payment_id || "",
    raw: payload,
  };
}
