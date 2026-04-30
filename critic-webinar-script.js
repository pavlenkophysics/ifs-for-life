// ============================================
// Google Apps Script — вебинар «Внутренний критик» + предзапись на группу «Части целого»
// ============================================
//
// Одна точка входа обрабатывает два типа запросов:
// - type: 'webinar' (или без type по умолчанию) — регистрация на вебинар
// - type: 'group' — предзапись на группу «Части целого»
//
// Для вебинара используется Google Calendar: событие создаётся на первой регистрации,
// все последующие регистрации добавляются как гости. Google автоматически шлёт
// участникам приглашение с кнопками Принять/Отклонить.
//
// Как обновить:
// 1. Открой этот проект в script.google.com
// 2. Удали весь код, вставь этот файл целиком
// 3. Deploy → Manage deployments → карандашик → Version: New version → Deploy
// 4. URL не меняется
// ============================================

// ─────────────────────────────────────────────
// ВАЖНО: запустить один раз вручную из редактора!
// Эта функция создаёт событие календаря и тем самым
// просит Google дать скрипту разрешение на CalendarApp.
// Без этого вызов CalendarApp из doPost() тихо падает.
//
// Как запустить: в редакторе сверху выбрать функцию
// setupCalendarPermissions в выпадающем списке, нажать Run.
// Google попросит разрешить доступ к календарю — разрешить.
// ─────────────────────────────────────────────
function setupCalendarPermissions() {
  var event = getOrCreateWebinarEvent_();
  Logger.log('Событие создано или найдено: ' + event.getTitle());
  Logger.log('Дата: ' + event.getStartTime());
  Logger.log('ID: ' + event.getId());
  return event.getId();
}

// ─────────────────────────────────────────────
// Роутер
// ─────────────────────────────────────────────
function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  if (data.type === 'group') {
    return handleGroupRegistration_(data);
  }

  if (data.type === 'critic-group') {
    return handleCriticGroupRegistration_(data);
  }

  return handleWebinarRegistration_(data);
}

// ─────────────────────────────────────────────
// ВЕБИНАР «Дорогой критик, нам надо поговорить» — 6 мая, 12:00 МСК
// ─────────────────────────────────────────────

// Настройки вебинара — время в UTC
// 12:00 МСК = 09:00 UTC; вебинар 1,5 часа → до 10:30 UTC
var WEBINAR_TITLE = 'Вебинар «Дорогой критик, нам надо поговорить» — Алёна Павленко';
var WEBINAR_START_UTC = new Date(Date.UTC(2026, 4, 6, 9, 0, 0)); // 6 мая 2026, 09:00 UTC
var WEBINAR_END_UTC   = new Date(Date.UTC(2026, 4, 6, 10, 30, 0));
var WEBINAR_ZOOM_URL  = 'https://us06web.zoom.us/j/84229401867?pwd=fcZlvqkn7xxr7b543oMCIu7RltZexw.1';
var WEBINAR_ZOOM_ID   = '842 2940 1867';
var WEBINAR_ZOOM_PWD  = '179747';

var WEBINAR_DESCRIPTION = [
  'Открытый вебинар «Дорогой критик, нам надо поговорить»',
  '',
  'У многих из нас есть голос, который комментирует каждое решение и точно знает, как правильно. Обычно с ним борются — и каждый раз не срабатывает. Потому что критик не баг, а часть системы.',
  '',
  'На вебинаре я расскажу про метод IFS (Internal Family Systems) — подход, в котором паттерны, установки и внутренние голоса рассматриваются как части. У каждой своё намерение и своя история, и с каждой можно выстроить отношения.',
  '',
  'Что будет:',
  '— Расскажу, откуда берётся внутренний критик и почему у него благое намерение',
  '— Покажу на живой демонстрации, как выглядит разговор с ним из состояния Self',
  '— Поделюсь своим опытом: какие у меня с критиком отношения после внедрения IFS в жизнь',
  '— Будет время для вопросов',
  '',
  'Подойдёт тем, кто слышит про IFS впервые, и тем, кто уже знаком, но хочет увидеть, как это работает вживую.',
  '',
  'Ведёт Алёна Павленко, PhD — IFS-практик, эксперт и куратор IFS Academy.',
  '',
  'Zoom: ' + WEBINAR_ZOOM_URL,
  'ID: ' + WEBINAR_ZOOM_ID,
  'Пароль: ' + WEBINAR_ZOOM_PWD,
  '',
  'Больше информации: https://alena-pavlenko-phd.netlify.app/',
  'Вопросы: https://t.me/Alena_Pavlenko_PhD'
].join('\n');

function getOrCreateWebinarSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('WEBINAR_SHEET_ID') || props.getProperty('SHEET_ID');

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId).getActiveSheet();
    } catch (e) {}
  }

  var ss = SpreadsheetApp.create('Вебинар «Критик» — регистрации');
  var sheet = ss.getActiveSheet();
  sheet.appendRow(['Дата', 'Имя', 'Email', 'Telegram']);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 160);
  sheet.setFrozenRows(1);
  props.setProperty('WEBINAR_SHEET_ID', ss.getId());

  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Таблица регистраций на вебинар создана',
    body: 'Первая регистрация на вебинар! Таблица:\n' + ss.getUrl()
  });

  return sheet;
}

function getOrCreateWebinarEvent_() {
  var props = PropertiesService.getScriptProperties();
  var eventId = props.getProperty('WEBINAR_EVENT_ID');
  var calendar = CalendarApp.getDefaultCalendar();

  if (eventId) {
    try {
      var existing = calendar.getEventById(eventId);
      if (existing) return existing;
    } catch (e) {}
  }

  var event = calendar.createEvent(
    WEBINAR_TITLE,
    WEBINAR_START_UTC,
    WEBINAR_END_UTC,
    {
      description: WEBINAR_DESCRIPTION,
      location: WEBINAR_ZOOM_URL
    }
  );
  event.addPopupReminder(30);
  props.setProperty('WEBINAR_EVENT_ID', event.getId());
  return event;
}

function handleWebinarRegistration_(data) {
  // 1. Сохраняем в таблицу
  var sheet = getOrCreateWebinarSheet_();
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.telegram || ''
  ]);

  // 2. Добавляем участника в событие Google Calendar
  // Google автоматически шлёт приглашение с кнопками Принять/Отклонить
  try {
    var event = getOrCreateWebinarEvent_();
    event.addGuest(data.email);
  } catch (e) {
    // не блокируем регистрацию, если что-то не так с календарём —
    // но шлём Алёне диагностическое письмо, чтобы было видно
    MailApp.sendEmail({
      to: 'alena.pavlenko.phd@gmail.com',
      subject: '⚠️ Ошибка календаря при регистрации: ' + data.name,
      body: 'Участник ' + data.name + ' (' + data.email + ') зарегистрирован, ' +
        'но добавление в Google Calendar упало с ошибкой:\n\n' + e.toString() +
        '\n\nВозможно, нужно запустить функцию setupCalendarPermissions() вручную из редактора ' +
        'Apps Script, чтобы дать скрипту разрешение на работу с календарём.'
    });
  }

  // 3. Письмо-подтверждение участнику
  MailApp.sendEmail({
    to: data.email,
    subject: 'Вы зарегистрированы на вебинар «Дорогой критик, нам надо поговорить»',
    htmlBody:
      '<div style="font-family:Arial,sans-serif;max-width:560px;color:#1a2b28;line-height:1.65">' +
        '<p>Привет, ' + data.name + '!</p>' +
        '<p>Вы зарегистрированы на вебинар <strong>«Дорогой критик, нам надо поговорить»</strong>.</p>' +
        '<p><strong>Когда:</strong> 6 мая в 12:00 МСК / 11:00 CET<br>' +
        '<strong>Где:</strong> <a href="' + WEBINAR_ZOOM_URL + '" style="color:#0e6168">Zoom</a></p>' +
        '<div style="background:#f0f7f5;padding:18px 22px;border-radius:12px;border-left:3px solid #0e6168;margin:20px 0;font-size:.95rem">' +
          '<a href="' + WEBINAR_ZOOM_URL + '" style="color:#0e6168;word-break:break-all">' + WEBINAR_ZOOM_URL + '</a><br><br>' +
          'ID встречи: <strong>' + WEBINAR_ZOOM_ID + '</strong><br>' +
          'Пароль: <strong>' + WEBINAR_ZOOM_PWD + '</strong>' +
        '</div>' +
        '<p>На встрече я расскажу про метод IFS (Internal Family Systems) — подход, в котором внутренний критик перестаёт быть проблемой, которую нужно решать. Он — часть психики со своей задачей, и с ней можно выстроить отношения.</p>' +
        '<p><strong>Что будет:</strong></p>' +
        '<p style="margin:8px 0">— Расскажу, откуда берётся внутренний критик и почему у него благое намерение<br>' +
        '— Покажу на живой демонстрации, как выглядит разговор с ним из состояния Self<br>' +
        '— Поделюсь своим опытом: какие у меня с критиком отношения после внедрения IFS в жизнь<br>' +
        '— Будет время для вопросов</p>' +
        '<p>Подойдёт тем, кто слышит про IFS впервые, и тем, кто уже знаком, но хочет увидеть, как это работает вживую.</p>' +
        '<p>Отдельно придёт приглашение в Google Calendar — нажмите «Принять», и встреча добавится в ваш календарь.</p>' +
        '<p style="margin-top:20px">Больше информации: <a href="https://alena-pavlenko-phd.netlify.app/" style="color:#0e6168">alena-pavlenko-phd.netlify.app</a><br>' +
        'Если есть вопросы — пишите мне: <a href="https://t.me/Alena_Pavlenko_PhD" style="color:#0e6168">t.me/Alena_Pavlenko_PhD</a></p>' +
        '<p style="color:#7eb8b5;margin-top:24px">До встречи, Алёна 🙌</p>' +
      '</div>',
    name: 'Алёна Павленко'
  });

  // 4. Уведомление Алёне
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

