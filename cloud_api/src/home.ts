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
    title: 'Subtitle Notes - the word you did not know, where you met it',
    h1: 'The word you did not know, where you met it.',
    lede: 'Highlight it in a subtitle, on a page or in a PDF, and see what it means in that line - then find it again later, on any of your devices.',
    dict: 'A dictionary', ours: 'Subtitle Notes',
    wrong: 'He is not in his plate.',
    right: 'He is not feeling well.',
    note: 'The line is read by a language model that can see the rest of the sentence, so a word gets the sense the speaker meant rather than its first entry in a dictionary.',
    whereTitle: 'Where it works',
    browserT: 'In the browser', browserB: 'Subtitles in web players, any text on a page, and PDFs. Hold the key, drag across the words, let go - the meaning appears where you are looking.',
    phoneT: 'On the phone', phoneB: 'The library: search, revision on a schedule, and a card for every word you kept, with the line it came from.',
    pcT: 'On the computer', pcB: 'Subtitles in VLC while a film plays, and selected text in any program at all - a reader, a mail client, a PDF.',
    doesTitle: 'What it does with a word',
    keepT: 'Keeps the line', keepB: 'The sentence, the film and the episode are stored with the word, because that is what made it mean what it meant.',
    oneT: 'One library', oneB: 'Sign in with Google once. What you pick in the browser is on the phone before you reach for it.',
    backT: 'Brings it back', backB: 'Revision on a widening schedule: a word you struggled with returns sooner than one you knew.',
    sayT: 'Lets you disagree', sayB: 'Write your own wording on any card. Enough people writing the same one makes it the reading everybody gets.',
    ctaLib: 'Open your library', ctaWin: 'Download for Windows',
    alpha: 'Subtitle Notes is in closed alpha. The browser extension and the Android app are on their way to the stores; the Windows installer is not signed yet, so it shows a SmartScreen warning the first time it runs.',
    fPrivacy: 'Privacy', fDelete: 'Delete your account', fLibrary: 'Library', fSource: 'Source and releases',
    fTag: 'Subtitle Notes - a place to keep the words you looked up.', langLabel: 'Language',
  },
  ru: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - незнакомое слово там, где вы его встретили',
    h1: 'Незнакомое слово там, где вы его встретили.',
    lede: 'Выделите его в субтитре, на странице или в PDF и сразу увидите, что оно значит в этой строке - а потом найдёте снова, на любом своём устройстве.',
    dict: 'Словарь', ours: 'Subtitle Notes',
    wrong: 'никто не хочет рекорд',
    right: 'никому не нужна судимость',
    note: 'Строку читает языковая модель, которая видит всю реплику, поэтому слово получает тот смысл, который вкладывал говорящий, а не первую статью из словаря.',
    whereTitle: 'Где это работает',
    browserT: 'В браузере', browserB: 'Субтитры в веб-плеерах, любой текст на странице и PDF. Держите клавишу, протяните по словам, отпустите - значение появится там, куда вы смотрите.',
    phoneT: 'На телефоне', phoneB: 'Библиотека: поиск, повторение по расписанию и карточка на каждое сохранённое слово вместе со строкой, из которой оно взято.',
    pcT: 'На компьютере', pcB: 'Субтитры в VLC прямо во время фильма и выделенный текст в любой программе - читалке, почте, PDF.',
    doesTitle: 'Что происходит со словом',
    keepT: 'Сохраняет строку', keepB: 'Вместе со словом хранится реплика, фильм и серия: именно они сделали его тем, чем оно оказалось.',
    oneT: 'Одна библиотека', oneB: 'Один вход через Google. Выделенное в браузере уже на телефоне, когда вы до него дотянетесь.',
    backT: 'Возвращает слово', backB: 'Повторение с растущими интервалами: то, что далось тяжело, вернётся раньше того, что вы знали.',
    sayT: 'Позволяет спорить', sayB: 'Напишите на карточке свой вариант. Если так же напишут другие, он станет общим переводом.',
    ctaLib: 'Открыть библиотеку', ctaWin: 'Скачать для Windows',
    alpha: 'Subtitle Notes в закрытой альфе. Расширение и приложение для Android готовятся к публикации; установщик для Windows пока не подписан, поэтому при первом запуске SmartScreen показывает предупреждение.',
    fPrivacy: 'Конфиденциальность', fDelete: 'Удалить аккаунт', fLibrary: 'Библиотека', fSource: 'Исходники и выпуски',
    fTag: 'Subtitle Notes - место, где остаются слова, которые вы посмотрели.', langLabel: 'Язык',
  },
  et: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - tundmatu sõna seal, kus sa selle kohtasid',
    h1: 'Tundmatu sõna seal, kus sa selle kohtasid.',
    lede: 'Tee see subtiitris, lehel või PDF-is aktiivseks ja näed kohe, mida see selles lauses tähendab - ja leiad hiljem uuesti, ükskõik millisest seadmest.',
    dict: 'Sõnaraamat', ours: 'Subtitle Notes',
    wrong: 'keegi ei taha rekordit',
    right: 'kellelgi pole vaja karistusregistri kannet',
    note: 'Lauset loeb keelemudel, mis näeb kogu repliiki, nii et sõna saab selle tähenduse, mida rääkija mõtles, mitte sõnaraamatu esimese kirje.',
    whereTitle: 'Kus see töötab',
    browserT: 'Brauseris', browserB: 'Subtiitrid veebipleierites, iga tekst lehel ja PDF-id. Hoia klahvi all, tõmba üle sõnade, lase lahti - tähendus ilmub sinna, kuhu sa vaatad.',
    phoneT: 'Telefonis', phoneB: 'Kogu: otsing, kordamine ajakava järgi ja kaart iga salvestatud sõna kohta koos lausega, kust see pärineb.',
    pcT: 'Arvutis', pcB: 'Subtiitrid VLC-s filmi ajal ja valitud tekst ükskõik millises programmis - lugeris, e-kirjas, PDF-is.',
    doesTitle: 'Mida sõnaga tehakse',
    keepT: 'Hoiab lauset alles', keepB: 'Sõna juurde jäävad repliik, film ja osa - just need andsid talle selle tähenduse.',
    oneT: 'Üks kogu', oneB: 'Üks Google\'i sisselogimine. Brauseris valitud sõna on telefonis enne, kui sa selle järele sirutad.',
    backT: 'Toob sõna tagasi', backB: 'Kordamine kasvavate vahedega: raskesti meelde jäänu tuleb tagasi varem kui see, mida juba teadsid.',
    sayT: 'Lubab vaielda', sayB: 'Kirjuta kaardile oma sõnastus. Kui piisavalt inimesi kirjutab sama, saab sellest kõigi tõlge.',
    ctaLib: 'Ava oma kogu', ctaWin: 'Laadi alla Windowsile',
    alpha: 'Subtitle Notes on suletud alfaversioonis. Brauserilaiendus ja Androidi rakendus on teel poodidesse; Windowsi installer pole veel allkirjastatud, nii et SmartScreen näitab esimesel korral hoiatust.',
    fPrivacy: 'Privaatsus', fDelete: 'Kustuta konto', fLibrary: 'Kogu', fSource: 'Lähtekood ja väljalasked',
    fTag: 'Subtitle Notes - koht, kuhu jäävad sõnad, mille sa üles otsisid.', langLabel: 'Keel',
  },
  de: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - das unbekannte Wort dort, wo Sie es getroffen haben',
    h1: 'Das unbekannte Wort dort, wo Sie es getroffen haben.',
    lede: 'Markieren Sie es im Untertitel, auf einer Seite oder in einem PDF und sehen Sie, was es in dieser Zeile bedeutet - und finden Sie es später wieder, auf jedem Ihrer Geräte.',
    dict: 'Ein Wörterbuch', ours: 'Subtitle Notes',
    wrong: 'niemand will einen Rekord',
    right: 'niemand will eine Vorstrafe',
    note: 'Die Zeile liest ein Sprachmodell, das den ganzen Satz sieht. So bekommt ein Wort die Bedeutung, die gemeint war, und nicht den ersten Eintrag im Wörterbuch.',
    whereTitle: 'Wo es funktioniert',
    browserT: 'Im Browser', browserB: 'Untertitel in Webplayern, jeder Text auf einer Seite und PDFs. Taste halten, über die Wörter ziehen, loslassen - die Bedeutung erscheint dort, wo Sie hinsehen.',
    phoneT: 'Auf dem Telefon', phoneB: 'Die Sammlung: Suche, Wiederholung nach Plan und eine Karte zu jedem behaltenen Wort, mit der Zeile, aus der es stammt.',
    pcT: 'Auf dem Computer', pcB: 'Untertitel in VLC während der Film läuft, und markierter Text in jedem beliebigen Programm - Lese-App, Mailprogramm, PDF.',
    doesTitle: 'Was mit einem Wort geschieht',
    keepT: 'Behält die Zeile', keepB: 'Satz, Film und Folge werden mit dem Wort gespeichert - sie haben ihm seine Bedeutung gegeben.',
    oneT: 'Eine Sammlung', oneB: 'Einmal mit Google anmelden. Was Sie im Browser auswählen, ist auf dem Telefon, bevor Sie danach greifen.',
    backT: 'Bringt es zurück', backB: 'Wiederholung in wachsenden Abständen: ein schwieriges Wort kommt früher zurück als eines, das saß.',
    sayT: 'Lässt Sie widersprechen', sayB: 'Schreiben Sie Ihre eigene Formulierung auf jede Karte. Schreiben genug Leute dieselbe, wird sie die Lesart für alle.',
    ctaLib: 'Sammlung öffnen', ctaWin: 'Für Windows herunterladen',
    alpha: 'Subtitle Notes ist in einer geschlossenen Alpha. Erweiterung und Android-App sind auf dem Weg in die Stores; das Windows-Installationsprogramm ist noch nicht signiert, deshalb warnt SmartScreen beim ersten Start.',
    fPrivacy: 'Datenschutz', fDelete: 'Konto löschen', fLibrary: 'Sammlung', fSource: 'Quellcode und Releases',
    fTag: 'Subtitle Notes - ein Ort für die Wörter, die Sie nachgeschlagen haben.', langLabel: 'Sprache',
  },
  fr: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - le mot inconnu, là où vous l\'avez rencontré',
    h1: 'Le mot inconnu, là où vous l\'avez rencontré.',
    lede: 'Sélectionnez-le dans un sous-titre, sur une page ou dans un PDF et voyez ce qu\'il veut dire dans cette réplique - puis retrouvez-le plus tard, sur n\'importe lequel de vos appareils.',
    dict: 'Un dictionnaire', ours: 'Subtitle Notes',
    wrong: 'personne ne veut un record',
    right: 'personne ne veut de casier judiciaire',
    note: 'La réplique est lue par un modèle de langue qui voit la phrase entière : le mot reçoit le sens voulu par celui qui parle, et non la première entrée du dictionnaire.',
    whereTitle: 'Où cela fonctionne',
    browserT: 'Dans le navigateur', browserB: 'Sous-titres des lecteurs web, n\'importe quel texte d\'une page, et les PDF. Maintenez la touche, glissez sur les mots, relâchez - le sens apparaît là où vous regardez.',
    phoneT: 'Sur le téléphone', phoneB: 'La bibliothèque : recherche, révision programmée et une fiche pour chaque mot gardé, avec la réplique d\'où il vient.',
    pcT: 'Sur l\'ordinateur', pcB: 'Les sous-titres dans VLC pendant le film, et le texte sélectionné dans n\'importe quel programme - liseuse, messagerie, PDF.',
    doesTitle: 'Ce qui arrive à un mot',
    keepT: 'Garde la réplique', keepB: 'La phrase, le film et l\'épisode sont gardés avec le mot : ce sont eux qui lui ont donné son sens.',
    oneT: 'Une seule bibliothèque', oneB: 'Une connexion Google, une fois. Ce que vous prenez dans le navigateur est sur le téléphone avant que vous ne l\'attrapiez.',
    backT: 'Le fait revenir', backB: 'Révision à intervalles croissants : un mot difficile revient plus tôt qu\'un mot su.',
    sayT: 'Vous laisse contredire', sayB: 'Écrivez votre propre formulation sur une fiche. Si assez de gens écrivent la même, elle devient la lecture de tout le monde.',
    ctaLib: 'Ouvrir la bibliothèque', ctaWin: 'Télécharger pour Windows',
    alpha: 'Subtitle Notes est en alpha fermée. L\'extension et l\'application Android sont en route vers les magasins ; l\'installateur Windows n\'est pas encore signé, SmartScreen affiche donc un avertissement au premier lancement.',
    fPrivacy: 'Confidentialité', fDelete: 'Supprimer le compte', fLibrary: 'Bibliothèque', fSource: 'Sources et versions',
    fTag: 'Subtitle Notes - un endroit pour les mots que vous avez cherchés.', langLabel: 'Langue',
  },
  es: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - la palabra que no conocías, donde la encontraste',
    h1: 'La palabra que no conocías, donde la encontraste.',
    lede: 'Selecciónala en un subtítulo, en una página o en un PDF y verás qué significa en esa frase - y la encontrarás de nuevo más tarde, en cualquiera de tus dispositivos.',
    dict: 'Un diccionario', ours: 'Subtitle Notes',
    wrong: 'nadie quiere un récord',
    right: 'nadie quiere antecedentes penales',
    note: 'La frase la lee un modelo de lenguaje que ve la oración entera, así que la palabra recibe el sentido que quiso darle quien habla, y no la primera entrada del diccionario.',
    whereTitle: 'Dónde funciona',
    browserT: 'En el navegador', browserB: 'Subtítulos en reproductores web, cualquier texto de una página y PDF. Mantén la tecla, arrastra sobre las palabras, suelta - el significado aparece donde estás mirando.',
    phoneT: 'En el teléfono', phoneB: 'La biblioteca: búsqueda, repaso programado y una ficha por cada palabra guardada, con la frase de la que salió.',
    pcT: 'En el ordenador', pcB: 'Subtítulos en VLC mientras corre la película, y texto seleccionado en cualquier programa - un lector, el correo, un PDF.',
    doesTitle: 'Qué le pasa a una palabra',
    keepT: 'Guarda la frase', keepB: 'La oración, la película y el episodio se guardan con la palabra: fueron ellos los que le dieron ese sentido.',
    oneT: 'Una sola biblioteca', oneB: 'Inicia sesión con Google una vez. Lo que eliges en el navegador ya está en el teléfono antes de que lo cojas.',
    backT: 'La trae de vuelta', backB: 'Repaso con intervalos crecientes: la palabra que costó vuelve antes que la que ya sabías.',
    sayT: 'Te deja discrepar', sayB: 'Escribe tu propia versión en cualquier ficha. Si bastante gente escribe la misma, se convierte en la lectura de todos.',
    ctaLib: 'Abrir la biblioteca', ctaWin: 'Descargar para Windows',
    alpha: 'Subtitle Notes está en alfa cerrada. La extensión y la aplicación de Android van camino de las tiendas; el instalador de Windows aún no está firmado, así que SmartScreen avisa la primera vez.',
    fPrivacy: 'Privacidad', fDelete: 'Eliminar la cuenta', fLibrary: 'Biblioteca', fSource: 'Código y versiones',
    fTag: 'Subtitle Notes - un sitio donde se quedan las palabras que buscaste.', langLabel: 'Idioma',
  },
  it: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - la parola che non conoscevi, dove l\'hai incontrata',
    h1: 'La parola che non conoscevi, dove l\'hai incontrata.',
    lede: 'Selezionala in un sottotitolo, su una pagina o in un PDF e vedi che cosa significa in quella battuta - poi la ritrovi più tardi, su qualsiasi tuo dispositivo.',
    dict: 'Un dizionario', ours: 'Subtitle Notes',
    wrong: 'nessuno vuole un record',
    right: 'nessuno vuole precedenti penali',
    note: 'La battuta viene letta da un modello linguistico che vede tutta la frase, così la parola riceve il senso che intendeva chi parla e non la prima voce del dizionario.',
    whereTitle: 'Dove funziona',
    browserT: 'Nel browser', browserB: 'Sottotitoli nei player web, qualsiasi testo su una pagina e i PDF. Tieni premuto il tasto, trascina sulle parole, lascia - il significato compare dove stai guardando.',
    phoneT: 'Sul telefono', phoneB: 'La raccolta: ricerca, ripasso programmato e una scheda per ogni parola tenuta, con la battuta da cui viene.',
    pcT: 'Sul computer', pcB: 'Sottotitoli in VLC mentre il film va, e il testo selezionato in qualunque programma - un lettore, la posta, un PDF.',
    doesTitle: 'Che cosa succede a una parola',
    keepT: 'Tiene la battuta', keepB: 'La frase, il film e l\'episodio restano con la parola: sono loro ad averle dato quel senso.',
    oneT: 'Una sola raccolta', oneB: 'Un accesso Google, una volta. Quello che prendi nel browser è sul telefono prima che tu lo prenda in mano.',
    backT: 'La riporta indietro', backB: 'Ripasso a intervalli crescenti: la parola che è costata fatica torna prima di quella che sapevi.',
    sayT: 'Ti lascia dissentire', sayB: 'Scrivi la tua versione su una scheda. Se abbastanza persone scrivono la stessa, diventa la lettura di tutti.',
    ctaLib: 'Apri la raccolta', ctaWin: 'Scarica per Windows',
    alpha: 'Subtitle Notes è in alfa chiusa. L\'estensione e l\'app Android sono in viaggio verso gli store; l\'installer per Windows non è ancora firmato, quindi SmartScreen avvisa al primo avvio.',
    fPrivacy: 'Privacy', fDelete: 'Elimina l\'account', fLibrary: 'Raccolta', fSource: 'Sorgenti e versioni',
    fTag: 'Subtitle Notes - un posto per le parole che hai cercato.', langLabel: 'Lingua',
  },
  pt: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - a palavra que não conhecia, onde a encontrou',
    h1: 'A palavra que não conhecia, onde a encontrou.',
    lede: 'Selecione-a numa legenda, numa página ou num PDF e veja o que significa naquela fala - e volte a encontrá-la mais tarde, em qualquer dos seus aparelhos.',
    dict: 'Um dicionário', ours: 'Subtitle Notes',
    wrong: 'ninguém quer um recorde',
    right: 'ninguém quer registo criminal',
    note: 'A fala é lida por um modelo de linguagem que vê a frase inteira, por isso a palavra recebe o sentido que quem fala lhe deu, e não a primeira entrada do dicionário.',
    whereTitle: 'Onde funciona',
    browserT: 'No navegador', browserB: 'Legendas em leitores web, qualquer texto numa página e PDF. Segure a tecla, arraste sobre as palavras, largue - o significado aparece onde está a olhar.',
    phoneT: 'No telemóvel', phoneB: 'A biblioteca: pesquisa, revisão com horário e um cartão para cada palavra guardada, com a fala de onde veio.',
    pcT: 'No computador', pcB: 'Legendas no VLC durante o filme, e texto selecionado em qualquer programa - um leitor, o correio, um PDF.',
    doesTitle: 'O que acontece a uma palavra',
    keepT: 'Guarda a fala', keepB: 'A frase, o filme e o episódio ficam com a palavra: foram eles que lhe deram aquele sentido.',
    oneT: 'Uma só biblioteca', oneB: 'Entre com o Google uma vez. O que escolhe no navegador está no telemóvel antes de lhe pegar.',
    backT: 'Traz de volta', backB: 'Revisão com intervalos crescentes: a palavra que custou volta mais cedo do que a que já sabia.',
    sayT: 'Deixa discordar', sayB: 'Escreva a sua própria versão num cartão. Se gente suficiente escrever a mesma, passa a ser a leitura de todos.',
    ctaLib: 'Abrir a biblioteca', ctaWin: 'Transferir para Windows',
    alpha: 'O Subtitle Notes está em alfa fechada. A extensão e a aplicação Android estão a caminho das lojas; o instalador de Windows ainda não está assinado, por isso o SmartScreen avisa da primeira vez.',
    fPrivacy: 'Privacidade', fDelete: 'Apagar a conta', fLibrary: 'Biblioteca', fSource: 'Código e versões',
    fTag: 'Subtitle Notes - um sítio para as palavras que foi procurar.', langLabel: 'Idioma',
  },
  pl: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - nieznane słowo tam, gdzie je spotkałeś',
    h1: 'Nieznane słowo tam, gdzie je spotkałeś.',
    lede: 'Zaznacz je w napisach, na stronie albo w PDF-ie i zobacz, co znaczy w tej kwestii - a potem znajdź je znowu, na dowolnym swoim urządzeniu.',
    dict: 'Słownik', ours: 'Subtitle Notes',
    wrong: 'nikt nie chce rekordu',
    right: 'nikt nie chce kartoteki karnej',
    note: 'Kwestię czyta model językowy, który widzi całe zdanie, więc słowo dostaje sens, o który chodziło mówiącemu, a nie pierwsze hasło ze słownika.',
    whereTitle: 'Gdzie to działa',
    browserT: 'W przeglądarce', browserB: 'Napisy w odtwarzaczach webowych, dowolny tekst na stronie i PDF-y. Przytrzymaj klawisz, przeciągnij po słowach, puść - znaczenie pojawi się tam, gdzie patrzysz.',
    phoneT: 'W telefonie', phoneB: 'Biblioteka: wyszukiwanie, powtórki według planu i karta do każdego zachowanego słowa, razem z kwestią, z której pochodzi.',
    pcT: 'Na komputerze', pcB: 'Napisy w VLC w trakcie filmu i zaznaczony tekst w dowolnym programie - czytniku, poczcie, PDF-ie.',
    doesTitle: 'Co dzieje się ze słowem',
    keepT: 'Zachowuje kwestię', keepB: 'Zdanie, film i odcinek zostają razem ze słowem: to one nadały mu ten sens.',
    oneT: 'Jedna biblioteka', oneB: 'Jedno logowanie Google. To, co wybierzesz w przeglądarce, jest w telefonie, zanim po niego sięgniesz.',
    backT: 'Przypomina je', backB: 'Powtórki w rosnących odstępach: słowo, z którym był kłopot, wraca wcześniej niż to, które znałeś.',
    sayT: 'Pozwala się nie zgodzić', sayB: 'Napisz na karcie własną wersję. Jeśli dość osób napisze tę samą, stanie się tłumaczeniem dla wszystkich.',
    ctaLib: 'Otwórz bibliotekę', ctaWin: 'Pobierz na Windows',
    alpha: 'Subtitle Notes jest w zamkniętej alfie. Rozszerzenie i aplikacja na Androida są w drodze do sklepów; instalator Windows nie jest jeszcze podpisany, więc SmartScreen ostrzega przy pierwszym uruchomieniu.',
    fPrivacy: 'Prywatność', fDelete: 'Usuń konto', fLibrary: 'Biblioteka', fSource: 'Kod i wydania',
    fTag: 'Subtitle Notes - miejsce na słowa, które sprawdziłeś.', langLabel: 'Język',
  },
  uk: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - незнайоме слово там, де ви його зустріли',
    h1: 'Незнайоме слово там, де ви його зустріли.',
    lede: 'Виділіть його в субтитрі, на сторінці або в PDF і побачите, що воно означає саме в цьому рядку - а потім знайдете знову, на будь-якому своєму пристрої.',
    dict: 'Словник', ours: 'Subtitle Notes',
    wrong: 'ніхто не хоче рекорд',
    right: 'нікому не потрібна судимість',
    note: 'Рядок читає мовна модель, яка бачить усю репліку, тож слово отримує той сенс, який мав на увазі мовець, а не першу статтю зі словника.',
    whereTitle: 'Де це працює',
    browserT: 'У браузері', browserB: 'Субтитри у веб-плеєрах, будь-який текст на сторінці та PDF. Тримайте клавішу, протягніть по словах, відпустіть - значення з\'явиться там, куди ви дивитеся.',
    phoneT: 'У телефоні', phoneB: 'Бібліотека: пошук, повторення за розкладом і картка на кожне збережене слово разом із рядком, звідки воно взялося.',
    pcT: 'На комп\'ютері', pcB: 'Субтитри у VLC просто під час фільму й виділений текст у будь-якій програмі - читалці, пошті, PDF.',
    doesTitle: 'Що стається зі словом',
    keepT: 'Зберігає рядок', keepB: 'Разом зі словом лишаються репліка, фільм і серія: саме вони дали йому цей сенс.',
    oneT: 'Одна бібліотека', oneB: 'Один вхід через Google. Виділене в браузері вже в телефоні, поки ви до нього тягнетеся.',
    backT: 'Повертає слово', backB: 'Повторення зі зростаючими інтервалами: те, що далося важко, повернеться раніше за те, що ви знали.',
    sayT: 'Дозволяє сперечатися', sayB: 'Напишіть на картці свій варіант. Якщо так само напишуть інші, він стане спільним перекладом.',
    ctaLib: 'Відкрити бібліотеку', ctaWin: 'Завантажити для Windows',
    alpha: 'Subtitle Notes у закритій альфі. Розширення та застосунок для Android готуються до публікації; інсталятор для Windows поки не підписаний, тому SmartScreen попереджає під час першого запуску.',
    fPrivacy: 'Конфіденційність', fDelete: 'Видалити акаунт', fLibrary: 'Бібліотека', fSource: 'Код і випуски',
    fTag: 'Subtitle Notes - місце, де лишаються слова, які ви подивилися.', langLabel: 'Мова',
  },
  nl: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - het woord dat je niet kende, waar je het tegenkwam',
    h1: 'Het woord dat je niet kende, waar je het tegenkwam.',
    lede: 'Selecteer het in een ondertitel, op een pagina of in een PDF en zie wat het in die zin betekent - en vind het later terug, op al je apparaten.',
    dict: 'Een woordenboek', ours: 'Subtitle Notes',
    wrong: 'niemand wil een record',
    right: 'niemand wil een strafblad',
    note: 'De regel wordt gelezen door een taalmodel dat de hele zin ziet, dus krijgt een woord de betekenis die de spreker bedoelde en niet het eerste lemma uit het woordenboek.',
    whereTitle: 'Waar het werkt',
    browserT: 'In de browser', browserB: 'Ondertitels in webspelers, elke tekst op een pagina en PDF\'s. Houd de toets vast, sleep over de woorden, laat los - de betekenis verschijnt waar je kijkt.',
    phoneT: 'Op de telefoon', phoneB: 'De bibliotheek: zoeken, herhalen volgens schema en een kaart voor elk bewaard woord, met de zin waar het uit komt.',
    pcT: 'Op de computer', pcB: 'Ondertitels in VLC terwijl de film loopt, en geselecteerde tekst in welk programma dan ook - een lezer, de mail, een PDF.',
    doesTitle: 'Wat er met een woord gebeurt',
    keepT: 'Bewaart de zin', keepB: 'De zin, de film en de aflevering worden bij het woord bewaard: die gaven het die betekenis.',
    oneT: 'Eén bibliotheek', oneB: 'Eén keer inloggen met Google. Wat je in de browser kiest, staat op je telefoon voordat je ernaar grijpt.',
    backT: 'Brengt het terug', backB: 'Herhalen met groeiende tussenpozen: een moeilijk woord komt eerder terug dan een woord dat zat.',
    sayT: 'Laat je het oneens zijn', sayB: 'Schrijf je eigen formulering op een kaart. Schrijven genoeg mensen dezelfde, dan wordt dat de lezing voor iedereen.',
    ctaLib: 'Open je bibliotheek', ctaWin: 'Downloaden voor Windows',
    alpha: 'Subtitle Notes is in gesloten alfa. De extensie en de Android-app zijn onderweg naar de stores; het Windows-installatieprogramma is nog niet ondertekend, dus SmartScreen waarschuwt de eerste keer.',
    fPrivacy: 'Privacy', fDelete: 'Account verwijderen', fLibrary: 'Bibliotheek', fSource: 'Broncode en releases',
    fTag: 'Subtitle Notes - een plek voor de woorden die je opzocht.', langLabel: 'Taal',
  },
  tr: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - bilmediğin kelime, onunla karşılaştığın yerde',
    h1: 'Bilmediğin kelime, onunla karşılaştığın yerde.',
    lede: 'Altyazıda, bir sayfada ya da PDF\'te seç ve o cümlede ne anlama geldiğini gör - sonra istediğin cihazda yeniden bul.',
    dict: 'Sözlük', ours: 'Subtitle Notes',
    wrong: 'kimse rekor istemez',
    right: 'kimse sabıka kaydı istemez',
    note: 'Satırı, cümlenin tamamını gören bir dil modeli okur; böylece kelime sözlükteki ilk karşılığı değil, konuşanın kastettiği anlamı alır.',
    whereTitle: 'Nerede çalışır',
    browserT: 'Tarayıcıda', browserB: 'Web oynatıcılardaki altyazılar, sayfadaki herhangi bir metin ve PDF\'ler. Tuşu basılı tut, kelimelerin üzerinden sürükle, bırak - anlam baktığın yerde belirir.',
    phoneT: 'Telefonda', phoneB: 'Kitaplık: arama, programa göre tekrar ve sakladığın her kelime için geldiği cümleyle birlikte bir kart.',
    pcT: 'Bilgisayarda', pcB: 'Film oynarken VLC\'deki altyazılar ve herhangi bir programdaki seçili metin - okuyucu, e-posta, PDF.',
    doesTitle: 'Bir kelimeye ne olur',
    keepT: 'Cümleyi saklar', keepB: 'Cümle, film ve bölüm kelimeyle birlikte saklanır: anlamı ona onlar verdi.',
    oneT: 'Tek kitaplık', oneB: 'Google ile bir kez giriş. Tarayıcıda seçtiğin, sen telefona uzanmadan telefonda olur.',
    backT: 'Geri getirir', backB: 'Aralıkları büyüyen tekrar: zorlandığın kelime, bildiğinden daha erken geri gelir.',
    sayT: 'İtiraz etmene izin verir', sayB: 'Herhangi bir karta kendi karşılığını yaz. Yeterince kişi aynısını yazarsa herkesin gördüğü karşılık o olur.',
    ctaLib: 'Kitaplığı aç', ctaWin: 'Windows için indir',
    alpha: 'Subtitle Notes kapalı alfa aşamasında. Tarayıcı eklentisi ve Android uygulaması mağazalara doğru yolda; Windows kurulumu henüz imzalı değil, bu yüzden SmartScreen ilk açılışta uyarı gösterir.',
    fPrivacy: 'Gizlilik', fDelete: 'Hesabı sil', fLibrary: 'Kitaplık', fSource: 'Kaynak ve sürümler',
    fTag: 'Subtitle Notes - baktığın kelimelerin kaldığı yer.', langLabel: 'Dil',
  },
  sv: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - ordet du inte kunde, där du mötte det',
    h1: 'Ordet du inte kunde, där du mötte det.',
    lede: 'Markera det i en undertext, på en sida eller i en PDF och se vad det betyder i just den repliken - och hitta det igen senare, på vilken av dina enheter som helst.',
    dict: 'En ordbok', ours: 'Subtitle Notes',
    wrong: 'ingen vill ha ett rekord',
    right: 'ingen vill ha ett brottsregister',
    note: 'Repliken läses av en språkmodell som ser hela meningen, så ordet får den betydelse talaren menade och inte ordbokens första uppslag.',
    whereTitle: 'Var det fungerar',
    browserT: 'I webbläsaren', browserB: 'Undertexter i webbspelare, vilken text som helst på en sida och PDF-er. Håll ned tangenten, dra över orden, släpp - betydelsen dyker upp där du tittar.',
    phoneT: 'I telefonen', phoneB: 'Biblioteket: sökning, repetition enligt schema och ett kort för varje sparat ord, med repliken det kom ur.',
    pcT: 'På datorn', pcB: 'Undertexter i VLC medan filmen går, och markerad text i vilket program som helst - en läsare, e-posten, en PDF.',
    doesTitle: 'Vad som händer med ett ord',
    keepT: 'Behåller repliken', keepB: 'Meningen, filmen och avsnittet sparas med ordet: det var de som gav det betydelsen.',
    oneT: 'Ett bibliotek', oneB: 'Logga in med Google en gång. Det du tar i webbläsaren finns i telefonen innan du hinner ta upp den.',
    backT: 'Tar tillbaka det', backB: 'Repetition med växande mellanrum: ett ord som var svårt kommer tillbaka tidigare än ett du kunde.',
    sayT: 'Låter dig invända', sayB: 'Skriv din egen formulering på ett kort. Skriver tillräckligt många samma sak blir det allas läsning.',
    ctaLib: 'Öppna biblioteket', ctaWin: 'Ladda ner för Windows',
    alpha: 'Subtitle Notes är i sluten alfa. Tillägget och Android-appen är på väg till butikerna; Windows-installationen är ännu inte signerad, så SmartScreen varnar första gången.',
    fPrivacy: 'Integritet', fDelete: 'Radera kontot', fLibrary: 'Bibliotek', fSource: 'Källkod och utgåvor',
    fTag: 'Subtitle Notes - en plats för orden du slog upp.', langLabel: 'Språk',
  },
  fi: {
    line: 'No one wants a record.', mark: 'record',
    title: 'Subtitle Notes - tuntematon sana siellä, missä sen kohtasit',
    h1: 'Tuntematon sana siellä, missä sen kohtasit.',
    lede: 'Maalaa se tekstityksestä, sivulta tai PDF:stä ja näet, mitä se juuri siinä repliikissä tarkoittaa - ja löydät sen myöhemmin uudelleen, millä tahansa laitteellasi.',
    dict: 'Sanakirja', ours: 'Subtitle Notes',
    wrong: 'kukaan ei halua ennätystä',
    right: 'kukaan ei halua rikosrekisteriä',
    note: 'Repliikin lukee kielimalli, joka näkee koko lauseen, joten sana saa sen merkityksen, jota puhuja tarkoitti, eikä sanakirjan ensimmäistä hakusanaa.',
    whereTitle: 'Missä tämä toimii',
    browserT: 'Selaimessa', browserB: 'Tekstitykset verkkosoittimissa, mikä tahansa teksti sivulla ja PDF-tiedostot. Pidä näppäintä pohjassa, vedä sanojen yli, päästä irti - merkitys ilmestyy siihen, mihin katsot.',
    phoneT: 'Puhelimessa', phoneB: 'Kirjasto: haku, kertaus aikataulun mukaan ja kortti jokaisesta talteen otetusta sanasta, mukana repliikki, josta se on peräisin.',
    pcT: 'Tietokoneella', pcB: 'Tekstitykset VLC:ssä elokuvan pyöriessä ja valittu teksti missä tahansa ohjelmassa - lukuohjelmassa, sähköpostissa, PDF:ssä.',
    doesTitle: 'Mitä sanalle tapahtuu',
    keepT: 'Säilyttää repliikin', keepB: 'Lause, elokuva ja jakso tallennetaan sanan mukana: juuri ne antoivat sille sen merkityksen.',
    oneT: 'Yksi kirjasto', oneB: 'Yksi Google-kirjautuminen. Selaimessa poimittu sana on puhelimessa ennen kuin ehdit tarttua siihen.',
    backT: 'Tuo sen takaisin', backB: 'Kertaus kasvavin välein: vaikea sana palaa aikaisemmin kuin sellainen, jonka osasit.',
    sayT: 'Antaa olla eri mieltä', sayB: 'Kirjoita korttiin oma muotoilusi. Jos tarpeeksi moni kirjoittaa saman, siitä tulee kaikkien käännös.',
    ctaLib: 'Avaa kirjasto', ctaWin: 'Lataa Windowsille',
    alpha: 'Subtitle Notes on suljetussa alfavaiheessa. Selainlaajennus ja Android-sovellus ovat matkalla kauppoihin; Windows-asennusohjelmaa ei ole vielä allekirjoitettu, joten SmartScreen varoittaa ensimmäisellä kerralla.',
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

export function homePage(lang: string): string {
  const t = HOME_TEXT[lang] ?? HOME_TEXT.en;
  const code = HOME_TEXT[lang] ? lang : 'en';
  // The subtitle with the picked word marked inside it, whatever the word is.
  const at = t.line.indexOf(t.mark);
  const marked = at < 0
    ? escape(t.line)
    : escape(t.line.slice(0, at)) + '<mark>' + escape(t.mark) + '</mark>' +
      escape(t.line.slice(at + t.mark.length));
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

  .where { display: grid; gap: 1.1rem; grid-template-columns: 1fr; }
  @media (min-width: 50rem) { .where { grid-template-columns: repeat(3, 1fr); } }
  .where section { background: var(--card); border: 1px solid var(--hair); border-left: 3px solid var(--accent); border-radius: 12px; padding: 1.3rem 1.4rem 1.4rem; }
  .where p { color: var(--soft); margin: 0; font-size: .96rem; }
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
</style></head><body>
<div class="page">

<header><span class="glyph" aria-hidden="true"></span><span class="wordmark">Subtitle Notes</span></header>

<h1>${escape(t.h1)}</h1>
<p class="lede">${escape(t.lede)}</p>

<div class="demo">
  <div class="wrong">
    <div class="label">${escape(t.dict)}</div>
    <div class="line">${marked}</div>
    <div class="out">${escape(t.wrong)}</div>
  </div>
  <div class="right">
    <div class="label">${escape(t.ours)}</div>
    <div class="line">${marked}</div>
    <div class="out">${escape(t.right)}</div>
  </div>
</div>
<p class="note">${escape(t.note)}</p>

<h2>${escape(t.whereTitle)}</h2>
<div class="where">
  <section><h3>${escape(t.browserT)}</h3><p>${escape(t.browserB)}</p><span class="keys">Ctrl + drag</span></section>
  <section><h3>${escape(t.phoneT)}</h3><p>${escape(t.phoneB)}</p><span class="keys">Android</span></section>
  <section><h3>${escape(t.pcT)}</h3><p>${escape(t.pcB)}</p><span class="keys">Ctrl + Alt + S</span></section>
</div>

<h2>${escape(t.doesTitle)}</h2>
<div class="rows">
  <div><b>${escape(t.keepT)}</b><span>${escape(t.keepB)}</span></div>
  <div><b>${escape(t.oneT)}</b><span>${escape(t.oneB)}</span></div>
  <div><b>${escape(t.backT)}</b><span>${escape(t.backB)}</span></div>
  <div><b>${escape(t.sayT)}</b><span>${escape(t.sayB)}</span></div>
</div>

<div class="cta">
  <a class="button" href="/library?lang=${code}">${escape(t.ctaLib)}</a>
  <a class="button quiet" href="https://github.com/mjandreas125/subtitle-notes/releases/latest">${escape(t.ctaWin)}</a>
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
</script>
</body></html>`;
}
