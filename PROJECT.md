# Subtitle Notes — состояние проекта

Один документ, чтобы продолжить работу с чистого листа: что это, из чего
собрано, где что лежит, что уже работает и что осталось.
Обновлено 18 августа 2026.

---

## 1. Что это

Приложение для изучения языка по фильмам и текстам. Человек выделяет незнакомое
слово там, где читает или смотрит, и сразу видит, что оно значит **в этой
реплике** — не пословный перевод из словаря, а смысл, который вкладывал
говорящий. Слово сохраняется в общую библиотеку и потом возвращается на
повторение.

Ключевое отличие от словаря: строку читает языковая модель, которая видит весь
контекст. «No one wants a record» → не «никто не хочет рекорд», а «никому не
нужна судимость».

## 2. Из чего состоит

| Часть | Где | Версия | Что делает |
|---|---|---|---|
| Сервер | `cloud_api/` | задеплоен | Cloudflare Worker + D1: аккаунты, карточки, разбор строки, повторение, веб-библиотека |
| Расширение | `extension/` | 2.6.0 | Chrome/Edge/Opera: субтитры в веб-плеерах, выделение на сайтах и в PDF |
| Приложение | `mobile/` | 1.6.0+3 | Flutter: библиотека, поиск, повторение, виджет, экран блокировки |
| Программа | корень, `installer/` | 1.6.0 | Python + Inno Setup: субтитры VLC, Ctrl+Alt+S, привязка аккаунта |
| Библиотека для ПК | `mobile/lib/desktop/` | — | тот же Flutter, сборка под Windows, ставится вместе с программой |

Репозиторий: <https://github.com/mjandreas125/subtitle-notes> (публичный).
Локально это отдельный git-репозиторий внутри `D:\LiisbetSystem`; ветка
`main-clean` пушится в `main` через remote `subtitle-notes`.

## 3. Сервер

`cloud_api/src/index.ts` — один файл, Cloudflare Worker.
Адрес: `https://subtitle-notes-api.andreas-sultseng228.workers.dev`

**База** D1 `subtitle-notes-production`, миграции `cloud_api/migrations/0001…0007`:
`users`, `selections`, `device_pairings`, `friendships`, `selection_likes`,
`reviews`, `corrections`.

**Основные эндпоинты**

- `POST /v1/auth/google` — вход по Google id_token (телефон)
- `GET /link?code=…&lang=…` — страница входа для браузера и программы, 14 языков
- `POST /v1/pairings/start|poll|approve|approve-google` — привязка устройств
- `POST /v1/quick` — только словарь, отвечает мгновенно
- `POST /v1/reading` — разбор строки быстрой моделью (для всплывающего окна)
- `POST /v1/captures` — сохранить с полным разбором (медленная модель)
- `POST /v1/selections/:id/suggest` — свой вариант перевода (три голоса = общий)
- `POST /v1/selections/:id/reenrich` — перечитать строку заново
- `GET /v1/review`, `POST /v1/selections/:id/review` — повторение
- `GET /v1/export/anki`, `GET /v1/me`, `DELETE /v1/me`
- `GET /library` — веб-библиотека, `GET /privacy`, `GET /delete-account`
- `GET /desktop/latest` — версия и адрес установщика (константа `DESKTOP_LATEST`)

