// ============================================
// Google Apps Script — предзапись на группу «Части целого»
// ============================================
//
// Как запустить:
// 1. Открой script.google.com → «Новый проект»
// 2. Удали весь код, вставь этот файл
// 3. Нажми Deploy → New deployment → Web app
//    Execute as: Me, Who has access: Anyone → Deploy
// 4. Разреши доступы → скопируй URL
// 5. Вставь URL в index.html (константа SCRIPT_URL)
//
// Таблицу создавать не надо — скрипт сам создаст
// при первой записи и пришлёт тебе ссылку на почту.
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

  props.setProperty('SHEET_ID', ss.getId());

  MailApp.sendEmail({
    to: 'alena.pavlenko.phd@gmail.com',
    subject: 'Таблица предзаписи на группу создана',
    body: 'Первая предзапись на «Части целого»! Таблица тут:\n' + ss.getUrl()
  });

  return sheet;
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // ── Сохраняем в таблицу ──
  var sheet = getOrCreateSheet_();
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.telegram || '',
    data.note || ''
  ]);

  // ── Письмо человеку ──
  MailApp.sendEmail({
    to: data.email,
    subject: 'Вы записаны в предзапись на «Части целого»',
    htmlBody:
      '<div style="font-family:Arial,sans-serif;max-width:540px;color:#1a2b28;line-height:1.6">' +
        '<h2 style="color:#0e6168;font-size:22px;margin-bottom:16px">Вы в предзаписи</h2>' +
        '<p>Привет, ' + data.name + '!</p>' +
        '<p>Спасибо, что записались на предзапись практической группы <strong>«Части целого»</strong>.</p>' +
        '<div style="background:#f0f7f5;padding:20px 24px;border-radius:12px;border-left:3px solid #0e6168;margin:20px 0">' +
          '<strong style="color:#0e6168">Старт группы — в сентябре 2026.</strong><br>' +
          'Я напишу вам за несколько недель до старта, когда откроется регистрация.' +
        '</div>' +
        '<p>А до этого буду проводить открытые вебинары и короткие группы — если интересно, подписывайтесь на мой <a href="https://t.me/Alena_Pavlenko_PhD_channel" style="color:#0e6168">телеграм-канал</a> и <a href="https://www.instagram.com/alena_pavlenko_ifs" style="color:#0e6168">инстаграм</a>.</p>' +
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

  // ── Уведомление Алёне ──
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
