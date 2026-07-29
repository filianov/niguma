/**
 * GET /api/telegram-check?secret=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Диагностика связи с Telegram: показывает, что реально видит сервер.
 * Нужна, когда «в личку приходит, а в канал нет» — Telegram отвечает на такие
 * случаи внятной ошибкой, но при обычной отправке она проглатывается.
 *
 * Секретов не раскрывает: токен не выводится, только его наличие.
 * Без TELEGRAM_WEBHOOK_SECRET эндпоинт отключён.
 */
import { adminIds, kvEnabled } from "./_lib.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

async function tg(method, params) {
  try {
    const r = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, description: "сеть: " + String(e && e.message) };
  }
}

/** Человеческое объяснение самых частых ошибок Telegram. */
function explain(description) {
  const d = String(description || "").toLowerCase();
  if (d.includes("chat not found")) {
    return "Чат не найден. Либо ID указан неверно (для канала он начинается с -100), " +
           "либо бот в этот чат не добавлен.";
  }
  if (d.includes("not enough rights") || d.includes("need administrator")) {
    return "Бот в чате есть, но не хватает прав. Сделайте его администратором " +
           "с правом «Публикация сообщений».";
  }
  if (d.includes("bot is not a member") || d.includes("bot was kicked")) {
    return "Бот не состоит в чате — добавьте его туда.";
  }
  if (d.includes("bot can't initiate conversation")) {
    return "Это личный чат, и человек не нажимал Start у бота. " +
           "Telegram запрещает боту писать первым — откройте бота и нажмите Start.";
  }
  if (d.includes("unauthorized")) {
    return "Токен не принят. Проверьте TELEGRAM_BOT_TOKEN — возможно, вставлен токен другого бота.";
  }
  return null;
}

export default async function handler(req, res) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const given = (req.query && req.query.secret) || "";
  if (!secret || given !== secret) {
    return res.status(404).json({ ok: false });
  }

  const out = {
    токен_задан: Boolean(TOKEN),
    хранилище_Upstash: kvEnabled ? "подключено" : "НЕ подключено — ответы реплаем не дойдут",
    адреса_уведомлений: [],
  };

  if (!TOKEN) {
    out.вывод = "Не задан TELEGRAM_BOT_TOKEN — бот не сможет ничего отправить.";
    return res.status(200).json(out);
  }

  const me = await tg("getMe");
  out.бот = me.ok ? "@" + me.result.username : "ошибка: " + me.description;

  const hook = await tg("getWebhookInfo");
  if (hook.ok) {
    out.вебхук = {
      адрес: hook.result.url || "НЕ УСТАНОВЛЕН — выполните setWebhook",
      секрет_проверяется: Boolean(hook.result.has_custom_certificate) || Boolean(hook.result.url),
      сообщений_в_очереди: hook.result.pending_update_count,
      последняя_ошибка: hook.result.last_error_message || "нет",
    };
  }

  const ids = adminIds();
  if (!ids.length) out.вывод = "TELEGRAM_ADMIN_ID пуст — уведомлять некого.";

  for (const id of ids) {
    const chat = await tg("getChat", { chat_id: id });
    const entry = { id };

    if (!chat.ok) {
      entry.статус = "НЕДОСТУПЕН";
      entry.ошибка = chat.description;
      entry.что_делать = explain(chat.description) || "См. текст ошибки выше.";
      out.адреса_уведомлений.push(entry);
      continue;
    }

    entry.тип = chat.result.type;
    entry.название = chat.result.title || chat.result.first_name || "";

    // пробная отправка — единственный надёжный способ проверить право писать
    const probe = await tg("sendMessage", {
      chat_id: id,
      text: "✅ Проверка связи: уведомления сюда доходят.",
      disable_notification: true,
    });
    if (probe.ok) {
      entry.статус = "РАБОТАЕТ — проверочное сообщение отправлено";
      await tg("deleteMessage", { chat_id: id, message_id: probe.result.message_id });
    } else {
      entry.статус = "НЕ ПИШЕТ";
      entry.ошибка = probe.description;
      entry.что_делать = explain(probe.description) || "См. текст ошибки выше.";
    }
    out.адреса_уведомлений.push(entry);
  }

  return res.status(200).json(out);
}
