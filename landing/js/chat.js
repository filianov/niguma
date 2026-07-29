/* ===================================================================
   15minYoga — виджет чата поддержки.

   Бот отвечает на частые вопросы выверенными формулировками, а по просьбе
   посетителя зовёт живого оператора и замолкает: дальше отвечает человек
   прямо из Telegram, посетитель видит ответ здесь.

   Работает и без серверной части: если /api/support недоступен, виджет
   отвечает локально из того же словаря и предлагает Telegram — посетитель
   не должен упереться в тишину.
   =================================================================== */
(function () {
  "use strict";

  var CFG = window.NIGUMA_CONFIG || {};
  var PACKS = window.NIGUMA_CHAT || {};
  var SKEY = "niguma.chat.session";
  var HKEY = "niguma.chat.history";

  var state = {
    open: false,
    sessionId: null,
    lang: "ru",
    handover: false,
    seen: 0,          // сколько сообщений уже показано (для поллинга)
    polling: null,
    busy: false
  };

  function pack() { return PACKS[state.lang] || PACKS.ru || { answers: {}, ui: {}, quick: [] }; }
  function ui(k) { return (pack().ui || {})[k] || ""; }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function linkify(s) {
    return esc(s)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\bt\.me\/([\w_]+)/g, '<a href="https://t.me/$1" target="_blank" rel="noopener">t.me/$1</a>');
  }

  /* ------------------------------ разметка ------------------------------ */
  function build() {
    var root = document.createElement("div");
    root.className = "chat";
    root.innerHTML =
      '<button class="chat__bubble" type="button" aria-label="' + esc(ui("open")) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M20.5 11.5a7.9 7.9 0 0 1-8.5 7.9 9 9 0 0 1-2.6-.4L4.5 20.5l1.4-4.6a7.7 7.7 0 0 1-1.4-4.4 8 8 0 0 1 8-7.9 7.9 7.9 0 0 1 8 7.9Z"/>' +
        "</svg><span class='chat__dot'></span></button>" +
      '<section class="chat__panel" hidden aria-live="polite">' +
        '<header class="chat__head">' +
          '<div><b class="chat__title"></b><span class="chat__sub"></span></div>' +
          '<button class="chat__close" type="button" aria-label="' + esc(ui("close")) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        "</header>" +
        '<div class="chat__log"></div>' +
        '<div class="chat__quick"></div>' +
        '<form class="chat__form">' +
          '<input class="chat__input" type="text" autocomplete="off" />' +
          '<button class="chat__send" type="submit">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12h13M12.5 6.5 18.5 12l-6 5.5"/></svg>' +
          "</button>" +
        "</form>" +
      "</section>";
    document.body.appendChild(root);
    return root;
  }

  var el = {};

  function applyTexts() {
    el.title.textContent = ui("title") || "15minYoga";
    el.sub.textContent = ui("subtitle");
    el.input.placeholder = ui("placeholder");
    el.send.setAttribute("aria-label", ui("send"));
    el.bubble.setAttribute("aria-label", ui("open"));
    renderQuick();
  }

  function renderQuick() {
    var labels = pack().quick || [];
    var keys = ["price", "schedule", "trial", "beginner"];
    el.quick.innerHTML = labels.map(function (l, i) {
      return '<button type="button" class="chat__chip" data-topic="' + keys[i] + '">' + esc(l) + "</button>";
    }).join("");
  }

  /* ------------------------------ сообщения ------------------------------ */
  function add(role, text, opts) {
    opts = opts || {};
    var row = document.createElement("div");
    row.className = "chat__msg chat__msg--" + role;
    row.innerHTML = '<div class="chat__bua">' + linkify(text) + "</div>";
    if (opts.telegram && CFG.telegram) {
      row.innerHTML += '<a class="chat__tg" href="' + CFG.telegram + '" target="_blank" rel="noopener">' +
        esc(ui("toTelegram")) + " →</a>";
    }
    el.log.appendChild(row);
    el.log.scrollTop = el.log.scrollHeight;
    saveHistory();
  }

  function addSystem(text) {
    var row = document.createElement("div");
    row.className = "chat__system";
    row.textContent = text;
    el.log.appendChild(row);
    el.log.scrollTop = el.log.scrollHeight;
  }

  function typing(on) {
    var t = el.log.querySelector(".chat__typing");
    if (on && !t) {
      var d = document.createElement("div");
      d.className = "chat__msg chat__msg--bot chat__typing";
      d.innerHTML = '<div class="chat__bua"><span></span><span></span><span></span></div>';
      el.log.appendChild(d);
      el.log.scrollTop = el.log.scrollHeight;
    } else if (!on && t) {
      t.remove();
    }
  }

  /* ---------------------- история в пределах вкладки ---------------------- */
  function saveHistory() {
    try {
      var items = Array.prototype.map.call(el.log.querySelectorAll(".chat__msg:not(.chat__typing)"), function (n) {
        return { role: n.className.indexOf("--user") > 0 ? "user"
                     : n.className.indexOf("--operator") > 0 ? "operator" : "bot",
                 html: n.querySelector(".chat__bua").innerHTML };
      });
      sessionStorage.setItem(HKEY, JSON.stringify(items.slice(-40)));
    } catch (e) {}
  }

  function restoreHistory() {
    try {
      var items = JSON.parse(sessionStorage.getItem(HKEY) || "[]");
      if (!items.length) return false;
      items.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "chat__msg chat__msg--" + m.role;
        row.innerHTML = '<div class="chat__bua">' + m.html + "</div>";
        el.log.appendChild(row);
      });
      el.log.scrollTop = el.log.scrollHeight;
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------ отправка ------------------------------ */
  function localAnswer(text) {
    // резервный режим: определяем тему теми же ключевыми словами, что и сервер
    var kw = pack().keywords || {};
    var t = " " + text.toLowerCase().replace(/[^\wа-яёіїєґ\s]/gi, " ").replace(/\s+/g, " ") + " ";
    var best = null, score = 0;
    Object.keys(kw).forEach(function (topic) {
      var s = 0;
      kw[topic].forEach(function (k) {
        k = String(k).toLowerCase();
        if (t.indexOf(" " + k) >= 0) s += k.indexOf(" ") >= 0 ? 2 : 1;
      });
      if (s > score) { score = s; best = topic; }
    });
    return best ? pack().answers[best] : pack().answers.fallback;
  }

  function send(text) {
    if (!text || state.busy) return;
    state.busy = true;
    add("user", text);
    el.input.value = "";
    typing(true);

    fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, lang: state.lang, sessionId: state.sessionId })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        typing(false);
        state.busy = false;
        if (d.sessionId) {
          state.sessionId = d.sessionId;
          try { sessionStorage.setItem(SKEY, d.sessionId); } catch (e) {}
        }
        if (d.handover) {
          state.handover = true;
          add("bot", d.reply);
          addSystem(ui("operatorCalled"));
          startPolling(d.canReceiveOperator !== false);
        } else if (d.reply) {
          add("bot", d.reply);
        }
        if (d.canReceiveOperator === false && state.handover) {
          // ответ оператора в чат вернуться не сможет — уводим в Telegram
          add("bot", ui("toTelegram"), { telegram: true });
        }
      })
      .catch(function () {
        // сервер недоступен — отвечаем локально, чтобы посетитель не остался без ответа
        typing(false);
        state.busy = false;
        add("bot", localAnswer(text), { telegram: true });
      });
  }

  /* ------------------------- ответы оператора ------------------------- */
  function startPolling(enabled) {
    if (!enabled || state.polling || !state.sessionId) return;
    state.polling = setInterval(function () {
      fetch("/api/support-messages?sessionId=" + encodeURIComponent(state.sessionId) + "&from=" + state.seen)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          if (d.disabled) { stopPolling(); return; }
          state.seen = d.total || state.seen;
          (d.messages || []).forEach(function (m) {
            if (m.role === "operator") {
              if (!state.operatorSeen) { addSystem(ui("operatorJoined")); state.operatorSeen = true; }
              add("operator", m.text);
              notify();
            }
          });
        })
        .catch(function () { /* сеть моргнула — попробуем на следующем тике */ });
    }, 5000);
  }

  function stopPolling() {
    if (state.polling) { clearInterval(state.polling); state.polling = null; }
  }

  function notify() {
    if (!state.open) el.root.classList.add("chat--unread");
  }

  /* ------------------------------- открыть ------------------------------- */
  function open() {
    state.open = true;
    el.panel.hidden = false;
    el.panel.style.display = "";           // страховка, если [hidden] перебьют стилями
    el.root.classList.add("chat--open");
    el.root.classList.remove("chat--unread");
    setTimeout(function () { el.input.focus(); }, 60);
    if (!el.log.children.length) {
      if (!restoreHistory()) add("bot", pack().answers.greeting || "");
    }
    if (state.handover) startPolling(true);
  }

  function close() {
    state.open = false;
    el.panel.hidden = true;
    el.panel.style.display = "none";       // страховка: закрытая панель не должна ловить клики
    el.root.classList.remove("chat--open");
  }

  /* -------------------------------- старт -------------------------------- */
  function init() {
    if (!Object.keys(PACKS).length) return;   // контент не загрузился — виджет не показываем

    state.lang = document.documentElement.lang || "ru";
    try { state.sessionId = sessionStorage.getItem(SKEY) || null; } catch (e) {}

    var root = build();
    el = {
      root: root,
      bubble: root.querySelector(".chat__bubble"),
      panel: root.querySelector(".chat__panel"),
      title: root.querySelector(".chat__title"),
      sub: root.querySelector(".chat__sub"),
      log: root.querySelector(".chat__log"),
      quick: root.querySelector(".chat__quick"),
      form: root.querySelector(".chat__form"),
      input: root.querySelector(".chat__input"),
      send: root.querySelector(".chat__send"),
      close: root.querySelector(".chat__close")
    };
    applyTexts();
    close();                                // стартуем гарантированно закрытыми

    el.bubble.addEventListener("click", function () { state.open ? close() : open(); });
    el.close.addEventListener("click", close);
    el.form.addEventListener("submit", function (e) {
      e.preventDefault();
      send(el.input.value.trim());
    });
    el.quick.addEventListener("click", function (e) {
      var b = e.target.closest(".chat__chip");
      if (b) send(b.textContent);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) close();
    });

    // язык переключили на сайте — переводим и чат
    var langBtns = document.querySelectorAll(".lang__btn");
    langBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        state.lang = b.getAttribute("data-lang") || state.lang;
        applyTexts();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
