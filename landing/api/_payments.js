/**
 * 15minYoga — способы оплаты.
 *
 * Четыре способа, два разных сценария:
 *
 *   Реквизиты присылает человек (счёт, PayPal, криптовалюта)
 *     Посетитель выбирает способ → заявка уходит менеджеру → человек получает
 *     реквизиты в Telegram → платит → менеджер подтверждает в кабинете.
 *
 *   Оплата сразу на сайте (карта через LiqPay)
 *     Посетитель выбирает карту → сразу открывается страница оплаты →
 *     LiqPay сам сообщает результат на /api/liqpay-callback → оплата
 *     подтверждается без участия менеджера.
 *
 * Способ доступен, только если для него заданы настройки. Не заданы — способ
 * не показывается: пустая кнопка «оплатить» хуже отсутствующей.
 */

/* ------------------------- курсы валют ------------------------- */

/**
 * Цены у нас в евро, а LiqPay считает в гривне, а криптоплатёж — в USDT.
 * Курс берём у Национального банка Украины: официальный источник, без ключей
 * и лимитов. Держим в памяти функции 6 часов — внутри дня курс НБУ не меняется,
 * а лишний запрос на каждой загрузке страницы не нужен.
 */
let ratesCache = { at: 0, eurUah: 0, usdUah: 0 };
const RATES_TTL = 6 * 60 * 60 * 1000;

export async function getRates() {
  if (Date.now() - ratesCache.at < RATES_TTL && ratesCache.eurUah) return ratesCache;
  try {
    const r = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json");
    if (!r.ok) throw new Error("nbu " + r.status);
    const list = await r.json();
    const eur = list.find((x) => x.cc === "EUR");
    const usd = list.find((x) => x.cc === "USD");
    if (!eur || !usd) throw new Error("no rates");
    ratesCache = { at: Date.now(), eurUah: Number(eur.rate), usdUah: Number(usd.rate) };
  } catch (e) {
    // Курс не получен — не выдумываем его. Способы, требующие пересчёта,
    // покажут «уточним сумму при оплате», а не случайное число.
    console.error("[rates] не удалось получить курс НБУ: " + (e && e.message));
  }
  return ratesCache;
}

/** Евро → гривны, с округлением вверх до целой гривны. */
export function eurToUah(cents, rates) {
  if (!rates || !rates.eurUah) return null;
  return Math.ceil((cents / 100) * rates.eurUah);
}

/**
 * Евро → USDT. Считаем через кросс-курс НБУ (EUR/UAH ÷ USD/UAH), потому что
 * USDT держится около доллара. Небольшую разницу курса покрываем надбавкой:
 * иначе при отправке фиксированной суммы на кошелёк может не хватить.
 */
export function eurToUsdt(cents, rates, marginPercent = 2) {
  if (!rates || !rates.eurUah || !rates.usdUah) return null;
  const usd = (cents / 100) * (rates.eurUah / rates.usdUah);
  return Math.ceil(usd * (1 + marginPercent / 100) * 100) / 100;   // два знака
}

/* ------------------------- описание способов ------------------------- */

/**
 * `env` — какие переменные нужны, чтобы способ заработал.
 * `mode` — "manual" (реквизиты присылает человек) или "instant" (оплата на сайте).
 */
