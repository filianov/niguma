/**
 * POST /api/telegram-webhook — всё, что происходит в Telegram-боте поддержки.
 *
 * Три сценария:
 *
 *   1. Вы отвечаете **реплаем** на уведомление о вопросе с сайта
 *      → ответ попадает в окно чата на сайте, бот там замолкает.
 *
 *   2. Вы отвечаете **реплаем** на уведомление о письме из Telegram
 *      → ответ уходит человеку в Telegram от имени бота.
 *
 *   3. Человек пишет боту напрямую
 *      → бот отвечает выверенной формулировкой (тот же словарь, что на сайте),
 *        а вам приходит уведомление с кнопкой «ответить реплаем».
 *        Вопросы о здоровье и просьбы позвать человека бот не берёт на себя.
 *
 * Защита: Telegram передаёт секрет в заголовке X-Telegram-Bot-Api-Secret-Token,
 * значение берётся из TELEGRAM_WEBHOOK_SECRET.
 *
 * Подключить один раз (подставьте свои значения):
 *   https://api.telegram.org/bot<ТОКЕН_ЧАТ_БОТА>/setWebhook
 *     ?url=https://15minyoga.com/api/telegram-webhook
 *     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
import {
  pushMessage, setHandover, sessionByTelegramMessage,
  linkTelegramDirect, chatByTelegramMessage,
  sendTelegram, sendToOperator, escapeHtml, isAdmin, kvEnabled, logHook,
} from "./_lib.js";
import { answer, packFor, langFromTelegram } from "./_answer.js";

async function ok(res, note, extra) {
  // Пишем исход в журнал: именно он отвечает на вопрос «почему ответ не дошёл».
  await logHook(Object.assign({ исход: note }, extra || {}));
  return res.status(200).json({ ok: true, note });
}

/** Откуда человек перешёл — параметр после /start в ссылке. */
const SOURCES = {
  lead_landing: "с сайта",
  lead_form: "из формы подписки",
  lead_chat: "из чата на сайте",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const got = req.headers["x-telegram-bot-api-secret-token"] || "";
  if (expected && got !== expected) {
    // Отвечаем 200, чтобы Telegram не копил очередь, но апдейт не обрабатываем.
    // Снаружи это выглядит как «всё хорошо, но ответы не доходят» — поэтому пишем в журнал.
    return await ok(res, "ОТКЛОНЁН: секрет не совпадает", {
      подсказка: "Значение TELEGRAM_WEBHOOK_SECRET в Vercel не совпадает с secret_token, " +
                 "указанным при setWebhook. Выполните setWebhook заново с актуальным секретом.",
      секрет_пришёл: got ? "да, но другой" : "нет — setWebhook сделан без secret_token",
    });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  // Telegram кладёт сообщение в разные поля: личка и группы — message,
  // канал — channel_post. Поддерживаем оба, чтобы «операторской» могли
  // служить и личный чат, и рабочая группа, и канал.
  const msg = body && (body.message || body.channel_post);
  if (!msg || !msg.text) return await ok(res, "not_a_text_message");

  const text = String(msg.text).trim().slice(0, 2000);
  if (!text) return await ok(res, "empty");

  const chatId = msg.chat && msg.chat.id;
  const chatType = (msg.chat && msg.chat.type) || "private";

  // «Свой» чат — тот, что указан в TELEGRAM_ADMIN_ID: личка, группа или канал.
  // В канале поля from нет вовсе, поэтому опираемся на id чата.
  const fromAdmin = isAdmin(chatId) || isAdmin(msg.from && msg.from.id);

  // В группе и канале посторонних быть не может — там только команда.
  const isTeamChat = chatType !== "private";

  /* ---------- 1-2. вы отвечаете реплаем ---------- */
  if (fromAdmin && msg.reply_to_message) {
    const repliedTo = msg.reply_to_message.message_id;

    // ответ посетителю сайта
    const sessionId = await sessionByTelegramMessage(chatId, repliedTo);
    if (sessionId) {
      /**
       * «/бот» возвращает разговор боту.
       *
       * Без этого передача оператору была билетом в один конец: ответили один
       * раз — и бот молчал в этой сессии до конца её жизни, даже когда
       * посетитель спрашивал про цену. Команда короткая и на двух языках,
       * потому что набирать её приходится с телефона.
       *
       * Граница слова здесь задана явно, а не через \b: в JavaScript \b
       * считает словом только латиницу, поэтому после «бот» она не срабатывает
       * и команда молча не ловилась бы.
       */
      if (/^\/(бот|bot)(\s|$)/i.test(text)) {
        await setHandover(sessionId, false);
        return await ok(res, "разговор возвращён боту", { сессия: sessionId });
      }
      await setHandover(sessionId, true);      // дальше говорит человек
      await pushMessage(sessionId, "operator", text);
      return await ok(res, "доставлено в чат на сайте", { сессия: sessionId });
    }

    // ответ человеку, который написал боту в Telegram
    const targetChat = await chatByTelegramMessage(chatId, repliedTo);
    if (targetChat) {
      await sendTelegram(targetChat, escapeHtml(text));
      return await ok(res, "доставлено человеку в Telegram", { чат: String(targetChat) });
    }

    /**
     * Адресат не найден. В личку сказать об этом можно, в группу — нельзя.
     *
     * «Свой» здесь определяется и по отправителю (isAdmin(msg.from.id)), поэтому
     * стоит владельцу ответить реплаем на чьё-нибудь сообщение в общем чате —
     * и бот публично напишет туда служебную фразу. В платном сообществе это
     * недопустимо, а ответ на саму фразу повторял бы её снова и снова.
     */
    if (isTeamChat) return await ok(res, "reply_target_not_found_in_group");

    await sendTelegram(chatId,
      "Не нашёл, кому адресован ответ — возможно, диалогу больше недели.\n" +
      "Ответьте реплаем на более свежее уведомление.");
    return await ok(res, "НЕ НАЙДЕН АДРЕСАТ", {
      чат_откуда_ответили: String(chatId),
      номер_сообщения: repliedTo,
      подсказка: kvEnabled
        ? "Связь не найдена. Обычно это ответ на уведомление, которое пришло ДО обновления кода — " +
          "ответьте на свежее. Если и со свежим так же, значит уведомление и ответ в разных чатах."
        : "Хранилище Upstash не подключено — связь сохранять негде.",
    });
  }

  /* ---------- свои переписываются, но не реплаем ---------- */
  if (fromAdmin) {
    // В группе и канале команда обсуждает свои дела — вмешиваться нельзя,
    // иначе бот засыпет рабочий чат подсказками. Молчим.
    if (isTeamChat) return await ok(res, "team_chat_chatter");

    await sendTelegram(chatId,
      "Это бот поддержки сайта.\n\n" +
      "Чтобы ответить человеку, нажмите на его сообщение → <b>Ответить</b> и напишите текст. " +
      "Обычные сообщения сюда никуда не уходят.");
    return await ok(res, "admin_hint");
  }

  /* ---------- бота добавили в постороннюю группу ---------- */
  // Отвечать клиентскими репликами в чужом групповом чате не следует.
  if (isTeamChat) return await ok(res, "foreign_group_ignored");

  /* ---------- 3. человек пишет боту напрямую ---------- */
  const lang = langFromTelegram(msg.from && msg.from.language_code);
  const pack = packFor(lang);

  // /start — приветствие из того же словаря, что и на сайте
  if (/^\/start\b/.test(text)) {
    await sendTelegram(chatId, escapeHtml(pack.answers.greeting || ""));
    const source = SOURCES[text.split(/\s+/)[1]] || "";
    const notes = await sendToOperator(
      "👋 <b>Новый человек в боте</b>\n\n" +
      escapeHtml(nameOf(msg)) + "\n" +
      (source ? "пришёл " + source + " · " : "") + "<i>язык " + lang + "</i>" +
      "\n↩️ Ответьте <b>реплаем</b> — человек получит сообщение в Telegram."
    );
    for (const n of notes) if (chatId) await linkTelegramDirect(n.chat, n.id, chatId);
    return await ok(res, "greeted");
  }

  const found = await answer(text, lang);
  await sendTelegram(chatId, escapeHtml(found.reply));

  const notes = await sendToOperator(
    (found.wantsHuman ? "🔔 <b>Просят человека — в Telegram</b>" : "💬 <b>Вопрос в Telegram-боте</b>") +
    "\n\n" + escapeHtml(text) +
    "\n\n" + escapeHtml(nameOf(msg)) + " · <i>язык " + lang + "</i>" +
    "\n↩️ Ответьте <b>реплаем</b> — человек получит сообщение в Telegram." +
    (kvEnabled ? "" : "\n⚠️ Хранилище не подключено: ответ реплаем не дойдёт, напишите человеку сами.")
  );
  for (const n of notes) if (chatId) await linkTelegramDirect(n.chat, n.id, chatId);

  return await ok(res, found.wantsHuman ? "handover" : "answered");
}

/** Человекочитаемая подпись отправителя для уведомления. */
function nameOf(msg) {
  const f = msg.from || {};
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ") || "без имени";
  return f.username ? name + " (@" + f.username + ")" : name;
}
