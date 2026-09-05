/// The front door, in the language the reader's browser asks for.
///
/// The first version of this page was English with a Russian answer in the
/// example - which explains nothing to a Russian reader, who cannot read the
/// question, and nothing to anybody else, who cannot read the answer. The
/// whole argument for the thing existing is that one example, so it is the one
/// piece that has to be in the reader's own language.
///
/// The example is always a foreign line read in the reader's own language,
/// because that is the only shape in which it demonstrates anything. For most
/// readers the foreign line is English, which is what they are learning. For
/// an English reader it is French: an English line answered in English shows
/// no translation happening at all. Both the line and the word picked out of
/// it are per-language strings, so a fifth example is an entry, not a change
/// to the page.

type Strings = Record<string, string>;

const HOME_TEXT: Record<string, Strings> = {
  en: {
    line: 'Il n\'est pas dans son assiette.', mark: 'assiette',
    title: 'Subtitle Notes - translated by the line, not by the word',
    h1: 'Translated by the line, not by the word',
    lede: 'Highlight an unfamiliar word in subtitles, on a page or in a PDF. It is translated the way it sounds in that sentence, and it stays in your library.',
    dict: 'A dictionary', ours: 'Subtitle Notes',
    wrong: 'He is not in his plate.',
    right: 'He is not feeling well.',
    note: 'The whole line is read, so the word gets the sense it has in it - not the first entry in a dictionary.',
    whereTitle: 'Where it works',
    browserT: 'In the browser', browserB: 'Subtitles in web players, any text on a page, and PDFs. Hold the key, drag across the words, let go - the answer appears beside them.',
    phoneT: 'On the phone', phoneB: 'Your words: search, revision on a schedule, and the sentence each one came from.',
    pcT: 'On the computer', pcB: 'Subtitles in VLC while the film runs, and selected text in any program - a reader, mail, a PDF.',
    doesTitle: 'What it does with a word',
    keepT: 'Keeps the line', keepB: 'The sentence, the film and the episode are saved with the word, so a week later you still know what it was about.',
    oneT: 'One library', oneB: 'Sign in with Google once. A word saved in the browser is already on your phone.',
    backT: 'Brings it back', backB: 'First after a day, then after three, then after a week. What you forget comes back more often.',
    sayT: 'Lets you disagree', sayB: 'Disagree with the answer? Write your own on the card. If enough people write the same one, it becomes the answer everybody gets.',
    linkBrowser: 'Add to Chrome',
    linkPhone: 'Download for Android',
    linkPc: 'Download for Windows',
    ctaLib: 'Open your library', ctaWin: 'Download for Windows',
    alpha: 'The extension is in the Chrome Web Store. The Android app installs from a file for now, and the Windows installer is not signed yet, so both ask once whether you meant it.',
    fPrivacy: 'Privacy', fDelete: 'Delete your account', fLibrary: 'Library', fSource: 'Source and releases',
    fTag: 'Subtitle Notes - a place to keep the words you looked up.', langLabel: 'Language',
  },
  ru: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - перевод по смыслу, а не по словарю',
    h1: 'Перевод по смыслу, а не по словарю',
    lede: 'Выделите незнакомое слово в субтитрах, на странице или в PDF. Оно переведётся так, как звучит в этой фразе, и останется в вашей библиотеке.',
    dict: 'Словарь', ours: 'Subtitle Notes',
    wrong: 'никто не хочет рекорд',
    right: 'никому не нужна судимость',
    note: 'Читается вся строка, поэтому слово получает тот смысл, который у него в ней, а не первую статью из словаря.',
    whereTitle: 'Где это работает',
    browserT: 'В браузере', browserB: 'Субтитры в веб-плеерах, любой текст на странице и PDF. Зажмите клавишу, проведите по словам, отпустите - ответ появится рядом.',
    phoneT: 'На телефоне', phoneB: 'Ваши слова: поиск, повторение по расписанию и фраза, из которой взято каждое.',
    pcT: 'На компьютере', pcB: 'Субтитры в VLC прямо во время фильма и выделенный текст в любой программе - читалке, почте, PDF.',
    doesTitle: 'Что происходит со словом',
    keepT: 'Сохраняет строку', keepB: 'Вместе со словом сохраняется фраза, фильм и серия - через неделю понятно, о чём шла речь.',
    oneT: 'Одна библиотека', oneB: 'Один вход через Google. Слово, сохранённое в браузере, уже на телефоне.',
    backT: 'Возвращает слово', backB: 'Сначала через день, потом через три, потом через неделю. Что забывается - показывается чаще.',
    sayT: 'Позволяет спорить', sayB: 'Не согласны с ответом? Напишите свой прямо на карточке. Если так же напишут другие, он станет общим.',
    linkBrowser: 'Установить в браузер',
    linkPhone: 'Скачать для Android',
    linkPc: 'Скачать для Windows',
    ctaLib: 'Открыть библиотеку', ctaWin: 'Скачать для Windows',
    alpha: 'Расширение уже в Chrome Web Store. Приложение для Android пока ставится файлом, а установщик Windows не подписан - оба один раз переспросят, точно ли вы этого хотели.',
    fPrivacy: 'Конфиденциальность', fDelete: 'Удалить аккаунт', fLibrary: 'Библиотека', fSource: 'Исходники и выпуски',
    fTag: 'Subtitle Notes - место, где остаются слова, которые вы посмотрели.', langLabel: 'Язык',
  },
  et: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - tõlge lause järgi, mitte sõna järgi',
    h1: 'Tõlge lause järgi, mitte sõna järgi',
    lede: 'Vali tundmatu sõna subtiitrist, lehelt või PDF-ist. See tõlgitakse nii, nagu see selles lauses kõlab, ja jääb sinu kogusse.',
    dict: 'Sõnaraamat', ours: 'Subtitle Notes',
    wrong: 'keegi ei taha rekordit',
    right: 'kellelgi pole vaja karistusregistri kannet',
    note: 'Loetakse kogu lauset, nii et sõna saab selle tähenduse, mis tal seal on, mitte sõnaraamatu esimest kirjet.',
    whereTitle: 'Kus see töötab',
    browserT: 'Brauseris', browserB: 'Subtiitrid veebipleierites, iga tekst lehel ja PDF-id. Hoia klahvi, tõmba üle sõnade, lase lahti - vastus ilmub kõrvale.',
    phoneT: 'Telefonis', phoneB: 'Sinu sõnad: otsing, kordamine ajakava järgi ja lause, kust iga sõna pärineb.',
    pcT: 'Arvutis', pcB: 'Subtiitrid VLC-s filmi ajal ja valitud tekst ükskõik millises programmis - lugeris, e-kirjas, PDF-is.',
    doesTitle: 'Mida sõnaga tehakse',
    keepT: 'Hoiab lauset alles', keepB: 'Sõna juurde salvestatakse lause, film ja osa - nädala pärast tead ikka, millest jutt käis.',
    oneT: 'Üks kogu', oneB: 'Üks Google\'i sisselogimine. Brauseris salvestatud sõna on juba telefonis.',
    backT: 'Toob sõna tagasi', backB: 'Kõigepealt päeva pärast, siis kolme, siis nädala pärast. Mis ununeb, seda näidatakse sagedamini.',
    sayT: 'Lubab vaielda', sayB: 'Ei nõustu vastusega? Kirjuta kaardile oma. Kui piisavalt inimesi kirjutab sama, saab sellest kõigi vastus.',
    linkBrowser: 'Lisa brauserisse',
    linkPhone: 'Laadi alla Androidile',
    linkPc: 'Laadi alla Windowsile',
    ctaLib: 'Ava oma kogu', ctaWin: 'Laadi alla Windowsile',
    alpha: 'Laiendus on Chrome Web Store\'is. Androidi rakendus paigaldub praegu failist ja Windowsi installer pole allkirjastatud - mõlemad küsivad korra üle, kas sa ikka tahad.',
    fPrivacy: 'Privaatsus', fDelete: 'Kustuta konto', fLibrary: 'Kogu', fSource: 'Lähtekood ja väljalasked',
    fTag: 'Subtitle Notes - koht, kuhu jäävad sõnad, mille sa üles otsisid.', langLabel: 'Keel',
  },
  de: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - übersetzt nach dem Satz, nicht nach dem Wort',
    h1: 'Übersetzt nach dem Satz, nicht nach dem Wort',
    lede: 'Markieren Sie ein unbekanntes Wort im Untertitel, auf einer Seite oder in einem PDF. Es wird so übersetzt, wie es in diesem Satz gemeint ist, und bleibt in Ihrer Sammlung.',
    dict: 'Ein Wörterbuch', ours: 'Subtitle Notes',
    wrong: 'niemand will einen Rekord',
    right: 'niemand will eine Vorstrafe',
    note: 'Die ganze Zeile wird gelesen, also bekommt das Wort die Bedeutung, die es darin hat - nicht den ersten Eintrag im Wörterbuch.',
    whereTitle: 'Wo es funktioniert',
    browserT: 'Im Browser', browserB: 'Untertitel in Webplayern, jeder Text auf einer Seite und PDFs. Taste halten, über die Wörter ziehen, loslassen - die Antwort erscheint daneben.',
    phoneT: 'Auf dem Telefon', phoneB: 'Ihre Wörter: Suche, Wiederholung nach Plan und der Satz, aus dem jedes stammt.',
    pcT: 'Auf dem Computer', pcB: 'Untertitel in VLC während der Film läuft, und markierter Text in jedem Programm - Lese-App, Mail, PDF.',
    doesTitle: 'Was mit einem Wort geschieht',
    keepT: 'Behält die Zeile', keepB: 'Satz, Film und Folge werden mit dem Wort gespeichert - eine Woche später wissen Sie noch, worum es ging.',
    oneT: 'Eine Sammlung', oneB: 'Einmal mit Google anmelden. Ein im Browser gespeichertes Wort ist schon auf dem Telefon.',
    backT: 'Bringt es zurück', backB: 'Zuerst nach einem Tag, dann nach drei, dann nach einer Woche. Was Sie vergessen, kommt häufiger.',
    sayT: 'Lässt Sie widersprechen', sayB: 'Mit der Antwort nicht einverstanden? Schreiben Sie Ihre eigene auf die Karte. Schreiben genug Leute dieselbe, wird sie die Antwort für alle.',
    linkBrowser: 'Zu Chrome hinzufügen',
    linkPhone: 'Für Android herunterladen',
    linkPc: 'Für Windows herunterladen',
    ctaLib: 'Sammlung öffnen', ctaWin: 'Für Windows herunterladen',
    alpha: 'Die Erweiterung ist im Chrome Web Store. Die Android-App wird vorerst aus einer Datei installiert und das Windows-Installationsprogramm ist noch nicht signiert - beide fragen einmal nach.',
    fPrivacy: 'Datenschutz', fDelete: 'Konto löschen', fLibrary: 'Sammlung', fSource: 'Quellcode und Releases',
    fTag: 'Subtitle Notes - ein Ort für die Wörter, die Sie nachgeschlagen haben.', langLabel: 'Sprache',
  },
  fr: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - traduit d\'après la phrase, pas d\'après le mot',
    h1: 'Traduit d\'après la phrase, pas d\'après le mot',
    lede: 'Sélectionnez un mot inconnu dans un sous-titre, sur une page ou dans un PDF. Il est traduit tel qu\'il sonne dans cette phrase, et il reste dans votre bibliothèque.',
    dict: 'Un dictionnaire', ours: 'Subtitle Notes',
    wrong: 'personne ne veut un record',
    right: 'personne ne veut de casier judiciaire',
    note: 'La phrase entière est lue, donc le mot reçoit le sens qu\'il a dedans - pas la première entrée du dictionnaire.',
    whereTitle: 'Où cela fonctionne',
    browserT: 'Dans le navigateur', browserB: 'Sous-titres des lecteurs web, n\'importe quel texte d\'une page, et les PDF. Maintenez la touche, glissez sur les mots, relâchez : la réponse apparaît à côté.',
    phoneT: 'Sur le téléphone', phoneB: 'Vos mots : recherche, révision programmée et la phrase dont chacun vient.',
    pcT: 'Sur l\'ordinateur', pcB: 'Les sous-titres dans VLC pendant le film, et le texte sélectionné dans n\'importe quel programme - liseuse, messagerie, PDF.',
    doesTitle: 'Ce qui arrive à un mot',
    keepT: 'Garde la réplique', keepB: 'La phrase, le film et l\'épisode sont gardés avec le mot : une semaine plus tard vous savez encore de quoi il s\'agissait.',
    oneT: 'Une seule bibliothèque', oneB: 'Une connexion Google. Un mot gardé dans le navigateur est déjà sur le téléphone.',
    backT: 'Le fait revenir', backB: 'D\'abord après un jour, puis trois, puis une semaine. Ce que vous oubliez revient plus souvent.',
    sayT: 'Vous laisse contredire', sayB: 'Pas d\'accord avec la réponse ? Écrivez la vôtre sur la fiche. Si assez de gens écrivent la même, elle devient la réponse de tout le monde.',
    linkBrowser: 'Ajouter à Chrome',
    linkPhone: 'Télécharger pour Android',
    linkPc: 'Télécharger pour Windows',
    ctaLib: 'Ouvrir la bibliothèque', ctaWin: 'Télécharger pour Windows',
    alpha: 'L\'extension est dans le Chrome Web Store. L\'application Android s\'installe pour l\'instant depuis un fichier et l\'installateur Windows n\'est pas signé : les deux demandent une confirmation.',
    fPrivacy: 'Confidentialité', fDelete: 'Supprimer le compte', fLibrary: 'Bibliothèque', fSource: 'Sources et versions',
    fTag: 'Subtitle Notes - un endroit pour les mots que vous avez cherchés.', langLabel: 'Langue',
  },
  es: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - traducido por la frase, no por la palabra',
    h1: 'Traducido por la frase, no por la palabra',
    lede: 'Selecciona una palabra desconocida en un subtítulo, en una página o en un PDF. Se traduce como suena en esa frase y se queda en tu biblioteca.',
    dict: 'Un diccionario', ours: 'Subtitle Notes',
    wrong: 'nadie quiere un récord',
    right: 'nadie quiere antecedentes penales',
    note: 'Se lee la frase entera, así que la palabra recibe el sentido que tiene en ella, no la primera entrada del diccionario.',
    whereTitle: 'Dónde funciona',
    browserT: 'En el navegador', browserB: 'Subtítulos en reproductores web, cualquier texto de una página y PDF. Mantén la tecla, arrastra sobre las palabras, suelta: la respuesta aparece al lado.',
    phoneT: 'En el teléfono', phoneB: 'Tus palabras: búsqueda, repaso programado y la frase de la que salió cada una.',
    pcT: 'En el ordenador', pcB: 'Subtítulos en VLC mientras corre la película, y texto seleccionado en cualquier programa: un lector, el correo, un PDF.',
    doesTitle: 'Qué le pasa a una palabra',
    keepT: 'Guarda la frase', keepB: 'La frase, la película y el episodio se guardan con la palabra: una semana después todavía sabes de qué iba.',
    oneT: 'Una sola biblioteca', oneB: 'Un inicio de sesión con Google. Una palabra guardada en el navegador ya está en el teléfono.',
    backT: 'La trae de vuelta', backB: 'Primero al día siguiente, luego a los tres, luego a la semana. Lo que se olvida aparece más a menudo.',
    sayT: 'Te deja discrepar', sayB: '¿No estás de acuerdo con la respuesta? Escribe la tuya en la ficha. Si bastante gente escribe la misma, se convierte en la de todos.',
    linkBrowser: 'Añadir a Chrome',
    linkPhone: 'Descargar para Android',
    linkPc: 'Descargar para Windows',
    ctaLib: 'Abrir la biblioteca', ctaWin: 'Descargar para Windows',
    alpha: 'La extensión está en la Chrome Web Store. La aplicación de Android se instala de momento desde un archivo y el instalador de Windows aún no está firmado: los dos preguntan una vez.',
    fPrivacy: 'Privacidad', fDelete: 'Eliminar la cuenta', fLibrary: 'Biblioteca', fSource: 'Código y versiones',
    fTag: 'Subtitle Notes - un sitio donde se quedan las palabras que buscaste.', langLabel: 'Idioma',
  },
  it: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - tradotto dalla frase, non dalla parola',
    h1: 'Tradotto dalla frase, non dalla parola',
    lede: 'Seleziona una parola sconosciuta in un sottotitolo, su una pagina o in un PDF. Viene tradotta come suona in quella frase e resta nella tua raccolta.',
    dict: 'Un dizionario', ours: 'Subtitle Notes',
    wrong: 'nessuno vuole un record',
    right: 'nessuno vuole precedenti penali',
    note: 'Viene letta tutta la frase, così la parola prende il senso che ha lì dentro, non la prima voce del dizionario.',
    whereTitle: 'Dove funziona',
    browserT: 'Nel browser', browserB: 'Sottotitoli nei player web, qualsiasi testo su una pagina e i PDF. Tieni premuto il tasto, trascina sulle parole, lascia: la risposta compare accanto.',
    phoneT: 'Sul telefono', phoneB: 'Le tue parole: ricerca, ripasso programmato e la frase da cui viene ciascuna.',
    pcT: 'Sul computer', pcB: 'Sottotitoli in VLC mentre il film va, e testo selezionato in qualunque programma: un lettore, la posta, un PDF.',
    doesTitle: 'Che cosa succede a una parola',
    keepT: 'Tiene la battuta', keepB: 'La frase, il film e l\'episodio restano con la parola: una settimana dopo sai ancora di che si trattava.',
    oneT: 'Una sola raccolta', oneB: 'Un accesso con Google. Una parola salvata nel browser è già sul telefono.',
    backT: 'La riporta indietro', backB: 'Prima dopo un giorno, poi dopo tre, poi dopo una settimana. Quello che dimentichi torna più spesso.',
    sayT: 'Ti lascia dissentire', sayB: 'Non sei d\'accordo con la risposta? Scrivi la tua sulla scheda. Se abbastanza persone scrivono la stessa, diventa quella di tutti.',
    linkBrowser: 'Aggiungi a Chrome',
    linkPhone: 'Scarica per Android',
    linkPc: 'Scarica per Windows',
    ctaLib: 'Apri la raccolta', ctaWin: 'Scarica per Windows',
    alpha: 'L\'estensione è nel Chrome Web Store. L\'app Android per ora si installa da un file e l\'installer per Windows non è firmato: entrambi chiedono conferma una volta.',
    fPrivacy: 'Privacy', fDelete: 'Elimina l\'account', fLibrary: 'Raccolta', fSource: 'Sorgenti e versioni',
    fTag: 'Subtitle Notes - un posto per le parole che hai cercato.', langLabel: 'Lingua',
  },
  pt: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - traduzido pela frase, não pela palavra',
    h1: 'Traduzido pela frase, não pela palavra',
    lede: 'Selecione uma palavra desconhecida numa legenda, numa página ou num PDF. É traduzida como soa naquela frase e fica na sua biblioteca.',
    dict: 'Um dicionário', ours: 'Subtitle Notes',
    wrong: 'ninguém quer um recorde',
    right: 'ninguém quer registo criminal',
    note: 'Lê-se a frase inteira, por isso a palavra recebe o sentido que tem nela, não a primeira entrada do dicionário.',
    whereTitle: 'Onde funciona',
    browserT: 'No navegador', browserB: 'Legendas em leitores web, qualquer texto numa página e PDF. Segure a tecla, arraste sobre as palavras, largue: a resposta aparece ao lado.',
    phoneT: 'No telemóvel', phoneB: 'As suas palavras: pesquisa, revisão com horário e a frase de onde veio cada uma.',
    pcT: 'No computador', pcB: 'Legendas no VLC durante o filme, e texto selecionado em qualquer programa: um leitor, o correio, um PDF.',
    doesTitle: 'O que acontece a uma palavra',
    keepT: 'Guarda a fala', keepB: 'A frase, o filme e o episódio ficam com a palavra: uma semana depois ainda sabe do que se tratava.',
    oneT: 'Uma só biblioteca', oneB: 'Uma entrada com o Google. Uma palavra guardada no navegador já está no telemóvel.',
    backT: 'Traz de volta', backB: 'Primeiro ao fim de um dia, depois de três, depois de uma semana. O que se esquece aparece mais vezes.',
    sayT: 'Deixa discordar', sayB: 'Não concorda com a resposta? Escreva a sua no cartão. Se gente suficiente escrever a mesma, passa a ser a de todos.',
    linkBrowser: 'Adicionar ao Chrome',
    linkPhone: 'Transferir para Android',
    linkPc: 'Transferir para Windows',
    ctaLib: 'Abrir a biblioteca', ctaWin: 'Transferir para Windows',
    alpha: 'A extensão está na Chrome Web Store. A aplicação Android instala-se por agora a partir de um ficheiro e o instalador do Windows não está assinado: ambos perguntam uma vez.',
    fPrivacy: 'Privacidade', fDelete: 'Apagar a conta', fLibrary: 'Biblioteca', fSource: 'Código e versões',
    fTag: 'Subtitle Notes - um sítio para as palavras que foi procurar.', langLabel: 'Idioma',
  },
  pl: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - tłumaczenie według zdania, nie według słowa',
    h1: 'Tłumaczenie według zdania, nie według słowa',
    lede: 'Zaznacz nieznane słowo w napisach, na stronie albo w PDF-ie. Zostanie przetłumaczone tak, jak brzmi w tym zdaniu, i zostanie w twojej bibliotece.',
    dict: 'Słownik', ours: 'Subtitle Notes',
    wrong: 'nikt nie chce rekordu',
    right: 'nikt nie chce kartoteki karnej',
    note: 'Czytane jest całe zdanie, więc słowo dostaje sens, który w nim ma, a nie pierwsze hasło ze słownika.',
    whereTitle: 'Gdzie to działa',
    browserT: 'W przeglądarce', browserB: 'Napisy w odtwarzaczach webowych, dowolny tekst na stronie i PDF-y. Przytrzymaj klawisz, przeciągnij po słowach, puść - odpowiedź pojawi się obok.',
    phoneT: 'W telefonie', phoneB: 'Twoje słowa: wyszukiwanie, powtórki według planu i zdanie, z którego pochodzi każde.',
    pcT: 'Na komputerze', pcB: 'Napisy w VLC w trakcie filmu i zaznaczony tekst w dowolnym programie - czytniku, poczcie, PDF-ie.',
    doesTitle: 'Co dzieje się ze słowem',
    keepT: 'Zachowuje kwestię', keepB: 'Zdanie, film i odcinek zapisują się razem ze słowem - po tygodniu nadal wiesz, o co chodziło.',
    oneT: 'Jedna biblioteka', oneB: 'Jedno logowanie Google. Słowo zapisane w przeglądarce jest już w telefonie.',
    backT: 'Przypomina je', backB: 'Najpierw po dniu, potem po trzech, potem po tygodniu. To, co się zapomina, wraca częściej.',
    sayT: 'Pozwala się nie zgodzić', sayB: 'Nie zgadzasz się z odpowiedzią? Napisz własną na karcie. Jeśli dość osób napisze tę samą, stanie się odpowiedzią dla wszystkich.',
    linkBrowser: 'Dodaj do Chrome',
    linkPhone: 'Pobierz na Androida',
    linkPc: 'Pobierz na Windows',
    ctaLib: 'Otwórz bibliotekę', ctaWin: 'Pobierz na Windows',
    alpha: 'Rozszerzenie jest w Chrome Web Store. Aplikacja na Androida instaluje się na razie z pliku, a instalator Windows nie jest podpisany - oba raz zapytają, czy na pewno.',
    fPrivacy: 'Prywatność', fDelete: 'Usuń konto', fLibrary: 'Biblioteka', fSource: 'Kod i wydania',
    fTag: 'Subtitle Notes - miejsce na słowa, które sprawdziłeś.', langLabel: 'Język',
  },
  uk: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - переклад за змістом, а не за словником',
    h1: 'Переклад за змістом, а не за словником',
    lede: 'Виділіть незнайоме слово в субтитрі, на сторінці або в PDF. Воно перекладеться так, як звучить у цій фразі, і лишиться у вашій бібліотеці.',
    dict: 'Словник', ours: 'Subtitle Notes',
    wrong: 'ніхто не хоче рекорд',
    right: 'нікому не потрібна судимість',
    note: 'Читається весь рядок, тож слово отримує той сенс, який має в ньому, а не першу статтю зі словника.',
    whereTitle: 'Де це працює',
    browserT: 'У браузері', browserB: 'Субтитри у веб-плеєрах, будь-який текст на сторінці та PDF. Затисніть клавішу, проведіть по словах, відпустіть - відповідь з\'явиться поруч.',
    phoneT: 'У телефоні', phoneB: 'Ваші слова: пошук, повторення за розкладом і фраза, з якої взяте кожне.',
    pcT: 'На комп\'ютері', pcB: 'Субтитри у VLC просто під час фільму й виділений текст у будь-якій програмі - читалці, пошті, PDF.',
    doesTitle: 'Що стається зі словом',
    keepT: 'Зберігає рядок', keepB: 'Разом зі словом зберігається фраза, фільм і серія - через тиждень ви ще пам\'ятаєте, про що йшлося.',
    oneT: 'Одна бібліотека', oneB: 'Один вхід через Google. Слово, збережене в браузері, уже в телефоні.',
    backT: 'Повертає слово', backB: 'Спершу через день, потім через три, потім через тиждень. Те, що забувається, показується частіше.',
    sayT: 'Дозволяє сперечатися', sayB: 'Не згодні з відповіддю? Напишіть свою на картці. Якщо так само напишуть інші, вона стане спільною.',
    linkBrowser: 'Додати в браузер',
    linkPhone: 'Завантажити для Android',
    linkPc: 'Завантажити для Windows',
    ctaLib: 'Відкрити бібліотеку', ctaWin: 'Завантажити для Windows',
    alpha: 'Розширення вже в Chrome Web Store. Застосунок для Android поки ставиться файлом, а інсталятор Windows не підписаний - обидва один раз перепитають.',
    fPrivacy: 'Конфіденційність', fDelete: 'Видалити акаунт', fLibrary: 'Бібліотека', fSource: 'Код і випуски',
    fTag: 'Subtitle Notes - місце, де лишаються слова, які ви подивилися.', langLabel: 'Мова',
  },
  nl: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - vertaald naar de zin, niet naar het woord',
    h1: 'Vertaald naar de zin, niet naar het woord',
    lede: 'Selecteer een onbekend woord in een ondertitel, op een pagina of in een PDF. Het wordt vertaald zoals het in die zin klinkt en blijft in je bibliotheek.',
    dict: 'Een woordenboek', ours: 'Subtitle Notes',
    wrong: 'niemand wil een record',
    right: 'niemand wil een strafblad',
    note: 'De hele zin wordt gelezen, dus krijgt het woord de betekenis die het daarin heeft - niet het eerste lemma uit het woordenboek.',
    whereTitle: 'Waar het werkt',
    browserT: 'In de browser', browserB: 'Ondertitels in webspelers, elke tekst op een pagina en PDF\'s. Houd de toets vast, sleep over de woorden, laat los - het antwoord verschijnt ernaast.',
    phoneT: 'Op de telefoon', phoneB: 'Jouw woorden: zoeken, herhalen volgens schema en de zin waar elk woord uit komt.',
    pcT: 'Op de computer', pcB: 'Ondertitels in VLC terwijl de film loopt, en geselecteerde tekst in elk programma - een lezer, de mail, een PDF.',
    doesTitle: 'Wat er met een woord gebeurt',
    keepT: 'Bewaart de zin', keepB: 'De zin, de film en de aflevering worden bij het woord bewaard - een week later weet je nog waar het over ging.',
    oneT: 'Eén bibliotheek', oneB: 'Eén keer inloggen met Google. Een woord dat je in de browser bewaart, staat al op je telefoon.',
    backT: 'Brengt het terug', backB: 'Eerst na een dag, dan na drie, dan na een week. Wat je vergeet, komt vaker terug.',
    sayT: 'Laat je het oneens zijn', sayB: 'Niet eens met het antwoord? Schrijf je eigen antwoord op de kaart. Schrijven genoeg mensen hetzelfde, dan wordt dat het antwoord voor iedereen.',
    linkBrowser: 'Aan Chrome toevoegen',
    linkPhone: 'Downloaden voor Android',
    linkPc: 'Downloaden voor Windows',
    ctaLib: 'Open je bibliotheek', ctaWin: 'Downloaden voor Windows',
    alpha: 'De extensie staat in de Chrome Web Store. De Android-app wordt voorlopig uit een bestand geïnstalleerd en het Windows-installatieprogramma is niet ondertekend - beide vragen het één keer.',
    fPrivacy: 'Privacy', fDelete: 'Account verwijderen', fLibrary: 'Bibliotheek', fSource: 'Broncode en releases',
    fTag: 'Subtitle Notes - een plek voor de woorden die je opzocht.', langLabel: 'Taal',
  },
  tr: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - kelimeye göre değil, cümleye göre çeviri',
    h1: 'Kelimeye göre değil, cümleye göre çeviri',
    lede: 'Altyazıda, bir sayfada ya da PDF\'te bilmediğin bir kelimeyi seç. O cümlede nasıl geçiyorsa öyle çevrilir ve kitaplığında kalır.',
    dict: 'Sözlük', ours: 'Subtitle Notes',
    wrong: 'kimse rekor istemez',
    right: 'kimse sabıka kaydı istemez',
    note: 'Cümlenin tamamı okunur, yani kelime sözlükteki ilk karşılığı değil, o cümledeki anlamını alır.',
    whereTitle: 'Nerede çalışır',
    browserT: 'Tarayıcıda', browserB: 'Web oynatıcılardaki altyazılar, sayfadaki her metin ve PDF\'ler. Tuşu basılı tut, kelimelerin üzerinden sürükle, bırak - cevap yanında belirir.',
    phoneT: 'Telefonda', phoneB: 'Kelimelerin: arama, programa göre tekrar ve her birinin geldiği cümle.',
    pcT: 'Bilgisayarda', pcB: 'Film oynarken VLC\'deki altyazılar ve herhangi bir programdaki seçili metin - okuyucu, e-posta, PDF.',
    doesTitle: 'Bir kelimeye ne olur',
    keepT: 'Cümleyi saklar', keepB: 'Cümle, film ve bölüm kelimeyle birlikte saklanır - bir hafta sonra da neyin konuşulduğunu bilirsin.',
    oneT: 'Tek kitaplık', oneB: 'Google ile bir kez giriş. Tarayıcıda kaydettiğin kelime telefonunda zaten var.',
    backT: 'Geri getirir', backB: 'Önce bir gün sonra, sonra üç gün, sonra bir hafta. Unuttukların daha sık gösterilir.',
    sayT: 'İtiraz etmene izin verir', sayB: 'Cevaba katılmıyor musun? Kendi karşılığını karta yaz. Yeterince kişi aynısını yazarsa herkesin gördüğü cevap o olur.',
    linkBrowser: 'Chrome\'a ekle',
    linkPhone: 'Android için indir',
    linkPc: 'Windows için indir',
    ctaLib: 'Kitaplığı aç', ctaWin: 'Windows için indir',
    alpha: 'Eklenti Chrome Web Store\'da. Android uygulaması şimdilik dosyadan kuruluyor ve Windows kurulumu imzalı değil - ikisi de bir kez soruyor.',
    fPrivacy: 'Gizlilik', fDelete: 'Hesabı sil', fLibrary: 'Kitaplık', fSource: 'Kaynak ve sürümler',
    fTag: 'Subtitle Notes - baktığın kelimelerin kaldığı yer.', langLabel: 'Dil',
  },
  sv: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - översatt efter meningen, inte efter ordet',
    h1: 'Översatt efter meningen, inte efter ordet',
    lede: 'Markera ett okänt ord i en undertext, på en sida eller i en PDF. Det översätts som det låter i just den meningen och stannar i ditt bibliotek.',
    dict: 'En ordbok', ours: 'Subtitle Notes',
    wrong: 'ingen vill ha ett rekord',
    right: 'ingen vill ha ett brottsregister',
    note: 'Hela meningen läses, så ordet får den betydelse det har där - inte ordbokens första uppslag.',
    whereTitle: 'Var det fungerar',
    browserT: 'I webbläsaren', browserB: 'Undertexter i webbspelare, vilken text som helst på en sida och PDF-er. Håll ned tangenten, dra över orden, släpp - svaret dyker upp bredvid.',
    phoneT: 'I telefonen', phoneB: 'Dina ord: sökning, repetition enligt schema och meningen varje ord kom ur.',
    pcT: 'På datorn', pcB: 'Undertexter i VLC medan filmen går, och markerad text i vilket program som helst - en läsare, e-posten, en PDF.',
    doesTitle: 'Vad som händer med ett ord',
    keepT: 'Behåller repliken', keepB: 'Meningen, filmen och avsnittet sparas med ordet - en vecka senare vet du fortfarande vad det handlade om.',
    oneT: 'Ett bibliotek', oneB: 'En inloggning med Google. Ett ord du sparar i webbläsaren finns redan i telefonen.',
    backT: 'Tar tillbaka det', backB: 'Först efter en dag, sedan efter tre, sedan efter en vecka. Det du glömmer visas oftare.',
    sayT: 'Låter dig invända', sayB: 'Håller du inte med om svaret? Skriv ditt eget på kortet. Skriver tillräckligt många samma sak blir det allas svar.',
    linkBrowser: 'Lägg till i Chrome',
    linkPhone: 'Ladda ner för Android',
    linkPc: 'Ladda ner för Windows',
    ctaLib: 'Öppna biblioteket', ctaWin: 'Ladda ner för Windows',
    alpha: 'Tillägget finns i Chrome Web Store. Android-appen installeras tills vidare från en fil och Windows-installationen är inte signerad - båda frågar en gång.',
    fPrivacy: 'Integritet', fDelete: 'Radera kontot', fLibrary: 'Bibliotek', fSource: 'Källkod och utgåvor',
    fTag: 'Subtitle Notes - en plats för orden du slog upp.', langLabel: 'Språk',
  },
  fi: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - käännös lauseen mukaan, ei sanan',
    h1: 'Käännös lauseen mukaan, ei sanan',
    lede: 'Maalaa tuntematon sana tekstityksestä, sivulta tai PDF:stä. Se käännetään niin kuin se siinä lauseessa kuuluu, ja se jää kirjastoosi.',
    dict: 'Sanakirja', ours: 'Subtitle Notes',
    wrong: 'kukaan ei halua ennätystä',
    right: 'kukaan ei halua rikosrekisteriä',
    note: 'Koko lause luetaan, joten sana saa sen merkityksen, joka sillä siinä on - ei sanakirjan ensimmäistä hakusanaa.',
    whereTitle: 'Missä tämä toimii',
    browserT: 'Selaimessa', browserB: 'Tekstitykset verkkosoittimissa, mikä tahansa teksti sivulla ja PDF-tiedostot. Pidä näppäintä pohjassa, vedä sanojen yli, päästä irti - vastaus ilmestyy viereen.',
    phoneT: 'Puhelimessa', phoneB: 'Sinun sanasi: haku, kertaus aikataulun mukaan ja lause, josta kukin on peräisin.',
    pcT: 'Tietokoneella', pcB: 'Tekstitykset VLC:ssä elokuvan pyöriessä ja valittu teksti missä tahansa ohjelmassa - lukuohjelmassa, sähköpostissa, PDF:ssä.',
    doesTitle: 'Mitä sanalle tapahtuu',
    keepT: 'Säilyttää repliikin', keepB: 'Lause, elokuva ja jakso tallentuvat sanan mukana - viikon päästäkin tiedät, mistä oli kyse.',
    oneT: 'Yksi kirjasto', oneB: 'Yksi Google-kirjautuminen. Selaimessa tallennettu sana on jo puhelimessa.',
    backT: 'Tuo sen takaisin', backB: 'Ensin päivän päästä, sitten kolmen, sitten viikon. Se mikä unohtuu, näytetään useammin.',
    sayT: 'Antaa olla eri mieltä', sayB: 'Etkö ole samaa mieltä vastauksesta? Kirjoita kortille oma. Jos tarpeeksi moni kirjoittaa saman, siitä tulee kaikkien vastaus.',
    linkBrowser: 'Lisää Chromeen',
    linkPhone: 'Lataa Androidille',
    linkPc: 'Lataa Windowsille',
    ctaLib: 'Avaa kirjasto', ctaWin: 'Lataa Windowsille',
    alpha: 'Laajennus on Chrome Web Storessa. Android-sovellus asennetaan toistaiseksi tiedostosta eikä Windows-asennusohjelmaa ole allekirjoitettu - kumpikin kysyy kerran.',
    fPrivacy: 'Tietosuoja', fDelete: 'Poista tili', fLibrary: 'Kirjasto', fSource: 'Lähdekoodi ja julkaisut',
    fTag: 'Subtitle Notes - paikka sanoille, jotka katsoit.', langLabel: 'Kieli',
  },
};

