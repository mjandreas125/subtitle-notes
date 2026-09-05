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
A dictionary translates the word. Subtitle Notes translates what the word meant in the line you found it in.

"No one wants a record" is not about a best-ever score. The line is read by a language model that sees the whole utterance, and it answers the way a dubbing translator would: a criminal record. Every word comes with synonyms, and a figure of speech also comes with the literal image it grew out of.

WHILE YOU WATCH
Hold Ctrl and a subtitle in a web player becomes ordinary text you can drag across: YouTube, Netflix, Playerjs and the rest. The film pauses by itself while you read the answer. Let go of the key and the player is yours again - the line drags, a click pauses.

WHILE YOU READ
Highlight anything on any page and a card says what it means in this context. In PDFs, where highlighting is awkward, the right-click item in Chrome's viewer does the same. Hold Ctrl+Alt while you highlight and the word is kept without a button and without a dialogue - with an undo, in case the drag was a mistake.

AFTERWARDS
Everything lands in one library, and revision brings each word back on a widening schedule: the ones you struggled with sooner than the ones you knew. The same Google account puts that library on your phone and in the Windows program, which also reads subtitles in VLC and text in any program on the desktop.

Also: read out loud in the language of the subtitle, a counter of how often you have met a word, Anki export, a list of sites to leave alone, and an interface in 14 languages chosen by your browser.

Nothing is sent anywhere until you highlight something yourself. https://app.subtitlenotes.workers.dev
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
Словарь переводит слово. Subtitle Notes переводит то, что это слово значило в строке, где вы его встретили.

"No one wants a record" - это не про рекорд. Строку читает языковая модель, которая видит всю реплику, и отвечает так, как перевёл бы её дубляж: "никому не нужна судимость". К каждому слову - синонимы, а к образным выражениям ещё и буквальный смысл, из которого они выросли.

КОГДА ВЫ СМОТРИТЕ
Держите Ctrl - и субтитр в веб-плеере становится обычным текстом, который можно выделить: YouTube, Netflix, Playerjs и остальные. Фильм сам встаёт на паузу, пока вы читаете ответ. Отпустили клавишу - плеер снова ваш: субтитры перетаскиваются, клик ставит на паузу.

КОГДА ВЫ ЧИТАЕТЕ
Выделите что угодно на любой странице - и карточка скажет, что это значит именно здесь. В PDF, где выделять неудобно, то же самое делает пункт правого меню в просмотрщике Chrome. Ctrl+Alt при выделении - слово уходит в библиотеку без кнопок и без диалогов, с возможностью отменить, если рука дрогнула.

ПОТОМ
Всё попадает в одну библиотеку, а повторение возвращает слова с растущими интервалами: то, что далось тяжело, приходит раньше того, что вы знали. Тот же аккаунт Google - та же библиотека в приложении на телефоне и в программе для компьютера, которая читает ещё и субтитры в VLC и текст в любой программе.

Кроме того: произношение вслух на языке субтитра, счётчик встреч со словом, выгрузка для Anki, список сайтов, куда лучше не лезть, и интерфейс на 14 языках по языку браузера.

Ничего никуда не отправляется, пока вы сами не выделите текст. https://app.subtitlenotes.workers.dev
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
Sõnaraamat tõlgib sõna. Subtitle Notes tõlgib selle, mida sõna tähendas lauses, kust sa selle leidsid.

"No one wants a record" ei räägi rekordist. Lauset loeb keelemudel, mis näeb kogu repliiki, ja vastab nii, nagu vastaks dublaaži tõlkija: karistusregistri kanne. Iga sõna juurde käivad sünonüümid, kujundlike väljendite juurde ka see otsene pilt, millest need on kasvanud.

KUI SA VAATAD
Hoia Ctrl all ja subtiiter veebipleieris muutub tavaliseks tekstiks, mida saab valida: YouTube, Netflix, Playerjs ja teised. Film läheb ise pausile, kuni sa vastust loed. Lased klahvi lahti - pleier on jälle sinu: rida liigub, klõps paneb pausile.

KUI SA LOED
Vali mis tahes tekst mis tahes lehel ja kaart ütleb, mida see just siin tähendab. PDF-is, kus valimine on tülikas, teeb sama Chrome'i vaaturi paremklõpsu käsk. Hoia valimise ajal Ctrl+Alt ja sõna läheb kogusse ilma nupu ja dialoogita - koos võimalusega tagasi võtta, kui käsi värises.

PÄRAST
Kõik jõuab ühte kogusse ja kordamine toob sõnad tagasi üha pikemate vahedega: need, millega oli raskusi, tulevad varem kui need, mida juba teadsid. Sama Google'i konto tähendab sama kogu telefonirakenduses ja Windowsi programmis, mis loeb lisaks subtiitreid VLC-s ja teksti ükskõik millises programmis.

Lisaks: ettelugemine subtiitri keeles, loendur mitu korda oled sõna kohanud, Anki eksport, saitide nimekiri, kuhu mitte sekkuda, ja liides 14 keeles brauseri keele järgi.

Midagi ei saadeta kuhugi enne, kui sa ise teksti valid. https://app.subtitlenotes.workers.dev
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
