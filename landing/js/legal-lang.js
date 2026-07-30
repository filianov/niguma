/* ===================================================================
   15minYoga — выбор языка на юридических страницах.

   Четыре страницы (оферта, возврат, конфиденциальность, Impressum) выбирали
   язык каждая по-своему, четырьмя копиями одного кода. Копии разошлись:
   где-то запасным языком был украинский, где-то немецкий, и посетитель из
   Украины открывал условия оплаты по-немецки. Теперь логика одна.

   Отдельно решается требование части 6 статьи 27 Закона України «Про
   забезпечення функціонування української мови як державної»: посетителю
   с территории Украины страница обязана открываться на украинском.
   Страну знает только сервер — спрашиваем /api/geo.

   Страница отвечает за отрисовку, этот файл — только за то, КАКОЙ язык
   показать. Ключ хранения общий с главной страницей, поэтому выбранный
   язык переходит с сайта в документы и обратно.
   =================================================================== */
(function () {
  "use strict";

  var SUPPORTED = ["uk", "ru", "en", "de"];
  var KEY = "niguma.lang";

  function chosen() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    return saved && SUPPORTED.indexOf(saved) >= 0 ? saved : null;
  }

  /**
   * Запоминается только язык, выбранный человеком.
   *
   * Пока запоминался и автоопределённый, первый же заход из Украины с русским
   * браузером записывал «ru» как осознанный выбор — и украинская версия больше
   * не открывалась никогда, ни на сайте, ни в документах.
   */
  function remember(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  function detect(fallback) {
    var saved = chosen();
    if (saved) return saved;
    var nav = (navigator.language || fallback).slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(nav) >= 0 ? nav : fallback;
  }

  /**
   * Подключает выбор языка к странице.
   *
   * @param {function(string)} render  отрисовка страницы на заданном языке;
   *                                   сама ничего не сохраняет
   * @param {string} fallback          язык, если ни выбора, ни подходящего
   *                                   языка браузера нет
   */
  window.NigumaLegalLang = function (render, fallback) {
    fallback = SUPPORTED.indexOf(fallback) >= 0 ? fallback : "uk";

    function show(lang, byPerson) {
      if (SUPPORTED.indexOf(lang) < 0) lang = fallback;
      render(lang);
      if (byPerson) remember(lang);
    }

    show(detect(fallback), false);

    // страна важнее языка браузера, но слабее осознанного выбора человека
    if (!chosen() && document.documentElement.lang !== "uk") {
      fetch("/api/geo", { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.country === "UA" && !chosen()) show("uk", false);
        })
        .catch(function () {});
    }

    document.querySelectorAll(".lang__btn").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-lang"), true); });
    });
  };
})();