export const METHODS = [
  {
    id: "invoice",
    mode: "manual",
    env: ["EUR_IBAN", "EUR_BENEFICIARY"],
    icon: "bank",
    ru: { name: "Счёт на банковский перевод",
          hint: "Пришлём счёт с реквизитами — оплата из любого банка Европы",
          badge: "SEPA · для юрлиц и физлиц" },
    en: { name: "Bank transfer invoice",
          hint: "We'll send an invoice with the details — pay from any European bank",
          badge: "SEPA · companies and individuals" },
    de: { name: "Rechnung per Banküberweisung",
          hint: "Wir senden eine Rechnung mit den Daten — Zahlung von jeder europäischen Bank",
          badge: "SEPA · Firmen und Privatpersonen" },
    uk: { name: "Рахунок на банківський переказ",
          hint: "Надішлемо рахунок із реквізитами — оплата з будь-якого банку Європи",
          badge: "SEPA · для юросіб і фізосіб" },
  },
  {
    id: "paypal",
    mode: "manual",
    env: ["PAYPAL_ME"],
    icon: "paypal",
    ru: { name: "PayPal", hint: "Пришлём ссылку на оплату — картой или из баланса PayPal",
          badge: "быстро, без реквизитов" },
    en: { name: "PayPal", hint: "We'll send a payment link — card or PayPal balance",
          badge: "fast, no bank details" },
    de: { name: "PayPal", hint: "Wir senden einen Zahlungslink — Karte oder PayPal-Guthaben",
          badge: "schnell, ohne Bankdaten" },
    uk: { name: "PayPal", hint: "Надішлемо посилання на оплату — карткою або з балансу PayPal",
          badge: "швидко, без реквізитів" },
  },
  {
    id: "card",
    mode: "instant",
    env: ["LIQPAY_PUBLIC_KEY", "LIQPAY_PRIVATE_KEY"],
    icon: "card",
    ru: { name: "Картой онлайн", hint: "Оплата сразу на сайте: карта, Apple Pay, Google Pay",
          badge: "Visa · Mastercard · Apple Pay · Google Pay" },
    en: { name: "Card online", hint: "Pay right on the site: card, Apple Pay, Google Pay",
          badge: "Visa · Mastercard · Apple Pay · Google Pay" },
    de: { name: "Karte online", hint: "Direkt auf der Seite bezahlen: Karte, Apple Pay, Google Pay",
          badge: "Visa · Mastercard · Apple Pay · Google Pay" },
    uk: { name: "Карткою онлайн", hint: "Оплата просто на сайті: картка, Apple Pay, Google Pay",
          badge: "Visa · Mastercard · Apple Pay · Google Pay" },
  },
  {
    id: "crypto",
    mode: "manual",
    env: ["CRYPTO_WALLET"],
    icon: "crypto",
    ru: { name: "Криптовалютой", hint: "USDT в сети TRC-20 — пришлём адрес и точную сумму",
          badge: "USDT · TRC-20" },
    en: { name: "Cryptocurrency", hint: "USDT on TRC-20 — we'll send the address and exact amount",
          badge: "USDT · TRC-20" },
    de: { name: "Kryptowährung", hint: "USDT über TRC-20 — wir senden Adresse und genauen Betrag",
          badge: "USDT · TRC-20" },
    uk: { name: "Криптовалютою", hint: "USDT у мережі TRC-20 — надішлемо адресу й точну суму",
          badge: "USDT · TRC-20" },
  },
];

/** Настроен ли способ: все нужные переменные заданы и не пусты. */
export function isConfigured(method) {
  return method.env.every((k) => {
    const v = process.env[k];
    return v && String(v).trim() && String(v).trim() !== "REPLACE_ME";
  });
}

/**
 * Способы для показа на сайте: с переводом на нужный язык и пересчитанной
 * суммой там, где она отличается от евро.
 */
export async function methodsForClient(lang, cents) {
  const rates = await getRates();
  const L = ["ru", "en", "de", "uk"].includes(lang) ? lang : "ru";

  return METHODS.filter(isConfigured).map((m) => {
    const out = {
      id: m.id, mode: m.mode, icon: m.icon,
      name: m[L].name, hint: m[L].hint, badge: m[L].badge,
    };
    if (cents) {
      if (m.id === "card") {
        const uah = eurToUah(cents, rates);
        if (uah) out.amountNote = uah.toLocaleString("uk-UA") + " ₴";
      }
      if (m.id === "crypto") {
        const usdt = eurToUsdt(cents, rates);
        if (usdt) out.amountNote = "≈ " + usdt + " USDT";
      }
    }
    return out;
  });
}

