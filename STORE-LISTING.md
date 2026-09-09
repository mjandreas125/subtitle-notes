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
5. **Ekraanipildid** (скриншоты) - теперь свои на каждый язык. Магазин
   локализует скриншоты и промо-видео; не локализуются только две плитки.
   Выбрав язык в том же дропдауне **Keel**, перетащить в секцию
   *Lokaliseeritud ekraanipildid*:
   - `inglise - en` -> `release_package/store-en/shot-1.png` ... `shot-5.png`
   - `vene - ru`    -> `release_package/store-ru/shot-1.png` ... `shot-5.png`

   Порядок показа у магазина такой: локализованное видео, локализованные
   скриншоты, общее видео, общие скриншоты. Старый общий набор
   `release_package/store/shot-*.png` остаётся запасным для тех языков, у
   которых своего набора нет; перезаливать его не нужно.
6. **Промо-видео** (`YouTube video`): загрузить на YouTube
   `release_package/promo/subtitle-notes-en.mp4` и `...-ru.mp4` (1920x1080,
   27 с, со звуком), доступ «по ссылке» или публичный, без рекламы. Ссылку
   вставить в поле видео - для каждого языка свою. Видео показывается **перед**
   скриншотами, это самое заметное место карточки.
7. **Väike reklaamipaan** -> `release_package/store/tile-440x280.png`.
   **Silmapaistev reklaamipaan** -> `release_package/store/marquee-1400x560.png`.
   Эти две - общие на все языки, локализовать их магазин не даёт.
8. **Kodulehe URL** поменять на `https://subtitlenotes.com`
   (сейчас там GitHub - это исходники, а не сайт продукта).
   **Toe URL**: `https://github.com/mjandreas125/subtitle-notes/issues`.
9. **Ametlik URL** - теперь можно указать `https://subtitlenotes.com`, но
   сначала домен нужно подтвердить в Google Search Console тем же аккаунтом,
   под которым открыт кабинет разработчика. Не подтвердишь - оставь `Puudub`,
   поле необязательное.
10. **Kategooria**: `Haridus` - оставить.
   **Täiskasvanutele mõeldud sisu**: нет.
11. Сохранить и отправить на проверку.

## Как пересобрать картинки и ролик

Всё рисуется из двух страниц и одного словаря строк, локаль - параметр:

```
release_package/promo/strings.js   все видимые строки, en и ru
release_package/promo/shots.html   пять кадров витрины, ?lang=en&n=1..5
release_package/promo/film.html    ролик, ?lang=en&t=17.6 - один кадр
```

```
node tools/build-promo.mjs           # всё: 10 скриншотов + 2 ролика
node tools/build-promo.mjs shots     # только скриншоты, это быстро
node tools/build-promo.mjs film ru   # только русский ролик
```

Ролик собирается покадрово: `tools/render-film.mjs` водит headless Chrome по
таймлайну (`FILM.seek(t)`), `tools/promo-audio.py` синтезирует дорожку из
арифметики - никакой лицензионной музыки, - а ffmpeg склеивает. Кадры уходят во
временную папку и удаляются после сборки.

Новый язык = новый ключ в `strings.js` плюс строка в `LANGS` в
`tools/build-promo.mjs`. Разметку трогать не нужно.

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
Understands subtitle lines in context. One library for the extension, phone, VLC and the Windows app.
```

**Kirjeldus / Description:**

```
Subtitle Notes helps you watch series and films in the original language. It translates the meaning of the whole subtitle line, not a word in isolation. Highlight a line to get a natural translation, synonyms and an explanation of the figurative meaning.

"No one wants a record" is not about a sporting record. Subtitle Notes reads the full line and explains it as a dubbing translator would: "nobody wants a criminal record". For an idiom, it also shows the literal image and the meaning it gives in that scene.

