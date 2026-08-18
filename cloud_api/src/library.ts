/// The library in a browser: the same words, review and achievements the phone
/// shows, for people who never install the app - and for the extension, which
/// opens this page already signed in.

/// Kept short on purpose: every line here has to exist in fourteen languages,
/// so anything that can be said with two words is said with two words.
const SAY: Record<string, Record<string, string>> = {
  en: {
    title: 'Your library', words: 'Words', review: 'Practise', goals: 'Achievements',
    settings: 'Settings', search: 'Search your words', clear: 'Clear', all: 'All',
    active: 'Saved', learned: 'Learned', refresh: 'Refresh', signout: 'Sign out',
    empty: 'Nothing saved here yet',
    emptyNote: 'Highlight a subtitle in a player or any text on a page, and it appears here.',
    ready: 'ready to practise', reveal: 'Show meaning', again: 'Again', knew: 'I knew it',
    easy: 'Easy', nothingDue: 'Nothing to practise right now',
    nothingDueNote: 'Words come back on their own: tomorrow, in three days, in a week.',
    done: 'Done for now', context: 'The line it came from', full: 'Whole line',
    variants: 'Other meanings', examples: 'Examples', synonyms: 'Close to',
    literal: 'Literally', mine: 'My own wording', mineHint: 'Write the meaning you would use',
    save: 'Save', reread: 'Read the line again', archive: 'Move to learned',
    unarchive: 'Back to saved', remove: 'Delete', removeAsk: 'Delete this word?',
    saved: 'saved', sources: 'sources', learnedCount: 'learned',
    unlocked: 'unlocked', language: 'Language of the cards',
    languageNote: 'New cards are written in this language. What is already saved stays as it is.',
    exportAnki: 'Export for Anki', exportNote: 'A file with the word, its meaning and the line it came from.',
    deleteAccount: 'Delete account', working: 'One moment…',
    enter: 'Continue with Google',
    sync: 'Sync with the app',
  },
  ru: {
    title: 'Ваша библиотека', words: 'Слова', review: 'Повторение', goals: 'Достижения',
    settings: 'Настройки', search: 'Поиск по словам', clear: 'Очистить', all: 'Все',
    active: 'Сохранённые', learned: 'Выученные', refresh: 'Обновить', signout: 'Выйти',
    empty: 'Здесь пока пусто',
    emptyNote: 'Выделите субтитр в плеере или любой текст на странице - слово появится тут.',
    ready: 'ждут повторения', reveal: 'Показать значение', again: 'Ещё раз', knew: 'Вспомнил',
    easy: 'Легко', nothingDue: 'Сейчас повторять нечего',
    nothingDueNote: 'Слова возвращаются сами: завтра, через три дня, через неделю.',
    done: 'На сегодня всё', context: 'Строка, из которой взято', full: 'Вся строка',
    variants: 'Другие значения', examples: 'Примеры', synonyms: 'Близко по смыслу',
    literal: 'Буквально', mine: 'Свой вариант', mineHint: 'Напишите, как перевели бы вы',
    save: 'Сохранить', reread: 'Перечитать строку', archive: 'В выученные',
    unarchive: 'Вернуть в сохранённые', remove: 'Удалить', removeAsk: 'Удалить это слово?',
    saved: 'сохранено', sources: 'источников', learnedCount: 'выучено',
    unlocked: 'открыто', language: 'Язык карточек',
    languageNote: 'На этом языке пишутся новые карточки. Сохранённое остаётся как есть.',
    exportAnki: 'Выгрузить для Anki', exportNote: 'Файл со словом, значением и репликой, из которой оно взято.',
    deleteAccount: 'Удалить аккаунт', working: 'Секунду…',
    enter: 'Войти через Google',
    sync: 'Синхронизация с приложением',
  },
  et: {
    title: 'Sinu kogu', words: 'Sõnad', review: 'Kordamine', goals: 'Saavutused',
    settings: 'Seaded', search: 'Otsi oma sõnadest', clear: 'Tühjenda', all: 'Kõik',
    active: 'Salvestatud', learned: 'Selged', refresh: 'Värskenda', signout: 'Logi välja',
    empty: 'Siin pole veel midagi',
    emptyNote: 'Märgi subtiiter mängijas või mis tahes tekst lehel - sõna ilmub siia.',
    ready: 'ootab kordamist', reveal: 'Näita tähendust', again: 'Uuesti', knew: 'Teadsin',
    easy: 'Lihtne', nothingDue: 'Praegu pole midagi korrata',
    nothingDueNote: 'Sõnad tulevad ise tagasi: homme, kolme päeva, nädala pärast.',
    done: 'Praeguseks tehtud', context: 'Rida, kust see tuli', full: 'Kogu rida',
    variants: 'Teised tähendused', examples: 'Näited', synonyms: 'Lähedased',
    literal: 'Sõna-sõnalt', mine: 'Minu variant', mineHint: 'Kirjuta, kuidas sina ütleksid',
    save: 'Salvesta', reread: 'Loe rida uuesti', archive: 'Liiguta selgeks',
    unarchive: 'Tagasi salvestatuisse', remove: 'Kustuta', removeAsk: 'Kustutada see sõna?',
    saved: 'salvestatud', sources: 'allikat', learnedCount: 'selge',
    unlocked: 'avatud', language: 'Kaartide keel',
    languageNote: 'Uued kaardid kirjutatakse selles keeles. Juba salvestatu jääb samaks.',
    exportAnki: 'Ekspordi Ankisse', exportNote: 'Fail sõna, tähenduse ja lausega, kust see pärineb.',
    deleteAccount: 'Kustuta konto', working: 'Hetk…',
    enter: 'Jätka Google’iga',
    sync: 'Sünkroonimine rakendusega',
  },
  de: {
    title: 'Deine Sammlung', words: 'Wörter', review: 'Üben', goals: 'Erfolge',
    settings: 'Einstellungen', search: 'In deinen Wörtern suchen', clear: 'Leeren', all: 'Alle',
    active: 'Gespeichert', learned: 'Gelernt', refresh: 'Aktualisieren', signout: 'Abmelden',
    empty: 'Hier ist noch nichts',
    emptyNote: 'Markiere einen Untertitel im Player oder Text auf einer Seite - das Wort erscheint hier.',
    ready: 'warten aufs Üben', reveal: 'Bedeutung zeigen', again: 'Nochmal', knew: 'Wusste ich',
    easy: 'Leicht', nothingDue: 'Gerade nichts zu üben',
    nothingDueNote: 'Wörter kommen von selbst zurück: morgen, in drei Tagen, in einer Woche.',
    done: 'Für jetzt erledigt', context: 'Die Zeile dazu', full: 'Ganze Zeile',
    variants: 'Andere Bedeutungen', examples: 'Beispiele', synonyms: 'Ähnlich',
    literal: 'Wörtlich', mine: 'Meine Fassung', mineHint: 'Schreib, wie du es sagen würdest',
    save: 'Speichern', reread: 'Zeile neu lesen', archive: 'Zu gelernt',
    unarchive: 'Zurück zu gespeichert', remove: 'Löschen', removeAsk: 'Dieses Wort löschen?',
    saved: 'gespeichert', sources: 'Quellen', learnedCount: 'gelernt',
    unlocked: 'freigeschaltet', language: 'Sprache der Karten',
    languageNote: 'Neue Karten entstehen in dieser Sprache. Gespeichertes bleibt, wie es ist.',
    exportAnki: 'Für Anki exportieren', exportNote: 'Eine Datei mit Wort, Bedeutung und der Zeile, aus der es stammt.',
    deleteAccount: 'Konto löschen', working: 'Einen Moment…',
    enter: 'Mit Google fortfahren',
    sync: 'Mit der App synchronisieren',
  },
  fr: {
    title: 'Votre bibliothèque', words: 'Mots', review: 'Réviser', goals: 'Réussites',
    settings: 'Réglages', search: 'Chercher dans vos mots', clear: 'Effacer', all: 'Tous',
    active: 'Enregistrés', learned: 'Appris', refresh: 'Actualiser', signout: 'Se déconnecter',
    empty: 'Rien d’enregistré ici',
    emptyNote: 'Sélectionnez un sous-titre ou du texte sur une page : le mot apparaît ici.',
    ready: 'à réviser', reveal: 'Voir le sens', again: 'Encore', knew: 'Je savais',
    easy: 'Facile', nothingDue: 'Rien à réviser pour l’instant',
    nothingDueNote: 'Les mots reviennent seuls : demain, dans trois jours, dans une semaine.',
    done: 'Terminé pour l’instant', context: 'La réplique d’origine', full: 'Réplique entière',
    variants: 'Autres sens', examples: 'Exemples', synonyms: 'Proche de',
    literal: 'Littéralement', mine: 'Ma version', mineHint: 'Écrivez le sens que vous emploieriez',
    save: 'Enregistrer', reread: 'Relire la réplique', archive: 'Vers appris',
    unarchive: 'Remettre en enregistrés', remove: 'Supprimer', removeAsk: 'Supprimer ce mot ?',
    saved: 'enregistrés', sources: 'sources', learnedCount: 'appris',
    unlocked: 'débloqués', language: 'Langue des fiches',
    languageNote: 'Les nouvelles fiches seront dans cette langue. L’existant ne change pas.',
    exportAnki: 'Exporter vers Anki', exportNote: 'Un fichier avec le mot, le sens et la réplique d’où il vient.',
    deleteAccount: 'Supprimer le compte', working: 'Un instant…',
    enter: 'Continuer avec Google',
    sync: 'Synchroniser avec l’application',
  },
  es: {
    title: 'Tu biblioteca', words: 'Palabras', review: 'Repasar', goals: 'Logros',
    settings: 'Ajustes', search: 'Buscar en tus palabras', clear: 'Limpiar', all: 'Todas',
    active: 'Guardadas', learned: 'Aprendidas', refresh: 'Actualizar', signout: 'Cerrar sesión',
    empty: 'Aquí todavía no hay nada',
    emptyNote: 'Selecciona un subtítulo o cualquier texto de una página y la palabra aparecerá aquí.',
    ready: 'para repasar', reveal: 'Ver significado', again: 'Otra vez', knew: 'Lo sabía',
    easy: 'Fácil', nothingDue: 'Ahora no hay nada que repasar',
    nothingDueNote: 'Las palabras vuelven solas: mañana, en tres días, en una semana.',
    done: 'Por ahora, hecho', context: 'La línea de donde viene', full: 'Línea completa',
    variants: 'Otros significados', examples: 'Ejemplos', synonyms: 'Parecido a',
    literal: 'Literalmente', mine: 'Mi versión', mineHint: 'Escribe el significado que usarías',
    save: 'Guardar', reread: 'Releer la línea', archive: 'A aprendidas',
    unarchive: 'Volver a guardadas', remove: 'Eliminar', removeAsk: '¿Eliminar esta palabra?',
    saved: 'guardadas', sources: 'fuentes', learnedCount: 'aprendidas',
    unlocked: 'desbloqueados', language: 'Idioma de las tarjetas',
    languageNote: 'Las tarjetas nuevas se escriben en este idioma. Lo guardado no cambia.',
    exportAnki: 'Exportar a Anki', exportNote: 'Un archivo con la palabra, su significado y la línea de origen.',
    deleteAccount: 'Eliminar cuenta', working: 'Un momento…',
    enter: 'Continuar con Google',
    sync: 'Sincronizar con la aplicación',
  },
  it: {
    title: 'La tua raccolta', words: 'Parole', review: 'Ripasso', goals: 'Traguardi',
    settings: 'Impostazioni', search: 'Cerca fra le tue parole', clear: 'Pulisci', all: 'Tutte',
    active: 'Salvate', learned: 'Imparate', refresh: 'Aggiorna', signout: 'Esci',
    empty: 'Qui non c’è ancora niente',
    emptyNote: 'Seleziona un sottotitolo o del testo su una pagina: la parola compare qui.',
    ready: 'da ripassare', reveal: 'Mostra il significato', again: 'Ancora', knew: 'La sapevo',
    easy: 'Facile', nothingDue: 'Per ora non c’è nulla da ripassare',
    nothingDueNote: 'Le parole tornano da sole: domani, fra tre giorni, fra una settimana.',
    done: 'Per ora è tutto', context: 'La battuta da cui viene', full: 'Battuta intera',
    variants: 'Altri significati', examples: 'Esempi', synonyms: 'Vicino a',
    literal: 'Alla lettera', mine: 'La mia versione', mineHint: 'Scrivi il significato che useresti',
    save: 'Salva', reread: 'Rileggi la battuta', archive: 'Fra le imparate',
    unarchive: 'Torna fra le salvate', remove: 'Elimina', removeAsk: 'Eliminare questa parola?',
    saved: 'salvate', sources: 'fonti', learnedCount: 'imparate',
    unlocked: 'sbloccati', language: 'Lingua delle schede',
    languageNote: 'Le schede nuove saranno in questa lingua. Quelle salvate restano com’erano.',
    exportAnki: 'Esporta per Anki', exportNote: 'Un file con la parola, il significato e la battuta di origine.',
    deleteAccount: 'Elimina account', working: 'Un attimo…',
    enter: 'Continua con Google',
    sync: 'Sincronizza con l’app',
  },
  pt: {
    title: 'A sua biblioteca', words: 'Palavras', review: 'Rever', goals: 'Conquistas',
    settings: 'Definições', search: 'Procurar nas suas palavras', clear: 'Limpar', all: 'Todas',
    active: 'Guardadas', learned: 'Aprendidas', refresh: 'Atualizar', signout: 'Sair',
    empty: 'Ainda não há nada aqui',
    emptyNote: 'Selecione uma legenda ou texto numa página e a palavra aparece aqui.',
    ready: 'para rever', reveal: 'Mostrar significado', again: 'Outra vez', knew: 'Eu sabia',
    easy: 'Fácil', nothingDue: 'Nada para rever agora',
    nothingDueNote: 'As palavras voltam sozinhas: amanhã, daqui a três dias, daqui a uma semana.',
    done: 'Por agora, feito', context: 'A fala de onde veio', full: 'Fala inteira',
    variants: 'Outros significados', examples: 'Exemplos', synonyms: 'Perto de',
    literal: 'Literalmente', mine: 'A minha versão', mineHint: 'Escreva o significado que usaria',
    save: 'Guardar', reread: 'Reler a fala', archive: 'Para aprendidas',
    unarchive: 'Voltar a guardadas', remove: 'Apagar', removeAsk: 'Apagar esta palavra?',
    saved: 'guardadas', sources: 'fontes', learnedCount: 'aprendidas',
    unlocked: 'desbloqueadas', language: 'Idioma dos cartões',
    languageNote: 'Os cartões novos ficam neste idioma. O que já está guardado mantém-se.',
    exportAnki: 'Exportar para Anki', exportNote: 'Um ficheiro com a palavra, o significado e a fala de origem.',
    deleteAccount: 'Apagar conta', working: 'Um momento…',
    enter: 'Continuar com Google',
    sync: 'Sincronizar com a aplicação',
  },
  pl: {
    title: 'Twoja biblioteka', words: 'Słowa', review: 'Powtórka', goals: 'Osiągnięcia',
    settings: 'Ustawienia', search: 'Szukaj w swoich słowach', clear: 'Wyczyść', all: 'Wszystkie',
    active: 'Zapisane', learned: 'Opanowane', refresh: 'Odśwież', signout: 'Wyloguj',
    empty: 'Jeszcze nic tu nie ma',
    emptyNote: 'Zaznacz napis w odtwarzaczu albo tekst na stronie - słowo pojawi się tutaj.',
    ready: 'czeka na powtórkę', reveal: 'Pokaż znaczenie', again: 'Jeszcze raz', knew: 'Wiedziałem',
    easy: 'Łatwe', nothingDue: 'Teraz nie ma czego powtarzać',
    nothingDueNote: 'Słowa wracają same: jutro, za trzy dni, za tydzień.',
    done: 'Na teraz gotowe', context: 'Kwestia, z której pochodzi', full: 'Cała kwestia',
    variants: 'Inne znaczenia', examples: 'Przykłady', synonyms: 'Blisko',
    literal: 'Dosłownie', mine: 'Moja wersja', mineHint: 'Napisz znaczenie, którego byś użył',
    save: 'Zapisz', reread: 'Przeczytaj kwestię jeszcze raz', archive: 'Do opanowanych',
    unarchive: 'Z powrotem do zapisanych', remove: 'Usuń', removeAsk: 'Usunąć to słowo?',
    saved: 'zapisanych', sources: 'źródeł', learnedCount: 'opanowanych',
    unlocked: 'odblokowanych', language: 'Język fiszek',
    languageNote: 'Nowe fiszki powstają w tym języku. Zapisane zostają bez zmian.',
    exportAnki: 'Eksport do Anki', exportNote: 'Plik ze słowem, znaczeniem i kwestią, z której pochodzi.',
    deleteAccount: 'Usuń konto', working: 'Chwileczkę…',
    enter: 'Kontynuuj z Google',
    sync: 'Synchronizacja z aplikacją',
  },
  uk: {
    title: 'Ваша бібліотека', words: 'Слова', review: 'Повторення', goals: 'Досягнення',
    settings: 'Налаштування', search: 'Пошук за словами', clear: 'Очистити', all: 'Усі',
    active: 'Збережені', learned: 'Вивчені', refresh: 'Оновити', signout: 'Вийти',
    empty: 'Тут поки порожньо',
    emptyNote: 'Виділіть субтитр у плеєрі або будь-який текст на сторінці - слово з’явиться тут.',
    ready: 'чекають повторення', reveal: 'Показати значення', again: 'Ще раз', knew: 'Згадав',
    easy: 'Легко', nothingDue: 'Зараз повторювати нічого',
    nothingDueNote: 'Слова повертаються самі: завтра, за три дні, за тиждень.',
    done: 'На сьогодні все', context: 'Рядок, звідки взято', full: 'Весь рядок',
    variants: 'Інші значення', examples: 'Приклади', synonyms: 'Близьке за змістом',
    literal: 'Буквально', mine: 'Свій варіант', mineHint: 'Напишіть, як переклали б ви',
    save: 'Зберегти', reread: 'Перечитати рядок', archive: 'До вивчених',
    unarchive: 'Повернути до збережених', remove: 'Видалити', removeAsk: 'Видалити це слово?',
    saved: 'збережено', sources: 'джерел', learnedCount: 'вивчено',
    unlocked: 'відкрито', language: 'Мова карток',
    languageNote: 'Цією мовою пишуться нові картки. Збережене лишається як є.',
    exportAnki: 'Вивантажити для Anki', exportNote: 'Файл зі словом, значенням і реплікою, з якої воно взяте.',
    deleteAccount: 'Видалити акаунт', working: 'Секунду…',
    enter: 'Увійти через Google',
    sync: 'Синхронізація із застосунком',
  },
  nl: {
    title: 'Jouw bibliotheek', words: 'Woorden', review: 'Oefenen', goals: 'Prestaties',
    settings: 'Instellingen', search: 'Zoek in je woorden', clear: 'Wissen', all: 'Alle',
    active: 'Bewaard', learned: 'Geleerd', refresh: 'Vernieuwen', signout: 'Afmelden',
    empty: 'Hier staat nog niets',
    emptyNote: 'Selecteer een ondertitel of tekst op een pagina en het woord verschijnt hier.',
    ready: 'klaar om te oefenen', reveal: 'Toon betekenis', again: 'Opnieuw', knew: 'Wist ik',
    easy: 'Makkelijk', nothingDue: 'Nu niets te oefenen',
    nothingDueNote: 'Woorden komen vanzelf terug: morgen, over drie dagen, over een week.',
    done: 'Voor nu klaar', context: 'De zin waar het uit komt', full: 'Hele zin',
    variants: 'Andere betekenissen', examples: 'Voorbeelden', synonyms: 'Dicht bij',
    literal: 'Letterlijk', mine: 'Mijn eigen woorden', mineHint: 'Schrijf de betekenis die jij zou gebruiken',
    save: 'Bewaren', reread: 'Zin opnieuw lezen', archive: 'Naar geleerd',
    unarchive: 'Terug naar bewaard', remove: 'Verwijderen', removeAsk: 'Dit woord verwijderen?',
    saved: 'bewaard', sources: 'bronnen', learnedCount: 'geleerd',
    unlocked: 'vrijgespeeld', language: 'Taal van de kaarten',
    languageNote: 'Nieuwe kaarten komen in deze taal. Wat er staat blijft zoals het is.',
    exportAnki: 'Exporteren naar Anki', exportNote: 'Een bestand met het woord, de betekenis en de zin waar het uit komt.',
    deleteAccount: 'Account verwijderen', working: 'Momentje…',
    enter: 'Doorgaan met Google',
    sync: 'Synchroniseren met de app',
  },
  sv: {
    title: 'Ditt bibliotek', words: 'Ord', review: 'Öva', goals: 'Utmärkelser',
    settings: 'Inställningar', search: 'Sök bland dina ord', clear: 'Rensa', all: 'Alla',
    active: 'Sparade', learned: 'Inlärda', refresh: 'Uppdatera', signout: 'Logga ut',
    empty: 'Här finns inget än',
    emptyNote: 'Markera en undertext eller text på en sida - ordet dyker upp här.',
    ready: 'väntar på repetition', reveal: 'Visa betydelse', again: 'Igen', knew: 'Jag kunde det',
    easy: 'Lätt', nothingDue: 'Inget att repetera just nu',
    nothingDueNote: 'Orden kommer tillbaka av sig själva: i morgon, om tre dagar, om en vecka.',
    done: 'Klart för nu', context: 'Repliken det kom ur', full: 'Hela repliken',
    variants: 'Andra betydelser', examples: 'Exempel', synonyms: 'Nära',
    literal: 'Ordagrant', mine: 'Min egen version', mineHint: 'Skriv betydelsen du skulle använda',
    save: 'Spara', reread: 'Läs repliken igen', archive: 'Till inlärda',
    unarchive: 'Tillbaka till sparade', remove: 'Radera', removeAsk: 'Radera det här ordet?',
    saved: 'sparade', sources: 'källor', learnedCount: 'inlärda',
    unlocked: 'upplåsta', language: 'Kortens språk',
    languageNote: 'Nya kort skrivs på det här språket. Det som redan är sparat ändras inte.',
    exportAnki: 'Exportera till Anki', exportNote: 'En fil med ordet, betydelsen och repliken det kom ur.',
    deleteAccount: 'Radera konto', working: 'Ett ögonblick…',
    enter: 'Fortsätt med Google',
    sync: 'Synkronisera med appen',
  },
  fi: {
    title: 'Oma kirjasto', words: 'Sanat', review: 'Kertaus', goals: 'Saavutukset',
    settings: 'Asetukset', search: 'Hae omista sanoista', clear: 'Tyhjennä', all: 'Kaikki',
    active: 'Tallennetut', learned: 'Opitut', refresh: 'Päivitä', signout: 'Kirjaudu ulos',
    empty: 'Täällä ei ole vielä mitään',
    emptyNote: 'Maalaa tekstitys soittimessa tai mikä tahansa teksti sivulla - sana ilmestyy tänne.',
    ready: 'odottaa kertausta', reveal: 'Näytä merkitys', again: 'Uudelleen', knew: 'Muistin',
    easy: 'Helppo', nothingDue: 'Juuri nyt ei ole kerrattavaa',
    nothingDueNote: 'Sanat palaavat itsestään: huomenna, kolmen päivän päästä, viikon päästä.',
    done: 'Tältä erää valmis', context: 'Repliikki, josta se on', full: 'Koko repliikki',
    variants: 'Muut merkitykset', examples: 'Esimerkit', synonyms: 'Lähellä',
    literal: 'Kirjaimellisesti', mine: 'Oma versio', mineHint: 'Kirjoita merkitys, jota itse käyttäisit',
    save: 'Tallenna', reread: 'Lue repliikki uudelleen', archive: 'Opittuihin',
    unarchive: 'Takaisin tallennettuihin', remove: 'Poista', removeAsk: 'Poistetaanko tämä sana?',
    saved: 'tallennettu', sources: 'lähdettä', learnedCount: 'opittu',
    unlocked: 'avattu', language: 'Korttien kieli',
    languageNote: 'Uudet kortit kirjoitetaan tällä kielellä. Tallennettu pysyy ennallaan.',
    exportAnki: 'Vie Ankiin', exportNote: 'Tiedosto, jossa on sana, merkitys ja repliikki.',
    deleteAccount: 'Poista tili', working: 'Hetki…',
    enter: 'Jatka Google-tilillä',
    sync: 'Synkronoi sovelluksen kanssa',
  },
  tr: {
    title: 'Kitaplığınız', words: 'Kelimeler', review: 'Tekrar', goals: 'Başarımlar',
    settings: 'Ayarlar', search: 'Kelimelerinizde arayın', clear: 'Temizle', all: 'Tümü',
    active: 'Kayıtlı', learned: 'Öğrenildi', refresh: 'Yenile', signout: 'Çıkış',
    empty: 'Burada henüz bir şey yok',
    emptyNote: 'Oynatıcıda bir altyazıyı ya da sayfadaki metni seçin - kelime burada belirir.',
    ready: 'tekrar bekliyor', reveal: 'Anlamı göster', again: 'Tekrar', knew: 'Biliyordum',
    easy: 'Kolay', nothingDue: 'Şu an tekrar edilecek bir şey yok',
    nothingDueNote: 'Kelimeler kendiliğinden döner: yarın, üç gün sonra, bir hafta sonra.',
    done: 'Şimdilik bu kadar', context: 'Geldiği replik', full: 'Repliğin tamamı',
    variants: 'Diğer anlamlar', examples: 'Örnekler', synonyms: 'Yakın anlam',
    literal: 'Kelimesi kelimesine', mine: 'Kendi karşılığım', mineHint: 'Sizin kullanacağınız anlamı yazın',
    save: 'Kaydet', reread: 'Repliği yeniden oku', archive: 'Öğrenilenlere',
    unarchive: 'Kayıtlılara geri al', remove: 'Sil', removeAsk: 'Bu kelime silinsin mi?',
    saved: 'kayıtlı', sources: 'kaynak', learnedCount: 'öğrenildi',
    unlocked: 'açıldı', language: 'Kart dili',
    languageNote: 'Yeni kartlar bu dilde yazılır. Kayıtlı olanlar olduğu gibi kalır.',
    exportAnki: 'Anki için dışa aktar', exportNote: 'Kelimeyi, anlamını ve geldiği repliği içeren bir dosya.',
    deleteAccount: 'Hesabı sil', working: 'Bir saniye…',
    enter: 'Google ile devam et',
    sync: 'Uygulamayla eşitle',
  },
};

