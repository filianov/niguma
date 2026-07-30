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
  var state = { plans: null, promo: null, selected: null, sending: false, methods: null, method: null };

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
          rateNote: "Цены в гривне указаны справочно: пересчитаны по курсу {source} {rate} ₴ за 1 € на {date}. Списание проходит в евро.",
          payTitle: "Как удобно заплатить", payPick: "Способ оплаты",
          payNote: "Реквизиты приходят лично — на сайте их нет.",
          payInstantNote: "Оплата пройдёт сразу на защищённой странице банка.",
          copy: "Скопировать", copied: "Скопировано", payNow: "Перейти к оплате",
          detailsTitle: "Реквизиты для оплаты", detailsAfter: "После оплаты мы подтвердим доступ — обычно в течение дня.",
          openBot: "Получить реквизиты в Telegram",
          title: "Заявка на участие", sub: "Пришлём реквизиты и ответим на вопросы. Оплата — переводом, картой или криптовалютой.",
          name: "Имя", email: "Почта", phone: "Телефон (необязательно)", tg: "Telegram (необязательно)",
          comment: "Вопрос или пожелание (необязательно)", submit: "Отправить заявку", sending: "Отправляем…",
          okTitle: "Заявка принята", okBody: "Мы напишем вам в ближайшее время и пришлём реквизиты для оплаты.",
          errEmail: "Проверьте адрес почты.", err: "Не отправилось. Попробуйте ещё раз или напишите нам в Telegram.",
          close: "Закрыть", promoLeft: "до конца акции" },
    en: { choose: "Choose", chosen: "Selected", perMonth: "€/mo", off: "you save",
          rateNote: "Prices in hryvnia are indicative: converted at the {source} rate of ₴{rate} per €1 on {date}. The charge is made in euro.",
          payTitle: "How would you like to pay", payPick: "Payment method",
          payNote: "Payment details are sent to you personally — they are not published here.",
          payInstantNote: "You will pay right away on the bank's secure page.",
          copy: "Copy", copied: "Copied", payNow: "Go to payment",
          detailsTitle: "Payment details", detailsAfter: "Once paid, we confirm your access — usually within a day.",
          openBot: "Get the details in Telegram",
          title: "Membership request", sub: "We'll send the payment details and answer your questions. Bank transfer, card or crypto.",
          name: "Name", email: "E-mail", phone: "Phone (optional)", tg: "Telegram (optional)",
          comment: "Question or note (optional)", submit: "Send request", sending: "Sending…",
          okTitle: "Request received", okBody: "We'll get back to you shortly with the payment details.",
          errEmail: "Please check the e-mail address.", err: "Could not send. Please try again or write to us on Telegram.",
          close: "Close", promoLeft: "until the offer ends" },
    de: { choose: "Wählen", chosen: "Gewählt", perMonth: "€/Mon.", off: "Ersparnis",
          rateNote: "Preise in Hrywnja dienen der Orientierung: umgerechnet zum Kurs von {source}, {rate} ₴ je 1 € am {date}. Die Abbuchung erfolgt in Euro.",
          payTitle: "Wie möchten Sie bezahlen", payPick: "Zahlungsart",
          payNote: "Die Zahlungsdaten erhalten Sie persönlich — auf der Seite stehen sie nicht.",
          payInstantNote: "Die Zahlung erfolgt sofort auf der gesicherten Seite der Bank.",
          copy: "Kopieren", copied: "Kopiert", payNow: "Zur Zahlung",
          detailsTitle: "Zahlungsdaten", detailsAfter: "Nach der Zahlung bestätigen wir den Zugang — meist innerhalb eines Tages.",
          openBot: "Daten per Telegram erhalten",
          title: "Anfrage zur Teilnahme", sub: "Wir senden die Zahlungsdaten und beantworten Ihre Fragen. Überweisung, Karte oder Krypto.",
          name: "Name", email: "E-Mail", phone: "Telefon (optional)", tg: "Telegram (optional)",
          comment: "Frage oder Hinweis (optional)", submit: "Anfrage senden", sending: "Wird gesendet…",
          okTitle: "Anfrage angekommen", okBody: "Wir melden uns in Kürze mit den Zahlungsdaten.",
          errEmail: "Bitte prüfen Sie die E-Mail-Adresse.", err: "Senden fehlgeschlagen. Bitte erneut versuchen oder uns auf Telegram schreiben.",
          close: "Schließen", promoLeft: "bis zum Ende der Aktion" },
    uk: { choose: "Обрати", chosen: "Обрано", perMonth: "€/міс", off: "вигода",
          rateNote: "Ціни в гривні наведено довідково: перераховано за курсом {source} {rate} ₴ за 1 € на {date}. Списання відбувається в євро.",
          payTitle: "Як зручно заплатити", payPick: "Спосіб оплати",
          payNote: "Реквізити надходять особисто — на сайті їх немає.",
          payInstantNote: "Оплата пройде одразу на захищеній сторінці банку.",
          copy: "Копіювати", copied: "Скопійовано", payNow: "Перейти до оплати",
          detailsTitle: "Реквізити для оплати", detailsAfter: "Після оплати ми підтвердимо доступ — зазвичай протягом дня.",
          openBot: "Отримати реквізити в Telegram",
          title: "Заявка на участь", sub: "Надішлемо реквізити та відповімо на запитання. Оплата — переказом, карткою або криптовалютою.",
          name: "Ім'я", email: "Пошта", phone: "Телефон (необов'язково)", tg: "Telegram (необов'язково)",
          comment: "Запитання чи побажання (необов'язково)", submit: "Надіслати заявку", sending: "Надсилаємо…",
          okTitle: "Заявку прийнято", okBody: "Ми напишемо вам найближчим часом і надішлемо реквізити для оплати.",
          errEmail: "Перевірте адресу пошти.", err: "Не надіслалося. Спробуйте ще раз або напишіть нам у Telegram.",
          close: "Закрити", promoLeft: "до кінця акції" },
  };
  function t(key) { return (T[lang()] || T.ru)[key]; }


  /* ------------------------------ иконки ------------------------------ */
  /* Рисуем сами: логотипы платёжных систем нельзя размещать без разрешения,
     а внешние картинки — лишний запрос и утечка адреса посетителя. */
  var ICONS = {
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
      '<path d="M3 9.5 12 4l9 5.5M5 10v9m14-9v9M3 20h18M9 20v-5.5h6V20"/></svg>',
    paypal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M7 19 9.2 5.5h4.6c2.4 0 3.8 1.3 3.4 3.6-.4 2.4-2.3 3.7-4.9 3.7h-2L9.5 19H7Z"/>' +
      '<path d="M12.2 12.8h1.6c2.6 0 4.5 1.2 4.1 3.5" opacity=".55"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
      '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 14.5h3"/></svg>',
    crypto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 9.5h7M12 9.5V16"/></svg>',
  };


  /**
   * Значки платёжных систем.
   *
   * Нарисованы сами, а не взяты официальные логотипы: их размещение требует
   * согласия правообладателя и соблюдения гайдлайнов по отступам и цветам.
   * Здесь — узнаваемые обозначения, которых достаточно, чтобы человек понял,
   * чем можно заплатить. Если понадобится точное соответствие бренду, официальные
   * файлы берутся у Visa, Mastercard, Apple и Google и подставляются вместо этих.
   */
  var MARKS = {
    visa: '<span class="paymark paymark--visa">VISA</span>',
    mastercard: '<span class="paymark paymark--mc" aria-label="Mastercard">' +
      '<svg viewBox="0 0 32 20" aria-hidden="true">' +
      '<circle cx="12" cy="10" r="7" fill="#EB001B"/>' +
      '<circle cx="20" cy="10" r="7" fill="#F79E1B"/>' +
      '<path d="M16 4.6a7 7 0 0 0 0 10.8 7 7 0 0 0 0-10.8Z" fill="#FF5F00"/>' +
      "</svg></span>",
    applepay: '<span class="paymark paymark--apple">' +
      '<svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">' +
      '<path d="M11 1.6c-.5.6-1.3 1-2 .9-.1-.8.3-1.6.7-2.1.5-.6 1.4-1 2.1-1 .1.8-.2 1.6-.8 2.2Z"/>' +
      '<path d="M11.7 3.1c-1.2-.1-2.2.7-2.7.7-.6 0-1.4-.6-2.4-.6-1.2 0-2.4.7-3 1.8-1.3 2.2-.3 5.5.9 7.3.6.9 1.4 1.9 2.3 1.8.9 0 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2.1 0 0-1.9-.7-1.9-2.9 0-1.8 1.5-2.7 1.6-2.7-.9-1.3-2.2-1.4-2.8-1.5Z"/>' +
      "</svg>Pay</span>",
    googlepay: '<span class="paymark paymark--google">' +
      '<svg viewBox="0 0 16 16" aria-hidden="true">' +
      '<path d="M15.7 8.2c0-.6 0-1.1-.2-1.6H8v3h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.5 2.4-5.8Z" fill="#4285F4"/>' +
      '<path d="M8 16c2.2 0 4-.7 5.3-2l-2.6-2c-.7.5-1.6.8-2.7.8-2.1 0-3.9-1.4-4.5-3.3H.8v2.1A8 8 0 0 0 8 16Z" fill="#34A853"/>' +
      '<path d="M3.5 9.5a4.8 4.8 0 0 1 0-3.1V4.3H.8a8 8 0 0 0 0 7.2l2.7-2Z" fill="#FBBC04"/>' +
      '<path d="M8 3.2c1.2 0 2.3.4 3.1 1.2l2.3-2.3A8 8 0 0 0 .8 4.3l2.7 2.1C4.1 4.6 5.9 3.2 8 3.2Z" fill="#EA4335"/>' +
      "</svg>Pay</span>",
  };

  /**
   * Логотип LiqPay — официальный файл, а не рисунок.
   *
   * Бренд-бук LiqPay запрещает перерисовывать логотип, перекрашивать его,
   * поворачивать и растягивать, поэтому он подключается картинкой из
   * assets/liqpay и никогда не собирается кодом, как значки выше.
   * Размещение логотипа — требование ЛиqPay к сайту мерчанта.
   */
  MARKS.liqpay =
    '<span class="paymark paymark--liqpay">' +
    '<img src="/assets/liqpay/liqpay-logo.svg" alt="LiqPay" width="500" height="104" loading="lazy" />' +
    "</span>";

  function marksHtml(list) {
    if (!list || !list.length) return "";
    return '<span class="paymarks">' + list.map(function (k) { return MARKS[k] || ""; }).join("") + "</span>";
  }

  /* ---------------------------- загрузка цен ---------------------------- */
  /**
   * Наименование и описание услуги приходят с сервера уже на нужном языке,
   * поэтому запоминаем, на каком языке был ответ: иначе украинец, открывший
   * сайт, читал бы описание пакета по-русски — а именно описание позиции
   * проверяет платёжный сервис.
   */
  function loadPlans() {
    var reqLang = lang();                       // фиксируем: язык может смениться, пока идёт запрос
    return fetch("/api/plans?lang=" + encodeURIComponent(reqLang))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        if (!d.ok) return;
        state.plans = d.plans;
        state.plansLang = reqLang;
        state.promo = d.promo;
        state.rate = d.rate || null;
        decorate();
      })
      .catch(function () { /* цены из переводов уже отрисованы — этого достаточно */ });
  }

  /**
   * Язык страницы меняется тремя путями: выбором человека, языком браузера и
   * автопереключением на украинский для посетителей из Украины. Ловим факт
   * расхождения, а не сами события — так ни один путь не окажется забытым.
   */
  function syncLang() {
    if (state.plansLang !== lang()) loadPlans();
    if (state.methodsLang !== lang()) loadMethods();
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
      // Название и описание услуги: их наличие рядом с ценой — требование
      // правил приёма карт, а человеку понятнее, за что именно он платит.
      if (plan.desc) {
        var desc = $(".tier__desc", card) || document.createElement("p");
        desc.className = "tier__desc";
        desc.textContent = plan.desc;
        if (!desc.parentNode) card.appendChild(desc);
      }
      // Цена в гривне — обязательна для украинского приёма платежей.
      if (plan.uah) {
        var uahEl = $(".tier__uah", card) || document.createElement("div");
        uahEl.className = "tier__uah";
        uahEl.textContent = plan.uah.toLocaleString("uk-UA") + " ₴";
        if (!uahEl.parentNode && perEl) perEl.parentNode.insertBefore(uahEl, perEl.nextSibling);
        else if (!uahEl.parentNode) card.appendChild(uahEl);
      }
      if (plan.off && !$(".tier__save", card)) {
        var save = document.createElement("div");
        save.className = "tier__save";
        save.textContent = t("off") + " " + money(plan.off);
        card.appendChild(save);
      }
      // Наклейка вешается только на карточки со скидкой: она объясняет повод,
      // а на карточке без скидки была бы обещанием, которого нет.
      var oldSticker = $(".promo-sticker", card);
      if (oldSticker) oldSticker.remove();
      if (plan.off && state.promo && state.promo.sticker) {
        card.insertAdjacentHTML("beforeend", stickerHtml(state.promo));
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
    renderRateNote();
  }

  /**
   * Пояснение к цене в гривне: по какому курсу и на какую дату посчитано.
   * Без этого сумма выглядит взятой произвольно, а правила требуют, чтобы
   * цена была понятной и проверяемой.
   */
  /** 2026-07-29 → 29.07.2026: дата для человека, а не для машины. */
  function humanDate(iso) {
    if (!iso) return "";
    var p = String(iso).split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso;
  }

  function renderRateNote() {
    var host = document.querySelector(".pricing");
    if (!host || !state.rate) return;
    var old = document.querySelector(".pricing__rate");
    if (old) old.remove();
    var p = document.createElement("p");
    p.className = "pricing__rate";
    p.textContent = t("rateNote")
      .replace("{rate}", state.rate.eurUah.toFixed(2))
      .replace("{source}", state.rate.source || "ПриватБанк")
      .replace("{date}", humanDate(state.rate.at));
    host.parentNode.insertBefore(p, host.nextSibling);
  }

  /**
   * Наклейка акции: рисунок из общего набора плюс название, которое задал
   * менеджер. Название показывается как есть — оно и есть повод для скидки.
   */
  function stickerHtml(promo) {
    var set = window.NIGUMA_STICKERS || {};
    var s = set[promo.sticker];
    if (!s) return "";
    var caption = promo.name || s[lang()] || s.ru || "";
    return '<div class="promo-sticker" role="img" aria-label="' + esc(caption) + '">' +
      '<span class="promo-sticker__art">' + s.svg + "</span>" +
      (caption ? '<span class="promo-sticker__text">' + esc(caption) + "</span>" : "") +
      "</div>";
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
    ribbon.innerHTML = "<b>−" + state.promo.percent + "%</b>" +
      (state.promo.name ? " · " + esc(state.promo.name) : "") + esc(left);
    host.parentNode.insertBefore(ribbon, host);
  }


  /* ------------------------- способы оплаты ------------------------- */
  /**
   * Показываем только настроенные способы: кнопка, за которой ничего нет,
   * хуже, чем её отсутствие. Пока ответа нет, в блоке остаётся текст из разметки.
   */
  function loadMethods() {
    var reqLang = lang();
    return fetch("/api/payment-methods?lang=" + encodeURIComponent(reqLang))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        if (!d.ok || !d.methods || !d.methods.length) return;
        state.methods = d.methods;
        state.methodsLang = reqLang;
        renderMethods();
      })
      .catch(function () { /* остаётся текст из разметки */ });
  }

  function renderMethods() {
    var host = document.getElementById("payMethods");
    if (!host || !state.methods) return;
    host.innerHTML =
      '<div class="paymethods__grid">' +
      state.methods.map(function (m) {
        return '<div class="paymethod">' +
          '<span class="paymethod__icon">' + (ICONS[m.icon] || "") + "</span>" +
          '<span class="paymethod__name">' + esc(m.name) + "</span>" +
          '<span class="paymethod__hint">' + esc(m.hint) + "</span>" +
          (m.marks && m.marks.length
            ? marksHtml(m.marks)
            : '<span class="paymethod__badge">' + esc(m.badge) + "</span>") +
          (m.mode === "instant" ? '<span class="paymethod__instant">' + esc(t("payInstantNote")) + "</span>" : "") +
        "</div>";
      }).join("") +
      "</div>" +
      '<p class="paymethods__note">' + esc(t("payNote")) + "</p>";
  }


  /** Выбор способа оплаты в форме. Первый способ отмечен по умолчанию. */
  function methodPicker() {
    var list = state.methods || [];
    if (!list.length) return "";
    return '<fieldset class="checkout__methods">' +
      "<legend>" + esc(t("payPick")) + "</legend>" +
      list.map(function (m, i) {
        return '<label class="checkout__method">' +
          '<input type="radio" name="method" value="' + esc(m.id) + '"' + (i === 0 ? " checked" : "") + " />" +
          '<span class="checkout__method-icon">' + (ICONS[m.icon] || "") + "</span>" +
          '<span class="checkout__method-text"><b>' + esc(m.name) + "</b>" +
            (m.amountNote ? ' <span class="checkout__method-amount">' + esc(m.amountNote) + "</span>" : "") +
            (m.marks && m.marks.length ? marksHtml(m.marks) : "<span>" + esc(m.badge) + "</span>") +
          "</span>" +
        "</label>";
      }).join("") +
      "</fieldset>";
  }

  /** Кнопка «скопировать» рядом с реквизитом — руками их не переписывают. */
  function copyable(value) {
    return '<button type="button" class="paydetails__copy" data-copy="' + esc(value) + '">' +
      esc(t("copy")) + "</button>";
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
        '<p class="checkout__plan"><b>' + esc(plan.title || plan.label) + "</b> — " +
          (plan.off ? '<s>' + money(plan.base) + "</s> " : "") + money(plan.final) + "</p>" +
        '<p class="checkout__sub">' + esc(t("sub")) + "</p>" +
        '<form class="checkout__form">' +
          methodPicker() +
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
          method: data.get("method") || (state.methods && state.methods[0] && state.methods[0].id),
          name: data.get("name"), phone: data.get("phone"),
          telegram: data.get("telegram"), comment: data.get("comment"),
        }),
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          // карта: сразу уводим на страницу оплаты банка
          if (d.mode === "instant" && d.checkout) return goToPayment(d.checkout);
          // остальные способы: показываем реквизиты — платить можно не дожидаясь ответа
          showDetails(box, d, close);
        })
        .catch(function () {
          err.textContent = t("err"); err.hidden = false;
          submit.disabled = false; submit.textContent = t("submit");
        })
        .then(function () { state.sending = false; });
    });
  }


  /**
   * Переход на страницу оплаты. Отправляем скрытую форму, потому что LiqPay
   * принимает данные только методом POST — ссылкой это не открыть.
   */
  function goToPayment(checkout) {
    var f = document.createElement("form");
    f.method = "POST";
    f.action = checkout.action;
    f.acceptCharset = "utf-8";
    f.innerHTML =
      '<input type="hidden" name="data" value="' + esc(checkout.data) + '" />' +
      '<input type="hidden" name="signature" value="' + esc(checkout.signature) + '" />';
    document.body.appendChild(f);
    f.submit();
  }

  /** Реквизиты после заявки: с кнопками копирования и ссылкой на бота. */
  function showDetails(box, d, close) {
    var ins = d.instructions;
    var tg = (window.NIGUMA_CONFIG || {}).telegram;
    var inner =
      '<button class="checkout__close" type="button" aria-label="' + esc(t("close")) + '">✕</button>' +
      '<div class="checkout__done">' +
        '<div class="checkout__tick">✓</div>' +
        "<h3>" + esc(t("okTitle")) + "</h3>" +
      "</div>";

    if (ins) {
      inner += '<div class="paydetails">' +
        "<h4>" + esc(ins.title) + "</h4>" +
        '<dl class="paydetails__list">' +
          ins.lines.map(function (l) {
            return "<dt>" + esc(l.label) + "</dt><dd><span>" + esc(l.value) + "</span>" + copyable(l.value) + "</dd>";
          }).join("") +
        "</dl>" +
        (ins.note ? '<p class="paydetails__note">' + esc(ins.note) + "</p>" : "") +
        '<p class="paydetails__after">' + esc(t("detailsAfter")) + "</p>" +
        (tg ? '<a class="btn btn--ghost btn--small" href="' + esc(tg) + '" target="_blank" rel="noopener">' +
          esc(t("openBot")) + "</a>" : "") +
      "</div>";
    } else {
      inner += '<p class="checkout__sub">' + esc(t("okBody")) + "</p>";
    }

    $(".checkout__box", box).innerHTML = inner;
    $(".checkout__close", box).addEventListener("click", close);

    // копирование реквизитов
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-copy]");
      if (!b) return;
      var text = b.getAttribute("data-copy");
      var done = function () { b.textContent = t("copied"); setTimeout(function () { b.textContent = t("copy"); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        ta.remove(); done();
      }
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
      setTimeout(function () { decorate(); syncLang(); busy = false; }, 0);
    }).observe(host, { childList: true });
  }

  function init() {
    loadPlans();
    loadMethods();
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
      b.addEventListener("click", function () {
        setTimeout(function () { decorate(); syncLang(); }, 60);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