// ─────────────────────────────────────────────
// ПРЕДЗАПИСЬ на группу «Части целого» — старт в сентябре 2026
// ─────────────────────────────────────────────
function getOrCreateGroupSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('GROUP_SHEET_ID');

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId).getActiveSheet();
    } catch (e) {}
  }

  var ss = SpreadsheetApp.create('Предзапись — Части целого');
  var sheet = ss.getActiveSheet();
  sheet.appendRow(['Дата', 'Имя', 'Email', 'Telegram', 'Комментарий']);
  sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 360);
  sheet.setFrozenRows(1);
  props.setProperty('GROUP_SHEET_ID', ss.getId());

  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Таблица предзаписи на группу создана',
    body: 'Первая предзапись на «Части целого»! Таблица:\n' + ss.getUrl()
  });

  return sheet;
}

// ─────────────────────────────────────────────
// ПРЕДЗАПИСЬ на группу «Дорогой критик» — старт в июле 2026
// ─────────────────────────────────────────────
function getOrCreateCriticGroupSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('CRITIC_GROUP_SHEET_ID');

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId).getActiveSheet();
    } catch (e) {}
  }

  var ss = SpreadsheetApp.create('Предзапись — Дорогой критик');
  var sheet = ss.getActiveSheet();
  sheet.appendRow(['Дата', 'Имя', 'Email', 'Telegram', 'Комментарий']);
  sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 360);
  sheet.setFrozenRows(1);
  props.setProperty('CRITIC_GROUP_SHEET_ID', ss.getId());

  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Таблица предзаписи на «Дорогой критик» создана',
    body: 'Первая предзапись на группу про критика! Таблица:\n' + ss.getUrl()
  });

  return sheet;
}

