/**
 * 15minYoga — способы оплаты.
 *
 * Четыре способа, один сценарий: посетитель выбирает пакет и способ → заявка
 * уходит менеджеру → реквизиты приходят сразу в ответе и повторно от бота в
 * Telegram → человек платит → менеджер подтверждает оплату в кабинете.
 *
 * Приём карт прямо на сайте был отключён после того, как платёжный сервис
 * заблокировал проект; вместо него — обычный перевод на карту.
 *
 * Сами реквизиты живут только в переменных окружения: в репозитории их нет и
 * на страницах сайта они не появляются, поэтому поисковикам не достаются.
 */

/* ------------------------- курсы валют ------------------------- */

/**
 * Курс валют — коммерческий курс ПриватБанка (тот же банк, что обслуживает
 * приём карт), поле «покупка». Официальный курс НБУ отличается на 0.2–0.5%
 * и не отражает того, по чему реально идут расчёты.
 *
 * Обновляем раз в сутки: внутри дня банк курс почти не двигает, а лишний
 * запрос на каждой загрузке страницы не нужен. Если ПриватБанк недоступен,
 * пробуем НБУ — лучше слегка отличающийся курс, чем неработающая оплата.
 */
let ratesCache = { at: 0, eurUah: 0, usdUah: 0, source: "" };
const RATES_TTL = 24 * 60 * 60 * 1000;

const PB_COMMERCIAL = "https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=11";
const NBU_FALLBACK = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";

