/* ===================================================================
   Niguma — front-end config
   Mirror of the relevant parts of /config/project.config.json.
   Keep these two in sync (or generate this file from the JSON at build).
   =================================================================== */
window.NIGUMA_CONFIG = {
  // Telegram bot — main entry point / first client + funnel
  telegram:        "https://t.me/niguma_bot?start=lead_landing",
  telegramChannel: "https://t.me/niguma_yoga",

  // Instagram — primary human support (author writes back directly)
  instagram:       "https://ig.me/m/niguma.yoga",

  // Other socials
  facebook:        "https://facebook.com/niguma.yoga",

  // Email — enable after the domain is registered; leave mailto empty to hide
  email:           "mailto:hello@niguma.yoga",

  // Optional automated checkout links (PayPal / Stripe). Filled when enabled.
  pay: {
    paypal: { m1: "", m6: "", m12: "" },
    stripe: { m1: "", m6: "", m12: "" }
  },

  // Lead capture endpoint (e.g. a serverless function or Telegram bot webhook).
  // Leave empty -> form gently redirects the user into the Telegram bot instead.
  leadEndpoint: ""
};