function handleCriticGroupRegistration_(data) {
  var sheet = getOrCreateCriticGroupSheet_();
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.telegram || '',
    data.note || ''
  ]);

  MailApp.sendEmail({
    to: data.email,
    subject: 'Вы в предзаписи на «Дорогой критик, нам надо поговорить»',
    htmlBody:
      '<div style="font-family:Arial,sans-serif;max-width:540px;color:#1a2b28;line-height:1.6">' +
        '<h2 style="color:#0e6168;font-size:22px;margin-bottom:16px">Вы в предзаписи</h2>' +
        '<p>Привет, ' + data.name + '!</p>' +
        '<p>Спасибо, что записались на предзапись практической группы <strong>«Дорогой критик, нам надо поговорить»</strong>.</p>' +
        '<div style="background:#f0f7f5;padding:20px 24px;border-radius:12px;border-left:3px solid #0e6168;margin:20px 0">' +
          '<strong style="color:#0e6168">Старт группы — в июле 2026.</strong><br>' +
          'Я напишу вам за несколько недель до старта, когда откроется регистрация.' +
        '</div>' +
        '<p>А до этого будут открытые вебинары и короткие встречи — если интересно, подписывайтесь на мой <a href="https://t.me/Alena_Pavlenko_IFS" style="color:#0e6168">телеграм-канал</a> и <a href="https://www.instagram.com/alena_pavlenko_ifs" style="color:#0e6168">инстаграм</a>.</p>' +
        '<p style="color:#7eb8b5;margin-top:28px;padding-top:16px;border-top:1px solid #cce0dc">' +
          'До связи!<br>Алёна' +
        '</p>' +
        '<p style="font-size:13px;color:#999;margin-top:20px">' +
          '<a href="https://alena-pavlenko-phd.netlify.app/" style="color:#0e6168">Все проекты</a> · ' +
          '<a href="https://t.me/Alena_Pavlenko_PhD" style="color:#0e6168">Написать в Telegram</a>' +
        '</p>' +
      '</div>',
    name: 'Алёна Павленко'
  });

  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Новая предзапись на «Дорогой критик»: ' + data.name,
    body: 'Имя: ' + data.name +
      '\nEmail: ' + data.email +
      '\nTelegram: ' + (data.telegram || '—') +
      '\n\nКомментарий:\n' + (data.note || '—') +
      '\n\nДата: ' + new Date().toLocaleString('ru-RU')
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGroupRegistration_(data) {
  var sheet = getOrCreateGroupSheet_();
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.telegram || '',
    data.note || ''
  ]);

  MailApp.sendEmail({
    to: data.email,
    subject: 'Вы в предзаписи на «Части целого»',
    htmlBody:
      '<div style="font-family:Arial,sans-serif;max-width:540px;color:#1a2b28;line-height:1.6">' +
        '<h2 style="color:#0e6168;font-size:22px;margin-bottom:16px">Вы в предзаписи</h2>' +
        '<p>Привет, ' + data.name + '!</p>' +
        '<p>Спасибо, что записались на предзапись практической группы <strong>«Части целого»</strong>.</p>' +
        '<div style="background:#f0f7f5;padding:20px 24px;border-radius:12px;border-left:3px solid #0e6168;margin:20px 0">' +
          '<strong style="color:#0e6168">Старт группы — в сентябре 2026.</strong><br>' +
          'Я напишу вам за несколько недель до старта, когда откроется регистрация.' +
        '</div>' +
        '<p>А до этого будут открытые вебинары и короткие группы — если интересно, подписывайтесь на мой <a href="https://t.me/Alena_Pavlenko_IFS" style="color:#0e6168">телеграм-канал</a> и <a href="https://www.instagram.com/alena_pavlenko_ifs" style="color:#0e6168">инстаграм</a>.</p>' +
        '<p>Ближайший открытый вебинар про внутреннего критика — <strong>6 мая, 12:00 МСК</strong>. <a href="https://ifs-for-life.netlify.app/webinar.html" style="color:#0e6168">Подробности и регистрация</a>.</p>' +
        '<p style="color:#7eb8b5;margin-top:28px;padding-top:16px;border-top:1px solid #cce0dc">' +
          'До связи!<br>Алёна' +
        '</p>' +
        '<p style="font-size:13px;color:#999;margin-top:20px">' +
          '<a href="https://alena-pavlenko-phd.netlify.app/" style="color:#0e6168">Все проекты</a> · ' +
          '<a href="https://t.me/Alena_Pavlenko_PhD" style="color:#0e6168">Написать в Telegram</a>' +
        '</p>' +
      '</div>',
    name: 'Алёна Павленко'
  });

  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Новая предзапись на «Части целого»: ' + data.name,
    body: 'Имя: ' + data.name +
      '\nEmail: ' + data.email +
      '\nTelegram: ' + (data.telegram || '—') +
      '\n\nКомментарий:\n' + (data.note || '—') +
      '\n\nДата: ' + new Date().toLocaleString('ru-RU')
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
