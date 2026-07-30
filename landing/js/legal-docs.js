/* ===================================================================
   15minYoga — публичный договор (оферта) и условия возврата.

   Документы нужны для приёма карт: ПриватБанк требует, чтобы на сайте были
   регистрационные данные получателя платежа, его адрес, условия возврата и
   договор с клиентом. Реквизиты здесь ДОЛЖНЫ совпадать с кабинетом мерчанта —
   расхождение блокирует перечисление средств.

   Разделение сторон намеренное и отражает действительность:
     • ФОП Фільянов П.О. (Украина) — исполнитель по этому договору, принимает
       оплату картой через LiqPay и организует доступ к занятиям;
     • Olha Filianova (Германия) — преподаватель, проводит занятия; её выходные
       данные в /legal/impressum, как требует § 5 DDG.

   Изменение реквизитов — только вместе с кабинетом мерчанта LiqPay.
   =================================================================== */
window.NIGUMA_LEGAL = {
  /* ------------------------------ реквизиты ------------------------------ */
  merchant: {
    uk: {
      name: "ФОП Фільянов Павло Олексійович",
      code: "РНОКПП 2982107454",
      address: "Україна, 04053, м. Київ, Вознесенський узвіз, 23-В, офіс 29",
      bank: "АТ КБ «ПриватБанк»",
      email: "15minyoga.com@gmail.com",
      site: "15minyoga.com",
    },
    ru: {
      name: "ФЛП Фильянов Павел Алексеевич",
      code: "РНУКПН 2982107454",
      address: "Украина, 04053, г. Киев, Вознесенский спуск, 23-В, офис 29",
      bank: "АО КБ «ПриватБанк»",
      email: "15minyoga.com@gmail.com",
      site: "15minyoga.com",
    },
    en: {
      name: "Pavlo Filianov, sole proprietor",
      code: "Tax ID 2982107454",
      address: "23-V Voznesenskyi uzviz, office 29, Kyiv 04053, Ukraine",
      bank: "JSC CB PrivatBank",
      email: "15minyoga.com@gmail.com",
      site: "15minyoga.com",
    },
    de: {
      name: "Pavlo Filianov, Einzelunternehmer",
      code: "Steuernummer 2982107454",
      address: "Voznesenskyi uzviz 23-V, Büro 29, 04053 Kyjiw, Ukraine",
      bank: "JSC CB PrivatBank",
      email: "15minyoga.com@gmail.com",
      site: "15minyoga.com",
    },
  },

  /* ------------------------- публичный договор ------------------------- */
  terms: {
    uk: {
      title: "Публічний договір (оферта)",
      intro: "Договір про надання послуг доступу до онлайн-занять 15minYoga",
      updated: "Редакція від 29 липня 2026 року",
      sections: [
        {
          heading: "1. Загальні положення",
          lines: [
            "Цей документ є публічною офертою — пропозицією укласти договір на умовах, викладених нижче. Оферта адресована будь-якій дієздатній фізичній особі (далі — Замовник).",
            "Виконавцем за цим договором є ФОП Фільянов Павло Олексійович, реєстраційні дані наведено в розділі 11.",
            "Заняття проводить викладач Ольга Фільянова (Німеччина). Виконавець організовує доступ до занять і приймає оплату.",
            "Оплата будь-яким зі способів на сайті означає повну й беззастережну згоду з умовами цього договору (акцепт).",
          ],
        },
        {
          heading: "2. Предмет договору",
          lines: [
            "Виконавець надає Замовнику доступ до онлайн-занять йогою за системою Ніґуми у форматі прямих ефірів і записів на обраний строк.",
            "Заняття проходять з понеділка по п'ятницю з 07:00 до 07:15 за віденським часом; у суботу — розширене заняття. Розклад може змінюватися з попередженням у закритому каналі.",
            "Доступ надається персонально Замовнику. Передавати доступ третім особам не можна.",
            "Послуга є цифровою: матеріальний товар не постачається.",
          ],
        },
        {
          heading: "3. Вартість і оплата",
          lines: [
            "Вартість пакетів указана на сайті в євро: 1 місяць — 100 €, 6 місяців — 500 €, 12 місяців — 900 €. Актуальна ціна показується в розділі «Вартість» і може змінюватися; для вже оплаченого періоду ціна не переглядається.",
            "Оплата можлива банківським переказом, через PayPal, карткою онлайн (Visa, Mastercard, Apple Pay, Google Pay) або криптовалютою.",
            "Оплата карткою обробляється платіжним сервісом LiqPay (АТ КБ «ПриватБанк»). Виконавець не отримує й не зберігає дані картки.",
            "Доступ відкривається після надходження коштів. За оплати карткою — автоматично, за інших способів — після підтвердження платежу, зазвичай протягом одного робочого дня.",
          ],
        },
        {
          heading: "4. Порядок надання послуг",
          lines: [
            "Після підтвердження оплати Замовник отримує посилання на заняття та доступ до закритого каналу з записами.",
            "Строк доступу відлічується від дати підтвердження оплати. Продовження до закінчення строку додається до залишку — оплачені дні не згорають.",
            "Пропущені заняття доступні в записі протягом строку дії доступу.",
            "Виконавець має право замінити викладача або перенести заняття, попередивши в закритому каналі.",
          ],
        },
        {
          heading: "5. Повернення коштів",
          lines: [
            "Умови повернення викладені в окремому розділі «Умови обміну та повернення» і є невід'ємною частиною цього договору.",
            "Коротко: протягом 14 днів з моменту оплати Замовник може відмовитися від послуги й повернути кошти за невикористаний період.",
          ],
        },
        {
          heading: "6. Права та обов'язки сторін",
          lines: [
            "Виконавець зобов'язаний надати доступ до занять на оплачений строк і повідомляти про зміни в розкладі.",
            "Замовник зобов'язаний не передавати доступ третім особам, не поширювати записи занять і не використовувати матеріали в комерційних цілях.",
            "У разі порушення цих умов Виконавець має право припинити доступ без повернення коштів за невикористаний період.",
          ],
        },
        {
          heading: "7. Відповідальність і застереження щодо здоров'я",
          lines: [
            "Заняття йогою не є медичною послугою. Виконавець і викладач не діагностують, не лікують і не дають медичних рекомендацій.",
            "Замовник самостійно оцінює стан свого здоров'я. За наявності захворювань, травм, вагітності або сумнівів слід порадитися з лікарем до початку занять.",
            "Замовник виконує вправи на власний розсуд і несе відповідальність за свій стан під час занять.",
            "Виконавець не відповідає за перебої, спричинені роботою сторонніх сервісів (Zoom, Telegram, платіжні системи, інтернет-провайдери).",
          ],
        },
        {
          heading: "8. Персональні дані",
          lines: [
            "Обробка персональних даних описана в Політиці конфіденційності, посилання на яку є в підвалі сайту.",
            "Оплачуючи послугу, Замовник погоджується на обробку своїх даних в обсязі, потрібному для надання послуги.",
          ],
        },
        {
          heading: "9. Строк дії та зміни",
          lines: [
            "Договір діє з моменту акцепту до закінчення оплаченого строку доступу.",
            "Виконавець може змінювати умови договору. Зміни діють з моменту публікації на сайті та не поширюються на вже оплачені періоди.",
          ],
        },
        {
          heading: "10. Вирішення спорів",
          lines: [
            "Сторони вирішують спори шляхом переговорів. Звернення надсилайте на 15minyoga.com@gmail.com — відповідь протягом 10 робочих днів.",
            "У разі недосягнення згоди спір вирішується згідно із законодавством України.",
          ],
        },
        {
          heading: "11. Реквізити Виконавця",
          merchant: true,
        },
      ],
    },

    ru: {
      title: "Публичный договор (оферта)",
      intro: "Договор о предоставлении услуг доступа к онлайн-занятиям 15minYoga",
      updated: "Редакция от 29 июля 2026 года",
      sections: [
        {
          heading: "1. Общие положения",
          lines: [
            "Этот документ является публичной офертой — предложением заключить договор на изложенных ниже условиях. Оферта адресована любому дееспособному физическому лицу (далее — Заказчик).",
            "Исполнителем по договору является ФЛП Фильянов Павел Алексеевич, регистрационные данные приведены в разделе 11.",
            "Занятия проводит преподаватель Ольга Фильянова (Германия). Исполнитель организует доступ к занятиям и принимает оплату.",
            "Оплата любым из способов на сайте означает полное и безоговорочное согласие с условиями договора (акцепт).",
          ],
        },
        {
          heading: "2. Предмет договора",
          lines: [
            "Исполнитель предоставляет Заказчику доступ к онлайн-занятиям йогой по системе Нигумы в формате прямых эфиров и записей на выбранный срок.",
            "Занятия проходят с понедельника по пятницу с 07:00 до 07:15 по венскому времени; в субботу — расширенное занятие. Расписание может меняться с предупреждением в закрытом канале.",
            "Доступ предоставляется персонально Заказчику. Передавать доступ третьим лицам нельзя.",
            "Услуга является цифровой: материальный товар не поставляется.",
          ],
        },
        {
          heading: "3. Стоимость и оплата",
          lines: [
            "Стоимость пакетов указана на сайте в евро: 1 месяц — 100 €, 6 месяцев — 500 €, 12 месяцев — 900 €. Актуальная цена показывается в разделе «Стоимость» и может меняться; для уже оплаченного периода цена не пересматривается.",
            "Оплата возможна банковским переводом, через PayPal, картой онлайн (Visa, Mastercard, Apple Pay, Google Pay) или криптовалютой.",
            "Оплата картой обрабатывается платёжным сервисом LiqPay (АО КБ «ПриватБанк»). Исполнитель не получает и не хранит данные карты.",
            "Доступ открывается после поступления средств. При оплате картой — автоматически, при других способах — после подтверждения платежа, обычно в течение одного рабочего дня.",
          ],
        },
        {
          heading: "4. Порядок оказания услуг",
          lines: [
            "После подтверждения оплаты Заказчик получает ссылку на занятия и доступ к закрытому каналу с записями.",
            "Срок доступа отсчитывается от даты подтверждения оплаты. Продление до окончания срока добавляется к остатку — оплаченные дни не сгорают.",
            "Пропущенные занятия доступны в записи в течение срока действия доступа.",
            "Исполнитель вправе заменить преподавателя или перенести занятие, предупредив в закрытом канале.",
          ],
        },
        {
          heading: "5. Возврат средств",
          lines: [
            "Условия возврата изложены в отдельном разделе «Условия обмена и возврата» и являются неотъемлемой частью договора.",
            "Кратко: в течение 14 дней с момента оплаты Заказчик может отказаться от услуги и вернуть средства за неиспользованный период.",
          ],
        },
        {
          heading: "6. Права и обязанности сторон",
          lines: [
            "Исполнитель обязан предоставить доступ к занятиям на оплаченный срок и сообщать об изменениях в расписании.",
            "Заказчик обязан не передавать доступ третьим лицам, не распространять записи занятий и не использовать материалы в коммерческих целях.",
            "При нарушении этих условий Исполнитель вправе прекратить доступ без возврата средств за неиспользованный период.",
          ],
        },
        {
          heading: "7. Ответственность и предупреждение о здоровье",
          lines: [
            "Занятия йогой не являются медицинской услугой. Исполнитель и преподаватель не диагностируют, не лечат и не дают медицинских рекомендаций.",
            "Заказчик самостоятельно оценивает состояние своего здоровья. При наличии заболеваний, травм, беременности или сомнений следует посоветоваться с врачом до начала занятий.",
            "Заказчик выполняет упражнения по своему усмотрению и несёт ответственность за своё состояние во время занятий.",
            "Исполнитель не отвечает за перебои, вызванные работой сторонних сервисов (Zoom, Telegram, платёжные системы, интернет-провайдеры).",
          ],
        },
        {
          heading: "8. Персональные данные",
          lines: [
            "Обработка персональных данных описана в Политике конфиденциальности, ссылка на которую есть в подвале сайта.",
            "Оплачивая услугу, Заказчик соглашается на обработку своих данных в объёме, необходимом для оказания услуги.",
          ],
        },
        {
          heading: "9. Срок действия и изменения",
          lines: [
            "Договор действует с момента акцепта до окончания оплаченного срока доступа.",
            "Исполнитель может изменять условия договора. Изменения действуют с момента публикации на сайте и не распространяются на уже оплаченные периоды.",
          ],
        },
        {
          heading: "10. Разрешение споров",
          lines: [
            "Стороны разрешают споры путём переговоров. Обращения направляйте на 15minyoga.com@gmail.com — ответ в течение 10 рабочих дней.",
            "При недостижении согласия спор разрешается в соответствии с законодательством Украины.",
          ],
        },
        {
          heading: "11. Реквизиты Исполнителя",
          merchant: true,
        },
      ],
    },

    en: {
      title: "Public offer agreement",
      intro: "Agreement on access to 15minYoga online classes",
      updated: "Version of 29 July 2026",
      sections: [
        {
          heading: "1. General provisions",
          lines: [
            "This document is a public offer — a proposal to conclude an agreement on the terms set out below, addressed to any person with legal capacity (the Client).",
            "The Provider under this agreement is Pavlo Filianov, sole proprietor; registration details are given in section 11.",
            "Classes are taught by Olha Filianova (Germany). The Provider arranges access to the classes and accepts payment.",
            "Payment by any method offered on the site constitutes full and unconditional acceptance of these terms.",
          ],
        },
        {
          heading: "2. Subject of the agreement",
          lines: [
            "The Provider grants the Client access to online yoga classes in the Niguma tradition, as live sessions and recordings, for the selected period.",
            "Classes run Monday to Friday, 07:00–07:15 Vienna time; on Saturday there is an extended session. The schedule may change, with notice in the members' channel.",
            "Access is personal to the Client and may not be shared with third parties.",
            "The service is digital; no physical goods are supplied.",
          ],
        },
        {
          heading: "3. Price and payment",
          lines: [
            "Prices are shown on the site in euro: 1 month — €100, 6 months — €500, 12 months — €900. The current price is shown in the “Pricing” section and may change; the price of an already paid period is not revised.",
            "Payment is possible by bank transfer, PayPal, card online (Visa, Mastercard, Apple Pay, Google Pay) or cryptocurrency.",
            "Card payments are processed by LiqPay (JSC CB PrivatBank). The Provider neither receives nor stores card details.",
            "Access opens once funds are received: automatically for card payments, and after confirmation for other methods — usually within one business day.",
          ],
        },
        {
          heading: "4. Provision of the service",
          lines: [
            "After the payment is confirmed, the Client receives the link to the classes and access to the members' channel with recordings.",
            "The access period starts on the date the payment is confirmed. Renewing before the period ends adds to the remainder — paid days are not lost.",
            "Missed classes remain available as recordings for the duration of the access period.",
            "The Provider may replace the teacher or reschedule a class, with notice in the members' channel.",
          ],
        },
        {
          heading: "5. Refunds",
          lines: [
            "Refund terms are set out in the separate “Exchange and refund policy” and form an integral part of this agreement.",
            "In short: within 14 days of payment the Client may withdraw and receive a refund for the unused period.",
          ],
        },
        {
          heading: "6. Rights and obligations",
          lines: [
            "The Provider shall grant access for the paid period and give notice of schedule changes.",
            "The Client shall not share access, distribute recordings or use the materials commercially.",
            "In case of breach, the Provider may terminate access without refunding the unused period.",
          ],
        },
        {
          heading: "7. Liability and health notice",
          lines: [
            "Yoga classes are not a medical service. Neither the Provider nor the teacher diagnoses, treats or gives medical advice.",
            "The Client assesses their own state of health. In case of illness, injury, pregnancy or any doubt, consult a doctor before starting.",
            "The Client performs the exercises at their own discretion and is responsible for their condition during the classes.",
            "The Provider is not liable for interruptions caused by third-party services (Zoom, Telegram, payment systems, internet providers).",
          ],
        },
        {
          heading: "8. Personal data",
          lines: [
            "Processing of personal data is described in the Privacy Policy, linked in the site footer.",
            "By paying for the service the Client consents to processing of their data to the extent necessary to provide it.",
          ],
        },
        {
          heading: "9. Term and changes",
          lines: [
            "The agreement is in force from acceptance until the end of the paid access period.",
            "The Provider may amend these terms. Amendments take effect on publication and do not apply to periods already paid for.",
          ],
        },
        {
          heading: "10. Disputes",
          lines: [
            "The parties settle disputes through negotiation. Write to 15minyoga.com@gmail.com — we reply within 10 business days.",
            "Failing agreement, disputes are resolved under the law of Ukraine.",
          ],
        },
        {
          heading: "11. Provider details",
          merchant: true,
        },
      ],
    },

    de: {
      title: "Öffentliches Angebot (Vertrag)",
      intro: "Vertrag über den Zugang zu den Online-Kursen 15minYoga",
      updated: "Stand: 29. Juli 2026",
      sections: [
        {
          heading: "1. Allgemeines",
          lines: [
            "Dieses Dokument ist ein öffentliches Angebot — ein Vorschlag zum Vertragsschluss zu den unten genannten Bedingungen, gerichtet an jede geschäftsfähige Person (Kundin oder Kunde).",
            "Anbieter nach diesem Vertrag ist Pavlo Filianov, Einzelunternehmer; die Registrierungsdaten stehen in Abschnitt 11.",
            "Die Kurse leitet Olha Filianova (Deutschland). Der Anbieter organisiert den Zugang und nimmt die Zahlung entgegen.",
            "Die Zahlung über einen der angebotenen Wege gilt als vollständige und vorbehaltlose Annahme dieser Bedingungen.",
          ],
        },
        {
          heading: "2. Vertragsgegenstand",
          lines: [
            "Der Anbieter gewährt Zugang zu Online-Yogakursen in der Niguma-Tradition — als Live-Sitzungen und Aufzeichnungen — für den gewählten Zeitraum.",
            "Die Kurse finden montags bis freitags von 07:00 bis 07:15 Uhr Wiener Zeit statt; samstags eine längere Einheit. Der Zeitplan kann sich ändern, mit Ankündigung im Mitgliederkanal.",
            "Der Zugang ist persönlich und darf nicht an Dritte weitergegeben werden.",
            "Es handelt sich um eine digitale Leistung; es werden keine Waren geliefert.",
          ],
        },
        {
          heading: "3. Preis und Zahlung",
          lines: [
            "Die Preise stehen auf der Seite in Euro: 1 Monat — 100 €, 6 Monate — 500 €, 12 Monate — 900 €. Der aktuelle Preis steht im Abschnitt „Preise“ und kann sich ändern; für bereits bezahlte Zeiträume bleibt er unverändert.",
            "Zahlung ist möglich per Banküberweisung, PayPal, Karte online (Visa, Mastercard, Apple Pay, Google Pay) oder Kryptowährung.",
            "Kartenzahlungen werden über LiqPay (JSC CB PrivatBank) abgewickelt. Der Anbieter erhält und speichert keine Kartendaten.",
            "Der Zugang öffnet sich nach Zahlungseingang: bei Kartenzahlung automatisch, bei anderen Wegen nach Bestätigung — in der Regel innerhalb eines Werktags.",
          ],
        },
        {
          heading: "4. Leistungserbringung",
          lines: [
            "Nach Bestätigung der Zahlung erhalten Sie den Link zu den Kursen und Zugang zum Mitgliederkanal mit den Aufzeichnungen.",
            "Die Zugangsdauer beginnt mit der Bestätigung der Zahlung. Eine Verlängerung vor Ablauf wird zur Restlaufzeit addiert — bezahlte Tage verfallen nicht.",
            "Verpasste Einheiten bleiben während der Zugangsdauer als Aufzeichnung verfügbar.",
            "Der Anbieter darf die Lehrkraft wechseln oder eine Einheit verschieben, mit Ankündigung im Mitgliederkanal.",
          ],
        },
        {
          heading: "5. Rückerstattung",
          lines: [
            "Die Bedingungen stehen in den gesonderten „Umtausch- und Rückgabebedingungen“ und sind Bestandteil dieses Vertrags.",
            "Kurz: innerhalb von 14 Tagen nach Zahlung können Sie zurücktreten und erhalten den nicht genutzten Zeitraum erstattet.",
          ],
        },
        {
          heading: "6. Rechte und Pflichten",
          lines: [
            "Der Anbieter gewährt den Zugang für den bezahlten Zeitraum und informiert über Änderungen im Zeitplan.",
            "Die Kundin oder der Kunde gibt den Zugang nicht weiter, verbreitet keine Aufzeichnungen und nutzt die Materialien nicht kommerziell.",
            "Bei Verstoß kann der Anbieter den Zugang ohne Erstattung des nicht genutzten Zeitraums beenden.",
          ],
        },
        {
          heading: "7. Haftung und Hinweis zur Gesundheit",
          lines: [
            "Yogakurse sind keine medizinische Leistung. Weder der Anbieter noch die Lehrkraft diagnostiziert, behandelt oder gibt medizinische Empfehlungen.",
            "Sie schätzen Ihren Gesundheitszustand selbst ein. Bei Erkrankungen, Verletzungen, Schwangerschaft oder Zweifeln sprechen Sie vor Beginn mit einer Ärztin oder einem Arzt.",
            "Sie führen die Übungen nach eigenem Ermessen aus und tragen die Verantwortung für Ihren Zustand während der Kurse.",
            "Für Störungen durch Dienste Dritter (Zoom, Telegram, Zahlungsdienste, Internetanbieter) haftet der Anbieter nicht.",
          ],
        },
        {
          heading: "8. Personenbezogene Daten",
          lines: [
            "Die Verarbeitung ist in der Datenschutzerklärung beschrieben, verlinkt im Fußbereich der Seite.",
            "Mit der Zahlung stimmen Sie der Verarbeitung Ihrer Daten im erforderlichen Umfang zu.",
          ],
        },
        {
          heading: "9. Laufzeit und Änderungen",
          lines: [
            "Der Vertrag gilt ab Annahme bis zum Ende des bezahlten Zugangszeitraums.",
            "Der Anbieter kann die Bedingungen ändern. Änderungen gelten ab Veröffentlichung und nicht für bereits bezahlte Zeiträume.",
          ],
        },
        {
          heading: "10. Streitbeilegung",
          lines: [
            "Die Parteien klären Streitigkeiten im Gespräch. Schreiben Sie an 15minyoga.com@gmail.com — Antwort innerhalb von 10 Werktagen.",
            "Kommt keine Einigung zustande, gilt ukrainisches Recht.",
          ],
        },
        {
          heading: "11. Angaben zum Anbieter",
          merchant: true,
        },
      ],
    },
  },

  /* ---------------------- условия обмена и возврата ---------------------- */
  refund: {
    uk: {
      title: "Умови обміну та повернення",
      intro: "Порядок повернення коштів за послуги 15minYoga",
      updated: "Редакція від 29 липня 2026 року",
      sections: [
        {
          heading: "Що саме ви купуєте",
          lines: [
            "15minYoga — цифрова послуга: доступ до онлайн-занять і записів на обраний строк. Матеріальний товар не постачається, тому обмін товару неможливий — застосовується повернення коштів.",
          ],
        },
        {
          heading: "Повернення протягом 14 днів",
          lines: [
            "Протягом 14 календарних днів з дати оплати ви можете відмовитися від послуги без пояснення причин.",
            "Повертається вартість невикористаного періоду: із суми оплати вираховується частина за дні, коли доступ був відкритий, з розрахунку вартості пакета за день.",
            "Приклад: оплачено 6 місяців за 500 €, відмова на 10-й день. До повернення — 500 € мінус 10 днів доступу (приблизно 27 €), тобто близько 473 €.",
          ],
        },
        {
          heading: "Після 14 днів",
          lines: [
            "Кошти за використаний період не повертаються.",
            "За невикористаний період повернення можливе за домовленістю — напишіть нам, ми розглянемо ситуацію індивідуально. Це не обов'язок Виконавця, але ми зазвичай ідемо назустріч.",
          ],
        },
        {
          heading: "Коли повернення не здійснюється",
          lines: [
            "Якщо доступ припинено через порушення умов договору: передавання доступу третім особам, поширення записів, комерційне використання матеріалів.",
            "Якщо з моменту оплати минуло більше строку дії оплаченого пакета.",
          ],
        },
        {
          heading: "Як подати запит",
          lines: [
            "Напишіть на 15minyoga.com@gmail.com або в Telegram — https://t.me/yoga15min_chat_bot.",
            "Вкажіть: адресу пошти, з якої оформлювали доступ, дату оплати, спосіб оплати та суму.",
            "Ми відповідаємо протягом 3 робочих днів і повідомляємо суму до повернення.",
          ],
        },
        {
          heading: "Строки та спосіб повернення",
          lines: [
            "Кошти повертаються тим самим способом, яким були сплачені: на картку, на банківський рахунок, на PayPal або на криптогаманець.",
            "Строк повернення — до 14 календарних днів з дня погодження суми. Для карткових платежів зарахування може зайняти додатково до 5 банківських днів залежно від банку-емітента.",
            "Комісії платіжних систем за переказ не повертаються.",
          ],
        },
        {
          heading: "Якщо ви незадоволені послугою",
          lines: [
            "Напишіть нам до того, як просити повернення. Часто питання вирішується заміною формату занять, паузою в доступі або переносом строку — і це швидше, ніж повернення коштів.",
          ],
        },
      ],
    },

    ru: {
      title: "Условия обмена и возврата",
      intro: "Порядок возврата средств за услуги 15minYoga",
      updated: "Редакция от 29 июля 2026 года",
      sections: [
        {
          heading: "Что именно вы покупаете",
          lines: [
            "15minYoga — цифровая услуга: доступ к онлайн-занятиям и записям на выбранный срок. Материальный товар не поставляется, поэтому обмен товара невозможен — применяется возврат средств.",
          ],
        },
        {
          heading: "Возврат в течение 14 дней",
          lines: [
            "В течение 14 календарных дней с даты оплаты вы можете отказаться от услуги без объяснения причин.",
            "Возвращается стоимость неиспользованного периода: из суммы оплаты вычитается часть за дни, когда доступ был открыт, из расчёта стоимости пакета за день.",
            "Пример: оплачено 6 месяцев за 500 €, отказ на 10-й день. К возврату — 500 € минус 10 дней доступа (примерно 27 €), то есть около 473 €.",
          ],
        },
        {
          heading: "После 14 дней",
          lines: [
            "Средства за использованный период не возвращаются.",
            "За неиспользованный период возврат возможен по договорённости — напишите нам, рассмотрим ситуацию индивидуально. Это не обязанность Исполнителя, но обычно мы идём навстречу.",
          ],
        },
        {
          heading: "Когда возврат не производится",
          lines: [
            "Если доступ прекращён из-за нарушения условий договора: передача доступа третьим лицам, распространение записей, коммерческое использование материалов.",
            "Если с момента оплаты прошло больше срока действия оплаченного пакета.",
          ],
        },
        {
          heading: "Как подать запрос",
          lines: [
            "Напишите на 15minyoga.com@gmail.com или в Telegram — https://t.me/yoga15min_chat_bot.",
            "Укажите: адрес почты, с которого оформляли доступ, дату оплаты, способ оплаты и сумму.",
            "Мы отвечаем в течение 3 рабочих дней и сообщаем сумму к возврату.",
          ],
        },
        {
          heading: "Сроки и способ возврата",
          lines: [
            "Средства возвращаются тем же способом, которым были уплачены: на карту, на банковский счёт, на PayPal или на криптокошелёк.",
            "Срок возврата — до 14 календарных дней со дня согласования суммы. Для карточных платежей зачисление может занять дополнительно до 5 банковских дней в зависимости от банка-эмитента.",
            "Комиссии платёжных систем за перевод не возвращаются.",
          ],
        },
        {
          heading: "Если вы недовольны услугой",
          lines: [
            "Напишите нам прежде, чем просить возврат. Часто вопрос решается заменой формата занятий, паузой в доступе или переносом срока — и это быстрее, чем возврат средств.",
          ],
        },
      ],
    },

    en: {
      title: "Exchange and refund policy",
      intro: "How refunds work for 15minYoga services",
      updated: "Version of 29 July 2026",
      sections: [
        {
          heading: "What you are buying",
          lines: [
            "15minYoga is a digital service: access to online classes and recordings for the chosen period. No physical goods are supplied, so exchange does not apply — refunds do.",
          ],
        },
        {
          heading: "Refund within 14 days",
          lines: [
            "Within 14 calendar days of payment you may withdraw without giving a reason.",
            "You are refunded for the unused period: the days during which access was open are deducted, pro rata to the package price.",
            "Example: €500 paid for 6 months, withdrawal on day 10. The refund is €500 minus 10 days of access (about €27), i.e. roughly €473.",
          ],
        },
        {
          heading: "After 14 days",
          lines: [
            "The used period is not refundable.",
            "A refund for the unused period is possible by agreement — write to us and we will look at your situation. This is not an obligation of the Provider, but we usually accommodate.",
          ],
        },
        {
          heading: "When no refund is given",
          lines: [
            "If access was terminated for breach of the agreement: sharing access, distributing recordings, commercial use of the materials.",
            "If the paid period has already ended.",
          ],
        },
        {
          heading: "How to request a refund",
          lines: [
            "Write to 15minyoga.com@gmail.com or on Telegram — https://t.me/yoga15min_chat_bot.",
            "Please state: the e-mail used for the purchase, the date of payment, the payment method and the amount.",
            "We reply within 3 business days and confirm the amount to be refunded.",
          ],
        },
        {
          heading: "Timing and method",
          lines: [
            "Refunds are made by the same method as the payment: card, bank account, PayPal or crypto wallet.",
            "The refund is issued within 14 calendar days of agreeing the amount. For card payments, crediting may take up to a further 5 banking days depending on the issuing bank.",
            "Payment system fees are not refundable.",
          ],
        },
        {
          heading: "If you are unhappy with the service",
          lines: [
            "Please write to us before asking for a refund. Often the matter is solved by adjusting the format, pausing your access or extending the period — which is faster than a refund.",
          ],
        },
      ],
    },

    de: {
      title: "Umtausch- und Rückgabebedingungen",
      intro: "Wie Rückerstattungen bei 15minYoga funktionieren",
      updated: "Stand: 29. Juli 2026",
      sections: [
        {
          heading: "Was Sie kaufen",
          lines: [
            "15minYoga ist eine digitale Leistung: Zugang zu Online-Kursen und Aufzeichnungen für den gewählten Zeitraum. Es werden keine Waren geliefert, ein Umtausch entfällt daher — es gilt die Rückerstattung.",
          ],
        },
        {
          heading: "Rückerstattung innerhalb von 14 Tagen",
          lines: [
            "Innerhalb von 14 Kalendertagen nach der Zahlung können Sie ohne Angabe von Gründen zurücktreten.",
            "Erstattet wird der nicht genutzte Zeitraum: die Tage mit offenem Zugang werden anteilig vom Paketpreis abgezogen.",
            "Beispiel: 500 € für 6 Monate gezahlt, Rücktritt am 10. Tag. Erstattung: 500 € abzüglich 10 Tage Zugang (etwa 27 €), also rund 473 €.",
          ],
        },
        {
          heading: "Nach 14 Tagen",
          lines: [
            "Der genutzte Zeitraum wird nicht erstattet.",
            "Für den nicht genutzten Zeitraum ist eine Erstattung nach Absprache möglich — schreiben Sie uns, wir sehen uns Ihren Fall an. Eine Pflicht des Anbieters besteht dazu nicht, wir kommen Ihnen aber in der Regel entgegen.",
          ],
        },
        {
          heading: "Wann nicht erstattet wird",
          lines: [
            "Wenn der Zugang wegen Verstoßes gegen den Vertrag beendet wurde: Weitergabe des Zugangs, Verbreitung von Aufzeichnungen, kommerzielle Nutzung der Materialien.",
            "Wenn der bezahlte Zeitraum bereits abgelaufen ist.",
          ],
        },
        {
          heading: "Wie Sie eine Rückerstattung beantragen",
          lines: [
            "Schreiben Sie an 15minyoga.com@gmail.com oder über Telegram — https://t.me/yoga15min_chat_bot.",
            "Bitte nennen Sie: die für den Kauf genutzte E-Mail-Adresse, das Zahlungsdatum, die Zahlungsart und den Betrag.",
            "Wir antworten innerhalb von 3 Werktagen und nennen den Erstattungsbetrag.",
          ],
        },
        {
          heading: "Fristen und Weg der Erstattung",
          lines: [
            "Die Erstattung erfolgt auf demselben Weg wie die Zahlung: Karte, Bankkonto, PayPal oder Krypto-Wallet.",
            "Die Auszahlung erfolgt innerhalb von 14 Kalendertagen nach Abstimmung des Betrags. Bei Kartenzahlungen kann die Gutschrift je nach Bank bis zu 5 weitere Banktage dauern.",
            "Gebühren der Zahlungsdienste werden nicht erstattet.",
          ],
        },
        {
          heading: "Wenn Sie unzufrieden sind",
          lines: [
            "Schreiben Sie uns, bevor Sie eine Erstattung verlangen. Oft lässt sich die Sache durch eine Anpassung des Formats, eine Pause oder eine Verlängerung lösen — das geht schneller als eine Rückabwicklung.",
          ],
        },
      ],
    },
  },
};
