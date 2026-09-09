// Every visible string for the store screenshots and the promo film, in one
// place, so that adding a locale is adding a key and never touching markup.
//
// The demonstration language differs on purpose. A Russian visitor is shown an
// English film answered in Russian; an English visitor is shown a French film
// answered in English. Both are the examples the store description already
// argues from, and together they say the thing one example cannot: the source
// language is not the point.

window.STRINGS = {
  en: {
    brand: 'Subtitle Notes',

    // --- shot 1: the gesture -------------------------------------------------
    s1h: 'Hold Ctrl and drag across the subtitle',
    s1l: 'Let go and the player is yours again - the line drags, a click pauses.',
    s1cap: ['Il n’est pas ', 'dans son assiette', '.'],
    s1card: 'He is not feeling well.',
    s1word: 'dans son assiette - feeling right',
    s1seen: 'Saved to your library',
    s1k: 'Ctrl',
    s1s: [
      ['Hold the key', 'The subtitle turns into ordinary text'],
      ['Drag across the words', 'The film pauses by itself'],
      ['Read it and watch on', 'Already saved. No buttons, no dialogue.'],
    ],

    // --- shot 2: the line, not the word --------------------------------------
    s2h: 'It answers about the line, not the word',
    s2l: 'A model reads the whole utterance and replies the way a dubbing translator would.',
    s2src: ['Il n’est pas ', 'dans son assiette', '.'],
    s2time: 'film, 27:44',
    s2lose: 'Word for word',
    s2losep: 'he is not in his plate',
    s2win: 'Subtitle Notes',
    s2winp: 'he is not feeling well',
    s2chips: ['under the weather', 'off colour', 'out of sorts'],
    s2lit: 'Literally “not in his plate” - the plate is an old word for how a person sits in themselves.',
    s2band: 'The same with idiom, sarcasm and slang',
    s2three: [
      ['Il pleut des cordes.', 'it’s pouring down'],
      ['Me estás tomando el pelo.', 'you’re pulling my leg'],
      ['Ich verstehe nur Bahnhof.', 'I haven’t a clue'],
    ],

    // --- shot 3: any page, any PDF -------------------------------------------
    s3h: 'Any page, any PDF - just highlight it',
    s3l: 'An article, a document, a comment, a subtitle. One movement of the mouse, and the card is beside it.',
    s3url: 'elpais.example/cultura/las-palabras-que-quedan',
    s3title: 'Las palabras que quedan',
    s3p1: ['Los lectores rara vez se detienen ante un diccionario. Adivinan, siguen adelante, y la palabra ', 'se les escapa entre los dedos', ' - por eso el segundo encuentro con ella se parece tanto al primero.'],
    s3p2: 'Una nota tomada en el segundo en que ocurre vale más que una hora de listas escritas por la noche.',
    s3p3: 'Por eso una palabra encontrada en una película se queda mejor que la misma palabra encontrada en una columna de otras veinte.',
    s3p4: 'No es cuestión de esfuerzo. Es si la palabra todavía lleva encima la escena de la que vino.',
    s3by: 'Marta Ibáñez · 6 min de lectura',
    s3card: 'slips through their fingers',
    s3word: 'escaparse entre los dedos - to slip away',
    s3pdf: 'bericht-2026.pdf',
    s3pdfpage: '14 / 32',
    s3pdfbody: ['Der Ausschuss fand keine ', 'Anhaltspunkte', ' für die Behauptung.'],
    s3s: [
      ['An ordinary highlight', 'No setting, no separate mode. Highlight, and the card is there.'],
      ['Ctrl+Alt while you drag', 'Keeps the word silently, without even opening the card.'],
      ['In a PDF, the right-click item', 'Where nothing else works, that one does.'],
    ],

    // --- shot 4: the library on every device ---------------------------------
    s4h: 'By morning the words are on your phone',
    s4l: 'One Google account, one library: browser, phone, computer.',
    s4lib: 'Library',
    s4libsub: '129 words · 11 films',
    s4rows: [
      ['dans son assiette', 'feeling right', 'Le Fabuleux Destin · 27:44'],
      ['à la belle étoile', 'under the open sky', 'Les Choristes · 41:12'],
      ['coup de foudre', 'love at first sight', 'Amélie · 08:03'],
      ['tomber dans les pommes', 'to faint', 'Intouchables · 55:20'],
    ],
    s4rev: 'Review',
    s4revq: 'coup de foudre',
    s4revhint: 'Amélie · 08:03',
    s4revans: 'love at first sight',
    s4revline: 'Ça a été un vrai coup de foudre.',
    s4revbtns: ['Again', 'Knew it'],
    s4prog: 'Card 3 of 12 due today',
    s4dev: ['Browser', 'Phone', 'Desktop'],
    s4aside: 'What happens next',
    s4list: [
      ['Two minutes on the bus.', 'The app brings back the words that are due - the hard ones sooner.'],
      ['Search your own words.', 'Which film it came from, and at which minute.'],
      ['Your own wording.', 'If the answer is off, write the one you would use.'],
      ['Works offline.', 'Anything saved can be read and revised with no connection.'],
    ],
    s4note: 'A word saved in the browser is on the phone a second later. Nothing to move by hand.',

    // --- shot 5: your language -----------------------------------------------
    s5h: 'Answers in any of 14 languages',
    s5l: 'Pick the language your cards are explained in - whatever language the film happens to speak.',
    s5pick: 'Cards are explained in',
    s5note: 'Chosen once, in the extension settings. The interface follows your browser on its own.',
    s5anki: 'Anki export',
    s5ankin: '129 words',
    s5rows: [
      ['dans son assiette', 'feeling right - Il n’est pas dans son assiette.'],
      ['se escapa entre los dedos', 'slips through their fingers'],
      ['Anhaltspunkte', 'grounds, indications'],
      ['coup de foudre', 'love at first sight'],
    ],
    s5vlc: 'VLC on the desktop',
    s5vlcs: 'The program writes itself into the player, and Ctrl+Alt+S translates text in any window.',
    s5own: 'Your words stay yours',
    s5owns: 'One file with the word, the meaning and the line it came from. The account is deleted with one button.',
    s5cap: ['Je n’y comprends ', 'que dalle', '.'],
    s5card: 'not a thing',
    s5word: 'que dalle - nothing at all',

    // --- the film ------------------------------------------------------------
    s0cap: 'Qu’est-ce qu’il a, Michel ?',
    fep: 'S02 · E04',
    ftotal: '42:10',
    fdict: 'a dictionary',
    fhere: 'in this line',
    f1: 'A dictionary answers about the word.',
    f2: 'The line meant something else.',
    f3: 'Hold Ctrl. Drag across it.',
    fnodes: ['the line', 'the sense', 'the dub'],
    f4: 'The whole utterance is read - not the word.',
    f5: 'Kept, with the scene it came from.',
    f6: 'Browser, phone, desktop. One library.',
    f7: 'Explained in any of 14 languages.',
    fswaps: [
      'he is not feeling well', 'ему не по себе', 'ihm geht es nicht gut',
      'no se encuentra bien', 'tal pole hea olla',
    ],
    f8: 'Subtitle Notes',
    f9: 'Free, in the Chrome Web Store',
  },

  ru: {
    brand: 'Subtitle Notes',

    s1h: 'Держите Ctrl и протяните по субтитру',
    s1l: 'Отпустили - плеер снова ваш: субтитр перетаскивается, клик ставит на паузу.',
    s1cap: ['No one wants ', 'a record', '.'],
    s1card: 'Никому не нужна судимость.',
    s1word: 'a record - судимость',
    s1seen: 'Сохранено в библиотеку',
    s1k: 'Ctrl',
    s1s: [
      ['Зажали клавишу', 'Субтитр становится обычным текстом'],
      ['Протянули по словам', 'Видео встаёт на паузу само'],
      ['Прочитали и смотрите дальше', 'Слово уже в библиотеке. Кнопок нет.'],
    ],

    s2h: 'Отвечает про фразу, а не про слово',
    s2l: 'Строку читает модель: она видит всю реплику и отвечает так, как перевёл бы дубляж.',
    s2src: ['No one wants ', 'a record', '.'],
    s2time: 'серия, 27:44',
    s2lose: 'Слово за слово',
    s2losep: 'никто не хочет рекорд',
    s2win: 'Subtitle Notes',
    s2winp: 'никому не нужна судимость',
    s2chips: ['криминальное прошлое', 'привод в полицию', 'уголовное прошлое'],
    s2lit: 'Буквально «запись» - запись о судимости, которая остаётся с человеком.',
    s2band: 'Так же с идиомами, сарказмом и сленгом',
    s2three: [
      ['It’s not my cup of tea.', 'мне это не по вкусу'],
      ['He threw me under the bus.', 'он меня подставил'],
      ['Let’s call it a day.', 'на сегодня хватит'],
    ],

    s3h: 'На любом сайте и в PDF - просто выделите',
    s3l: 'Статья, документ, комментарий, субтитр. Одно движение мышью - окно появляется рядом.',
    s3url: 'longreads.example/how-we-learn-words',
    s3title: 'The words we keep',
    s3p1: ['Readers rarely stop for a dictionary. They guess, move on, and the word ', 'slips through the cracks', ' - which is why the second meeting with it feels exactly like the first one.'],
    s3p2: 'A note taken in the second it happens is worth more than an hour of lists written later in the evening.',
    s3p3: 'That is also why a word met in a film sticks better than the same word met in a column of twenty others.',
    s3p4: 'The difference is not effort. It is whether the word still carries the scene it came from.',
    s3by: 'Helen Marsh · 6 min read',
    s3card: 'ускользает от внимания',
    s3word: 'slip through the cracks - остаться незамеченным',
    s3pdf: 'report-2026.pdf',
    s3pdfpage: '14 / 32',
    s3pdfbody: ['The committee found no ', 'grounds', ' for the claim.'],
    s3s: [
      ['Обычное выделение мышью', 'Ни настройки, ни отдельного режима: выделили - окно рядом.'],
      ['Ctrl+Alt при выделении', 'Сохранить молча, даже не открывая окно.'],
      ['В PDF - правый клик', 'Там, где больше ничего не работает.'],
    ],

    s4h: 'Утром слова уже в телефоне',
    s4l: 'Один аккаунт Google - одна библиотека: браузер, телефон, компьютер.',
    s4lib: 'Библиотека',
    s4libsub: '129 слов · 11 фильмов',
    s4rows: [
      ['a record', 'судимость', 'Сериал · 27:44'],
      ['slip through the cracks', 'ускользнуть от внимания', 'Статья · вчера'],
      ['make out', 'разобрать, что говорят', 'Фильм · 41:12'],
      ['under the weather', 'плохо себя чувствовать', 'Фильм · 08:03'],
    ],
    s4rev: 'Повторение',
    s4revq: 'slip through the cracks',
    s4revhint: 'Статья · вчера',
    s4revans: 'остаться незамеченным',
    s4revline: 'The word slips through the cracks.',
    s4revbtns: ['Ещё раз', 'Знаю'],
    s4prog: 'Карточка 3 из 12 на сегодня',
    s4dev: ['Браузер', 'Телефон', 'Компьютер'],
    s4aside: 'Что с этим дальше',
    s4list: [
      ['Две минуты в транспорте.', 'Приложение само предлагает слова, которым пора вернуться.'],
      ['Поиск по своим словам.', 'Видно, из какого фильма и с какой минуты.'],
      ['Свой вариант перевода.', 'Если неточно - напишите, как правильно.'],
      ['Работает без сети.', 'Сохранённое читается и повторяется offline.'],
    ],
    s4note: 'Слово, сохранённое в браузере, оказывается в телефоне через секунду. Ничего не нужно переносить руками.',

    s5h: 'Ответы на любом из 14 языков',
    s5l: 'Выберите язык, на котором объясняются карточки, - на каком бы языке ни говорил фильм.',
    s5pick: 'Карточки объясняются на',
    s5note: 'Выбирается один раз, в настройках расширения. Интерфейс сам подхватывает язык браузера.',
    s5anki: 'Выгрузка для Anki',
    s5ankin: '129 слов',
    s5rows: [
      ['a record', 'судимость - No one wants a record.'],
      ['slip through the cracks', 'остаться незамеченным'],
      ['make out', 'разобрать на слух'],
      ['at the commons', 'на общей территории'],
    ],
    s5vlc: 'VLC на компьютере',
    s5vlcs: 'Программа сама прописывает себя в плеер, а Ctrl+Alt+S переводит текст в любом окне.',
    s5own: 'Ваши слова остаются вашими',
    s5owns: 'Файл со словом, значением и репликой, из которой оно взято. Аккаунт удаляется одной кнопкой.',
    s5cap: ['I can’t ', 'make out', ' a word.'],
    s5card: 'разобрать на слух',
    s5word: 'make out - различить',

    s0cap: 'So what did the lawyer say?',
    fep: 'S02 · E04',
    ftotal: '42:10',
    fdict: 'словарь',
    fhere: 'в этой реплике',
    f1: 'Словарь отвечает про слово.',
    f2: 'А фраза значила другое.',
    f3: 'Зажмите Ctrl. Протяните.',
    fnodes: ['реплика', 'смысл', 'дубляж'],
    f4: 'Читается вся реплика - не слово.',
    f5: 'Сохранено - вместе со сценой.',
    f6: 'Браузер, телефон, компьютер. Одна библиотека.',
    f7: 'Объясняется на любом из 14 языков.',
    fswaps: [
      'судимость', 'a criminal record', 'eine Vorstrafe',
      'antecedentes penales', 'karistatus',
    ],
    f8: 'Subtitle Notes',
    f9: 'Бесплатно, в Chrome Web Store',
  },
};

// The fourteen languages a card can be explained in, named in themselves.
window.LANGS = [
  ['en', 'English'], ['ru', 'Русский'], ['et', 'Eesti'], ['de', 'Deutsch'],
  ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português'],
  ['pl', 'Polski'], ['uk', 'Українська'], ['nl', 'Nederlands'], ['tr', 'Türkçe'],
  ['sv', 'Svenska'], ['fi', 'Suomi'],
];

// The two promo tiles. Deliberately outside STRINGS and not keyed by locale:
// the Chrome Web Store localises descriptions, screenshots and video, but the
// small tile and the marquee are shown to everyone in every country exactly as
// uploaded. So they carry one set of words, and those words are English - the
// widest-read language in the store - demonstrating a French line rather than a
// Russian one, so that the example itself needs no translation to land.
window.TILES = {
  name: 'Subtitle Notes',
  line: 'It translates the line, not the word.',
  sub: ['Il n’est pas ', 'dans son assiette', '.'],
  meaning: 'he is not feeling well',
  term: 'dans son assiette — feeling right',
  wrong: 'he is not in his plate',
  wrongLabel: 'a dictionary',
  rightLabel: 'in this line',
};
