/* ===================================================================
   Niguma — front-end config
   Mirror of the relevant parts of /config/project.config.json.
   Keep these two in sync (or generate this file from the JSON at build).
   =================================================================== */
window.NIGUMA_CONFIG = {
  // Telegram bot — main entry point / first client + funnel
  // NB: Telegram usernames cannot start with a digit → "yoga15min_bot", not "15minyoga_bot".
  telegram:        "https://t.me/yoga15min_bot?start=lead_landing",
  telegramChannel: "https://t.me/yoga15min",

  // Instagram — primary human support (author writes back directly)
  instagram:       "https://ig.me/m/15minyoga",

  // Other socials
  facebook:        "https://facebook.com/15minyoga",

  // Email — enable after the domain is registered; leave mailto empty to hide
  email:           "mailto:hello@15minyoga.com",

  // Optional automated checkout links (PayPal / Stripe). Filled when enabled.
  pay: {
    paypal: { m1: "", m6: "", m12: "" },
    stripe: { m1: "", m6: "", m12: "" }
  },

  // Lead capture endpoint (e.g. a serverless function or Telegram bot webhook).
  // Leave empty -> form gently redirects the user into the Telegram bot instead.
  leadEndpoint: ""
};
