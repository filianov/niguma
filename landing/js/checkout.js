/* ===================================================================
   15minYoga — выбор пакета и заявка на оплату.

   Карточки цен становятся кликабельными: человек выбирает пакет, открывается
   короткая форма, заявка уходит менеджеру. Денег на сайте не принимаем —
   реквизиты приходят лично, оплату подтверждает человек.

   Цены берутся из /api/plans, поэтому включённая в кабинете скидка появляется
   на сайте сразу. Если функция недоступна, остаются цены из переводов —
   блок продолжает работать, просто без акции.
   =================================================================== */
(function () {
  "use strict";

  var PLAN_IDS = ["m1", "m6", "m12"];
  var state = { plans: null, promo: null, selected: null, sending: false };

  function $(s, root) { return (root || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function money(cents) {
    return (Number(cents || 0) / 100).toFixed(2).replace(/\.00$/, "") + " €";
  }
  function lang() { return document.documentElement.lang || "ru"; }

  /* --------------------------- тексты формы --------------------------- */
  var T = {
    ru: { choose: "Выбрать", chosen: "Выбрано", perMonth: "€/мес", off: "выгода",
          title: "Заявка на участие", sub: "Пришлём реквизиты и ответим на вопросы. Оплата — переводом, картой или криптовалютой.",
          name: "Имя", email: "Почта", phone: "Телефон (необязательно)", tg: "Telegram (необязательно)",
          comment: "Вопрос или пожелание (необязательно)", submit: "Отправить заявку", sending: "Отправляем…",
          okTitle: "Заявка принята", okBody: "Мы напишем вам в ближайшее время и пришлём реквизиты для оплаты.",
          errEmail: "Проверьте адрес почты.", err: "Не отправилось. Попробуйте ещё раз или напишите нам в Telegram.",
          close: "Закрыть", promoLeft: "до конца акции" },
    en: { choose: "Choose", chosen: "Selected", perMonth: "€/mo", off: "you save",
          title: "Membership request", sub: "We'll send the payment details and answer your questions. Bank transfer, card or crypto.",
          name: "Name", email: "E-mail", phone: "Phone (optional)", tg: "Telegram (optional)",
          comment: "Question or note (optional)", submit: "Send request", sending: "Sending…",
          okTitle: "Request received", okBody: "We'll get back to you shortly with the payment details.",
          errEmail: "Please check the e-mail address.", err: "Could not send. Please try again or write to us on Telegram.",
          close: "Close", promoLeft: "until the offer ends" },
    de: { choose: "Wählen", chosen: "Gewählt", perMonth: "€/Mon.", off: "Ersparnis",
          title: "Anfrage zur Teilnahme", sub: "Wir senden die Zahlungsdaten und beantworten Ihre Fragen. Überweisung, Karte oder Krypto.",
          name: "Name", email: "E-Mail", phone: "Telefon (optional)", tg: "Telegram (optional)",
          comment: "Frage oder Hinweis (optional)", submit: "Anfrage senden", sending: "Wird gesendet…",
          okTitle: "Anfrage angekommen", okBody: "Wir melden uns in Kürze mit den Zahlungsdaten.",
          errEmail: "Bitte prüfen Sie die E-Mail-Adresse.", err: "Senden fehlgeschlagen. Bitte erneut versuchen oder uns auf Telegram schreiben.",
          close: "Schließen", promoLeft: "bis zum Ende der Aktion" },
    uk: { choose: "Обрати", chosen: "Обрано", perMonth: "€/міс", off: "вигода",
          title: "Заявка на участь", sub: "Надішлемо реквізити та відповімо на запитання. Оплата — переказом, карткою або криптовалютою.",
          name: "Ім'я", email: "Пошта", phone: "Телефон (необов'язково)", tg: "Telegram (необов'язково)",
          comment: "Запитання чи побажання (необов'язково)", submit: "Надіслати заявку", sending: "Надсилаємо…",
          okTitle: "Заявку прийнято", okBody: "Ми напишемо вам найближчим часом і надішлемо реквізити для оплати.",
          errEmail: "Перевірте адресу пошти.", err: "Не надіслалося. Спробуйте ще раз або напишіть нам у Telegram.",
          close: "Закрити", promoLeft: "до кінця акції" },
  };
  function t(key) { return (T[lang()] || T.ru)[key]; }

  /* ---------------------------- загрузка цен ---------------------------- */
  function loadPlans() {
    return fetch("/api/plans")
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        if (!d.ok) return;
        state.plans = d.plans;
        state.promo = d.promo;
        decorate();
      })
      .catch(function () { /* цены из переводов уже отрисованы — этого достаточно */ });
  }

  /**
   * Дополняем уже отрисованные карточки: цена со скидкой, выгода, кнопка.
   * Не перерисовываем блок целиком, чтобы не потерять переводы и анимацию появления.
   */
  function decorate() {
    var cards = document.querySelectorAll(".pricing .tier");
    if (!cards.length || !state.plans) return;

    cards.forEach(function (card, i) {
      var plan = state.plans[i];
      if (!plan) return;
      card.setAttribute("data-plan", plan.id);
      card.classList.add("tier--pickable");

      var priceEl = $(".tier__price", card);
      if (priceEl) {
        priceEl.innerHTML = plan.off
          ? '<span class="tier__old">' + money(plan.base) + "</span> " + money(plan.final)
          : money(plan.final);
      }
      var perEl = $(".tier__per", card);
      if (perEl && plan.months > 1) {
        perEl.textContent = Math.round(plan.final / plan.months / 100) + " " + t("perMonth");
      }
      if (plan.off && !$(".tier__save", card)) {
        var save = document.createElement("div");
        save.className = "tier__save";
        save.textContent = t("off") + " " + money(plan.off);
        card.appendChild(save);
      }
      if (!$(".tier__pick", card)) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tier__pick";
        btn.textContent = t("choose");
        card.appendChild(btn);
      }
    });

    renderPromoRibbon();
  }

  /** Полоса с условиями акции — только когда скидка реально действует. */
  function renderPromoRibbon() {
    var host = document.querySelector(".pricing");
    var old = document.querySelector(".promo-ribbon");
    if (old) old.remove();
    if (!state.promo || !host) return;

    var ribbon = document.createElement("div");
    ribbon.className = "promo-ribbon";
    var left = "";
    if (state.promo.endsAt) {
      var days = Math.ceil((new Date(state.promo.endsAt) - Date.now()) / 86400000);
      if (days > 0) left = " · " + days + " дн. " + t("promoLeft");
    }
    ribbon.innerHTML = "<b>−" + state.promo.percent + "%</b>" + esc(left);
    host.parentNode.insertBefore(ribbon, host);
  }

  /* ------------------------------ форма ------------------------------ */
  function openForm(planId) {
    var plan = (state.plans || []).find(function (p) { return p.id === planId; });
    if (!plan) return;
    state.selected = plan;

    var box = document.createElement("div");
    box.className = "checkout";
    box.innerHTML =
      '<div class="checkout__box" role="dialog" aria-modal="true">' +
        '<button class="checkout__close" type="button" aria-label="' + esc(t("close")) + '">✕</button>' +
        '<h3 class="checkout__title">' + esc(t("title")) + "</h3>" +
        '<p class="checkout__plan"><b>' + esc(plan.label) + "</b> — " +
          (plan.off ? '<s>' + money(plan.base) + "</s> " : "") + money(plan.final) + "</p>" +
        '<p class="checkout__sub">' + esc(t("sub")) + "</p>" +
        '<form class="checkout__form">' +
          '<label>' + esc(t("name")) + '<input type="text" name="name" autocomplete="name" /></label>' +
          '<label>' + esc(t("email")) + '<input type="email" name="email" autocomplete="email" required /></label>' +
          '<label>' + esc(t("phone")) + '<input type="tel" name="phone" autocomplete="tel" /></label>' +
          '<label>' + esc(t("tg")) + '<input type="text" name="telegram" placeholder="@username" /></label>' +
          '<label>' + esc(t("comment")) + '<textarea name="comment" rows="2"></textarea></label>' +
          '<button class="btn btn--primary checkout__submit" type="submit">' + esc(t("submit")) + "</button>" +
          '<p class="checkout__error" hidden></p>' +
        "</form>" +
      "</div>";
    document.body.appendChild(box);

    var form = $(".checkout__form", box);
    var err = $(".checkout__error", box);
    var submit = $(".checkout__submit", box);

    function close() { box.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    $(".checkout__close", box).addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    setTimeout(function () { $('input[name="name"]', box).focus(); }, 50);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (state.sending) return;
      err.hidden = true;

      var data = new FormData(form);
      var email = String(data.get("email") || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        err.textContent = t("errEmail"); err.hidden = false; return;
      }

      state.sending = true;
      submit.disabled = true;
      submit.textContent = t("sending");

      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id, email: email, lang: lang(),
          name: data.get("name"), phone: data.get("phone"),
          telegram: data.get("telegram"), comment: data.get("comment"),
        }),
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function () {
          $(".checkout__box", box).innerHTML =
            '<button class="checkout__close" type="button" aria-label="' + esc(t("close")) + '">✕</button>' +
            '<div class="checkout__done">' +
              '<div class="checkout__tick">✓</div>' +
              "<h3>" + esc(t("okTitle")) + "</h3>" +
              "<p>" + esc(t("okBody")) + "</p>" +
            "</div>";
          $(".checkout__close", box).addEventListener("click", close);
          setTimeout(close, 6000);
        })
        .catch(function () {
          err.textContent = t("err"); err.hidden = false;
          submit.disabled = false; submit.textContent = t("submit");
        })
        .then(function () { state.sending = false; });
    });
  }

  /* ------------------------------- запуск ------------------------------- */
  /**
   * Блок цен перерисовывается движком переводов — при первом показе и при смене
   * языка. Порядок между ним и загрузкой цен не гарантирован, поэтому не гадаем,
   * а следим за блоком: перерисовали — снова наводим цены, скидку и кнопки.
   */
  function watchPricing() {
    var host = document.querySelector(".pricing");
    if (!host || !window.MutationObserver) return;
    var busy = false;
    new MutationObserver(function () {
      if (busy) return;                 // decorate меняет тот же блок — не зацикливаемся
      busy = true;
      setTimeout(function () { decorate(); busy = false; }, 0);
    }).observe(host, { childList: true });
  }

  function init() {
    loadPlans();
    watchPricing();

    // карточки перерисовываются при смене языка — слушаем на документе
    document.addEventListener("click", function (e) {
      var card = e.target.closest(".pricing .tier");
      if (!card) return;
      var id = card.getAttribute("data-plan");
      if (!id) return;
      e.preventDefault();
      openForm(id);
    });

    document.querySelectorAll(".lang__btn").forEach(function (b) {
      b.addEventListener("click", function () { setTimeout(decorate, 60); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