export const HOME_LANGUAGES = Object.keys(HOME_TEXT);

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ru: 'Русский', et: 'Eesti', de: 'Deutsch', fr: 'Français',
  es: 'Español', it: 'Italiano', pt: 'Português', pl: 'Polski', uk: 'Українська',
  nl: 'Nederlands', tr: 'Türkçe', sv: 'Svenska', fi: 'Suomi',
};

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function homePage(lang: string, links: Record<string, string> = {}): string {
  const t = HOME_TEXT[lang] ?? HOME_TEXT.en;
  const code = HOME_TEXT[lang] ? lang : 'en';
  // The subtitle with the picked word marked inside it, whatever the word is.
  const at = t.line.indexOf(t.mark);
  const marked = at < 0
    ? escape(t.line)
    : escape(t.line.slice(0, at)) + '<mark>' + escape(t.mark) + '</mark>' +
      escape(t.line.slice(at + t.mark.length));
  const fullLine = escape(t.line);
  const options = HOME_LANGUAGES.map(
    (name) => '<option value="' + name + '"' + (name === code ? ' selected' : '') + '>' +
      escape(LANGUAGE_NAMES[name] ?? name) + '</option>',
  ).join('');
  return `<!doctype html>
<html lang="${code}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(t.title)}</title>
<meta name="description" content="${escape(t.lede)}">
<style>
  :root {
    --paper: #faf8f4; --ink: #14201c; --soft: #5d6d67; --hair: #e4dfd5;
    --accent: #1e7a4c; --wash: #e7f2ea; --card: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper: #101614; --ink: #eaf1ed; --soft: #93a49c; --hair: #26332e;
      --accent: #64c795; --wash: #17241f; --card: #151d1a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: var(--paper); color: var(--ink);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 62rem; margin: 0 auto; padding: 3.5rem 1.25rem 4rem; }
  header { display: flex; align-items: center; gap: .7rem; margin-bottom: 4rem; }
  .glyph { width: 26px; height: 18px; border-radius: 4px; background: var(--accent); position: relative; flex: 0 0 auto; }
  .glyph::after { content: ""; position: absolute; left: 4px; right: 4px; bottom: 4px; height: 3px; border-radius: 2px; background: var(--paper); opacity: .85; }
  .wordmark { font-weight: 700; letter-spacing: -.02em; font-size: 1.05rem; }
  h1 { margin: 0 0 1.1rem; font-size: clamp(2rem, 5.2vw, 3.1rem); line-height: 1.1; letter-spacing: -.035em; font-weight: 700; text-wrap: balance; max-width: 20ch; }
  .lede { margin: 0 0 2.6rem; font-size: clamp(1.05rem, 2.2vw, 1.22rem); color: var(--soft); max-width: 48ch; }
  h2 { font-size: 1.02rem; letter-spacing: .06em; text-transform: uppercase; color: var(--soft); font-weight: 650; margin: 4.5rem 0 1.4rem; }
  h3 { margin: 0 0 .45rem; font-size: 1.05rem; letter-spacing: -.015em; }
  p { margin: 0 0 1rem; }

  .demo { display: grid; gap: 1px; background: var(--hair); border: 1px solid var(--hair); border-radius: 14px; overflow: hidden; grid-template-columns: 1fr; }
  @media (min-width: 44rem) { .demo { grid-template-columns: 1fr 1fr; } }
  .demo > div { background: var(--card); padding: 1.3rem 1.4rem 1.5rem; }
  .demo .label { font-size: .74rem; letter-spacing: .09em; text-transform: uppercase; color: var(--soft); font-weight: 700; margin-bottom: .8rem; }
  .demo .line { font-size: 1.02rem; color: var(--soft); margin-bottom: .55rem; }
  .demo mark { background: var(--wash); color: inherit; padding: .05em .25em; border-radius: 4px; font-weight: 600; }
  .demo .out { font-size: 1.25rem; font-weight: 650; letter-spacing: -.02em; }
  .demo .wrong .out { color: var(--soft); text-decoration: line-through; text-decoration-thickness: 1px; }
  .demo .right .out { color: var(--accent); }

  /* The landing demonstration uses the same four moments as the apps. It is
     a carousel, not an autoplay video: touch, arrows and dots always let the
     reader set the pace. */
  .site-tour { border: 1px solid var(--hair); border-radius: 16px; overflow: hidden; background: var(--card); box-shadow: 0 18px 44px -34px rgba(20,32,28,.6); }
  .site-tour-window { overflow: hidden; }
  .site-tour-track { display: flex; transition: transform 460ms cubic-bezier(.22,.8,.28,1); touch-action: pan-y; }
  .site-tour-slide { flex: 0 0 100%; min-width: 0; min-height: 290px; padding: clamp(1rem, 3vw, 1.7rem); display: grid; align-content: center; gap: 1.05rem; }
  .site-tour-copy { max-width: 43rem; margin: 0 auto; text-align: center; }
  .site-tour-copy b { display: block; font-size: 1.1rem; letter-spacing: -.02em; }
  .site-tour-copy span { display: block; margin-top: .35rem; font-size: .92rem; color: var(--soft); }
  .site-tour .demo { width: min(100%, 43rem); margin: 0 auto; }
  .site-film { position: relative; width: min(100%, 43rem); min-height: 138px; margin: 0 auto; border-radius: 14px; overflow: hidden; background: linear-gradient(150deg,#27333e,#10171b 62%); }
  .site-film::before { content: '▶'; position: absolute; top: 24px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,.18); font-size: 2rem; }
  .site-subtitle { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); max-width: calc(100% - 32px); padding: .28rem .45rem; border-radius: 5px; color: #fff; background: rgba(0,0,0,.72); font-weight: 650; white-space: nowrap; }
  .site-tour-slide.is-active .site-subtitle { animation: site-pick 4s ease-in-out infinite; }
  .site-pointer { position: absolute; left: 68%; bottom: 4px; color: #fff; font-size: 1.45rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,.6)); }
  .site-tour-slide.is-active .site-pointer { animation: site-pointer 4s ease-in-out infinite; }
  @keyframes site-pick { 0%,14% { background: rgba(0,0,0,.72); } 38%,82% { background: rgba(66,190,127,.66); } 100% { background: rgba(0,0,0,.72); } }
  @keyframes site-pointer { 0%,14% { transform: translateX(-7rem); opacity: 0; } 22% { opacity: 1; } 42%,80% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(0); opacity: 0; } }
  .site-devices { width: min(100%, 43rem); margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; }
  .site-device { padding: 1rem .4rem; border: 1px solid var(--hair); border-radius: 12px; text-align: center; color: var(--soft); font-size: .82rem; font-weight: 700; }
  .site-device i { display: block; margin-bottom: .4rem; color: var(--accent); font-style: normal; font-size: 1.35rem; }
  .site-library { grid-column: 1 / -1; border-radius: 10px; padding: .7rem; background: var(--wash); color: var(--accent); text-align: center; font-size: .88rem; font-weight: 750; }
  .site-repeat { width: min(100%, 43rem); margin: 0 auto; padding: 1.4rem 1rem .8rem; }
  .site-repeat-word { width: 88px; margin: 0 auto 1.5rem; padding: .42rem .5rem; border-radius: 8px; background: var(--accent); color: var(--paper); text-align: center; font-size: .82rem; font-weight: 800; }
  .site-tour-slide.is-active .site-repeat-word { animation: site-hop 4s ease-in-out infinite; }
  .site-days { display: flex; align-items: center; justify-content: space-between; border-top: 2px solid var(--hair); color: var(--soft); font-size: .8rem; font-weight: 700; }
  .site-days i { width: 10px; height: 10px; margin-top: -6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--card); }
  @keyframes site-hop { 0%,12% { transform: translateX(-112px); } 28% { transform: translateX(-37px) translateY(-16px); } 44% { transform: translateX(-37px); } 60% { transform: translateX(37px) translateY(-16px); } 76% { transform: translateX(37px); } 90%,100% { transform: translateX(112px); } }
  .site-tour-controls { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; min-height: 52px; border-top: 1px solid var(--hair); }
  .site-tour-arrow { width: 44px; height: 44px; padding: 0; border: 0; background: transparent; color: var(--ink); cursor: pointer; font-size: 1.55rem; }
  .site-tour-arrow:hover { background: var(--wash); }
  .site-tour-dots { display: flex; justify-content: center; gap: .45rem; }
  .site-tour-dot { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 999px; background: var(--hair); cursor: pointer; transition: width .2s ease, background .2s ease; }
  .site-tour-dot[aria-current="true"] { width: 22px; background: var(--accent); }
  @media (max-width: 28rem) { .site-tour-slide { min-height: 268px; padding: 1rem; } .site-subtitle { font-size: .8rem; } }
  @media (prefers-reduced-motion: reduce) { .site-tour-track { transition: none; } .site-tour-slide * { animation: none !important; } }

  .where { display: grid; gap: 1.1rem; grid-template-columns: 1fr; }
  @media (min-width: 50rem) { .where { grid-template-columns: repeat(3, 1fr); } }
  .where section { background: var(--card); border: 1px solid var(--hair); border-left: 3px solid var(--accent); border-radius: 12px; padding: 1.3rem 1.4rem 1.4rem; }
  .where p { color: var(--soft); margin: 0; font-size: .96rem; }
  .where section { display: flex; flex-direction: column; align-items: flex-start; }
  .where section p { flex: 1; }
  .get {
    margin-top: 1rem; align-self: stretch; text-align: center; text-decoration: none;
    padding: .55rem .9rem; border-radius: 9px; border: 1px solid var(--hair);
    background: var(--wash); color: var(--accent); font-weight: 650; font-size: .95rem;
  }
  .get:hover { border-color: var(--accent); }
  .keys { display: inline-block; margin-top: .9rem; padding: .2rem .5rem; border-radius: 6px; border: 1px solid var(--hair); background: var(--wash); color: var(--accent); font-size: .82rem; font-weight: 650; }

  .rows { border-top: 1px solid var(--hair); }
  .rows div { border-bottom: 1px solid var(--hair); padding: 1.05rem 0; display: grid; gap: .15rem .9rem; }
  @media (min-width: 44rem) { .rows div { grid-template-columns: 14rem 1fr; } }
  .rows b { font-weight: 650; }
  .rows span { color: var(--soft); }

  .cta { margin-top: 2.4rem; display: flex; flex-wrap: wrap; gap: .7rem; align-items: center; }
  .button { display: inline-block; padding: .68rem 1.15rem; border-radius: 10px; text-decoration: none; background: var(--accent); color: var(--paper); font-weight: 650; }
  .button.quiet { background: transparent; color: var(--ink); border: 1px solid var(--hair); }
  .note { margin-top: 1.1rem; color: var(--soft); font-size: .92rem; max-width: 54ch; }

  footer { margin-top: 5rem; padding-top: 1.5rem; border-top: 1px solid var(--hair); color: var(--soft); font-size: .9rem; }
  footer a { color: inherit; }
  footer nav { display: flex; flex-wrap: wrap; gap: 1.1rem; margin-bottom: .9rem; }
  .picker { display: flex; align-items: center; gap: .5rem; margin-top: 1.1rem; }
  .picker select { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--hair); border-radius: 8px; padding: .3rem .5rem; }
  a { color: var(--accent); }

  /* Sections arrive as you reach them. Six pixels and a fifth of a second:
     enough to feel deliberate, not enough to make anybody wait for it. */
  [data-reveal] { opacity: 0; transform: translateY(14px); }
  [data-reveal].seen {
    opacity: 1; transform: none;
    transition: opacity .5s cubic-bezier(.2,.7,.3,1), transform .5s cubic-bezier(.2,.7,.3,1);
  }
  [data-reveal].seen .where section:nth-child(2) { transition-delay: .06s; }
  [data-reveal].seen .where section:nth-child(3) { transition-delay: .12s; }

  /* The demo does what the product does: the dictionary's answer is struck
     through and ours rises into the place it was standing in. */
  .demo .wrong .out { position: relative; text-decoration: none; }
  .demo .wrong .out::after {
    content: ""; position: absolute; left: 0; top: 52%; height: 1px; width: 0;
    background: currentColor;
  }
  .demo.seen .wrong .out::after { width: 100%; transition: width .5s ease .35s; }
  .demo .right .out { opacity: 0; transform: translateY(6px); }
  .demo.seen .right .out {
    opacity: 1; transform: none;
    transition: opacity .45s ease .95s, transform .45s cubic-bezier(.2,.7,.3,1) .95s;
  }
  .demo mark { transition: background .4s ease; }

  .where section { transition: transform .18s cubic-bezier(.2,.7,.3,1), border-color .18s ease; }
  .where section:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent) 45%, var(--hair)); }
  .get, .button { transition: transform .14s cubic-bezier(.2,.7,.3,1), filter .14s ease, border-color .14s ease; }
  .get:hover, .button:hover { transform: translateY(-1px); }
  .get:active, .button:active { transform: translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    [data-reveal], [data-reveal].seen { opacity: 1; transform: none; transition: none; }
    .demo .wrong .out::after { width: 100%; transition: none; }
    .demo .right .out { opacity: 1; transform: none; transition: none; }
    .where section:hover, .get:hover, .button:hover { transform: none; }
  }
</style></head><body>
<div class="page">

<header><span class="glyph" aria-hidden="true"></span><span class="wordmark">Subtitle Notes</span></header>

<h1>${escape(t.h1)}</h1>
<p class="lede">${escape(t.lede)}</p>

<section class="site-tour" id="siteTour" aria-roledescription="carousel">
  <div class="site-tour-window"><div class="site-tour-track" id="siteTourTrack">
    <article class="site-tour-slide is-active">
      <div class="demo" data-reveal><div class="wrong"><div class="label">${escape(t.dict)}</div><div class="line">${marked}</div><div class="out">${escape(t.wrong)}</div></div><div class="right"><div class="label">${escape(t.ours)}</div><div class="line">${marked}</div><div class="out">${escape(t.right)}</div></div></div>
      <div class="site-tour-copy"><b>${escape(t.ours)}</b><span>${escape(t.note)}</span></div>
    </article>
    <article class="site-tour-slide">
      <div class="site-film"><div class="site-subtitle">${fullLine}</div><div class="site-pointer">☝</div></div>
      <div class="site-tour-copy"><b>${escape(t.browserT)}</b><span>${escape(t.browserB)}</span></div>
    </article>
    <article class="site-tour-slide">
      <div class="site-devices"><div class="site-device"><i>◉</i>${escape(t.browserT)}</div><div class="site-device"><i>▣</i>${escape(t.phoneT)}</div><div class="site-device"><i>▤</i>${escape(t.pcT)}</div><div class="site-library">${escape(t.oneT)}</div></div>
      <div class="site-tour-copy"><b>${escape(t.oneT)}</b><span>${escape(t.oneB)}</span></div>
    </article>
    <article class="site-tour-slide">
      <div class="site-repeat"><div class="site-repeat-word">${escape(t.mark)}</div><div class="site-days"><i></i><span>1</span><i></i><span>3</span><i></i><span>7</span><i></i><span>16</span></div></div>
      <div class="site-tour-copy"><b>${escape(t.backT)}</b><span>${escape(t.backB)}</span></div>
    </article>
  </div></div>
  <div class="site-tour-controls"><button class="site-tour-arrow" type="button" data-tour-prev aria-label="Previous slide">‹</button><div class="site-tour-dots"><button class="site-tour-dot" type="button" aria-label="Slide 1" aria-current="true"></button><button class="site-tour-dot" type="button" aria-label="Slide 2"></button><button class="site-tour-dot" type="button" aria-label="Slide 3"></button><button class="site-tour-dot" type="button" aria-label="Slide 4"></button></div><button class="site-tour-arrow" type="button" data-tour-next aria-label="Next slide">›</button></div>
</section>

<h2 data-reveal>${escape(t.whereTitle)}</h2>
<div class="where" data-reveal>
  <section>
    <h3>${escape(t.browserT)}</h3><p>${escape(t.browserB)}</p>
    <span class="keys">Ctrl + drag</span>
    ${links.browser ? `<a class="get" href="${escape(links.browser)}">${escape(t.linkBrowser)}</a>` : ''}
  </section>
  <section>
    <h3>${escape(t.phoneT)}</h3><p>${escape(t.phoneB)}</p>
    <span class="keys">Android</span>
    ${links.android ? `<a class="get" href="${escape(links.android)}">${escape(t.linkPhone)}</a>` : ''}
  </section>
  <section>
    <h3>${escape(t.pcT)}</h3><p>${escape(t.pcB)}</p>
    <span class="keys">Ctrl + Alt + S</span>
    ${links.desktop ? `<a class="get" href="${escape(links.desktop)}">${escape(t.linkPc)}</a>` : ''}
  </section>
</div>

<h2 data-reveal>${escape(t.doesTitle)}</h2>
<div class="rows" data-reveal>
  <div><b>${escape(t.keepT)}</b><span>${escape(t.keepB)}</span></div>
  <div><b>${escape(t.oneT)}</b><span>${escape(t.oneB)}</span></div>
  <div><b>${escape(t.backT)}</b><span>${escape(t.backB)}</span></div>
  <div><b>${escape(t.sayT)}</b><span>${escape(t.sayB)}</span></div>
</div>

<div class="cta" data-reveal>
  ${links.browser ? `<a class="button" href="${escape(links.browser)}">${escape(t.linkBrowser)}</a>` : ''}
  <a class="button quiet" href="/library?lang=${code}">${escape(t.ctaLib)}</a>
</div>
<p class="note">${escape(t.alpha)}</p>

<footer>
  <nav>
    <a href="/privacy">${escape(t.fPrivacy)}</a>
    <a href="/delete-account">${escape(t.fDelete)}</a>
    <a href="/library?lang=${code}">${escape(t.fLibrary)}</a>
    <a href="https://github.com/mjandreas125/subtitle-notes">${escape(t.fSource)}</a>
  </nav>
  <div>${escape(t.fTag)}</div>
  <div class="picker">
    <label for="lang">${escape(t.langLabel)}</label>
    <select id="lang">${options}</select>
  </div>
</footer>

</div>
<script>
  document.getElementById('lang').onchange = function () {
    location.search = '?lang=' + this.value;
  };

  // Anything marked shows itself once, when it comes into view. One observer,
  // no scroll handler, and nothing at all to do if the reader asked for less
  // motion - the CSS has already put everything in its finished state.
  (function () {
    var marked = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      marked.forEach(function (node) { node.classList.add('seen'); });
      return;
    }
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('seen');
        watch.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    marked.forEach(function (node) { watch.observe(node); });
  })();
  (function () {
    const deck = document.getElementById('siteTour');
    const track = document.getElementById('siteTourTrack');
    const slides = Array.from(deck.querySelectorAll('.site-tour-slide'));
    const dots = Array.from(deck.querySelectorAll('.site-tour-dot'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let at = 0, timer, start = 0;
    const stop = () => { clearInterval(timer); timer = undefined; };
    const restart = () => { stop(); if (!reduced) timer = setInterval(() => show(at + 1), 6000); };
    function show(index, byPerson) {
      at = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (at * 100) + '%)';
      slides.forEach((slide, position) => slide.classList.toggle('is-active', position === at));
      dots.forEach((dot, position) => dot.setAttribute('aria-current', String(position === at)));
      if (byPerson) restart();
    }
    deck.querySelector('[data-tour-prev]').onclick = () => show(at - 1, true);
    deck.querySelector('[data-tour-next]').onclick = () => show(at + 1, true);
    dots.forEach((dot, index) => dot.onclick = () => show(index, true));
    deck.onmouseenter = stop; deck.onmouseleave = restart;
    deck.onfocusin = stop; deck.onfocusout = restart;
    deck.addEventListener('touchstart', event => { start = event.changedTouches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', event => { const delta = event.changedTouches[0].clientX - start; if (Math.abs(delta) > 34) show(at + (delta < 0 ? 1 : -1), true); }, { passive: true });
    restart();
  })();
</script>
</body></html>`;
}
