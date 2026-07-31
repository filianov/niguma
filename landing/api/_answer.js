/**
 * 15minYoga — общий «мозг» ответов: один словарь для чата на сайте и для бота в Telegram.
 *
 * Здесь нет выдумывания: тема определяется по ключевым словам, ответ берётся из
 * выверенного словаря. Claude (если задан ANTHROPIC_API_KEY) может лишь
 * переформулировать найденный ответ — добавить факт он не может по устройству запроса.
 */
import CONTENT from "./_chat-content.js";

export const LANGS = ["ru", "en", "de", "uk"];
export const HANDOVER_TOPICS = new Set(["operator", "health"]);

export function packFor(lang) {
  return CONTENT[LANGS.includes(lang) ? lang : "ru"] || CONTENT.ru;
}

/** Язык из кода Telegram (ru-RU → ru), с откатом на русский. */
export function langFromTelegram(code) {
  const short = String(code || "").slice(0, 2).toLowerCase();
  return LANGS.includes(short) ? short : "ru";
}

/** Сопоставление по ключевым словам. Возвращает тему или null. */
export function detectTopic(text, lang) {
  const dict = packFor(lang).keywords || {};
  const t = " " + String(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ") + " ";
  let best = null, bestScore = 0;
  for (const topic of Object.keys(dict)) {
    let score = 0;
    for (const kw of dict[topic]) {
      const k = String(kw).toLowerCase().trim();
      if (!k) continue;
      if (t.includes(" " + k + " ") || t.includes(" " + k)) score += k.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = topic; }
  }
  return bestScore > 0 ? best : null;
}

/** Необязательное «оживление» ответа: те же факты, другая формулировка. */
export async function rephrase(answer, question, lang) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return answer;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.SUPPORT_MODEL || "claude-haiku-4-5",
        max_tokens: 220,
        system:
          "You are the 15minYoga assistant. You will be given a VERIFIED answer and the " +
          "visitor's question. Rewrite the verified answer so it responds naturally to that exact " +
          "question, in the same language. You may NOT add any fact that is not in the verified " +
          "answer — no prices, times, promises or medical advice. Keep it to 1-3 short sentences, " +
          "calm and warm. Return only the rewritten answer.",
        messages: [{
          role: "user",
          content: "Visitor question: " + question + "\n\nVerified answer: " + answer,
        }],
      }),
    });
    if (!r.ok) return answer;
    const data = await r.json();
    const out = data && data.content && data.content[0] && data.content[0].text;
    return out && out.trim().length > 4 ? out.trim() : answer;
  } catch (e) {
    return answer;
  }
}

/**
 * Готовый ответ на вопрос: { topic, reply, wantsHuman }.
 * wantsHuman = true для тем «нужен человек» и «здоровье» — там бот замолкает.
 */
export async function answer(text, lang, opts) {
  const pack = packFor(lang);
  const topic = detectTopic(text, lang);
  const wantsHuman = HANDOVER_TOPICS.has(topic);

  if (wantsHuman) {
    return { topic, wantsHuman, reply: topic === "health" ? pack.answers.health : pack.answers.operator };
  }
  const base = topic ? pack.answers[topic] : pack.answers.fallback;
  let reply = topic && !(opts && opts.raw) ? await rephrase(base, text, lang) : base;

  // Спросили про оплату — сразу даём реквизиты, а не обещание их прислать.
  // Значения берутся из переменных окружения: в репозитории их нет и на
  // страницах сайта они не появляются, поэтому поисковики их не индексируют.
  // Дописываем ПОСЛЕ переформулирования: эти строки менять нельзя.
  if (topic === "payment") reply += payoutDetails(lang);

  return { topic: topic || "fallback", wantsHuman: false, reply };
}

/** Реквизиты, которые можно назвать в переписке. Пусто — если не настроены. */
export function payoutDetails(lang) {
  const env = (k) => String(process.env[k] || "").trim();
  const L = LANGS.includes(lang) ? lang : "ru";
  const t = (k) => ({
    head:   { ru: "Реквизиты", uk: "Реквізити", en: "Payment details", de: "Zahlungsdaten" },
    card:   { ru: "Карта Monobank", uk: "Картка Monobank", en: "Monobank card", de: "Monobank-Karte" },
    holder: { ru: "получатель", uk: "отримувач", en: "recipient", de: "Empfänger" },
    usdt:   { ru: "USDT, сеть TRC-20", uk: "USDT, мережа TRC-20", en: "USDT on TRC-20", de: "USDT über TRC-20" },
    after:  {
      ru: "После перевода напишите сюда — подтвердим доступ, обычно в течение дня.",
      uk: "Після переказу напишіть сюди — підтвердимо доступ, зазвичай протягом дня.",
      en: "Once you have sent it, write here — we confirm access, usually within a day.",
      de: "Schreiben Sie nach der Überweisung hier — wir bestätigen den Zugang, meist innerhalb eines Tages.",
    },
  }[k][L]);

  const lines = [];
  if (env("MONOBANK_CARD")) {
    lines.push(t("card") + ": " + env("MONOBANK_CARD") +
      (env("MONOBANK_HOLDER") ? " (" + t("holder") + ": " + env("MONOBANK_HOLDER") + ")" : ""));
  }
  if (env("CRYPTO_WALLET")) {
    lines.push(t("usdt") + ": " + env("CRYPTO_WALLET"));
  }
  if (!lines.length) return "";
  return "\n\n" + t("head") + ":\n" + lines.join("\n") + "\n\n" + t("after");
}