WHILE WATCHING SERIES AND FILMS
Hold Ctrl to make subtitles selectable in web players. It works on YouTube, Netflix, Playerjs and other sites. The video pauses while you select the line and read the answer. Release Ctrl and the player works normally again.

WHILE READING
Highlight text on any page to see what it means in that exact context. In Chrome's PDF viewer, use the right-click menu. Hold Ctrl+Alt while selecting to save the word or phrase directly to your library. An accidental save can be undone.

ONE LIBRARY FOR THE EXTENSION, PHONE AND WINDOWS
The extension saves words and lines you find while watching into one shared library. Sign in with the same Google account to open it on your phone and in the Windows app. The Windows app also works with VLC subtitles and text from other desktop programs. Find a line in the browser, then review it on your phone or computer.

REVIEW
Spaced repetition brings difficult words back sooner and familiar words later. Also included: pronunciation, encounter counts, Anki export, an excluded-sites list and an interface in 14 languages.

Nothing is sent for translation until you select text yourself. https://subtitlenotes.com
```

---

## Русский

**Название:**

```
Subtitle Notes
```

**Короткое описание** (до 132 знаков):

```
Переводит реплики в субтитрах по смыслу. Одна библиотека для расширения, телефона, VLC и Windows.
```

**Подробное описание:**

```
Subtitle Notes помогает смотреть сериалы и фильмы на языке оригинала. Расширение переводит не отдельное слово, а всю реплику с учётом контекста. Выделите строку в субтитрах и получите естественный перевод, синонимы и объяснение образного выражения.

"No one wants a record" - это не про рекорд. Subtitle Notes читает всю реплику и объясняет её так, как перевёл бы дубляж: "никому не нужна судимость". Для идиом показывает буквальный образ и смысл, который он даёт в этой сцене.

ПРИ ПРОСМОТРЕ СЕРИАЛОВ И ФИЛЬМОВ
Зажмите Ctrl, чтобы сделать субтитры в веб-плеере выделяемым текстом. Это работает на YouTube, Netflix, Playerjs и других сайтах. Пока вы выделяете реплику и читаете перевод, видео само ставится на паузу. Отпустите Ctrl, и плеер снова работает как обычно.

ПРИ ЧТЕНИИ
Выделите текст на любой странице, чтобы понять его именно в этом контексте. В PDF используйте пункт правого меню Chrome. Если выделять с Ctrl+Alt, слово или выражение сразу сохранится в библиотеку. Случайное сохранение можно отменить.

ОДНА БИБЛИОТЕКА ДЛЯ РАСШИРЕНИЯ, ТЕЛЕФОНА И WINDOWS
Расширение сохраняет найденные в сериале слова и реплики в общую библиотеку. С тем же Google-аккаунтом она появляется в приложении на телефоне и в программе для Windows. В Windows программа работает также с субтитрами VLC и текстом из других приложений. Всё, что вы нашли в браузере, можно повторять на телефоне или компьютере.

ПОВТОРЕНИЕ
Интервальные повторения возвращают сложные слова раньше, а знакомые позже. Есть произношение, счётчик встреч со словом, экспорт в Anki, список исключённых сайтов и интерфейс на 14 языках.

Ничего не отправляется на перевод, пока вы сами не выделите текст. https://subtitlenotes.com
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

Midagi ei saadeta kuhugi enne, kui sa ise teksti valid. https://subtitlenotes.com
```

---

## Обоснование разрешений

Если проверка спросит, зачем расширению доступ ко всем сайтам:

```
The extension makes subtitles in web video players selectable and translates
text the user highlights. Neither can be limited to a list of hosts: people
watch on many different sites, and a word can be on any page. Nothing is read
or sent until the user holds the key and highlights something. The only hosts
the extension talks to are subtitlenotes.com and subtitlenotes.com
- the same service under its own domain and under the address earlier versions
were built with. It holds the user's own library.
```

`storage` - настройки и токен сессии на устройстве пользователя.
`contextMenus` - пункт правого меню для PDF, где выделение недоступно.