export async function getRates() {
  if (Date.now() - ratesCache.at < RATES_TTL && ratesCache.eurUah) return ratesCache;

  // основной источник — коммерческий курс ПриватБанка, курс покупки
  try {
    const r = await fetch(PB_COMMERCIAL, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("privat " + r.status);
    const list = await r.json();
    const eur = list.find((x) => x.ccy === "EUR" && x.base_ccy === "UAH");
    const usd = list.find((x) => x.ccy === "USD" && x.base_ccy === "UAH");
    if (eur && Number(eur.buy) > 0) {
      ratesCache = {
        at: Date.now(),
        eurUah: Number(eur.buy),
        usdUah: usd && Number(usd.buy) > 0 ? Number(usd.buy) : 0,
        source: "ПриватБанк",
      };
      return ratesCache;
    }
    throw new Error("no eur");
  } catch (e) {
    console.error("[rates] ПриватБанк недоступен: " + (e && e.message) + " — пробуем НБУ");
  }

  // запасной источник
  try {
    const r = await fetch(NBU_FALLBACK);
    if (!r.ok) throw new Error("nbu " + r.status);
    const list = await r.json();
    const eur = list.find((x) => x.cc === "EUR");
    const usd = list.find((x) => x.cc === "USD");
    if (!eur) throw new Error("no rates");
    ratesCache = {
      at: Date.now(),
      eurUah: Number(eur.rate),
      usdUah: usd ? Number(usd.rate) : 0,
      source: "НБУ",
    };
  } catch (e) {
    // Курс не получен — не выдумываем его. Способы, требующие пересчёта,
    // покажут «сумму уточним», а не случайное число.
    console.error("[rates] курс не получен ни в одном источнике: " + (e && e.message));
  }
  return ratesCache;
}

/** Евро → гривны по курсу покупки, с округлением вверх до целой гривны. */
export function eurToUah(cents, rates) {
  if (!rates || !rates.eurUah) return null;
  return Math.ceil((cents / 100) * rates.eurUah);
}

/**
 * Евро → USDT. Считаем кросс-курсом по котировкам покупки (EUR/UAH ÷ USD/UAH),
 * потому что USDT держится около доллара. Надбавка покрывает движение курса
 * между выставлением суммы и приходом платежа: иначе на кошелёк придёт меньше.
 */
export function eurToUsdt(cents, rates, marginPercent = 2) {
  if (!rates || !rates.eurUah || !rates.usdUah) return null;
  const usd = (cents / 100) * (rates.eurUah / rates.usdUah);
  return Math.ceil(usd * (1 + marginPercent / 100) * 100) / 100;   // два знака
}

/* ------------------------- описание способов ------------------------- */

/**
 * `env` — какие переменные нужны, чтобы способ заработал.
 * `mode` оставлен для совместимости: способы теперь только ручные —
 * человек оставляет заявку и получает реквизиты лично.
 */
export const METHODS = [
  {
    id: "paypal",
    mode: "manual",
    env: ["PAYPAL_ME"],
    icon: "paypal",
    marks: ["visa", "mastercard"],
    ru: { name: "PayPal",
          hint: "Пришлём ссылку с готовой суммой — оплата в пару касаний.",
          badge: "картой или с баланса PayPal" },
    en: { name: "PayPal",
          hint: "We'll send a link with the amount already filled in — pay in two taps.",
          badge: "card or PayPal balance" },
    de: { name: "PayPal",
          hint: "Wir senden einen Link mit fertigem Betrag — Zahlung in zwei Klicks.",
          badge: "Karte oder PayPal-Guthaben" },
    uk: { name: "PayPal",
          hint: "Надішлемо посилання з готовою сумою — оплата у два дотики.",
          badge: "карткою або з балансу PayPal" },
  },
  {
    id: "invoice",
    mode: "manual",
    env: ["EUR_BENEFICIARY", "EUR_IBAN"],
    icon: "bank",
    ru: { name: "Счёт на банковский перевод",
          hint: "Пришлём счёт с IBAN — оплата обычным переводом из вашего банка.",
          badge: "SEPA · счёт для бухгалтерии" },
    en: { name: "Bank transfer invoice",
          hint: "We'll send an invoice with the IBAN — pay by ordinary transfer from your bank.",
          badge: "SEPA · invoice for your books" },
    de: { name: "Rechnung per Banküberweisung",
          hint: "Wir senden eine Rechnung mit IBAN — Zahlung per normaler Überweisung.",
          badge: "SEPA · Rechnung für die Buchhaltung" },
    uk: { name: "Рахунок на банківський переказ",
          hint: "Надішлемо рахунок з IBAN — оплата звичайним переказом із вашого банку.",
          badge: "SEPA · рахунок для бухгалтерії" },
  },
  {
    id: "monocard",
    mode: "manual",
    env: ["MONOBANK_CARD"],
    icon: "card",
    ru: { name: "Перевод на карту Monobank",
          hint: "Пришлём номер карты и сумму в гривне — обычный перевод с карты на карту.",
          badge: "в гривне · за минуту" },
    en: { name: "Monobank card transfer",
          hint: "We'll send the card number and the amount in hryvnia — a card-to-card transfer.",
          badge: "in hryvnia · takes a minute" },
    de: { name: "Überweisung auf Monobank-Karte",
          hint: "Wir senden Kartennummer und Betrag in Hrywnja — Karte-zu-Karte-Überweisung.",
          badge: "in Hrywnja · in einer Minute" },
    uk: { name: "Переказ на картку Monobank",
          hint: "Надішлемо номер картки та суму в гривні — звичайний переказ з картки на картку.",
          badge: "у гривні · за хвилину" },
  },
  {
    id: "crypto",
    mode: "manual",
    env: ["CRYPTO_WALLET"],
    icon: "crypto",
    ru: { name: "Криптовалютой (USDT)",
          hint: "Пришлём адрес кошелька и точную сумму — перевод в сети TRC-20.",
          badge: "USDT · TRC-20" },
    en: { name: "Cryptocurrency (USDT)",
          hint: "We'll send the wallet address and the exact amount — transfer on TRC-20.",
          badge: "USDT · TRC-20" },
    de: { name: "Kryptowährung (USDT)",
          hint: "Wir senden Wallet-Adresse und genauen Betrag — Transfer im TRC-20-Netz.",
          badge: "USDT · TRC-20" },
    uk: { name: "Криптовалютою (USDT)",
          hint: "Надішлемо адресу гаманця й точну суму — переказ у мережі TRC-20.",
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
      id: m.id, mode: m.mode, icon: m.icon, marks: m.marks || [],
      name: m[L].name, hint: m[L].hint, badge: m[L].badge,
    };
    if (cents) {
      // Перевод на карту приходит в гривне, поэтому сумму в гривне показываем
      // именно здесь — там, где она нужна для платежа, а не под ценой пакета.
      if (m.id === "monocard") {
        const uah = eurToUah(cents, rates);
        if (uah) out.amountNote = "≈ " + uah.toLocaleString("uk-UA") + " ₴";
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

  /**
   * Подписи полей реквизитов.
   *
   * Раньше они были жёстко русскими и печатались всем: украинец в блоке
   * «Реквізити для оплати» читал «Получатель», «Назначение платежа». Слова
   * IBAN и BIC намеренно не переводятся — это международные обозначения,
   * и в банковских формах они везде пишутся одинаково.
   */
  const t = (k) => ({
    cardNumber:  { ru: "Номер карты", uk: "Номер картки", en: "Card number", de: "Kartennummer" },
    cardHolder:  { ru: "Получатель", uk: "Отримувач", en: "Cardholder", de: "Karteninhaber" },
    transferNote:{ ru: "Комментарий к переводу", uk: "Коментар до переказу",
                   en: "Transfer note", de: "Verwendungszweck" },
    beneficiary: { ru: "Получатель", uk: "Отримувач", en: "Beneficiary", de: "Empfänger" },
    bank:        { ru: "Банк", uk: "Банк", en: "Bank", de: "Bank" },
    amount:      { ru: "Сумма", uk: "Сума", en: "Amount", de: "Betrag" },
    reference:   { ru: "Назначение платежа", uk: "Призначення платежу", en: "Payment reference", de: "Verwendungszweck" },
    payLink:     { ru: "Ссылка для оплаты", uk: "Посилання для оплати", en: "Payment link", de: "Zahlungslink" },
    paypalTo:    { ru: "Получатель в PayPal", uk: "Отримувач у PayPal", en: "PayPal recipient", de: "PayPal-Empfänger" },
    network:     { ru: "Сеть", uk: "Мережа", en: "Network", de: "Netzwerk" },
    wallet:      { ru: "Адрес кошелька", uk: "Адреса гаманця", en: "Wallet address", de: "Wallet-Adresse" },
    tbd:         { ru: "сумму уточним", uk: "суму уточнимо", en: "amount to be confirmed", de: "Betrag folgt" },
  }[k][L]);

  if (methodId === "invoice") {
    return {
      title: { ru: "Счёт на оплату", en: "Invoice", de: "Rechnung", uk: "Рахунок на оплату" }[L],
      lines: [
        { label: t("beneficiary"), value: env("EUR_BENEFICIARY") },
        { label: "IBAN", value: env("EUR_IBAN") },
        env("EUR_BIC") ? { label: "BIC", value: env("EUR_BIC") } : null,
        env("EUR_BANK") ? { label: t("bank"), value: env("EUR_BANK") } : null,
        { label: t("amount"), value: eur + " EUR" },
        { label: t("reference"), value: env("EUR_REFERENCE") || "15minYoga" },
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
    // Принимаем оба варианта: короткую ссылку PayPal.Me и просто адрес почты.
    // PayPal.Me работает только с никнеймом (paypal.me/имя) — адрес почты в
    // такой ссылке даёт 404, поэтому по виду значения выбираем, что показать.
    const raw = env("PAYPAL_ME");
    const isLink = /^https?:\/\//i.test(raw) && !raw.includes("@");
    // PayPal.Me принимает сумму и валюту прямо в адресе: paypal.me/Имя/500EUR.
    // Человек попадает на страницу с уже подставленной суммой — ошибиться в ней
    // или ввести не ту валюту невозможно.
    const payLink = isLink
      ? raw.replace(/\/+$/, "") + "/" + eur + "EUR"
      : raw;
    return {
      title: "PayPal",
      lines: isLink
        ? [
            { label: t("payLink"), value: payLink },
            { label: t("amount"), value: eur + " EUR" },
          ]
        : [
            { label: t("paypalTo"), value: raw.replace(/^https?:\/\/(www\.)?paypal\.me\//i, "") },
            { label: t("amount"), value: eur + " EUR" },
          ],
      note: (isLink
        ? {
            ru: "Выберите «отправить другу», иначе PayPal удержит комиссию с получателя.",
            en: "Please choose “sending to a friend”, otherwise PayPal charges the recipient a fee.",
            de: "Bitte wählen Sie „an Freunde senden“, sonst berechnet PayPal dem Empfänger eine Gebühr.",
            uk: "Оберіть «надіслати другу», інакше PayPal стягне комісію з отримувача.",
          }
        : {
            ru: "В приложении PayPal выберите «Отправить», укажите этот адрес и сумму, тип перевода — «другу». Иначе PayPal удержит комиссию с получателя.",
            en: "In PayPal choose “Send”, enter this address and the amount, and select “sending to a friend”. Otherwise PayPal charges the recipient a fee.",
            de: "Wählen Sie in PayPal „Senden“, geben Sie diese Adresse und den Betrag ein und wählen Sie „an Freunde senden“. Sonst berechnet PayPal dem Empfänger eine Gebühr.",
            uk: "У застосунку PayPal оберіть «Надіслати», вкажіть цю адресу й суму, тип переказу — «другу». Інакше PayPal стягне комісію з отримувача.",
          })[L],
    };
  }

  if (methodId === "monocard") {
    const uah = eurToUah(cents, rates);
    return {
      title: { ru: "Перевод на карту", uk: "Переказ на картку",
               en: "Card transfer", de: "Kartenüberweisung" }[L],
      lines: [
        { label: t("cardNumber"), value: env("MONOBANK_CARD") },
        env("MONOBANK_HOLDER") ? { label: t("cardHolder"), value: env("MONOBANK_HOLDER") } : null,
        { label: t("amount"), value: uah ? uah.toLocaleString("uk-UA") + " ₴" : eur + " EUR (" + t("tbd") + ")" },
        { label: t("transferNote"), value: "15minYoga" },
      ].filter(Boolean),
      note: {
        ru: "Сумма пересчитана по курсу на сегодня. Перевод идёт с карты на карту — как обычный платёж другу.",
        uk: "Суму перераховано за курсом на сьогодні. Переказ іде з картки на картку — як звичайний платіж другу.",
        en: "The amount uses today's rate. It is an ordinary card-to-card transfer, like sending money to a friend.",
        de: "Der Betrag basiert auf dem heutigen Kurs. Es ist eine gewöhnliche Karte-zu-Karte-Überweisung.",
      }[L],
    };
  }

  if (methodId === "crypto") {
    const usdt = eurToUsdt(cents, rates);
    return {
      title: { ru: "Оплата в USDT", en: "Payment in USDT", de: "Zahlung in USDT", uk: "Оплата в USDT" }[L],
      lines: [
        { label: t("network"), value: env("CRYPTO_NETWORK") || "USDT-TRC20" },
        { label: t("wallet"), value: env("CRYPTO_WALLET") },
        { label: t("amount"), value: usdt ? usdt + " USDT" : eur + " EUR (" + t("tbd") + ")" },
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
