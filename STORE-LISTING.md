# Chrome Web Store: что вписать и куда

Консоль у тебя на эстонском, поэтому названия полей ниже даны так, как они там
подписаны.

## Главная ошибка, которую надо исправить

Сейчас в карточке стоит **язык `inglise - en (vaikimisi)`**, а описание в ней
написано по-русски. Человек, у которого браузер на английском, видит английское
название, английское короткое описание - и стену кириллицы под ними. Русский
при этом не видит русского названия, потому что для русского языка карточки
вообще нет.

В магазине карточка заводится **отдельно на каждый язык**. Правильно так:
английский остаётся языком по умолчанию и содержит английский текст, а русский
добавляется как ещё один язык со своим текстом. Дальше можно добавлять сколько
угодно языков - магазин сам показывает человеку тот, что совпадает с языком его
браузера, а если совпадения нет, показывает язык по умолчанию.

## Порядок действий

1. **Poe kirje** (Store listing) -> вверху **Praegune muutmiskeel / Keel**.
   Убедись, что выбран `inglise - en (vaikimisi)`.
2. В полях этого языка стереть русский текст и вставить английский - он ниже,
   в разделе **English**.
3. Тот же дропдаун **Keel** -> добавить `vene - ru` -> вставить русский текст
   из раздела **Русский**.
4. Ещё раз -> добавить `eesti - et` -> текст из раздела **Eesti**.
5. **Üldised ekraanipildid** (общие скриншоты): перетащить
   `release_package/store/shot-1.png` ... `shot-5.png` (все уже 1280x800).
   Они общие для всех языков, отдельно для каждого языка загружать не нужно.
6. **Väike reklaamipaan** -> `release_package/store/tile-440x280.png`.
   **Silmapaistev reklaamipaan** -> `release_package/store/marquee-1400x560.png`.
7. **Kodulehe URL** поменять на `https://app.subtitlenotes.workers.dev`
   (сейчас там GitHub - это исходники, а не сайт продукта).
   **Toe URL**: `https://github.com/mjandreas125/subtitle-notes/issues`.
8. **Ametlik URL** оставить `Puudub`: это поле требует, чтобы домен был
   подтверждён в Google Search Console, а домен пока не наш.
9. **Kategooria**: `Haridus` - оставить.
   **Täiskasvanutele mõeldud sisu**: нет.
10. Сохранить и отправить на проверку.

Дальше каждая новая версия - поднять номер в `extension/manifest.json`,
пересобрать `powershell -ExecutionPolicy Bypass -File pack-extension.ps1`,
загрузить `release_package/subtitle-notes-extension-<версия>.zip`. Тексты
карточки при этом трогать не надо.

---

## English (язык по умолчанию)

**Üksus paketist / Name:**

```
Subtitle Notes
```

**Kokkuvõte paketist / Summary** (до 132 знаков):

```
Translates the word you select, taking the whole line into account. Works in subtitles, on any page and in PDF.
```

**Kirjeldus / Description:**

```
Subtitle Notes translates the sense a word has in the line it turned up in, not the word on its own.

A dictionary reads "No one wants a record" as a best-ever score. Here the line is read by a language model that sees the whole utterance, and it answers the way a dubbing translator would: a criminal record. Every word comes with synonyms, and a figure of speech also comes with the literal image it grew out of.

What the extension does:

- Highlight anything on any site. Let go, and a small card says what it means in this context.
- Subtitles in web players. YouTube, Netflix, Playerjs and the rest: hold Ctrl and the subtitle becomes ordinary text you can drag across. Let go and the player is yours again - the line drags, a click pauses.
- PDF. The right-click item in Chrome's viewer works where nothing else does.
- Saving without a button. Hold Ctrl+Alt while you highlight and the word goes to your library quietly, with an undo.
- One library for everything. The same Google account means the same words in the phone app and in the Windows program.
- Read out loud, a counter of how often you have met a word, Anki export, a blocklist of sites.
- Interface in 14 languages, chosen by your browser.

The extension sends nothing anywhere until you highlight something yourself.
```

---

