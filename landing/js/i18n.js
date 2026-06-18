/* ===================================================================
   Niguma — tiny i18n engine (no dependencies)
   Reads window.NIGUMA_I18N (see translations.js) and swaps content.
   =================================================================== */
(function () {
  "use strict";

  var DICT = window.NIGUMA_I18N || {};
  var SUPPORTED = ["ru", "en", "de", "uk"];
  var FALLBACK = "ru";
  var STORAGE_KEY = "niguma.lang";

  function get(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      if (acc == null) return undefined;
      return acc[k];
    }, obj);
  }

  /* resolve a key for a locale, falling back to RU */
  function t(lang, path) {
    var v = get(DICT[lang], path);
    if (v === undefined || v === null) v = get(DICT[FALLBACK], path);
    return v;
  }

  function applyText(lang) {
    // simple text nodes
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = t(lang, key);
      if (val == null) return;
      var attr = el.getAttribute("data-i18n-attr");
      if (attr) { el.setAttribute(attr, val); }
      else { el.textContent = val; }
    });

    // simple <li> lists: data-list="path.to.array-of-strings"
    document.querySelectorAll("[data-list]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-list"));
      if (!Array.isArray(arr)) return;
      el.innerHTML = arr.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("");
    });

    // benefit cards: data-cards="path" -> [{title, body}]
    document.querySelectorAll("[data-cards]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-cards"));
      if (!Array.isArray(arr)) return;
      el.innerHTML = arr.map(function (c) {
        return '<article class="card reveal">' +
                 '<h3 class="card__title">' + escapeHtml(c.title) + "</h3>" +
                 '<p class="card__body">' + escapeHtml(c.body) + "</p>" +
               "</article>";
      }).join("");
    });

    // pricing tiers: data-tiers="path" -> [{period, price}]
    document.querySelectorAll("[data-tiers]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-tiers"));
      if (!Array.isArray(arr)) return;
      el.innerHTML = arr.map(function (tier, i) {
        var featured = (i === 1); // 6 months = best value
        var months = [1, 6, 12][i] || 1;
        var price = parseFloat(String(tier.price).replace(/[^\d.]/g, "")) || 0;
        var per = months > 1 ? Math.round(price / months) + " €/" + monthWord(lang) : "";
        return '<div class="tier ' + (featured ? "tier--featured" : "") + ' reveal">' +
                 (featured ? '<span class="tier__badge">★</span>' : "") +
                 '<p class="tier__period">' + escapeHtml(tier.period) + "</p>" +
                 '<div class="tier__price">' + escapeHtml(tier.price) + "</div>" +
                 (per ? '<div class="tier__per">' + per + "</div>" : "") +
               "</div>";
      }).join("");
    });

    document.documentElement.lang = lang;
    document.querySelectorAll(".lang__btn").forEach(function (b) {
      b.setAttribute("aria-current", String(b.getAttribute("data-lang") === lang));
    });
  }

  function monthWord(lang) {
    return ({ ru: "мес", en: "mo", de: "Mon", uk: "міс" })[lang] || "mo";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    var nav = (navigator.language || navigator.userLanguage || "ru").slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(nav) >= 0 ? nav : FALLBACK;
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) lang = FALLBACK;
    applyText(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    // re-arm scroll reveal for freshly rendered nodes
    if (window.NigumaReveal) window.NigumaReveal();
  }

  // expose
  window.NigumaI18n = { setLang: setLang, current: detect };

  // boot
  document.addEventListener("DOMContentLoaded", function () {
    setLang(detect());
    document.querySelectorAll(".lang__btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
  });
})();
