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

    // teachers: data-teachers="path" -> [{name, role, short, key, photo, lines, facts}]
    // Компактные карточки: круглое фото (assets/photos/avatars/<то же имя>), имя,
    // короткая роль, ключевая фраза. Вся карточка — кнопка «Подробнее»: по нажатию
    // js/main.js открывает окно с полным профилем (teacherProfile ниже).
    document.querySelectorAll("[data-teachers]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-teachers"));
      if (!Array.isArray(arr) || !arr.length) return;
      var more = t(lang, "trainers.more") || "";
      el.innerHTML = arr.map(function (p, i) {
        var initial = escapeHtml(String(p.name || "?").trim().charAt(0));
        var ava = avatarOf(p.photo);
        var pic = ava
          ? '<img class="tcard__ava" src="' + escapeHtml(ava) + '" alt="" width="72" height="72" loading="lazy" ' +
            'onerror="this.outerHTML=\'<span class=&quot;tcard__ava tcard__ava--empty&quot; aria-hidden=&quot;true&quot;>' + initial + '</span>\'" />'
          : '<span class="tcard__ava tcard__ava--empty" aria-hidden="true">' + initial + "</span>";
        return '<article class="tcard reveal">' +
                 pic +
                 '<div class="tcard__head">' +
                   '<h3 class="tcard__name">' + escapeHtml(p.name) + "</h3>" +
                   (p.short || p.role ? '<p class="tcard__role">' + escapeHtml(p.short || p.role) + "</p>" : "") +
                 "</div>" +
                 (p.key ? '<p class="tcard__key">' + escapeHtml(p.key) + "</p>" : "") +
                 '<button class="tcard__open" type="button" data-teacher="' + i + '" aria-haspopup="dialog">' +
                   '<span class="tcard__more">' + escapeHtml(more) + '</span>' +
                   '<span class="visually-hidden">: ' + escapeHtml(p.name) + "</span>" +
                   '<span class="tcard__plus" aria-hidden="true"></span>' +
                 "</button>" +
               "</article>";
      }).join("");
    });

    // reviews: data-reviews="path" -> [{name, meta, title, excerpt, fullTitle, full: [..], bio, link: {label, href}}]
    // Карточка по образцу: знак цитаты, заголовок-цитата, короткий отрывок, черта,
    // подпись. «Читать полностью» меняет отрывок на полный текст прямо в карточке
    // (js/main.js, reviewToggle); пока карточка свёрнута, нажатие в любом её месте
    // разворачивает её. fullTitle пустой — у полной версии тот же заголовок.
    document.querySelectorAll("[data-reviews]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-reviews"));
      if (!Array.isArray(arr) || !arr.length) return;
      var more = t(lang, "reviews.more") || "";
      var less = t(lang, "reviews.less") || "";
      el.innerHTML = arr.map(function (r, i) {
        var n = i + 1;
        var link = (r.link && /^https:\/\//.test(r.link.href || ""))
          ? ' <a class="rv__link" href="' + escapeHtml(r.link.href) + '" target="_blank" rel="noopener">' +
            escapeHtml(r.link.label || r.link.href) + "</a>"
          : "";
        var full = Array.isArray(r.full)
          ? r.full.map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; }).join("")
          : "";
        return '<article class="rv reveal" id="review-' + n + '">' +
                 '<span class="rv__mark" aria-hidden="true">”</span>' +
                 '<div class="rv__pane rv__short"><div class="rv__pane-inner">' +
                   '<h3 class="rv__title">' + escapeHtml(r.title) + "</h3>" +
                   (r.excerpt ? '<p class="rv__excerpt">' + escapeHtml(r.excerpt) + "</p>" : "") +
                 "</div></div>" +
                 '<div class="rv__pane rv__full" id="review-full-' + n + '"><div class="rv__pane-inner">' +
                   '<h3 class="rv__title">' + escapeHtml(r.fullTitle || r.title) + "</h3>" +
                   '<div class="rv__text">' + full + "</div>" +
                   (r.bio || link ? '<p class="rv__bio">' + escapeHtml(r.bio || "") + link + "</p>" : "") +
                 "</div></div>" +
                 '<div class="rv__foot">' +
                   '<p class="rv__who"><span class="rv__name">' + escapeHtml(r.name) + "</span>" +
                     (r.meta ? '<span class="rv__meta">' + escapeHtml(r.meta) + "</span>" : "") + "</p>" +
                   '<button class="rv__toggle" type="button" aria-expanded="false" aria-controls="review-full-' + n + '">' +
                     '<span class="rv__more">' + escapeHtml(more) + "</span>" +
                     '<span class="rv__less">' + escapeHtml(less) + "</span>" +
                     '<span class="visually-hidden">: ' + escapeHtml(r.name) + "</span>" +
                     '<span class="rv__plus" aria-hidden="true"></span>' +
                   "</button>" +
                 "</div>" +
               "</article>";
      }).join("");
    });

    // stats strip: data-stats="path" -> [{num, unit, lines: [..]}]
    document.querySelectorAll("[data-stats]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-stats"));
      if (!Array.isArray(arr) || !arr.length) return;
      el.innerHTML = arr.map(function (s) {
        return '<li class="stat">' +
                 '<p class="stat__value"><span class="stat__num">' + escapeHtml(s.num) + "</span>" +
                   // уточнение в скобках, «(Вена)», — не единица, а пояснение к цифре
                   (s.unit
                     ? ' <span class="stat__unit' + (/^\(/.test(s.unit) ? " stat__unit--note" : "") + '">' +
                       escapeHtml(s.unit) + "</span>"
                     : "") +
                 "</p>" +
                 (Array.isArray(s.lines)
                   ? s.lines.map(function (l) { return '<p class="stat__line">' + escapeHtml(l) + "</p>"; }).join("")
                   : "") +
               "</li>";
      }).join("");
    });

    // paragraphs with light markup: data-rich="path" -> ["… **жирный** *курсив* [ссылка](https://…) …"]
    // Текст сначала экранируется, потом размечается — HTML из переводов не проходит;
    // ссылки — только https.
    document.querySelectorAll("[data-rich]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-rich"));
      if (!Array.isArray(arr)) return;
      el.innerHTML = arr.map(function (s) {
        return "<p>" + escapeHtml(s)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
          .replace(/\[([^\]]+)\]\((https:\/\/[^)\s"<>]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>') +
          "</p>";
      }).join("");
    });

    // five winds: data-method="path" -> [{name, sub, text}] -> numbered rows 1–5
    document.querySelectorAll("[data-method]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-method"));
      if (!Array.isArray(arr) || !arr.length) return;
      el.innerHTML = arr.map(function (w, i) {
        var n = String(i + 1);
        return '<li class="mrow">' +
                 '<span class="mrow__num" aria-hidden="true">' + n + "</span>" +
                 '<h3 class="mrow__name">' + escapeHtml(w.name) +
                   (w.sub ? ' <span class="mrow__sub">(' + escapeHtml(w.sub) + ")</span>" : "") +
                 "</h3>" +
                 '<p class="mrow__text">' + escapeHtml(w.text) + "</p>" +
               "</li>";
      }).join("");
    });

    // practice steps: data-steps="path" -> [{title, text}] -> cards numbered 1, 2, 3
    document.querySelectorAll("[data-steps]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-steps"));
      if (!Array.isArray(arr) || !arr.length) return;
      el.innerHTML = arr.map(function (s, i) {
        return '<li class="pstep">' +
                 '<span class="pstep__num" aria-hidden="true">' + (i + 1) + "</span>" +
                 '<h4 class="pstep__title">' + escapeHtml(s.title) + "</h4>" +
                 '<p class="pstep__text">' + escapeHtml(s.text) + "</p>" +
               "</li>";
      }).join("");
    });

    // FAQ: data-faq="path" -> [{q, a: [..], link: {pre, label, post, href}}]
    // Кнопка вопроса раскрывает ответ (обработчик — js/main.js, faqAccordion).
    // Закрытый ответ скрыт и от клавиатуры, и от экранного диктора (CSS, visibility).
    document.querySelectorAll("[data-faq]").forEach(function (el) {
      var arr = t(lang, el.getAttribute("data-faq"));
      if (!Array.isArray(arr) || !arr.length) return;
      el.innerHTML = arr.map(function (it, i) {
        var n = i + 1;
        var link = "";
        if (it.link && /^https:\/\//.test(it.link.href || "")) {
          link = "<p>" + escapeHtml(it.link.pre || "") +
                 '<a href="' + escapeHtml(it.link.href) + '" target="_blank" rel="noopener">' +
                 escapeHtml(it.link.label || it.link.href) + "</a>" + escapeHtml(it.link.post || "") + "</p>";
        }
        return '<div class="faq__item">' +
                 '<h3 class="faq__q">' +
                   '<button type="button" class="faq__btn" id="faq-q-' + n + '" aria-expanded="false" aria-controls="faq-a-' + n + '">' +
                     '<span class="faq__qtext">' + escapeHtml(it.q) + "</span>" +
                     '<span class="faq__icon" aria-hidden="true"></span>' +
                   "</button>" +
                 "</h3>" +
                 '<div class="faq__a" id="faq-a-' + n + '" role="region" aria-labelledby="faq-q-' + n + '">' +
                   '<div class="faq__a-inner">' +
                     (Array.isArray(it.a) ? it.a.map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; }).join("") : "") +
                     link +
                   "</div>" +
                 "</div>" +
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

  /* круглое фото: тот же файл в подпапке avatars (квадратный кадр лица) */
  function avatarOf(photo) {
    return photo ? String(photo).replace("assets/photos/", "assets/photos/avatars/") : "";
  }

  /**
   * Полный профиль тренера i на языке lang — прежняя большая карточка:
   * портрет 3:4, имя, полная роль, абзацы и факты. Если портрета нет,
   * на его месте плашка с инициалом.
   */
  function teacherProfile(lang, i) {
    var arr = t(lang, "trainers.people");
    var p = Array.isArray(arr) ? arr[i] : null;
    if (!p) return "";
    var initial = escapeHtml(String(p.name || "?").trim().charAt(0));
    var photo = p.photo
      ? '<div class="teacher__photo"><img src="' + escapeHtml(p.photo) + '" alt="" ' +
        'onerror="this.parentNode.className=\'teacher__photo teacher__photo--empty\';' +
        'this.parentNode.innerHTML=\'<span aria-hidden=&quot;true&quot;>' + initial + '</span>\'" /></div>'
      : '<div class="teacher__photo teacher__photo--empty"><span aria-hidden="true">' + initial + "</span></div>";
    return '<article class="teacher teacher--dialog">' + photo +
             '<div class="teacher__text">' +
               '<h3 class="teacher__name" id="teacherDialogName">' + escapeHtml(p.name) + "</h3>" +
               (p.role ? '<p class="teacher__role">' + escapeHtml(p.role) + "</p>" : "") +
               (Array.isArray(p.lines)
                 ? p.lines.map(function (l) { return "<p>" + escapeHtml(l) + "</p>"; }).join("")
                 : "") +
               (Array.isArray(p.facts) && p.facts.length
                 ? '<ul class="teacher__facts">' +
                   p.facts.map(function (f) { return "<li>" + escapeHtml(f) + "</li>"; }).join("") +
                   "</ul>"
                 : "") +
             "</div>" +
           "</article>";
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

  // expose — t() lets other scripts read a string in the language shown right now
  window.NigumaI18n = {
    setLang: setLang,
    current: detect,
    t: function (path) { return t(document.documentElement.lang || detect(), path); },
    teacherProfile: function (i) { return teacherProfile(document.documentElement.lang || detect(), i); }
  };

  // boot
  document.addEventListener("DOMContentLoaded", function () {
    setLang(detect(), false);
    document.querySelectorAll(".lang__btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang"), true); });
    });
  });
})();