const GOAL_NAMES: Record<string, [string, string][]> = {
  en: [["Collector", "Words saved: {n}"], ["Channel surfer", "Different series: {n}"], ["Wide net", "Different videos: {n}"], ["Deep dive", "Episodes of one series: {n}"], ["Phrasebook", "Expressions, not single words: {n}"], ["Retired", "Words moved to learned: {n}"]],
  ru: [["Собиратель", "Сохранено слов: {n}"], ["Переключатель", "Разных сериалов: {n}"], ["Широкий невод", "Разных видео: {n}"], ["Погружение", "Серий одного сериала: {n}"], ["Разговорник", "Выражений, а не отдельных слов: {n}"], ["На покой", "Слов в выученных: {n}"]],
  et: [["Koguja", "Salvestatud sõnu: {n}"], ["Kanalivahetaja", "Eri sarju: {n}"], ["Lai võrk", "Eri videoid: {n}"], ["Sukeldumine", "Ühe sarja osi: {n}"], ["Väljendite raamat", "Väljendeid, mitte üksiksõnu: {n}"], ["Puhkusele", "Selgeks saanud sõnu: {n}"]],
  de: [["Sammler", "Gespeicherte Wörter: {n}"], ["Zapper", "Verschiedene Serien: {n}"], ["Weites Netz", "Verschiedene Videos: {n}"], ["Tieftauchen", "Folgen einer Serie: {n}"], ["Redewendungen", "Ausdrücke statt Einzelwörter: {n}"], ["In Rente", "Wörter in Gelernt: {n}"]],
  fr: [["Collectionneur", "Mots enregistrés : {n}"], ["Zappeur", "Séries différentes : {n}"], ["Grand filet", "Vidéos différentes : {n}"], ["Plongée", "Épisodes d’une série : {n}"], ["Recueil", "Expressions, pas des mots isolés : {n}"], ["À la retraite", "Mots passés en appris : {n}"]],
  es: [["Coleccionista", "Palabras guardadas: {n}"], ["Zapeador", "Series distintas: {n}"], ["Red amplia", "Vídeos distintos: {n}"], ["Inmersión", "Episodios de una serie: {n}"], ["Frasario", "Expresiones, no palabras sueltas: {n}"], ["Jubiladas", "Palabras aprendidas: {n}"]],
  it: [["Collezionista", "Parole salvate: {n}"], ["Zapping", "Serie diverse: {n}"], ["Rete larga", "Video diversi: {n}"], ["Immersione", "Episodi di una serie: {n}"], ["Frasario", "Espressioni, non parole singole: {n}"], ["In pensione", "Parole imparate: {n}"]],
  pt: [["Colecionador", "Palavras guardadas: {n}"], ["Zapping", "Séries diferentes: {n}"], ["Rede larga", "Vídeos diferentes: {n}"], ["Mergulho", "Episódios de uma série: {n}"], ["Livro de frases", "Expressões, não palavras soltas: {n}"], ["Reformadas", "Palavras aprendidas: {n}"]],
  pl: [["Zbieracz", "Zapisane słowa: {n}"], ["Pilot", "Różne seriale: {n}"], ["Szeroka sieć", "Różne filmy: {n}"], ["Zanurzenie", "Odcinki jednego serialu: {n}"], ["Rozmówki", "Wyrażenia, nie pojedyncze słowa: {n}"], ["Na emeryturze", "Słowa opanowane: {n}"]],
  uk: [["Збирач", "Збережено слів: {n}"], ["Перемикач", "Різних серіалів: {n}"], ["Широкий невід", "Різних відео: {n}"], ["Занурення", "Серій одного серіалу: {n}"], ["Розмовник", "Висловів, а не окремих слів: {n}"], ["На спочинок", "Слів у вивчених: {n}"]],
  nl: [["Verzamelaar", "Bewaarde woorden: {n}"], ["Zapper", "Verschillende series: {n}"], ["Wijd net", "Verschillende video’s: {n}"], ["Diepe duik", "Afleveringen van één serie: {n}"], ["Uitdrukkingen", "Uitdrukkingen, geen losse woorden: {n}"], ["Met pensioen", "Woorden bij geleerd: {n}"]],
  sv: [["Samlare", "Sparade ord: {n}"], ["Zappare", "Olika serier: {n}"], ["Vitt nät", "Olika videor: {n}"], ["Djupdykning", "Avsnitt av en serie: {n}"], ["Parlör", "Uttryck, inte enstaka ord: {n}"], ["Pensionerade", "Ord bland inlärda: {n}"]],
  fi: [["Kerääjä", "Tallennettuja sanoja: {n}"], ["Kanavasurffaaja", "Eri sarjoja: {n}"], ["Laaja verkko", "Eri videoita: {n}"], ["Sukellus", "Yhden sarjan jaksoja: {n}"], ["Sanontakirja", "Sanontoja, ei yksittäisiä sanoja: {n}"], ["Eläkkeelle", "Opittuja sanoja: {n}"]],
  tr: [["Koleksiyoncu", "Kaydedilen kelime: {n}"], ["Kanal gezgini", "Farklı dizi: {n}"], ["Geniş ağ", "Farklı video: {n}"], ["Derin dalış", "Bir dizinin bölümü: {n}"], ["Deyimler", "Tek kelime değil ifade: {n}"], ["Emekli", "Öğrenilen kelime: {n}"]],
};

