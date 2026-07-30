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
                 (tier.desc ? '<p class="tier__desc">' + escapeHtml(tier.desc) + "</p>" : "") +
               "</div>";
      }).join("");
    });

    // paragraph blocks: data-paras="path" -> array of strings -> <p>
    document.querySelectorAll("[data-paras]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-paras"));
      if (!Array.isArray(arr)) return;
      el.innerHTML = arr.map(function (s) { return "<p>" + escapeHtml(s) + "</p>"; }).join("");
    });

    // inner-wind cards: data-winds="path" -> [{name, subtitle, before, after}]
    document.querySelectorAll("[data-winds]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-winds"));
      if (!Array.isArray(arr)) return;
      var beforeLbl = t(lang, el.getAttribute("data-before")) || "";
      var afterLbl = t(lang, el.getAttribute("data-after")) || "";
      el.innerHTML = arr.map(function (w) {
        return '<article class="wind reveal">' +
                 '<div class="wind__head">' +
                   '<span class="wind__name">' + escapeHtml(w.name) + "</span>" +
                   '<span class="wind__sub">' + escapeHtml(w.subtitle) + "</span>" +
                 "</div>" +
                 '<div class="wind__ba">' +
                   '<div class="wind__col wind__col--before">' +
                     '<span class="wind__label">' + escapeHtml(beforeLbl) + "</span>" +
                     "<p>" + escapeHtml(w.before) + "</p></div>" +
                   '<div class="wind__col wind__col--after">' +
                     '<span class="wind__label">' + escapeHtml(afterLbl) + "</span>" +
                     "<p>" + escapeHtml(w.after) + "</p></div>" +
                 "</div>" +
               "</article>";
      }).join("");
    });

    // "not for you" list with custom pictograms: data-notfor="path.to.items"
    document.querySelectorAll("[data-notfor]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-notfor"));
      if (!Array.isArray(arr)) return;
      var lib = window.NIGUMA_ICONS || {};
      var glyph = lib.cross || "";
      el.innerHTML = arr.map(function (s) {
        return '<li class="nf__item reveal">' +
                 '<span class="nf__icon" aria-hidden="true">' +
                   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
                   'stroke-linecap="round" stroke-linejoin="round">' + glyph + "</svg>" +
                 "</span>" +
                 '<span class="nf__text">' + escapeHtml(s) + "</span>" +
               "</li>";
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

  function chosen() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return saved && SUPPORTED.indexOf(saved) >= 0 ? saved : null;
  }

  function detect() {
    var saved = chosen();
    if (saved) return saved;
    var nav = (navigator.language || navigator.userLanguage || "ru").slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(nav) >= 0 ? nav : FALLBACK;
  }

  /**
   * Запоминаем язык, только когда его выбрал человек.
   *
   * Раньше запоминался и автоопределённый: первый заход из Украины с русским
   * браузером сохранял «ru» как будто это осознанный выбор, и украинская версия
   * больше не открывалась никогда. Теперь автоопределение ничего не записывает,
   * а нажатие на флажок — записывает.
   */
  function setLang(lang, remember) {
    if (SUPPORTED.indexOf(lang) < 0) lang = FALLBACK;
    applyText(lang);
    if (remember) { try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {} }
    // re-arm scroll reveal for freshly rendered nodes
    if (window.NigumaReveal) window.NigumaReveal();
  }

  /**
   * Посетителю из Украины сайт обязан открываться на украинском — часть 6
   * статьи 27 Закона «Про забезпечення функціонування української мови як
   * державної». Браузер страну не знает, поэтому спрашиваем /api/geo.
   *
   * Спрашиваем только если человек ещё не выбрал язык сам: свой выбор
   * посетителя важнее страны, из которой он зашёл. Ошибка сети или
   * недоступный ответ ничего не ломают — остаётся язык браузера.
   */
  function applyCountry() {
    if (chosen()) return;
    if (document.documentElement.lang === "uk") return;
    fetch("/api/geo", { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || d.country !== "UA") return;
        if (chosen()) return;            // человек успел выбрать сам, пока шёл запрос
        setLang("uk", false);
      })
      .catch(function () {});
  }

  // expose — t() lets other scripts read a string in the language shown right now
  window.NigumaI18n = {
    setLang: setLang,
    current: detect,
    t: function (path) { return t(document.documentElement.lang || detect(), path); }
  };

  // boot
  document.addEventListener("DOMContentLoaded", function () {
    setLang(detect(), false);
    applyCountry();
    document.querySelectorAll(".lang__btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang"), true); });
    });
  });
})();