export function methodById(id) {
  return METHODS.find((m) => m.id === id) || null;
}

/* ------------------------- реквизиты для клиента ------------------------- */

/**
 * Что отправить человеку после выбора способа. Реквизиты живут только в
 * переменных окружения и никогда не попадают на страницу: их получает лично
 * тот, кто оставил заявку.
 */
export async function paymentInstructions(methodId, cents, lang) {
  const L = ["ru", "en", "de", "uk"].includes(lang) ? lang : "ru";
  const eur = (cents / 100).toFixed(2).replace(/\.00$/, "");
  const rates = await getRates();
  const env = (k) => String(process.env[k] || "").trim();

  if (methodId === "invoice") {
    return {
      title: { ru: "Счёт на оплату", en: "Invoice", de: "Rechnung", uk: "Рахунок на оплату" }[L],
      lines: [
        { label: "Получатель", value: env("EUR_BENEFICIARY") },
        { label: "IBAN", value: env("EUR_IBAN") },
        env("EUR_BIC") ? { label: "BIC", value: env("EUR_BIC") } : null,
        env("EUR_BANK") ? { label: "Банк", value: env("EUR_BANK") } : null,
        { label: "Сумма", value: eur + " EUR" },
        { label: "Назначение платежа", value: env("EUR_REFERENCE") || "15minYoga" },
      ].filter(Boolean),
      note: {
        ru: "Назначение платежа укажите точно как в счёте — по нему мы находим оплату.",
        en: "Please quote the reference exactly as in the invoice — that is how we match the payment.",
        de: "Bitte geben Sie den Verwendungszweck genau wie in der Rechnung an — daran erkennen wir die Zahlung.",
        uk: "Призначення платежу вкажіть точно як у рахунку — за ним ми знаходимо оплату.",
      }[L],
    };
  }

  if (methodId === "paypal") {
    return {
      title: "PayPal",
      lines: [
        { label: "Ссылка", value: env("PAYPAL_ME") },
        { label: "Сумма", value: eur + " EUR" },
      ],
      note: {
        ru: "Выберите «отправить другу», иначе PayPal удержит комиссию с получателя.",
        en: "Please choose “sending to a friend”, otherwise PayPal charges the recipient a fee.",
        de: "Bitte wählen Sie „an Freunde senden“, sonst berechnet PayPal dem Empfänger eine Gebühr.",
        uk: "Оберіть «надіслати другу», інакше PayPal стягне комісію з отримувача.",
      }[L],
    };
  }

  if (methodId === "crypto") {
    const usdt = eurToUsdt(cents, rates);
    return {
      title: { ru: "Оплата в USDT", en: "Payment in USDT", de: "Zahlung in USDT", uk: "Оплата в USDT" }[L],
      lines: [
        { label: "Сеть", value: env("CRYPTO_NETWORK") || "USDT-TRC20" },
        { label: "Адрес кошелька", value: env("CRYPTO_WALLET") },
        { label: "Сумма", value: usdt ? usdt + " USDT" : eur + " EUR (сумму уточним)" },
      ],
      note: {
        ru: "Сумма пересчитана по курсу на сегодня и действует 24 часа. Проверьте сеть перед отправкой: перевод в другой сети теряется безвозвратно.",
        en: "The amount uses today's rate and is valid for 24 hours. Check the network before sending: a transfer on a different network is lost permanently.",
        de: "Der Betrag basiert auf dem heutigen Kurs und gilt 24 Stunden. Prüfen Sie das Netzwerk vor dem Senden: eine Überweisung im falschen Netzwerk ist unwiederbringlich verloren.",
        uk: "Суму перераховано за курсом на сьогодні, вона діє 24 години. Перевірте мережу перед надсиланням: переказ в іншій мережі втрачається безповоротно.",
      }[L],
    };
  }

  return null;
}
