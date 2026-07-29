/* ===================================================================
   Niguma — front-end config
   Mirror of the relevant parts of /config/project.config.json.
   Keep these two in sync (or generate this file from the JSON at build).
   =================================================================== */
window.NIGUMA_CONFIG = {
  // Telegram bot — main entry point / first client + funnel
  // NB: Telegram usernames cannot start with a digit → "yoga15min_bot", not "15minyoga_bot".
  // Пока главный бот не запущен на Railway, весь трафик идёт на бота поддержки:
  // он отвечает на вопросы и зовёт человека. Вернуть на главного — заменить здесь на yoga15min_bot.
  telegram:        "https://t.me/yoga15min_chat_bot?start=lead_landing",
  telegramChannel: "https://t.me/yoga15min",

  // Бесплатный чат для новичков — первый шаг для человека с сайта.
  // Сюда ведут «Присоединиться» и «Начать в Telegram»: там живое общение,
  // а не диалог с ботом. Ссылка-приглашение; чтобы закрыть доступ,
  // её нужно пересоздать в настройках чата — правки здесь недостаточно.
  community:       "https://t.me/+uQ3IIV-1ZBFmZGEy",

  // Instagram — primary human support (author writes back directly)
  instagram:       "https://ig.me/m/15minyoga",

  // Other socials
  facebook:        "https://facebook.com/15minyoga",

  // Email — enable after the domain is registered; leave mailto empty to hide
  email:           "mailto:15minyoga.com@gmail.com",

  // Optional automated checkout links (PayPal / Stripe). Filled when enabled.
  pay: {
    paypal: { m1: "", m6: "", m12: "" },
    stripe: { m1: "", m6: "", m12: "" }
  },

  // Lead capture endpoint — serverless function in landing/api/lead.js.
  // Sends the subscriber to Telegram and duplicates it by e-mail.
  // Leave empty -> form gently redirects the user into the Telegram bot instead.
  leadEndpoint: "/api/lead"
};