**Модели**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` для окна,
`@cf/openai/gpt-oss-120b` для сохраняемой карточки. Словарь — неофициальный
эндпоинт Google Translate, `sl=auto`.

Деплой: `cd cloud_api && npx wrangler deploy`
Миграции: `npx wrangler d1 migrations apply subtitle-notes-production --remote`

## 4. Расширение

Точки входа: `manifest.json` → `settings.js` (общие настройки), `capture.js`
(панель и выделение на странице), `subtitles.js` (субтитры в плеерах),
`background.js` (единственный, кто ходит в сеть), `options.html/js`,
`popup.html/js`, `welcome.html/js` (вступление при установке), `qr.js`
(свой генератор QR).

**Как устроены субтитры.** Расширение ничего не рисует поверх плеера: оно
делает выделяемым **сам элемент субтитра** (`user-select: text`,
`pointer-events: auto`), пока зажата клавиша. Отпустил — плеер снова свой:
субтитр перетаскивается, клик ставит на паузу. Подсветка рисуется своя
(скруглённая, поджатая), браузерная делается прозрачной. Плеер пересоздаёт
элемент на каждую реплику — выделение восстанавливается по символьным
смещениям через `MutationObserver`.

Сборка архива для магазина: `powershell -ExecutionPolicy Bypass -File pack-extension.ps1`

## 5. Приложение

`mobile/lib/`: `data.dart` (API, модели, кеши), `i18n.dart` (перевод интерфейса,
~290 фраз × 13 языков, ключ — английская строка, `context.t('…')`),
`screens/` (library, detail, review, settings, login, learned, friends, games,
capture), `design/` (токены и компоненты).

Сборка: `flutter build apk --release` (телефон),
`flutter build appbundle --release` (Play), `flutter build windows --release`
(библиотека для ПК). Flutter SDK: `D:\src\flutter`.

**Важно про подпись.** В `mobile/android/app/build.gradle.kts` сейчас стоит
`applicationId = "com.translatedvlc.translated_vlc_mobile"` и подпись
отладочным ключом — это единственная пара «пакет + сертификат»,
зарегистрированная у Google, поэтому вход работает. Для Play обе строки надо
поменять (помечены комментарием) и зарегистрировать новую пару.

## 6. Программа для Windows

`vlc_subtitle_overlay.py` (наложение и разбор), `open_vlc_translated.py`
(запуск VLC), `quick_capture.py` (Ctrl+Alt+S), `sync_client.py` (окно привязки,
отправка), `vlc_setup.py` (прописывает веб-интерфейс в `vlcrc`),
`desktop_update.py` (проверка новой версии), `desktop_i18n.py` (14 языков).

Сборка: `powershell -ExecutionPolicy Bypass -File build.ps1`, затем
`"C:\Users\andre\AppData\Local\Programs\Inno Setup 6\ISCC.exe" installer\SubtitleNotes.iss`
(Inno стоит не в Program Files — искать там бесполезно).

## 7. Вход и аккаунты

Один аккаунт Google на всё. Веб-клиент
`151185018789-tjda40ks4kb2vo8s30f9359n2b9o4dlb.apps.googleusercontent.com`,
проект **151185018789**.

- Телефон: нативный вход через `google_sign_in`.
- Браузер и программа: открывают `/link?code=…`, там кнопка Google; сервер
  подтверждает привязку по коду. Запасные пути — код и QR, подтверждаются
  в приложении.
- Сессия живёт год; приложение при истечении тихо перелогинивается через Google.

## 8. Что уже сделано

Умный разбор строки, синонимы и буквальный смысл; 14 языков интерфейса везде;
язык карточек на выбор; любой исходный язык (определяется сам); повторение по
расписанию; свой вариант перевода с общим голосованием; оффлайн-кеш; веб-
библиотека; выгрузка в Anki; QR-привязка; автонастройка VLC; автозапуск
Ctrl+Alt+S; проверка обновлений программы; вступление в браузере и в программе;
PDF-руководство (`release_package/guide/`); материалы для Play
(`release_package/play/`: `.aab`, иконка, баннер, скриншоты).

## 9. Что осталось

1. **Зарегистрировать origin в Google Cloud** — иначе вход через Google в
   браузере и программе даёт `Error 400: origin_mismatch`. Добавить
   `https://subtitle-notes-api.andreas-sultseng228.workers.dev` в
   **Authorized JavaScript origins** веб-клиента.
2. **Название приложения на экране входа**: сейчас показывает домен. Поле
   *App name* на <https://console.cloud.google.com/auth/branding?project=151185018789>.
3. **Магазины**: Chrome Web Store ($5) и Google Play ($25). Порядок —
   `RELEASE-GUIDE.md`, тексты — `STORE-LISTING.md`, чек-лист — `CHECKLIST.md`.
4. **Вступление в приложении** — в браузере и программе анимация есть, в
   приложении пока только текст.
5. **Подпись установщика** — без сертификата SmartScreen ругается.
6. **iOS** — отложено сознательно.
7. **Масштаб**: бесплатные лимиты Workers AI и неофициальный Google Translate.

## 10. Что стоит знать, прежде чем чинить

- **Chrome пользователя под корпоративной политикой** (`ExtensionInstallForcelist`)
  и игнорирует `--load-extension`. Для автоматических проверок — Edge с
  `--disable-features=DisableLoadExtensionCommandLineSwitch`.
- **После перезагрузки расширения страницу надо перезагрузить жёстко**
  (Ctrl+Shift+R): в открытых вкладках продолжает жить старая копия скрипта,
  которая уже не может достучаться до расширения.
- **Тестовый стенд** вместо настоящего сайта: `tools/player-bench.html` —
  копия плеера rezka (перетаскиваемый субтитр, пауза по клику, смена реплики
  каждые 3 секунды), беззвучная и без рекламы. Гоняется скриптами
  `tools/drive.js` (шаги: клики, перетаскивания с модификаторами, eval в мире
  расширения, скриншоты) и `tools/cdp.js` (открыть страницу, выполнить
  выражение, снять скриншот).
- **Ключ подписи Android**: `C:\Users\andre\keystores\subtitle-notes-upload.jks`,
  alias `upload`, SHA-1 `2E:02:D5:95:83:E2:66:AC:E2:A0:46:08:1B:E4:B2:CD:0A:49:01:CE`.
  Копии вне ноутбука нет — это риск.
- **При выпуске новой версии программы** поменять `DESKTOP_LATEST` в
  `cloud_api/src/index.ts` (версия и имя файла) и задеплоить воркер, иначе
  кнопка «Скачать для Windows» будет вести на старый файл.
- В дереве работает не только один агент: часть кода (веб-библиотека,
  переключатель языка интерфейса, определение исходного языка) написана
  параллельно. Перед правкой стоит прочитать текущий файл, а не полагаться
  на память о нём.

## 11. Остальные документы

- `CHECKLIST.md` — что проверить и что сделать руками.
- `RELEASE-GUIDE.md` — публикация: Play, Web Store, установщик.
- `STORE-LISTING.md` — готовые тексты для формы Chrome Web Store.
- `PLAY-RELEASE.md` — подробности по подписи и клиентам Google.
- `release_package/guide/` — PDF для обычных пользователей и его исходник.