export const libraryLanguage = (value: string) => {
  const code = String(value || '').slice(0, 2).toLowerCase();
  return SAY[code] ? code : 'en';
};

export const libraryPage = (lang: string, clientId: string) => {
  const code = libraryLanguage(lang);
  return `<!doctype html>
<html lang="${code}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subtitle Notes</title>
<script src="https://accounts.google.com/gsi/client" async></script>
<style>
  :root {
    --paper:#faf8f4; --ink:#14201c; --soft:#6b7a74; --hair:#e2ddd3;
    --accent:#1e7a4c; --wash:#e7f2ea; --red:#b4463c; --card:#ffffff;
    --lift:0 10px 26px rgb(20 50 35/.10);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper:#151b19; --ink:#eaf1ed; --soft:#93a49c; --hair:#2a3733;
      --accent:#64c795; --wash:#1d2a25; --red:#f08078; --card:#1a2320;
      --lift:0 10px 26px rgb(0 0 0/.35);
    }
  }
  * { box-sizing:border-box }
  body { margin:0; min-height:100dvh; background:var(--paper); color:var(--ink);
         font:15px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  [hidden] { display:none!important }

  header { position:sticky; top:0; z-index:3; display:flex; align-items:center; gap:14px;
           padding:12px max(20px,calc((100vw - 1120px)/2)); border-bottom:1px solid var(--hair);
           background:color-mix(in srgb,var(--paper) 92%,transparent); backdrop-filter:blur(12px) }
  .mark { display:grid; place-items:center; width:34px; height:34px; border-radius:10px;
          background:var(--accent); color:#fff; font-size:17px }
  h1 { margin:0; font-size:18px; letter-spacing:-.02em }
  .count { color:var(--soft); font-size:12.5px; font-weight:650 }
  .spacer { flex:1 }

  nav { display:flex; gap:4px; padding:0 max(20px,calc((100vw - 1120px)/2));
        border-bottom:1px solid var(--hair); background:var(--paper); position:sticky; top:59px; z-index:2 }
  nav button { position:relative; padding:11px 14px; border:0; background:transparent; color:var(--soft);
               font-weight:700; font-size:14px; cursor:pointer; transition:color .16s }
  nav button:hover { color:var(--ink) }
  nav button.on { color:var(--ink) }
  nav button.on::after { content:''; position:absolute; left:12px; right:12px; bottom:-1px;
                         height:2.5px; border-radius:2px; background:var(--accent) }

  button, input, select { font:inherit }
  .go { border:0; border-radius:10px; padding:10px 14px; color:#fff; background:var(--accent);
        font-weight:700; cursor:pointer; transition:transform .12s, filter .16s, box-shadow .16s }
  .go:hover { filter:brightness(1.07); box-shadow:var(--lift) }
  .go:active { transform:translateY(1px) scale(.985) }
  .ghost { border:0; border-radius:10px; padding:9px 12px; color:var(--soft); background:transparent;
           font-weight:700; cursor:pointer; transition:background .16s,color .16s,transform .12s }
  .ghost:hover { color:var(--ink); background:var(--wash) }
  .ghost:active { transform:translateY(1px) scale(.985) }
  .danger { color:var(--red) }

  main { width:min(1120px,100%); margin:0 auto; padding:24px 20px 56px }
  .toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:18px }
  .toolbar input { flex:1; min-width:200px; padding:10px 13px; border:1px solid var(--hair);
                   border-radius:10px; color:var(--ink); background:var(--card); outline-color:var(--accent) }
  .chips { display:flex; gap:6px }
  .chip { padding:8px 13px; border:1px solid var(--hair); border-radius:999px; background:transparent;
          color:var(--soft); font-weight:700; font-size:13.5px; cursor:pointer;
          transition:background .16s,color .16s,border-color .16s,transform .12s }
  .chip:hover { color:var(--ink); border-color:color-mix(in srgb,var(--accent) 45%,var(--hair)) }
  .chip:active { transform:scale(.97) }
  .chip.on { background:var(--wash); color:var(--accent); border-color:color-mix(in srgb,var(--accent) 55%,var(--hair)) }

  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(238px,1fr)); gap:13px }
  .card { position:relative; min-height:146px; padding:16px; border:1px solid var(--hair); border-radius:14px;
          background:var(--card); cursor:pointer; overflow:hidden;
          transition:transform .16s cubic-bezier(.2,.7,.3,1), box-shadow .16s, border-color .16s }
  .card:hover { transform:translateY(-3px); border-color:color-mix(in srgb,var(--accent) 50%,var(--hair));
                box-shadow:var(--lift) }
  .card:active { transform:translateY(-1px) scale(.988); box-shadow:none }
  /* The word lights up the way a picked subtitle does: a wash grows out from
     under it rather than a flat colour swap. */
  .word { position:relative; display:inline; font-size:19.5px; font-weight:760; letter-spacing:-.02em;
          overflow-wrap:anywhere; background-image:linear-gradient(var(--wash),var(--wash));
          background-repeat:no-repeat; background-position:0 88%; background-size:0% .62em;
          transition:background-size .28s cubic-bezier(.2,.7,.3,1) }
  .card:hover .word { background-size:100% .62em }
  .meaning { margin-top:7px; color:var(--accent); font-weight:650; overflow-wrap:anywhere }
  .source { position:absolute; left:16px; right:16px; bottom:14px; color:var(--soft); font-size:12px;
            font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
  .card .badge { position:absolute; top:14px; right:14px; width:8px; height:8px; border-radius:50%;
                 background:var(--accent); opacity:.55 }

  .empty { margin:70px auto; max-width:430px; text-align:center; color:var(--soft) }
  .empty h2 { color:var(--ink); font-size:20px; margin-bottom:6px }

  /* ---- practise ---------------------------------------------------------- */
  .study { max-width:620px; margin:0 auto }
  .bar { height:5px; border-radius:3px; background:var(--hair); overflow:hidden; margin-bottom:20px }
  .bar span { display:block; height:100%; background:var(--accent); border-radius:3px;
              transition:width .3s cubic-bezier(.2,.7,.3,1) }
  .ask { padding:34px 26px; border:1px solid var(--hair); border-radius:18px; background:var(--card);
         text-align:center; box-shadow:var(--lift) }
  .ask .prompt { font-size:30px; font-weight:780; letter-spacing:-.025em; overflow-wrap:anywhere }
  .ask .line { margin-top:10px; color:var(--soft) }
  .ask .answer { margin-top:18px; padding-top:18px; border-top:1px solid var(--hair);
                 color:var(--accent); font-size:21px; font-weight:720; overflow-wrap:anywhere;
                 animation:rise .22s ease-out }
  @keyframes rise { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
  .ask .row { display:flex; gap:9px; justify-content:center; margin-top:22px; flex-wrap:wrap }

  /* ---- achievements ------------------------------------------------------ */
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:22px }
  .stat { padding:16px; border:1px solid var(--hair); border-radius:14px; background:var(--card) }
  .stat b { display:block; font-size:26px; font-weight:800; letter-spacing:-.03em }
  .stat span { color:var(--soft); font-size:12.5px; font-weight:650 }
  .goal { display:grid; grid-template-columns:46px 1fr; gap:14px; padding:16px 0;
          border-top:1px solid var(--hair) }
  .medal { display:grid; place-items:center; width:46px; height:46px; border-radius:14px;
           background:var(--wash); color:var(--accent); font-size:20px; font-weight:800 }
  .goal.done .medal { background:var(--accent); color:#fff }
  .goal h3 { margin:0; font-size:15.5px }
  .goal p { margin:3px 0 8px; color:var(--soft); font-size:13px }
  .track { height:7px; border-radius:4px; background:var(--hair); overflow:hidden }
  .track span { display:block; height:100%; border-radius:4px; background:var(--accent);
                transition:width .5s cubic-bezier(.2,.7,.3,1) }
  .goal .tier { float:right; color:var(--soft); font-size:12px; font-weight:700 }

  /* ---- settings ---------------------------------------------------------- */
  .panel { max-width:560px; padding:20px; border:1px solid var(--hair); border-radius:14px;
           background:var(--card); margin-bottom:14px }
  .panel h3 { margin:0 0 4px; font-size:16px }
  .panel p { margin:0 0 14px; color:var(--soft); font-size:13.5px }
  .panel select { width:100%; padding:10px 12px; border:1px solid var(--hair); border-radius:10px;
                  background:var(--paper); color:var(--ink) }

  /* ---- one word ---------------------------------------------------------- */
  .detail { position:fixed; inset:0; z-index:6; display:none; place-items:center; padding:18px;
            background:rgb(0 0 0/.38); animation:fade .16s ease-out }
  @keyframes fade { from { opacity:0 } to { opacity:1 } }
  .detail.show { display:grid }
  .sheet { width:min(580px,100%); max-height:88dvh; overflow:auto; padding:24px; border-radius:18px;
           background:var(--paper); box-shadow:0 26px 70px rgb(0 0 0/.3); animation:pop .2s cubic-bezier(.2,.7,.3,1) }
  @keyframes pop { from { opacity:0; transform:translateY(10px) scale(.985) } to { opacity:1; transform:none } }
  .sheet h2 { margin:0; font-size:27px; letter-spacing:-.02em; overflow-wrap:anywhere }
  .sheet .big { margin:8px 0 4px; color:var(--accent); font-size:19px; font-weight:720; overflow-wrap:anywhere }
  .sheet section { margin-top:16px; padding-top:16px; border-top:1px solid var(--hair) }
  .sheet label { display:block; margin-bottom:5px; color:var(--soft); font-size:11.5px; font-weight:750;
                 text-transform:uppercase; letter-spacing:.07em }
  .sheet p { margin:0; white-space:pre-wrap; overflow-wrap:anywhere }
  .sheet .close { float:right; margin:-6px -6px 0 12px }
  .tags { display:flex; flex-wrap:wrap; gap:7px }
  .tag { padding:5px 11px; border-radius:999px; background:var(--wash); color:var(--accent);
         font-size:13px; font-weight:650 }
  .mine { display:flex; gap:8px; margin-top:8px }
  .mine input { flex:1; min-width:0; padding:10px 12px; border:1px solid var(--hair); border-radius:10px;
                background:var(--card); color:var(--ink); outline-color:var(--accent) }
  .acts { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; padding-top:16px; border-top:1px solid var(--hair) }
  .note { margin-top:10px; color:var(--soft); font-size:13px }

  #login { max-width:420px; margin:12dvh auto; text-align:center }
  #login h2 { font-size:27px; letter-spacing:-.03em }
  #login p { color:var(--soft) }
  #google { display:flex; justify-content:center; margin-top:20px }
</style></head><body>
<header>
  <div class="mark">▤</div>
  <div><h1>Subtitle Notes</h1><div id="count" class="count"></div></div>
  <div class="spacer"></div>
  <button id="refresh" class="ghost" hidden></button>
  <button id="signout" class="ghost" hidden></button>
</header>
<nav id="tabs" hidden></nav>
<main>
  <section id="login">
    <p id="login-sync"></p>
    <div id="google"></div>
    <p id="login-note"></p>
  </section>

  <section id="view-words" hidden>
    <div class="toolbar">
      <input id="search" type="search" autocomplete="off">
      <div class="chips" id="filters"></div>
      <button id="clear" class="ghost"></button>
    </div>
    <div id="grid" class="grid"></div>
    <div id="empty" class="empty" hidden><h2></h2><p></p></div>
  </section>

  <section id="view-review" hidden><div class="study" id="study"></div></section>
  <section id="view-goals" hidden><div class="stats" id="stats"></div><div id="goals"></div></section>
  <section id="view-settings" hidden><div id="settings"></div></section>
</main>

<div id="detail" class="detail"><article class="sheet" id="sheet"></article></div>
<script>
  var API = '/v1', KEY = 'subtitle-notes/library-token';
  var T = ${JSON.stringify(SAY[code])};
  var GOALS = ${JSON.stringify(GOAL_NAMES[code] || GOAL_NAMES.en)};
  var LANGS = ${JSON.stringify({
    ru: 'Русский', en: 'English', et: 'Eesti', de: 'Deutsch', fr: 'Français', es: 'Español',
    it: 'Italiano', pt: 'Português', pl: 'Polski', uk: 'Українська', nl: 'Nederlands',
    tr: 'Türkçe', sv: 'Svenska', fi: 'Suomi',
  })};
  var cards = [], learned = [], review = [], me = null, view = 'words', filter = 'active', open = null;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  };
  var label = function (card) {
    return card.focus_phrase || card.focus_word || card.selected_text || '';
  };
  var meaning = function (card) { return card.focus_translation || card.translation || ''; };

  var request = async function (path, method, body) {
    var token = localStorage.getItem(KEY);
    var reply = await fetch(API + path, {
      method: method || 'GET',
      headers: Object.assign({ 'content-type': 'application/json' },
        token ? { authorization: 'Bearer ' + token } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (reply.status === 204) return {};
    var data = await reply.json().catch(function () { return {}; });
    if (!reply.ok) throw new Error(data.detail || 'Could not reach the library');
    return data;
  };

  // ---- words ---------------------------------------------------------------
  function shownCards() {
    var query = $('search').value.trim().toLowerCase();
    var pool = filter === 'learned' ? learned : filter === 'all' ? cards.concat(learned) : cards;
    if (!query) return pool;
    return pool.filter(function (card) {
      return [label(card), meaning(card), card.selected_text, card.media_title]
        .some(function (value) { return String(value || '').toLowerCase().indexOf(query) >= 0; });
    });
  }

  function renderWords() {
    var shown = shownCards();
    $('count').textContent = cards.length + ' ' + T.saved +
      (learned.length ? ' · ' + learned.length + ' ' + T.learnedCount : '');
    $('grid').innerHTML = shown.map(function (card) {
      return '<article class="card" data-id="' + esc(card.id) + '">' +
        (card.archived ? '<div class="badge"></div>' : '') +
        '<div><span class="word">' + esc(label(card)) + '</span></div>' +
        '<div class="meaning">' + esc(meaning(card)) + '</div>' +
        '<div class="source">' + esc(card.media_title || 'Subtitle') + '</div></article>';
    }).join('');
    $('empty').hidden = shown.length !== 0;
    $('empty').querySelector('h2').textContent = T.empty;
    $('empty').querySelector('p').textContent = T.emptyNote;
    Array.prototype.forEach.call(document.querySelectorAll('.card'), function (node) {
      node.onclick = function () { openCard(node.dataset.id); };
    });
  }

  function renderFilters() {
    var options = [['active', T.active], ['learned', T.learned], ['all', T.all]];
    $('filters').innerHTML = options.map(function (option) {
      return '<button class="chip' + (filter === option[0] ? ' on' : '') + '" data-filter="' +
        option[0] + '">' + esc(option[1]) + '</button>';
    }).join('');
    Array.prototype.forEach.call($('filters').children, function (node) {
      node.onclick = function () { filter = node.dataset.filter; renderFilters(); renderWords(); };
    });
  }

  // ---- one word ------------------------------------------------------------
  async function openCard(id) {
    var item = await request('/selections/' + encodeURIComponent(id));
    open = item;
    drawSheet(item);
    $('detail').classList.add('show');
  }

  function part(title, value) {
    if (!value) return '';
    return '<section><label>' + esc(title) + '</label><p>' + esc(value) + '</p></section>';
  }

  function drawSheet(item) {
    var synonyms = (item.synonyms || []).filter(Boolean);
    var examples = (item.examples || []).map(function (example) {
      return example.text + (example.translation ? '\\n' + example.translation : '');
    }).join('\\n\\n');
    $('sheet').innerHTML =
      '<button class="ghost close" id="close" aria-label="Close">✕</button>' +
      '<h2>' + esc(label(item)) + '</h2>' +
      '<div class="big">' + esc(meaning(item)) + '</div>' +
      (synonyms.length ? '<section><label>' + esc(T.synonyms) + '</label><div class="tags">' +
        synonyms.map(function (word) { return '<span class="tag">' + esc(word) + '</span>'; }).join('') +
        '</div></section>' : '') +
      part(T.literal, item.sense_note) +
      part(T.context, item.selected_text === label(item) ? '' : item.selected_text) +
      part(T.full, item.translation) +
      part(T.variants, (item.variants || []).join('\\n')) +
      part(T.examples, examples) +
      '<section><label>' + esc(T.mine) + '</label>' +
        '<div class="mine"><input id="mine-text" maxlength="120" placeholder="' + esc(T.mineHint) + '">' +
        '<button class="go" id="mine-save">' + esc(T.save) + '</button></div>' +
        '<div class="note" id="mine-note"></div></section>' +
      '<div class="acts">' +
        '<button class="ghost" id="act-reread">' + esc(T.reread) + '</button>' +
        '<button class="ghost" id="act-archive">' + esc(item.archived ? T.unarchive : T.archive) + '</button>' +
        '<button class="ghost danger" id="act-delete">' + esc(T.remove) + '</button>' +
      '</div>';

    $('close').onclick = closeSheet;
    $('mine-save').onclick = async function () {
      var text = $('mine-text').value.trim();
      if (!text) return;
      $('mine-note').textContent = T.working;
      try {
        var updated = await request('/selections/' + encodeURIComponent(item.id) + '/suggest', 'POST', { text: text });
        replaceCard(updated);
        open = updated;
        drawSheet(updated);
        $('mine-note').textContent = updated.votes >= updated.quorum
          ? '✓ ' + updated.votes + '/' + updated.quorum
          : '✓ ' + updated.votes + '/' + updated.quorum;
      } catch (error) { $('mine-note').textContent = error.message; }
    };
    $('act-reread').onclick = async function () {
      $('mine-note').textContent = T.working;
      try {
        var fresh = await request('/selections/' + encodeURIComponent(item.id) + '/reenrich', 'POST', {});
        replaceCard(fresh);
        open = fresh;
        drawSheet(fresh);
      } catch (error) { $('mine-note').textContent = error.message; }
    };
    $('act-archive').onclick = async function () {
      await request('/selections/' + encodeURIComponent(item.id) + '/archive', 'PATCH', { archived: !item.archived });
      closeSheet();
      await load();
    };
    $('act-delete').onclick = async function () {
      if (!confirm(T.removeAsk)) return;
      await request('/selections/' + encodeURIComponent(item.id), 'DELETE');
      closeSheet();
      await load();
    };
  }

  function replaceCard(updated) {
    [cards, learned].forEach(function (list) {
      var at = list.findIndex(function (card) { return card.id === updated.id; });
      if (at >= 0) list[at] = Object.assign({}, list[at], updated);
    });
    renderWords();
  }

  function closeSheet() { $('detail').classList.remove('show'); open = null; }

  // ---- practise ------------------------------------------------------------
  var revealed = false, session = 0;

  function renderReview() {
    var item = review[0];
    if (!item) {
      $('study').innerHTML = '<div class="empty"><h2>' + esc(session ? T.done : T.nothingDue) +
        '</h2><p>' + esc(T.nothingDueNote) + '</p></div>';
      return;
    }
    var total = review.length + session;
    $('study').innerHTML =
      '<div class="bar"><span style="width:' + Math.round((session / total) * 100) + '%"></span></div>' +
      '<div class="ask">' +
        '<div class="prompt">' + esc(label(item)) + '</div>' +
        (item.selected_text && item.selected_text !== label(item)
          ? '<div class="line">' + esc(item.selected_text) + '</div>' : '') +
        (revealed ? '<div class="answer">' + esc(meaning(item)) + '</div>' : '') +
        '<div class="row">' + (revealed
          ? '<button class="ghost" data-result="again">' + esc(T.again) + '</button>' +
            '<button class="go" data-result="good">' + esc(T.knew) + '</button>' +
            '<button class="ghost" data-result="easy">' + esc(T.easy) + '</button>'
          : '<button class="go" id="reveal">' + esc(T.reveal) + '</button>') +
        '</div>' +
      '</div>';
    if (!revealed) {
      $('reveal').onclick = function () { revealed = true; renderReview(); };
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-result]'), function (node) {
      node.onclick = function () { mark(item.id, node.dataset.result); };
    });
  }

  async function mark(id, result) {
    await request('/selections/' + encodeURIComponent(id) + '/review', 'POST', { result: result });
    review.shift();
    revealed = false;
    session += 1;
    renderReview();
    renderTabs();
  }

  // ---- achievements --------------------------------------------------------
  // The same six the app counts, with the same tiers: one library, one score.
  function achievements() {
    var all = cards.concat(learned);
    var sources = {}, series = {}, episodes = {}, phrases = 0;
    all.forEach(function (card) {
      var title = card.media_title || 'Subtitle';
      sources[title] = true;
      if (card.season != null || card.episode != null) {
        series[title] = true;
        (episodes[title] = episodes[title] || {})[(card.season || '-') + 'x' + (card.episode || '-')] = true;
      }
      if (label(card).trim().indexOf(' ') > 0) phrases += 1;
    });
    var longest = Object.keys(episodes).reduce(function (best, title) {
      var count = Object.keys(episodes[title]).length;
      return count > best ? count : best;
    }, 0);

    var named = function (index, target) {
      return String(GOALS[index][1]).replace('{n}', target);
    };
    return [
      { title:GOALS[0][0], mark:'✦', tiers:[1,10,25,50,100,250], value:all.length,
        goal:function (target) { return named(0, target); } },
      { title:GOALS[1][0], mark:'▶', tiers:[1,3,5,10,20], value:Object.keys(series).length,
        goal:function (target) { return named(1, target); } },
      { title:GOALS[2][0], mark:'◼', tiers:[2,5,10,25], value:Object.keys(sources).length,
        goal:function (target) { return named(2, target); } },
      { title:GOALS[3][0], mark:'⇊', tiers:[3,10,25], value:longest,
        goal:function (target) { return named(3, target); } },
      { title:GOALS[4][0], mark:'❝', tiers:[5,15,40], value:phrases,
        goal:function (target) { return named(4, target); } },
      { title:GOALS[5][0], mark:'★', tiers:[1,10,30,75], value:learned.length,
        goal:function (target) { return named(5, target); } },
    ].map(function (item) {
      var level = item.tiers.filter(function (tier) { return item.value >= tier; }).length;
      var complete = level === item.tiers.length;
      var target = complete ? item.tiers[item.tiers.length - 1] : item.tiers[level];
      var floor = level === 0 ? 0 : item.tiers[level - 1];
      var span = Math.max(1, target - floor);
      return Object.assign({}, item, {
        level: level, complete: complete, target: target,
        progress: complete ? 1 : Math.min(1, Math.max(0, (item.value - floor) / span)),
      });
    });
  }

  function renderGoals() {
    var list = achievements();
    var unlocked = list.reduce(function (sum, item) { return sum + item.level; }, 0);
    var sources = {};
    cards.concat(learned).forEach(function (card) { sources[card.media_title || 'Subtitle'] = true; });
    $('stats').innerHTML =
      '<div class="stat"><b>' + cards.length + '</b><span>' + esc(T.saved) + '</span></div>' +
      '<div class="stat"><b>' + Object.keys(sources).length + '</b><span>' + esc(T.sources) + '</span></div>' +
      '<div class="stat"><b>' + learned.length + '</b><span>' + esc(T.learnedCount) + '</span></div>';
    $('goals').innerHTML = '<p class="count" style="margin:0 0 6px">' + unlocked + ' ' + esc(T.unlocked) + '</p>' +
      list.map(function (item) {
        return '<div class="goal' + (item.complete ? ' done' : '') + '">' +
          '<div class="medal">' + item.mark + '</div>' +
          '<div><span class="tier">' + item.value + '/' + item.target + '</span>' +
          '<h3>' + esc(item.title) + '</h3>' +
          '<p>' + esc(item.goal(item.target)) + '</p>' +
          '<div class="track"><span style="width:' + Math.round(item.progress * 100) + '%"></span></div>' +
          '</div></div>';
      }).join('');
  }

  // ---- settings ------------------------------------------------------------
  function renderSettings() {
    var current = (me && me.language) || 'ru';
    $('settings').innerHTML =
      '<div class="panel"><h3>' + esc(T.language) + '</h3><p>' + esc(T.languageNote) + '</p>' +
        '<select id="lang">' + Object.keys(LANGS).map(function (code) {
          return '<option value="' + code + '"' + (code === current ? ' selected' : '') + '>' +
            esc(LANGS[code]) + '</option>';
        }).join('') + '</select><div class="note" id="lang-note"></div></div>' +
      '<div class="panel"><h3>' + esc(T.exportAnki) + '</h3><p>' + esc(T.exportNote) + '</p>' +
        '<button class="go" id="anki">' + esc(T.exportAnki) + '</button></div>' +
      '<div class="panel"><h3>' + esc(T.deleteAccount) + '</h3>' +
        '<p>' + esc(me ? me.email : '') + '</p>' +
        '<button class="ghost danger" id="wipe">' + esc(T.deleteAccount) + '</button></div>';

    $('lang').onchange = async function () {
      $('lang-note').textContent = T.working;
      try {
        me = await request('/me', 'PATCH', { language: $('lang').value });
        $('lang-note').textContent = '✓';
      } catch (error) { $('lang-note').textContent = error.message; }
    };
    $('anki').onclick = async function () {
      var token = localStorage.getItem(KEY);
      var reply = await fetch(API + '/export/anki', { headers: { authorization: 'Bearer ' + token } });
      var blob = await reply.blob();
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'subtitle-notes.txt';
      link.click();
      URL.revokeObjectURL(link.href);
    };
    $('wipe').onclick = async function () {
      if (!confirm(T.deleteAccount + '?')) return;
      await request('/me', 'DELETE');
      localStorage.removeItem(KEY);
      location.reload();
    };
  }

  // ---- frame ---------------------------------------------------------------
  function renderTabs() {
    var tabs = [['words', T.words], ['review', T.review + (review.length ? ' · ' + review.length : '')],
                ['goals', T.goals], ['settings', T.settings]];
    $('tabs').innerHTML = tabs.map(function (tab) {
      return '<button data-view="' + tab[0] + '"' + (view === tab[0] ? ' class="on"' : '') + '>' +
        esc(tab[1]) + '</button>';
    }).join('');
    Array.prototype.forEach.call($('tabs').children, function (node) {
      node.onclick = function () { show(node.dataset.view); };
    });
  }

  function show(next) {
    view = next;
    ['words', 'review', 'goals', 'settings'].forEach(function (name) {
      $('view-' + name).hidden = name !== next;
    });
    renderTabs();
    if (next === 'words') renderWords();
    if (next === 'review') renderReview();
    if (next === 'goals') renderGoals();
    if (next === 'settings') renderSettings();
  }

  async function load() {
    try {
      var answers = await Promise.all([
        request('/selections'), request('/selections?archived=true'), request('/review'), request('/me'),
      ]);
      cards = answers[0]; learned = answers[1]; review = answers[2]; me = answers[3];
      $('login').hidden = true;
      $('tabs').hidden = false;
      $('refresh').hidden = false;
      $('signout').hidden = false;
      show(view);
    } catch (error) {
      localStorage.removeItem(KEY);
      $('login').hidden = false;
      $('tabs').hidden = true;
      ['words', 'review', 'goals', 'settings'].forEach(function (name) { $('view-' + name).hidden = true; });
      $('login-note').textContent = error.message === 'Unauthorized' ? '' : error.message;
    }
  }

  async function signedIn(accessToken) {
    $('login-note').textContent = T.working;
    try {
      var data = await request('/auth/google-access', 'POST', { access_token: accessToken });
      localStorage.setItem(KEY, data.token);
      await load();
    } catch (error) { $('login-note').textContent = error.message; }
  }

  window.addEventListener('load', function () {
    $('refresh').textContent = T.refresh;
    $('signout').textContent = T.signout;
    $('clear').textContent = T.clear;
    $('login-sync').textContent = T.sync;
    $('search').placeholder = T.search;
    renderFilters();

    // The extension hands the token over in the fragment, so nobody has to sign
    // in twice for the same account. It never reaches the server.
    var handover = location.hash.match(/[#&]t=([^&]+)/);
    if (handover) {
      localStorage.setItem(KEY, decodeURIComponent(handover[1]));
      history.replaceState(null, '', location.pathname + location.search);
    }

    // Coming back from Google with a token in the fragment.
    var back = location.hash.match(/access_token=([^&]+)/);
    var state = location.hash.match(/state=([^&]+)/);
    if (back && state && state[1] === sessionStorage.getItem('sn-state')) {
      var search = sessionStorage.getItem('sn-search') || '';
      var wanted = (search.match(/lang=([A-Za-z_-]+)/) || [])[1];
      if (wanted && wanted.slice(0, 2).toLowerCase() !== document.documentElement.lang) {
        // Rendered in the browser's language, not the one asked for: load it
        // again with the token still in hand. What is remembered stays put -
        // the second pass has to recognise this same trip.
        location.replace(location.pathname + search + location.hash);
        return;
      }
      sessionStorage.removeItem('sn-state');
      sessionStorage.removeItem('sn-search');
      history.replaceState(null, '', location.pathname + search);
      signedIn(decodeURIComponent(back[1]));
      return;
    }

    $('search').oninput = function () {
      $('clear').hidden = !$('search').value;
      renderWords();
    };
    $('clear').hidden = true;
    $('clear').onclick = function () {
      $('search').value = '';
      $('clear').hidden = true;
      renderWords();
    };
    $('refresh').onclick = load;
    $('signout').onclick = function () { localStorage.removeItem(KEY); load(); };
    $('detail').onclick = function (event) { if (event.target === $('detail')) closeSheet(); };
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeSheet();
      if (view === 'review' && !$('view-review').hidden && event.key === ' ' && !revealed) {
        event.preventDefault();
        revealed = true;
        renderReview();
      }
    });

    if (localStorage.getItem(KEY)) { load(); return; }
    $('google').innerHTML = '<button class="go" id="enter" style="padding:12px 22px;font-size:15px">' +
      esc(T.enter) + '</button>';
    $('enter').onclick = function () {
      // Straight to Google and back. A popup can be blocked and the rendered
      // Google button needs FedCM, which a browser may have switched off; a
      // redirect always works.
      var state = Math.random().toString(36).slice(2);
      sessionStorage.setItem('sn-state', state);
      sessionStorage.setItem('sn-search', location.search);
      location.href = 'https://accounts.google.com/o/oauth2/v2/auth' +
        '?client_id=' + encodeURIComponent(${JSON.stringify(clientId)}) +
        '&redirect_uri=' + encodeURIComponent(location.origin + '/library') +
        '&response_type=token&scope=' + encodeURIComponent('openid email profile') +
        '&include_granted_scopes=true&prompt=select_account&state=' + state;
    };
  });
</script></body></html>`;
};