## Русский

**Название:**

```
Subtitle Notes
```

**Короткое описание** (до 132 знаков):

```
Переводит выделенное слово с учётом всей фразы. Работает в субтитрах, на любой странице и в PDF.
```

**Подробное описание:**

```
Subtitle Notes переводит не слово, а смысл, который у него в этой строке.

Обычный словарь переводит "No one wants a record" как "никто не хочет рекорд". Здесь строку читает языковая модель, которая видит всю реплику целиком, и отвечает так, как перевёл бы её дубляж: "никому не нужна судимость". К каждому слову - синонимы, а к образным выражениям ещё и буквальный смысл, из которого они выросли.

Что умеет расширение:

- Выделение на любом сайте. Выделили - появилось окно с переводом и значением именно в этом контексте.
- Субтитры в веб-плеерах. YouTube, Netflix, Playerjs и остальные: держите Ctrl, и субтитры становятся обычным текстом, который можно выделить. Отпустили - плеер снова ваш: субтитры перетаскиваются, клик ставит на паузу.
- PDF. Правый клик в просмотрщике Chrome работает там, где не работает ничего другого.
- Сохранение без кнопки. Ctrl+Alt при выделении - слово уходит в библиотеку молча, с возможностью отменить.
- Одна библиотека на всё. Тот же аккаунт Google - те же слова в приложении на телефоне и в программе для компьютера.
- Произношение вслух, счётчик встреч, выгрузка для Anki, чёрный список сайтов.
- Интерфейс на 14 языках, выбирается по языку браузера.

Расширение ничего не отправляет, пока вы сами не выделите текст.
```

---

## Eesti

**Nimi:**

```
Subtitle Notes
```

**Kokkuvõte** (kuni 132 tähemärki):

```
Tõlgib valitud sõna kogu lauset arvesse võttes. Töötab subtiitrites, igal lehel ja PDF-is.
```

**Kirjeldus:**

```
Subtitle Notes ei tõlgi sõna, vaid seda tähendust, mis sõnal selles lauses on.

Tavaline sõnaraamat teeb lausest "No one wants a record" rekordi. Siin loeb lauset keelemudel, mis näeb kogu repliiki, ja vastab nii, nagu vastaks dublaaži tõlkija: karistusregistri kanne. Iga sõna juurde käivad sünonüümid, kujundlike väljendite juurde ka see otsene pilt, millest need on kasvanud.

Mida laiendus teeb:

- Valimine igal saidil. Lased lahti - ilmub aken, kus on tõlge ja tähendus just selles kontekstis.
- Subtiitrid veebipleierites. YouTube, Netflix, Playerjs ja teised: hoia Ctrl all ja subtiiter muutub tavaliseks tekstiks, mida saab valida. Lased lahti - pleier on jälle sinu: rida liigub, klõps paneb pausile.
- PDF. Paremklõpsu käsk Chrome'i vaaturis töötab seal, kus miski muu ei tööta.
- Salvestamine ilma nuputa. Hoia valimise ajal Ctrl+Alt ja sõna läheb kogusse vaikselt, koos võimalusega tagasi võtta.
- Üks kogu kõige jaoks. Sama Google'i konto tähendab samu sõnu telefonirakenduses ja Windowsi programmis.
- Ettelugemine, loendur mitu korda oled sõna kohanud, Anki eksport, saitide must nimekiri.
- Liides 14 keeles, valitakse brauseri keele järgi.

Laiendus ei saada kuhugi midagi enne, kui sa ise teksti valid.
```

---

## Обоснование разрешений

Если проверка спросит, зачем расширению доступ ко всем сайтам:

```
The extension makes subtitles in web video players selectable and translates
text the user highlights. Neither can be limited to a list of hosts: people
watch on many different sites, and a word can be on any page. Nothing is read
or sent until the user holds the key and highlights something. The only host
the extension talks to is app.subtitlenotes.workers.dev, which holds the user's
own library.
```

`storage` - настройки и токен сессии на устройстве пользователя.
`contextMenus` - пункт правого меню для PDF, где выделение недоступно.
