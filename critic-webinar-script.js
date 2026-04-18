// ============================================
// Google Apps Script — вебинар «Внутренний критик»
// ============================================
//
// Как запустить:
// 1. Открой script.google.com → «Новый проект»
// 2. Удали весь код, вставь этот файл
// 3. Нажми Deploy → New deployment → Web app
//    Execute as: Me, Who has access: Anyone → Deploy
// 4. Разреши доступы → скопируй URL
// 5. Вставь URL в critic-webinar.html
//
// Таблицу создавать не надо — скрипт сам создаст
// при первой регистрации и пришлёт тебе ссылку.
// ============================================

function getOrCreateSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SHEET_ID');

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId).getActiveSheet();
    } catch (e) {
      // таблица удалена — создадим заново
    }
  }

  // Создаём новую таблицу
  var ss = SpreadsheetApp.create('Вебинар «Критик» — регистрации');
  var sheet = ss.getActiveSheet();
  sheet.appendRow(['Дата', 'Имя', 'Email', 'Telegram']);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 160);
  sheet.setFrozenRows(1);

  // Запоминаем ID
  props.setProperty('SHEET_ID', ss.getId());

  // Отправляем ссылку на таблицу Алёне
  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Таблица регистраций создана',
    body: 'Первая регистрация на вебинар! Таблица с регистрациями тут:\n' + ss.getUrl()
  });

  return sheet;
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // ── Сохраняем в таблицу (создаст автоматически если нет) ──
  var sheet = getOrCreateSheet_();
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.telegram || ''
  ]);

  // ── Описание для календаря ──
  var eventDescription = [
    'Открытый вебинар «Дорогой критик, нам надо поговорить»',
    '',
    'Он просто всегда рядом. Комментирует решения, оценивает результаты, выматывает. На вебинаре расскажу, откуда он берётся и чего на самом деле хочет — и покажу, что меняется, когда начинаешь с ним разговаривать.',
    '',
    'На встрече:',
    '— Расскажу, откуда берётся внутренний критик — когда понимаешь, зачем он появился, уже становится легче',
    '— Разберёмся, чего он на самом деле хочет — ответ часто бывает неожиданным',
    '— Покажу на конкретном примере, как выглядит разговор с ним на практике',
    '— Будет время для вопросов',
    '',
    'Я рассказываю простым языком — подойдёт и тем, кто впервые слышит про такой подход, и тем, кто уже знаком.',
    '',
    'Ведёт Алёна Павленко — IFS-практик, эксперт и куратор IFS Academy, кандидат физ.-мат. наук.',
    '',
    'Zoom: https://us06web.zoom.us/j/84229401867?pwd=fcZlvqkn7xxr7b543oMCIu7RltZexw.1',
    '',
    'Больше информации: https://alena-pavlenko-phd.netlify.app/',
    'Вопросы: https://t.me/Alena_Pavlenko_PhD'
  ].join('\\n');

  // ── ICS-приглашение ──
  var now = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  var ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alena Pavlenko//Webinar Critic//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    'UID:critic-webinar-20260415@alena-pavlenko',
    'DTSTAMP:' + now,
    'DTSTART:20260415T090000Z',
    'DTEND:20260415T103000Z',
    'SUMMARY:Вебинар «Дорогой критик\\, нам надо поговорить» — Алёна Павленко',
    'DESCRIPTION:' + eventDescription,
    'LOCATION:https://us06web.zoom.us/j/84229401867?pwd=fcZlvqkn7xxr7b543oMCIu7RltZexw.1',
    'ORGANIZER;CN=Алёна Павленко:mailto:alena.pavlenko.phd@gmail.com',
    'ATTENDEE;RSVP=TRUE:mailto:' + data.email,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Вебинар через 30 минут',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  var icsBlob = Utilities.newBlob(ics, 'text/calendar', 'webinar-critic.ics');

  // ── Письмо участнику ──
  MailApp.sendEmail({
    to: data.email,
    subject: 'Приглашение: вебинар «Дорогой критик, нам надо поговорить» — 15 апреля, 12:00 МСК',
    htmlBody:
      '<div style="font-family:Arial,sans-serif;max-width:540px;color:#1a2b28;line-height:1.6">' +
        '<h2 style="color:#0e6168;font-size:22px;margin-bottom:16px">Вы зарегистрированы!</h2>' +
        '<p>Привет, ' + data.name + '!</p>' +
        '<p>Вебинар <strong>«Дорогой критик, нам надо поговорить»</strong> пройдёт <strong>15 апреля в 12:00 по Москве</strong> (10:00 по Лиссабону).</p>' +
        '<div style="background:#f0f7f5;padding:20px 24px;border-radius:12px;border-left:3px solid #0e6168;margin:20px 0">' +
          '<strong style="color:#0e6168">Ссылка на Zoom:</strong><br>' +
          '<a href="https://us06web.zoom.us/j/84229401867?pwd=fcZlvqkn7xxr7b543oMCIu7RltZexw.1" style="color:#0e6168">' +
            'https://us06web.zoom.us/j/84229401867</a><br><br>' +
          'ID встречи: <strong>842 2940 1867</strong><br>' +
          'Пароль: <strong>179747</strong>' +
        '</div>' +
        '<p>Приглашение в календарь — во вложении. Откройте файл, и встреча автоматически добавится в ваш календарь.</p>' +
        '<p style="margin-top:20px">На вебинаре расскажу, откуда берётся внутренний критик и чего он на самом деле хочет, и покажу на конкретном примере, как выглядит разговор с ним на практике. Я рассказываю простым языком — подойдёт и тем, кто впервые слышит про такой подход, и тем, кто уже знаком.</p>' +
        '<p style="color:#7eb8b5;margin-top:28px;padding-top:16px;border-top:1px solid #cce0dc">' +
          'До встречи!<br>Алёна' +
        '</p>' +
        '<p style="font-size:13px;color:#999;margin-top:20px">' +
          '<a href="https://alena-pavlenko-phd.netlify.app/" style="color:#0e6168">Больше информации</a> · ' +
          '<a href="https://t.me/Alena_Pavlenko_PhD" style="color:#0e6168">Написать в Telegram</a>' +
        '</p>' +
      '</div>',
    attachments: [icsBlob],
    name: 'Алёна Павленко'
  });

  // ── Уведомление Алёне ──
  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Новая регистрация на вебинар: ' + data.name,
    body: 'Имя: ' + data.name +
      '\nEmail: ' + data.email +
      '\nTelegram: ' + (data.telegram || '—') +
      '\n\nДата: ' + new Date().toLocaleString('ru-RU')
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
