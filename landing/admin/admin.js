/* ===================================================================
   Кабинет менеджера 15minYoga.

   Вся работа с деньгами — на сервере: здесь только показ и отправка команд.
   Ни цены, ни бонусы, ни сроки на стороне браузера не считаются, иначе
   расхождение с базой было бы вопросом времени.
   =================================================================== */
(function () {
  "use strict";

  var state = { tab: "requests", data: null, members: [] };

  /* ------------------------------ помощники ------------------------------ */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function money(cents) {
    return (Number(cents || 0) / 100).toFixed(2).replace(/\.00$/, "") + " €";
  }
  function date(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function api(action, payload) {
    return fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    });
  }

  /* -------------------------------- вход -------------------------------- */
  /**
   * Показ и скрытие дублируем через style: если правило [hidden] в стилях
   * когда-нибудь снова перебьют, вход не должен «молча не срабатывать».
   */
  function showApp() {
    $("#gate").hidden = true;  $("#gate").style.display = "none";
    $("#app").hidden = false;  $("#app").style.display = "";
    loadOverview();
  }
  function showGate() {
    $("#gate").hidden = false; $("#gate").style.display = "";
    $("#app").hidden = true;   $("#app").style.display = "none";
  }

  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#loginError");
    err.hidden = true;
    api("login", { password: $("#password").value }).then(function (r) {
      if (r.data.ok) { $("#password").value = ""; showApp(); return; }
      err.textContent = r.data.error === "not_configured"
        ? (r.data.hint || "Кабинет не настроен.")
        : "Неверный пароль.";
      err.hidden = false;
    });
  });

  $("#logout").addEventListener("click", function () {
    api("logout").then(showGate);
  });

  /* ------------------------------- вкладки ------------------------------- */
  document.querySelectorAll(".adm__tab").forEach(function (b) {
    b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
  });

  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".adm__tab").forEach(function (b) {
      b.setAttribute("aria-current", String(b.getAttribute("data-tab") === tab));
    });
    document.querySelectorAll(".adm__pane").forEach(function (p) {
      p.hidden = p.getAttribute("data-pane") !== tab;
    });
    if (tab === "members") loadMembers("");
    if (tab === "promo") renderPromoForm();
  }

  /* ------------------------------- сводка ------------------------------- */
  function loadOverview() {
    api("overview").then(function (r) {
      if (r.status === 401) return showGate();
      if (!r.data.ok) return;
      state.data = r.data;
      renderStats(r.data.stats);
      renderRequests(r.data.requests);
      renderDue(r.data.due);
      $("#cntRequests").textContent = r.data.requests.length ? "· " + r.data.requests.length : "";
      $("#cntDue").textContent = r.data.due.length ? "· " + r.data.due.length : "";
      switchTab(state.tab);
    });
  }

  function renderStats(s) {
    $("#stats").innerHTML = [
      stat(s.newRequests, "новых заявок", s.newRequests > 0),
      stat(s.active, "действующих подписок"),
      stat(s.overdue, "просрочено", s.overdue > 0),
      stat(s.members, "всего участников"),
      stat(money(s.bonusOutstanding), "бонусов у людей"),
    ].join("");
  }
  function stat(value, label, warn) {
    return '<div class="adm__stat' + (warn ? " adm__stat--warn" : "") + '">' +
      "<b>" + esc(value) + "</b><span>" + esc(label) + "</span></div>";
  }

  /* ------------------------------- заявки ------------------------------- */
  function renderRequests(list) {
    var box = $("#requestsList");
    if (!list.length) {
      box.innerHTML = '<div class="adm__empty">Новых заявок нет. Как только кто-то выберет пакет на сайте, он появится здесь.</div>';
      return;
    }
    box.innerHTML = list.map(function (r) {
      var plan = planLabel(r.planId);
      return '<div class="adm__row">' +
        '<div class="adm__row-main">' +
          '<div class="adm__row-name">' + esc(r.name || "без имени") + "</div>" +
          '<div class="adm__row-sub">' + esc(r.email) +
            (r.phone ? " · " + esc(r.phone) : "") +
            (r.telegram ? " · " + esc(r.telegram) : "") + "</div>" +
          (r.comment ? '<div class="adm__row-sub">💬 ' + esc(r.comment) + "</div>" : "") +
        "</div>" +
        '<div class="adm__row-side">' +
          '<span class="adm__badge">' + esc(plan) + "</span><br>" +
          (r.method ? '<span class="adm__badge">' + esc(methodName(r.method)) + "</span><br>" : "") +
          "заявка от " + date(r.createdAt) +
        "</div>" +
        '<div class="adm__row-actions">' +
          '<button class="btn btn--primary btn--small" data-confirm="' + esc(r.id) + '">Оплата пришла</button>' +
          '<button class="btn btn--ghost btn--small" data-reject="' + esc(r.id) + '">Отклонить</button>' +
        "</div></div>";
    }).join("");
  }

  /** Название способа оплаты для карточки заявки. */
  function methodName(id) {
    return ({ invoice: "счёт на банк", paypal: "PayPal", card: "карта", crypto: "USDT" })[id] || id;
  }

  function planLabel(id) {
    var p = (state.data && state.data.plans || []).find(function (x) { return x.id === id; });
    return p ? p.label : id || "—";
  }

  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-confirm]");
    if (c) return openConfirm(c.getAttribute("data-confirm"));
    var j = e.target.closest("[data-reject]");
    if (j) {
      var why = prompt("Причина отклонения (для истории):", "деньги не пришли");
      if (why === null) return;
      return api("request.reject", { id: j.getAttribute("data-reject"), note: why }).then(loadOverview);
    }
    var m = e.target.closest("[data-member]");
    if (m) return openMember(m.getAttribute("data-member"));
  });

  /* ------------------------- подтверждение оплаты ------------------------- */
  function openConfirm(requestId) {
    var req = (state.data.requests || []).find(function (r) { return r.id === requestId; });
    if (!req) return;
    var plans = state.data.plans || [];
    var today = new Date().toISOString().slice(0, 10);

    openModal(
      "<h3>Подтверждение оплаты</h3>" +
      '<p class="adm__note">' + esc(req.name || req.email) + " · " + esc(req.email) + "</p>" +
      '<form class="adm__form" id="confirmForm">' +
        "<label>Пакет<select id=\"cPlan\">" +
          plans.map(function (p) {
            return '<option value="' + p.id + '"' + (p.id === req.planId ? " selected" : "") + ">" +
              esc(p.label) + " — " + money(p.final) + "</option>";
          }).join("") +
        "</select></label>" +
        "<label>Сколько получено <span>если сумма отличалась от цены пакета</span>" +
          '<input type="number" id="cAmount" step="0.01" min="0" placeholder="' + (plans[0] ? (plans[0].final / 100) : "") + '" /></label>' +
        "<label>Дата оплаты<input type=\"date\" id=\"cDate\" value=\"" + today + "\" /></label>" +
        "<label>Способ<select id=\"cMethod\">" +
          ["Перевод на евро-счёт", "PayPal", "Карта Monobank", "Криптовалюта", "Наличные", "Другое"]
            .map(function (x) { return "<option>" + x + "</option>"; }).join("") +
        "</select></label>" +
        "<label>Списать бонусы, € <span>оставьте пустым, если не списываем</span>" +
          '<input type="number" id="cBonus" step="0.01" min="0" placeholder="0" /></label>' +
        "<label>Заметка<input type=\"text\" id=\"cNote\" placeholder=\"необязательно\" /></label>" +
        '<div class="adm__actions"><button class="btn btn--primary" type="submit">Подтвердить</button></div>' +
      "</form>"
    );

    $("#confirmForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var amount = $("#cAmount").value;
      api("request.confirm", {
        id: requestId,
        planId: $("#cPlan").value,
        cents: amount === "" ? undefined : Math.round(Number(amount) * 100),
        paidAt: $("#cDate").value ? new Date($("#cDate").value + "T12:00:00Z").toISOString() : undefined,
        method: $("#cMethod").value,
        bonusUsedCents: Math.round(Number($("#cBonus").value || 0) * 100),
        note: $("#cNote").value,
      }).then(function (r) {
        if (!r.data.ok) return alert("Не получилось: " + (r.data.error || "неизвестная ошибка"));
        closeModal();
        loadOverview();
        alert("Оплата записана. Доступ до " + date(r.data.payment.nextDueAt) +
              ", ступень «" + r.data.member.level.ru + "», бонусов " + money(r.data.member.bonusCents) + ".");
      });
    });
  }

  /* --------------------------- оплата без заявки --------------------------- */
  $("#manualPayment").addEventListener("click", function () {
    var plans = state.data.plans || [];
    var today = new Date().toISOString().slice(0, 10);
    openModal(
      "<h3>Оплата вручную</h3>" +
      '<p class="adm__note">Для тех, кто написал напрямую. Если почта уже есть в базе, оплата добавится этому же человеку.</p>' +
      '<form class="adm__form" id="manualForm">' +
        "<label>Имя<input type=\"text\" id=\"mName\" /></label>" +
        "<label>Почта<input type=\"email\" id=\"mEmail\" required /></label>" +
        "<label>Телефон<input type=\"text\" id=\"mPhone\" /></label>" +
        "<label>Telegram<input type=\"text\" id=\"mTg\" placeholder=\"@username\" /></label>" +
        "<label>Пакет<select id=\"mPlan\">" +
          plans.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + " — " + money(p.final) + "</option>"; }).join("") +
        "</select></label>" +
        "<label>Сколько получено<input type=\"number\" id=\"mAmount\" step=\"0.01\" min=\"0\" /></label>" +
        "<label>Дата оплаты<input type=\"date\" id=\"mDate\" value=\"" + today + "\" /></label>" +
        '<div class="adm__actions"><button class="btn btn--primary" type="submit">Записать</button></div>' +
      "</form>"
    );
    $("#manualForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var amount = $("#mAmount").value;
      api("payment.manual", {
        name: $("#mName").value, email: $("#mEmail").value,
        phone: $("#mPhone").value, telegram: $("#mTg").value,
        planId: $("#mPlan").value,
        cents: amount === "" ? undefined : Math.round(Number(amount) * 100),
        paidAt: $("#mDate").value ? new Date($("#mDate").value + "T12:00:00Z").toISOString() : undefined,
      }).then(function (r) {
        if (!r.data.ok) return alert("Не получилось: " + (r.data.error || ""));
        closeModal();
        loadOverview();
      });
    });
  });

  /* ------------------------------ продления ------------------------------ */
  function renderDue(list) {
    var box = $("#dueList");
    if (!list.length) {
      box.innerHTML = '<div class="adm__empty">Никого продлевать не нужно — ближайшие две недели свободны.</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      var over = m.daysLeft < 0;
      return '<div class="adm__row' + (over ? " adm__row--overdue" : "") + '">' +
        '<div class="adm__row-main">' +
          '<div class="adm__row-name">' + esc(m.name || m.email) + "</div>" +
          '<div class="adm__row-sub">' + esc(m.email) +
            (m.phone ? " · " + esc(m.phone) : "") + (m.telegram ? " · " + esc(m.telegram) : "") + "</div>" +
          '<div class="adm__row-sub">' +
            '<span class="adm__badge adm__badge--level">' + esc(m.level.ru) + "</span> " +
            '<span class="adm__badge adm__badge--bonus">бонусы ' + money(m.bonusCents) + "</span></div>" +
        "</div>" +
        '<div class="adm__row-side">' +
          '<span class="adm__badge ' + (over ? "adm__badge--overdue" : "adm__badge--soon") + '">' +
            (over ? "просрочено " + Math.abs(m.daysLeft) + " дн." : "через " + m.daysLeft + " дн.") +
          "</span><br>до " + date(m.nextDueAt) +
        "</div>" +
        '<div class="adm__row-actions">' +
          '<button class="btn btn--ghost btn--small" data-member="' + esc(m.id) + '">Карточка</button>' +
        "</div></div>";
    }).join("");
  }

  $("#notifyDue").addEventListener("click", function () {
    api("due.notify", { days: 14 }).then(function (r) {
      alert(r.data.sent ? "Отправлено в чат поддержки: " + r.data.sent + " чел."
                        : "Отправлять некого — список пуст.");
    });
  });

  /* ------------------------------ участники ------------------------------ */
  var searchTimer = null;
  $("#memberSearch").addEventListener("input", function (e) {
    clearTimeout(searchTimer);
    var q = e.target.value;
    searchTimer = setTimeout(function () { loadMembers(q); }, 250);
  });

  function loadMembers(query) {
    api("members", { query: query }).then(function (r) {
      if (!r.data.ok) return;
      state.members = r.data.members;
      var box = $("#membersList");
      if (!r.data.members.length) {
        box.innerHTML = '<div class="adm__empty">' +
          (query ? "Никого не нашлось." : "Участников пока нет — они появятся после первой подтверждённой оплаты.") +
          "</div>";
        return;
      }
      box.innerHTML = r.data.members.map(function (m) {
        var active = m.nextDueAt && new Date(m.nextDueAt).getTime() > Date.now();
        return '<div class="adm__row">' +
          '<div class="adm__row-main">' +
            '<div class="adm__row-name">' + esc(m.name || m.email) + "</div>" +
            '<div class="adm__row-sub">' + esc(m.email) +
              (m.phone ? " · " + esc(m.phone) : "") + (m.telegram ? " · " + esc(m.telegram) : "") + "</div>" +
            '<div class="adm__row-sub">' +
              '<span class="adm__badge adm__badge--level">' + esc(m.level.ru) + "</span> " +
              '<span class="adm__badge">' + m.paidMonths + " мес практики</span> " +
              '<span class="adm__badge adm__badge--bonus">' + money(m.bonusCents) + "</span></div>" +
          "</div>" +
          '<div class="adm__row-side">' +
            (active ? "действует до " + date(m.nextDueAt) : "<b>не активен</b>") + "<br>" +
            "оплачено " + money(m.paidCents) +
          "</div>" +
          '<div class="adm__row-actions">' +
            '<button class="btn btn--ghost btn--small" data-member="' + esc(m.id) + '">Карточка</button>' +
          "</div></div>";
      }).join("");
    });
  }

  /* --------------------------- карточка человека --------------------------- */
  function openMember(id) {
    api("member", { id: id }).then(function (r) {
      if (!r.data.ok) return;
      var m = r.data.member;
      var toNext = m.nextLevel ? m.nextLevel.months - m.paidMonths : 0;

      openModal(
        "<h3>" + esc(m.name || m.email) + "</h3>" +
        '<p class="adm__note">' +
          '<span class="adm__badge adm__badge--level">' + esc(m.level.ru) + "</span> " +
          (m.nextLevel ? "до ступени «" + esc(m.nextLevel.ru) + "» — " + toNext + " мес практики"
                       : "высшая ступень") +
        "</p>" +
        '<dl class="adm__kv">' +
          kv("Почта", m.email) + kv("Телефон", m.phone || "—") + kv("Telegram", m.telegram || "—") +
          kv("Доступ до", m.nextDueAt ? date(m.nextDueAt) + (m.daysLeft < 0 ? " (просрочено)" : " (" + m.daysLeft + " дн.)") : "—") +
          kv("Оплачено месяцев", m.paidMonths) +
          kv("Оплачено всего", money(m.paidCents)) +
          kv("Бонусы", money(m.bonusCents) + " · возврат " + Math.round(m.level.rate * 100) + "%") +
          kv("С нами с", date(m.createdAt)) +
        "</dl>" +

        "<h4>Оплаты</h4>" +
        (r.data.payments.length
          ? '<div class="adm__hist">' + r.data.payments.map(function (p) {
              return "<div><span>" + date(p.paidAt) + " · " + esc(planLabel(p.planId)) +
                (p.method ? " · " + esc(p.method) : "") + "</span><span>" + money(p.cents) +
                (p.bonusUsedCents ? " <span class='adm__minus'>−" + money(p.bonusUsedCents) + " бонусами</span>" : "") +
                "</span></div>";
            }).join("") + "</div>"
          : '<p class="adm__note">Оплат пока нет.</p>') +

        "<h4>Бонусы</h4>" +
        (r.data.loyalty.length
          ? '<div class="adm__hist">' + r.data.loyalty.map(function (l) {
              return "<div><span>" + date(l.at) + " · " + esc(l.reason) + "</span><span class='" +
                (l.delta >= 0 ? "adm__plus'>+" : "adm__minus'>−") + money(Math.abs(l.delta)) + "</span></div>";
            }).join("") + "</div>"
          : '<p class="adm__note">Начислений пока нет.</p>') +

        "<h4>Правки</h4>" +
        '<form class="adm__form" id="memberForm">' +
          "<label>Имя<input type=\"text\" id=\"eName\" value=\"" + esc(m.name) + "\" /></label>" +
          "<label>Телефон<input type=\"text\" id=\"ePhone\" value=\"" + esc(m.phone) + "\" /></label>" +
          "<label>Telegram<input type=\"text\" id=\"eTg\" value=\"" + esc(m.telegram) + "\" /></label>" +
          "<label>Заметка<input type=\"text\" id=\"eNote\" value=\"" + esc(m.note) + "\" /></label>" +
          "<label>Изменить бонусы, € <span>плюс начислит, минус спишет; причина попадёт в историю</span>" +
            '<input type="number" id="eBonus" step="0.01" placeholder="0" /></label>' +
          "<label>Причина правки<input type=\"text\" id=\"eReason\" placeholder=\"например: компенсация за пропуск\" /></label>" +
          '<div class="adm__actions"><button class="btn btn--primary" type="submit">Сохранить</button></div>' +
        "</form>"
      );

      $("#memberForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var bonus = Number($("#eBonus").value || 0);
        var chain = api("member.update", {
          id: m.id, name: $("#eName").value, phone: $("#ePhone").value,
          telegram: $("#eTg").value, note: $("#eNote").value,
        });
        if (bonus) {
          chain = chain.then(function () {
            return api("bonus.adjust", {
              id: m.id, deltaCents: Math.round(bonus * 100),
              reason: $("#eReason").value || "правка вручную",
            });
          });
        }
        chain.then(function () { closeModal(); loadOverview(); loadMembers($("#memberSearch").value); });
      });
    });
  }

  function kv(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd>"; }

  /* -------------------------------- акция -------------------------------- */
  /**
   * Выбор наклейки. Показываем сами рисунки, а не список названий: менеджер
   * должен видеть ровно то, что увидит посетитель на карточке.
   */
  function renderStickerPicker(selected) {
    var box = $("#promoStickers");
    if (!box) return;
    var set = window.NIGUMA_STICKERS || {};
    var keys = window.NIGUMA_STICKER_KEYS || Object.keys(set);
    box.innerHTML =
      '<label class="adm__sticker"><input type="radio" name="sticker" value=""' +
        (!selected ? " checked" : "") + ' /><span class="adm__sticker-none">без наклейки</span></label>' +
      keys.map(function (k) {
        var st = set[k];
        if (!st) return "";
        return '<label class="adm__sticker"><input type="radio" name="sticker" value="' + esc(k) + '"' +
          (selected === k ? " checked" : "") + " />" +
          '<span class="adm__sticker-art">' + st.svg + "</span>" +
          '<span class="adm__sticker-name">' + esc(st.ru) + "</span></label>";
      }).join("");
  }

  function renderPromoForm() {
    var p = state.data && state.data.promo;
    var box = $("#promoState");
    if (p) {
      box.innerHTML = "Сейчас действует: <b>−" + p.percent + "%</b>" +
        (p.name ? " «" + esc(p.name) + "»" : "") +
        (p.endsAt ? ", до " + date(p.endsAt) : ", бессрочно") +
        (p.plans && p.plans.length ? ", только: " + p.plans.map(planLabel).join(", ") : ", на все пакеты");
      $("#promoPercent").value = p.percent;
      $("#promoName").value = p.name || "";
      renderStickerPicker(p.sticker || "");
      document.querySelectorAll("#promoForm input[type=checkbox]").forEach(function (c) {
        c.checked = Boolean(p.plans && p.plans.indexOf(c.value) >= 0);
      });
    } else {
      box.textContent = "Скидка сейчас не действует — на сайте базовые цены.";
      renderStickerPicker("");
    }
  }

  $("#promoForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var plans = [];
    document.querySelectorAll("#promoForm input[type=checkbox]:checked").forEach(function (c) { plans.push(c.value); });
    var sticker = document.querySelector("#promoStickers input:checked");
    api("promo.set", {
      percent: Number($("#promoPercent").value),
      endsAt: $("#promoEnds").value || null,
      plans: plans,
      name: $("#promoName").value,
      sticker: sticker ? sticker.value : "",
    }).then(function (r) {
      if (!r.data.ok) return alert("Проверьте процент: допустимо от 1 до 90.");
      loadOverview();
      alert("Скидка включена — цены на сайте уже обновились.");
    });
  });

  $("#promoClear").addEventListener("click", function () {
    if (!confirm("Отключить скидку? На сайте вернутся базовые цены.")) return;
    api("promo.clear").then(function () { loadOverview(); });
  });

  /* ------------------------------- модалка ------------------------------- */
  function openModal(html) {
    $("#modalBody").innerHTML = html;
    $("#modal").hidden = false;
  }
  function closeModal() { $("#modal").hidden = true; $("#modalBody").innerHTML = ""; }
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", function (e) { if (e.target === $("#modal")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /* -------------------------------- старт -------------------------------- */
  api("session").then(function (r) {
    if (r.data && r.data.authed) showApp(); else showGate();
  });
})();
