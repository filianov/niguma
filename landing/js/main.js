/* ===================================================================
   Niguma — interactions
   - wires CTA buttons to config links
   - minimal email lead capture (falls back to Telegram bot)
   - scroll reveal, footer year
   =================================================================== */
(function () {
  "use strict";
  var CFG = window.NIGUMA_CONFIG || {};

  /* ---- 1. Wire every [data-cta] element to its config URL ---- */
  function wireCtas() {
    document.querySelectorAll("[data-cta]").forEach(function (el) {
      var key = el.getAttribute("data-cta");
      var url = CFG[key];
      if (url) { el.setAttribute("href", url); }
      else { el.style.display = "none"; } // hide e.g. empty email link before domain exists
    });
  }

  /* ---- 2. Footer year ---- */
  function setYear() {
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---- 3. Scroll reveal (re-armable after i18n re-renders) ---- */
  var io = null;
  function armReveal() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    document.querySelectorAll(".reveal:not(.is-in)").forEach(function (n) { io.observe(n); });
  }
  window.NigumaReveal = armReveal; // i18n calls this after rendering cards/tiers

  /* tag sections for reveal */
  function tagReveal() {
    document.querySelectorAll(".section, .hero__lead, .hero__cta").forEach(function (n) { n.classList.add("reveal"); });
  }

  /* ---- 4. Nav shadow on scroll ---- */
  function navShadow() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var onScroll = function () { nav.style.boxShadow = window.scrollY > 8 ? "0 1px 0 rgba(0,0,0,.06)" : "none"; };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- 5. Lead form: minimal email capture ---- */
  function leadForm() {
    var form = document.getElementById("leadForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (document.getElementById("leadEmail") || {}).value || "";
      var consent = (document.getElementById("leadConsent") || {}).checked;
      if (!email || !consent) { form.reportValidity && form.reportValidity(); return; }

      var lang = document.documentElement.lang || "ru";
      var payload = { email: email, lang: lang, consent: true, source: "landing", ts: new Date().toISOString() };
      var btn = form.querySelector(".lead__submit");
      var box = document.getElementById("leadDone");

      function say(key, cls) {
        if (!box) return;
        box.hidden = false;
        box.className = "lead__done" + (cls ? " " + cls : "");
        box.innerHTML = (window.NigumaI18n ? window.NigumaI18n.t(key) : "") ||
                        "Спасибо! Мы на связи.";
        // предлагаем перейти в бота ссылкой, а не всплывающим окном:
        // popup после асинхронного запроса браузеры блокируют
        if (cls !== "is-error" && CFG.telegram) {
          box.innerHTML += ' <a href="' + CFG.telegram + '" target="_blank" rel="noopener">' +
                           ((window.NigumaI18n && window.NigumaI18n.t("cta.telegram")) || "Открыть бота") + " →</a>";
        }
      }

      if (btn) { btn.disabled = true; btn.style.opacity = ".6"; }

      var finish = function (ok) {
        if (btn) { btn.disabled = false; btn.style.opacity = ""; }
        if (ok) { form.reset(); say("cta.leadThanks"); }
        else { say("cta.leadError", "is-error"); }
      };

      if (CFG.leadEndpoint) {
        fetch(CFG.leadEndpoint, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        })
          .then(function (r) { finish(r.ok); })
          .catch(function () { finish(false); });
      } else {
        // запасной путь без бэкенда — сохраняем локально, чтобы не потерять
        try {
          var k = "niguma.leads";
          var arr = JSON.parse(localStorage.getItem(k) || "[]");
          arr.push(payload); localStorage.setItem(k, JSON.stringify(arr));
        } catch (err) {}
        finish(true);
      }
    });
  }

  /* ---- 6. Deep-dive PDF block: show only when the file actually exists ---- */
  function deeperPdf() {
    var box = document.getElementById("deeper");
    var link = document.getElementById("deeperLink");
    if (!box || !link) return;
    fetch(link.getAttribute("href"), { method: "HEAD" })
      .then(function (r) { if (r.ok) box.hidden = false; })
      .catch(function () { /* no file yet — stays hidden */ });
  }

  /* ---- 7. «Частые вопросы»: «+» справа раскрывает ответ, «−» сворачивает ----
     Один обработчик на весь документ: список перерисовывается при смене
     языка (js/i18n.js), а этот обработчик продолжает работать. Ответы
     раскрываются независимо друг от друга. */
  function faqAccordion() {
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".faq__btn") : null;
      if (!btn) return;
      var item = btn.closest(".faq__item");
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (item) item.classList.toggle("is-open", open);
    });
  }

  /* ---- 8. Тренеры: нажатие на карточку открывает полный профиль ----
     Окно — нативный <dialog> (Esc закрывает сам, фокус заперт внутри).
     Профиль строится на языке, который показан сейчас (js/i18n.js,
     teacherProfile). Закрывается крестиком, Esc и нажатием на фон;
     после закрытия фокус возвращается на карточку. */
  function teacherDialog() {
    var dlg = document.getElementById("teacherDialog");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var body = dlg.querySelector(".tdialog__body");
    var opener = null;

    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".tcard__open") : null;
      if (!btn || !window.NigumaI18n) return;
      var html = window.NigumaI18n.teacherProfile(parseInt(btn.getAttribute("data-teacher"), 10));
      if (!html) return;
      opener = btn;
      body.innerHTML = html;
      dlg.showModal();
      dlg.scrollTop = 0;
      document.documentElement.classList.add("is-dialog-open");
    });
    dlg.querySelector(".tdialog__close").addEventListener("click", function () { dlg.close(); });
    // нажатие на затемнённый фон (вне окна) закрывает его
    dlg.addEventListener("click", function (e) {
      if (e.target !== dlg) return;
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
    });
    dlg.addEventListener("close", function () {
      document.documentElement.classList.remove("is-dialog-open");
      if (opener) { try { opener.focus({ preventScroll: true }); } catch (err) { opener.focus(); } }
    });
  }

  /* ---- 9. Отзывы: «Читать полностью» раскрывает полный текст в карточке ----
     Короткая часть (заголовок + отрывок) сворачивается, полная разворачивается
     (CSS, .rv.is-open). Свернули длинный отзыв, а начало карточки уже ушло
     вверх за край экрана — возвращаем к нему, чтобы читатель не потерялся. */
  function reviewToggle() {
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".rv__toggle") : null;
      if (!btn) return;
      var card = btn.closest(".rv");
      if (!card) return;
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      card.classList.toggle("is-open", open);
      if (!open && card.getBoundingClientRect().top < 0) {
        card.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    teacherDialog();
    reviewToggle();
    wireCtas();
    deeperPdf();
    setYear();
    tagReveal();
    armReveal();
    navShadow();
    leadForm();
    faqAccordion();
  });
})();
