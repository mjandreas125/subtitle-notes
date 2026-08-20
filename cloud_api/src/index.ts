interface Env { DB: D1Database; TOKEN_SECRET: string; AI: { run(model: string, input: unknown): Promise<any> } }

import { libraryPage } from './library';

const CLIENT_ID = '151185018789-tjda40ks4kb2vo8s30f9359n2b9o4dlb.apps.googleusercontent.com';
const encoder = new TextEncoder();

/// What the Windows program should be running, and where to get it.
///
/// The program has no store to update it, so it asks here on startup and says
/// when it is behind. Bump the version when a new installer is published.
const DESKTOP_LATEST = {
  version: '1.6.5',
  // Straight to the file: the button should start a download, not land
  // somebody on a page of assets to choose from.
  url: 'https://github.com/mjandreas125/subtitle-notes/releases/latest/download/SubtitleNotesSetup-1.6.5.exe',
  notes: '',
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const clean = (value: unknown) => String(value ?? '').trim();
const focusKey = (phrase: string, word: string, text: string) => (phrase || word || text).trim().toLowerCase().replace(/\s+/g, ' ');

function b64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function fromB64(value: string) { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)); }
async function sign(value: string, secret: string) { const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))); }
/// A session lasts a year. Thirty days sounded prudent and meant that every
/// phone, browser and computer quietly stopped working a month after it was
/// set up — for a vocabulary notebook that is not prudence, it is a fault.
async function token(user: { id: string; email: string }, secret: string) { const head = b64(encoder.encode('{"alg":"HS256","typ":"JWT"}')); const body = b64(encoder.encode(JSON.stringify({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 }))); return `${head}.${body}.${await sign(`${head}.${body}`, secret)}`; }
async function userFrom(request: Request, env: Env) { const value = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''; const [head, body, signature] = value.split('.'); if (!head || !body || !signature || signature !== await sign(`${head}.${body}`, env.TOKEN_SECRET)) throw new Error('Unauthorized'); const claims = JSON.parse(new TextDecoder().decode(fromB64(body))); if (claims.exp * 1000 < Date.now()) throw new Error('Session expired'); const user = await env.DB.prepare('SELECT id, email, display_name, language FROM users WHERE id = ?').bind(claims.sub).first(); if (!user) throw new Error('Unauthorized'); return user as { id: string; email: string; display_name: string; language: string }; }
function failure(error: unknown) { const message = error instanceof Error ? error.message : 'Server error'; const status = /Unauthorized|expired/.test(message) ? 401 : 400; return json({ detail: message }, status); }

// Words that are never the thing someone stopped the film to look up. Light
// verbs ("keeps", "got") are included: without them a sentence like "He keeps
// bragging about his car" picks "keeps" as the lesson.
const stop = new Set(['a','an','and','are','as','at','be','been','but','by','for','from','had','has','have','he','her','him','his','i','if','in','is','it','its','me','my','of','on','or','our','she','that','the','their','them','there','they','this','to','was','we','were','what','when','where','who','will','with','you','your',
  'am','being','can','could','did','do','does','doing','done','get','gets','getting','go','goes','going','gone','got','just','keep','keeps','kept','let','lets','make','makes','making','may','might','must','not','now','really','said','say','says','shall','should','so','some','still','such','than','then','too','very','want','wants','well','went','would']);

// A highlighted run of up to this many words is one expression.
const PHRASE_MAX_WORDS = 5;
const subjectPronouns = new Set(['i','you','he','she','it','we','they','there','here']);
const sentenceAuxiliaries = new Set(['am','is','are','was','were','do','does','did','have','has','had','will','would','can','could','should']);

/// Whether a short selection is a clause rather than an expression. A pronoun
/// only counts in front, so the "it" inside "take it for granted" does not
/// disqualify the idiom.
function looksLikeSentence(text: string, words: string[]) {
  if (/[.!?]\s*$/.test(text)) return true;
  // "She's" is still a subject: compare on the part before the contraction.
  if (words.length && subjectPronouns.has(words[0].split("'")[0])) return true;
  if (words.some((word) => word.includes("'"))) return true;
  return words.some((word) => sentenceAuxiliaries.has(word));
}

const wordsIn = (text: string) => text.match(/[\p{L}]+(?:[-'][\p{L}]+)?/gu) ?? [];

function focus(text: string, sourceLanguage = 'en') {
  const words = wordsIn(text);
  const lowered = words.map((word) => word.toLowerCase());
  // The stop-word and phrasal-verb rules below are English-specific. A short
  // selection in another language is already the expression its reader chose;
  // whole lines are narrowed by the language model before they arrive here.
  if (sourceLanguage !== 'en') {
    const phrase = text.trim().replace(/^\P{L}+|\P{L}+$/gu, '') || words[0] || '';
    return {
      word: words[0] ?? '',
      phrase: words.length <= PHRASE_MAX_WORDS ? phrase : (words[0] ?? ''),
    };
  }
  // "She's" and "I'm" carry a subject the stop list only knows as "she"/"i".
  const stems = lowered.map((word) => word.split("'")[0]);

  // Someone who highlights two or three words has already chosen what they
  // want to learn: "employment record" means a work history, and cutting it
  // down to "employment" loses the thing they looked up.
  if (words.length > 1 && words.length <= PHRASE_MAX_WORDS && !looksLikeSentence(text, lowered)) {
    const head = words[Math.max(0, stems.findIndex((word) => !stop.has(word)))] ?? words[0];
    const phrase = text.trim().replace(/^\P{L}+|\P{L}+$/gu, '') || head;
    return { word: head, phrase };
  }

  const index = Math.max(0, stems.findIndex(word => !stop.has(word)));
  const word = words[index] ?? '';
  const next = lowered[index + 1];
  const phrase = next && ['about','for','from','into','off','on','out','over','through','to','up','with'].includes(next) ? `${word} ${words[index + 1]}` : word;
  return { word, phrase };
}

/// A reader who deliberately selected a compact phrase already told us exactly
/// what should be translated. The language model is useful for a whole
/// subtitle line, but asking it to reinterpret a name-heavy phrase such as
/// "beaches of Tennessee" can turn a reliable dictionary answer into a made-up
/// sense. Keep these selections literal and deterministic.
function isDeliberatePhrase(text: string) {
  const words = wordsIn(text);
  return (
    words.length > 0 &&
    words.length <= PHRASE_MAX_WORDS &&
    !looksLikeSentence(text, words.map((word) => word.toLowerCase()))
  );
}

/// The dictionary only carries examples for headwords: "brag" has them,
/// "bragging" and "brag about" do not. These are the spellings worth trying
/// before giving up on finding any.
function headwords(word: string): string[] {
  const value = word.toLowerCase();
  const forms = [value];
  if (value.endsWith('ing') && value.length > 5) {
    const base = value.slice(0, -3);
    const undoubled = base.length > 2 && base.at(-1) === base.at(-2) ? base.slice(0, -1) : base;
    forms.push(undoubled, `${base}e`);
  } else if (value.endsWith('ied') && value.length > 4) {
    forms.push(`${value.slice(0, -3)}y`);
  } else if (value.endsWith('ed') && value.length > 4) {
    const base = value.slice(0, -2);
    forms.push(base, `${base}e`);
  } else if (value.endsWith('ies') && value.length > 4) {
    forms.push(`${value.slice(0, -3)}y`);
  } else if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) {
    forms.push(value.slice(0, -1));
  }
  return [...new Set(forms)];
}
// `dt=ex` asks the same endpoint for usage examples of the queried term. They
// come back as English sentences with the term wrapped in <b> tags.
const UNAVAILABLE = 'Translation unavailable';

type Translation = {
  text: string;
  variants: string[];
  examples: string[];
  /// Google returns the ISO code it detected.  Keeping it with the result is
  /// important: the sentence reader and browser voice must use the language
  /// the viewer selected, not the language we used to assume every film had.
  source: string;
};

/// Translate from whatever language the highlighted subtitle actually uses.
///
/// `sl=en` was baked into the first version of Subtitle Notes.  It works for
/// an English show, but turns every French, Spanish or Finnish line into a
/// malformed "English" word before it reaches the dictionary or speech
/// engine.  Google detects the source reliably here and returns it as `src`.
async function translate(text: string, withExamples = false, language = 'ru', sourceLanguage = 'auto'): Promise<Translation> {
  const query = new URLSearchParams([['client','gtx'],['sl',sourceLanguage || 'auto'],['tl',language],['dt','t'],['dt','bd'],['dj','1'],['q',text]]);
  if (withExamples) query.append('dt', 'ex');
  const url = `https://translate.googleapis.com/translate_a/single?${query}`;
  // Saving several words in a row can trip rate limiting, and a card with no
  // translation is worse than a slightly slower save. One retry clears it.
  let response = await fetch(url);
  if (!response.ok) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    response = await fetch(url);
  }
  if (!response.ok) return { text: UNAVAILABLE, variants: [], examples: [], source: sourceLanguage || 'auto' };
  const payload: any = await response.json();
  const result = (payload.sentences ?? []).map((item: any) => item.trans ?? '').join('').trim() || 'Translation unavailable';
  const variants = (payload.dict ?? []).flatMap((item: any) => item.terms?.length ? [`${item.pos ?? 'meaning'}: ${item.terms.slice(0, 8).join(', ')}`] : []).slice(0, 6);
  const examples = (payload.examples?.example ?? [])
    .map((item: any) => String(item.text ?? '').replace(/<\/?b>/g, '').trim())
    .filter((value: string) => value.length > 0)
    .slice(0, 4);
  const source = clean(payload.src).toLowerCase().split('-')[0] || sourceLanguage || 'auto';
  return { text: result, variants, examples, source };
}

/// Translates each example sentence so the card can show both halves. The
/// requests run together: four short sentences should not add four round trips
/// to a capture that the player is waiting on.
async function translateExamples(sentences: string[], language = 'ru', sourceLanguage = 'auto') {
  // Three short sentences, asked for at once rather than one after the other:
  // a card should not cost three round trips in a row.
  return Promise.all(
    sentences.slice(0, 3).map(async (sentence) => {
      try {
        const result = await translate(sentence, false, language, sourceLanguage);
        return {
          text: sentence,
          translation: result.text === UNAVAILABLE ? null : result.text,
        };
      } catch {
        return { text: sentence, translation: null };
      }
    }),
  );
}
/// Asks a language model what the highlighted expression means in its line.
///
/// A dictionary translates a word on its own, which is how "The kid doesn't
/// need any more static." became "не нужно больше статики" and how "exclusive"
/// becomes "эксклюзивный" — true, and of no use to someone learning. A model
/// reading the whole line answers with the sense a dubbing translator would
/// pick, plus ordinary Russian synonyms for it. It runs on Cloudflare next to
/// this worker, so it costs one call and no second account.
/// Two models, chosen by who is waiting. The player's popup appears while the
/// film is paused, so it takes the one that answers in about a second. A saved
/// card is written once and read for weeks, and nobody is watching the clock,
/// so it takes the slower model that reads idioms better: "Seize the day" as
/// "лови момент" rather than "хватить момент".
const SMART_MODEL_FAST = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const SMART_MODEL_DEEP = '@cf/openai/gpt-oss-120b';

/// The languages a card can be written in. English names, because that is what
/// the prompt is written in and what the model recognises.
const LANGUAGE_NAMES: Record<string, string> = {
  ru: 'Russian', en: 'English', et: 'Estonian', de: 'German', fr: 'French',
  es: 'Spanish', it: 'Italian', pt: 'Portuguese', pl: 'Polish', uk: 'Ukrainian',
  nl: 'Dutch', tr: 'Turkish', sv: 'Swedish', fi: 'Finnish',
};

const languageName = (code: string) => LANGUAGE_NAMES[code] ?? 'Russian';

/// Scripts decide two checks below: what a valid answer looks like, and
/// whether a word can be an English one spelled in the reader's alphabet.
const CYRILLIC_LANGUAGES = new Set(['ru', 'uk']);

/// The worked examples below are Russian, and they are what taught the model
/// to answer with a sense rather than a dictionary entry. They are only shown
/// when the reader's language is Russian: examples in the wrong language teach
/// the wrong thing. Every other language gets the same instructions without
/// them.
const RUSSIAN_EXAMPLES = `

Examples:
Highlighted: They threw him under the bus.
{"term_source":"threw him under the bus","line":"Они его подставили.","term":"подставили","synonyms":["предали","сдали","бросили на растерзание"],"note":"буквально: бросили под автобус"}

Highlighted: to be exclusive
{"term_source":"to be exclusive","line":"Быть доступным не для всех.","term":"быть исключительным","synonyms":["быть особым","быть только для избранных","быть эксклюзивным"],"note":""}

Highlighted: The kid doesn't need any more static.
{"term_source":"static","line":"Парню и без того хватает нотаций.","term":"нотации","synonyms":["придирки","нравоучения","упрёки"],"note":"буквально: помехи в эфире"}`;

const smartPrompt = (code: string, sourceCode = 'auto') => `You are a $LANG$ dubbing translator. A $LANG$ learner highlighted $SOURCE$ text in a line of film dialogue and wants to learn from it.

Render the line as a $LANG$ dub would speak it: a grammatical, natural sentence a person would really say. Never translate word for word.
Dialogue leans on figurative language. When the literal reading would puzzle a $LANG$ viewer, give the sense the speaker actually means.

Reply with one JSON object and nothing else:
{"term_source": "...", "line": "...", "term": "...", "synonyms": ["...", "..."], "note": "..."}

A Context line may come first: the rest of the subtitle around the highlighted text. Use it to decide which sense is meant - "No one wants a record." is about a criminal record when the scene is a police station. Never translate the context itself.

term_source - the expression to learn, copied exactly from the highlighted $SOURCE$ text.
  If the highlighted text is a whole sentence, choose the one expression in it a Russian learner would gain most from: the idiom, the phrasal verb, or the least predictable word. Never choose a name, a pronoun, or an everyday word such as "kid", "need", "go", "want".
  If the highlighted text is shorter than a sentence, repeat it unchanged - the learner chose it deliberately.
line - the highlighted text as natural spoken $LANG$. It must read as correct Russian on its own.
  Brand names are not translated and never turned into a Russian pet name: a Coke machine is "автомат с газировкой", never "автомат с Кокой". Either keep the brand as it is written, or use the ordinary Russian word for the thing itself.
term - what term_source means in THIS line: 1-4 words, the words a $LANG$ speaker would use here, in the same part of speech. No explanation, no quotes.
  Give it as a dictionary entry, not as it would be inflected in the sentence: a noun in its base form ("судимость", not "судимая"), an adjective in the masculine nominative, a verb in the aspect and tense the line uses.
  Never answer with the English word merely respelled in $LANG$ - эксклюзивный, статика, имидж, локация, контент teach a learner nothing. Lead with a genuinely Russian word and leave the borrowing for synonyms.
synonyms - 2 to 4 other $LANG$ words for that same sense, in the same part of speech, commonest first. Not repetitions of term, not near-spellings of the English word.
note - up to 8 $LANG$ words naming the literal image behind a figurative expression, e.g. "буквально: бросили под автобус". Leave it "" unless the expression really is figurative. Never write a label such as "идиома", "игра слов" or "фигуральное выражение" - name the image or say nothing.

`.replace(/\$LANG\$/g, languageName(code)).replace(/\$SOURCE\$/g, languageName(sourceCode)) + (code === 'ru' ? RUSSIAN_EXAMPLES : '');

/// Labels rather than meanings: the prompt forbids them, and a model that
/// slips one in has said nothing worth showing.
const EMPTY_NOTES = ['идиома', 'идиоматическое выражение', 'игра слов', 'фигуральное выражение', 'переносный смысл', 'метафора'];

function smartText(reply: any): string {
  if (typeof reply?.response === 'string') return reply.response;
  if (reply?.response && typeof reply.response === 'object') return JSON.stringify(reply.response);
  const choice = reply?.choices?.[0]?.message?.content;
  return typeof choice === 'string' ? choice : '';
}

/// The reader's language only, and never the headword repeated back. Models occasionally
/// emit a half-transliterated word ("кollision"); it is not a Russian word and
/// would only confuse the reader.
function synonymsFor(values: any, term: string, language: string): string[] {
  if (!Array.isArray(values)) return [];
  const cyrillic = CYRILLIC_LANGUAGES.has(language);
  // Written in the reader's alphabet and nothing else. A German answer must
  // not carry Cyrillic, and a Russian one must not carry Latin — either way it
  // means the model drifted mid-sentence.
  const shape = cyrillic ? /^[\p{Script=Cyrillic}\s'’-]+$/u : /^[^\p{Script=Cyrillic}]+$/u;
  const seen = new Set([term.toLowerCase()]);
  const kept: string[] = [];
  for (const value of values) {
    const word = clean(String(value ?? '')).replace(/^[«"']|[»"'.]$/g, '');
    if (!word || word.length > 40 || !/\p{L}/u.test(word)) continue;
    if (!shape.test(word)) continue;
    if (seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    kept.push(word);
  }
  return kept.slice(0, 4);
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
};

/// Strips a word down to the consonants that survive being borrowed, so that
/// "exclusive" and "эксклюзивный" can be recognised as the same word: x and ks
/// spell one sound, c and k another, and the vowels shift freely.
function skeleton(word: string): string {
  const latin = [...word.toLowerCase()]
    .map((letter) => CYRILLIC_TO_LATIN[letter] ?? letter)
    .join('')
    .replace(/x/g, 'ks')
    .replace(/ph/g, 'f')
    .replace(/[cq]/g, 'k');
  return latin.replace(/[^a-z]/g, '').replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');
}

function longestWord(text: string): string {
  return (text.match(/[\p{L}]+/gu) ?? []).sort((left, right) => right.length - left.length)[0] ?? '';
}

/// True when the Russian is really the English word in Russian letters.
/// "Эксклюзивный" tells a learner nothing they did not already know from
/// "exclusive"; "исключительный" does.
function isBorrowing(russian: string, english: string): boolean {
  const from = skeleton(longestWord(russian));
  const to = skeleton(longestWord(english));
  if (from.length < 4 || to.length < 4) return false;
  let shared = 0;
  while (shared < from.length && shared < to.length && from[shared] === to[shared]) shared += 1;
  return shared >= 4;
}

async function smartReading(env: Env, line: string, context = '', model = SMART_MODEL_FAST, language = 'ru', sourceLanguage = 'auto') {
  const around = clean(context);
  const question = around && around.toLowerCase() !== line.toLowerCase()
    ? `Context: ${around}\nHighlighted: ${line}`
    : `Highlighted: ${line}`;
  try {
    const reply = await env.AI.run(model, {
      messages: [
        { role: 'system', content: smartPrompt(language, sourceLanguage) },
        { role: 'user', content: question },
      ],
      // The deeper model reasons before it answers, and that reasoning is
      // charged against the same budget: too small a budget cuts the JSON off
      // mid-object.
      max_tokens: model === SMART_MODEL_DEEP ? 1600 : 600,
      temperature: 0,
    });
    // Models sometimes wrap the object in prose or a code fence.
    const body = smartText(reply).match(/\{[\s\S]*\}/)?.[0];
    if (!body) return null;
    const parsed = JSON.parse(body);
    const meaning = clean(String(parsed.term ?? parsed.term_ru ?? ''));
    const sentence = clean(String(parsed.line ?? parsed.line_ru ?? ''));
    // A model that answers "скуру himself" has lost the thread; the dictionary
    // reading is then the honest one to keep. The check has to know the script
    // it is expecting: demanding Cyrillic would reject every correct German
    // answer, and demanding no Latin letters would reject all of them.
    if (!meaning || meaning.length > 60) return null;
    if (!/\p{L}/u.test(meaning)) return null;
    if (CYRILLIC_LANGUAGES.has(language) && !/\p{Script=Cyrillic}/u.test(meaning)) return null;
    if (CYRILLIC_LANGUAGES.has(language) && /[A-Za-z]/.test(meaning)) return null;
    const note = clean(String(parsed.note ?? parsed.note_ru ?? ''));
    // `term_en` keeps older cloud responses readable.  New responses call it
    // what it is: a term in the subtitle's source language.
    const english = clean(String(parsed.term_source ?? parsed.term_en ?? '')) || line;
    let term = meaning;
    let synonyms = synonymsFor(parsed.synonyms ?? parsed.synonyms_ru, meaning, language);
    // The model is told to lead with a Russian word and still answers
    // "быть эксклюзивным" now and then. When it does, the first synonym that
    // is a real Russian word takes the front, and the borrowing joins the rest.
    if (CYRILLIC_LANGUAGES.has(language) && isBorrowing(term, english)) {
      const native = synonyms.find((word) => !isBorrowing(word, english));
      if (native) {
        synonyms = [term, ...synonyms.filter((word) => word !== native)].slice(0, 4);
        term = native;
      }
    }
    return {
      english,
      line: sentence && sentence.length <= 400 ? sentence : '',
      term,
      synonyms,
      note: note && note.length <= 80 && !EMPTY_NOTES.includes(note.toLowerCase()) ? note : null,
    };
  } catch {
    // A card built from the dictionary alone is still a usable card.
    return null;
  }
}

/// Finds or creates the account behind a Google credential.
///
/// Every way into the account ends here — the phone's own sign-in button, and
/// the page a browser or the Windows program opens — so there is one notion of
/// who you are and the same library everywhere.
async function googleAccount(env: Env, idToken: string) {
  const verified: any = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)).json();
  if (verified.aud !== CLIENT_ID || !verified.email) throw new Error('Google sign-in could not be verified');
  const email = String(verified.email).toLowerCase();
  const found = await env.DB.prepare('SELECT id, email, display_name FROM users WHERE email = ?').bind(email).first<any>();
  if (found) return found as { id: string; email: string; display_name: string };
  const user = { id: uid(), email, display_name: verified.name || email.split('@')[0] };
  await env.DB.prepare('INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)').bind(user.id, user.email, user.display_name, now()).run();
  return user;
}


/// The personalised Google button rides on FedCM, which browsers can switch
/// off - and when it is off, the button simply does nothing when clicked. The
/// plain popup flow returns an access token instead, so this turns one into an
/// account the same way the id token path does.
async function googleAccountFromAccess(env: Env, accessToken: string) {
  const who: any = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  })).json();
  if (!who?.email) throw new Error('Google sign-in could not be verified');
  const email = String(who.email).toLowerCase();
  const found = await env.DB.prepare('SELECT id, email, display_name FROM users WHERE email = ?').bind(email).first<any>();
  if (found) return found as { id: string; email: string; display_name: string };
  const user = { id: uid(), email, display_name: who.name || email.split('@')[0] };
  await env.DB.prepare('INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)').bind(user.id, user.email, user.display_name, now()).run();
  return user;
}

/// The sign-in page in the reader's own language. It is opened from a browser
/// whose interface is already translated and from a Windows program that
/// follows the system language, so arriving at an English page is a jolt.
const LINK_TEXT: Record<string, Record<string, string>> = {
  en: { title: 'Connect this device', intro: 'Sign in with the same Google account you use on your phone, and everything you save here lands in the same library.', type: 'Type the eight-character code shown on the device:', note: 'Nothing else is asked for - only your name and e-mail, so the library knows whose it is.', connecting: 'Connecting…', needCode: 'Type the code from the device first.', failed: 'Could not connect', blocked: 'Google sign-in could not load here. Approve the code in the phone app instead.', done: 'Connected. You can close this page and go back.' , button: 'Continue with Google' , sync: 'Sync with the app' },
  ru: { title: 'Подключить это устройство', intro: 'Войдите тем же аккаунтом Google, что и на телефоне: всё сохранённое здесь попадёт в ту же библиотеку.', type: 'Введите восьмизначный код, показанный на устройстве:', note: 'Больше ничего не спрашивается - только имя и почта, чтобы библиотека знала, чья она.', connecting: 'Подключаю…', needCode: 'Сначала введите код с устройства.', failed: 'Не удалось подключить', blocked: 'Вход через Google здесь не загрузился. Подтвердите код в приложении на телефоне.', done: 'Готово. Можно закрыть эту страницу и вернуться назад.' , button: 'Войти через Google' , sync: 'Синхронизация с приложением' },
  et: { title: 'Ühenda see seade', intro: 'Logi sisse sama Google’i kontoga, mida kasutad telefonis - kõik siin salvestatu jõuab samasse kogusse.', type: 'Sisesta seadmes näidatud kaheksakohaline kood:', note: 'Rohkem midagi ei küsita - ainult nimi ja e-post, et kogu teaks, kelle oma see on.', connecting: 'Ühendan…', needCode: 'Sisesta esmalt seadme kood.', failed: 'Ühendamine ebaõnnestus', blocked: 'Google’i sisselogimine ei laadinud siin. Kinnita kood telefonirakenduses.', done: 'Valmis. Selle lehe võib sulgeda ja tagasi minna.' , button: 'Jätka Google’iga' , sync: 'Sünkroonimine rakendusega' },
  de: { title: 'Dieses Gerät verbinden', intro: 'Melden Sie sich mit demselben Google-Konto an wie auf dem Telefon - alles Gespeicherte landet in derselben Sammlung.', type: 'Geben Sie den achtstelligen Code vom Gerät ein:', note: 'Mehr wird nicht abgefragt - nur Name und E-Mail, damit die Sammlung weiß, wem sie gehört.', connecting: 'Verbinde…', needCode: 'Geben Sie zuerst den Code vom Gerät ein.', failed: 'Verbindung fehlgeschlagen', blocked: 'Die Google-Anmeldung konnte hier nicht geladen werden. Bestätigen Sie den Code in der Telefon-App.', done: 'Verbunden. Sie können diese Seite schließen.' , button: 'Mit Google fortfahren' , sync: 'Mit der App synchronisieren' },
  fr: { title: 'Connecter cet appareil', intro: 'Connectez-vous avec le compte Google de votre téléphone : tout ce que vous enregistrez ici rejoint la même bibliothèque.', type: 'Saisissez le code à huit caractères affiché sur l’appareil :', note: 'Rien d’autre n’est demandé - seulement votre nom et votre e-mail, pour savoir à qui appartient la bibliothèque.', connecting: 'Connexion…', needCode: 'Saisissez d’abord le code de l’appareil.', failed: 'Connexion impossible', blocked: 'La connexion Google n’a pas pu se charger ici. Validez le code dans l’application du téléphone.', done: 'Connecté. Vous pouvez fermer cette page.' , button: 'Continuer avec Google' , sync: 'Synchroniser avec l’application' },
  es: { title: 'Conectar este dispositivo', intro: 'Inicia sesión con la misma cuenta de Google que en el teléfono: todo lo que guardes aquí irá a la misma biblioteca.', type: 'Escribe el código de ocho caracteres que muestra el dispositivo:', note: 'No se pide nada más: solo tu nombre y tu correo, para saber de quién es la biblioteca.', connecting: 'Conectando…', needCode: 'Escribe primero el código del dispositivo.', failed: 'No se pudo conectar', blocked: 'El inicio de sesión de Google no se cargó aquí. Aprueba el código en la app del teléfono.', done: 'Conectado. Ya puedes cerrar esta página.' , button: 'Continuar con Google' , sync: 'Sincronizar con la aplicación' },
  it: { title: 'Collega questo dispositivo', intro: 'Accedi con lo stesso account Google del telefono: tutto ciò che salvi qui finisce nella stessa raccolta.', type: 'Digita il codice di otto caratteri mostrato sul dispositivo:', note: 'Non viene chiesto altro: solo nome ed e-mail, perché la raccolta sappia di chi è.', connecting: 'Collegamento…', needCode: 'Digita prima il codice del dispositivo.', failed: 'Impossibile collegare', blocked: 'L’accesso Google non si è caricato qui. Approva il codice nell’app del telefono.', done: 'Collegato. Puoi chiudere questa pagina.' , button: 'Continua con Google' , sync: 'Sincronizza con l’app' },
  pt: { title: 'Conectar este dispositivo', intro: 'Entre com a mesma conta do Google do celular - tudo o que você salvar aqui vai para a mesma biblioteca.', type: 'Digite o código de oito caracteres mostrado no dispositivo:', note: 'Nada mais é pedido - só nome e e-mail, para a biblioteca saber de quem é.', connecting: 'Conectando…', needCode: 'Digite primeiro o código do dispositivo.', failed: 'Não foi possível conectar', blocked: 'O login do Google não carregou aqui. Aprove o código no app do celular.', done: 'Conectado. Você já pode fechar esta página.' , button: 'Continuar com Google' , sync: 'Sincronizar com a aplicação' },
  pl: { title: 'Połącz to urządzenie', intro: 'Zaloguj się tym samym kontem Google co w telefonie - wszystko, co tu zapiszesz, trafi do tej samej biblioteki.', type: 'Wpisz ośmioznakowy kod pokazany na urządzeniu:', note: 'O nic więcej nie pytamy - tylko imię i e-mail, żeby biblioteka wiedziała, czyja jest.', connecting: 'Łączę…', needCode: 'Najpierw wpisz kod z urządzenia.', failed: 'Nie udało się połączyć', blocked: 'Logowanie Google nie wczytało się tutaj. Zatwierdź kod w aplikacji na telefonie.', done: 'Połączono. Możesz zamknąć tę stronę.' , button: 'Kontynuuj z Google' , sync: 'Synchronizacja z aplikacją' },
  uk: { title: 'Підключити цей пристрій', intro: 'Увійдіть тим самим обліковим записом Google, що й на телефоні: усе збережене потрапить до тієї самої бібліотеки.', type: 'Введіть восьмизначний код, показаний на пристрої:', note: 'Більше нічого не запитується - лише ім’я та пошта, щоб бібліотека знала, чия вона.', connecting: 'Підключаю…', needCode: 'Спершу введіть код із пристрою.', failed: 'Не вдалося підключити', blocked: 'Вхід через Google тут не завантажився. Підтвердіть код у застосунку на телефоні.', done: 'Готово. Цю сторінку можна закрити.' , button: 'Увійти через Google' , sync: 'Синхронізація із застосунком' },
  nl: { title: 'Dit apparaat verbinden', intro: 'Meld je aan met hetzelfde Google-account als op je telefoon - alles wat je hier bewaart, komt in dezelfde bibliotheek.', type: 'Typ de code van acht tekens die op het apparaat staat:', note: 'Meer wordt niet gevraagd - alleen je naam en e-mail, zodat de bibliotheek weet van wie die is.', connecting: 'Verbinden…', needCode: 'Typ eerst de code van het apparaat.', failed: 'Verbinden lukte niet', blocked: 'Google-aanmelding kon hier niet laden. Keur de code goed in de telefoon-app.', done: 'Verbonden. Je kunt deze pagina sluiten.' , button: 'Doorgaan met Google' , sync: 'Synchroniseren met de app' },
  tr: { title: 'Bu cihazı bağla', intro: 'Telefonunuzdaki Google hesabıyla giriş yapın; burada kaydettiğiniz her şey aynı kütüphaneye gider.', type: 'Cihazda görünen sekiz karakterli kodu yazın:', note: 'Başka bir şey istenmez - yalnızca adınız ve e-postanız, kütüphanenin kime ait olduğu bilinsin diye.', connecting: 'Bağlanıyor…', needCode: 'Önce cihazdaki kodu yazın.', failed: 'Bağlanılamadı', blocked: 'Google girişi burada yüklenemedi. Kodu telefon uygulamasında onaylayın.', done: 'Bağlandı. Bu sayfayı kapatabilirsiniz.' , button: 'Google ile devam et' , sync: 'Uygulamayla eşitle' },
  sv: { title: 'Anslut den här enheten', intro: 'Logga in med samma Google-konto som i telefonen - allt du sparar hamnar i samma bibliotek.', type: 'Skriv den åttatecken långa koden som visas på enheten:', note: 'Inget annat efterfrågas - bara namn och e-post, så att biblioteket vet vems det är.', connecting: 'Ansluter…', needCode: 'Skriv först koden från enheten.', failed: 'Kunde inte ansluta', blocked: 'Google-inloggningen kunde inte laddas här. Godkänn koden i telefonappen i stället.', done: 'Ansluten. Du kan stänga sidan.' , button: 'Fortsätt med Google' , sync: 'Synkronisera med appen' },
  fi: { title: 'Yhdistä tämä laite', intro: 'Kirjaudu samalla Google-tilillä kuin puhelimessa - kaikki tallentamasi päätyy samaan kirjastoon.', type: 'Kirjoita laitteessa näkyvä kahdeksanmerkkinen koodi:', note: 'Muuta ei kysytä - vain nimi ja sähköposti, jotta kirjasto tietää kenen se on.', connecting: 'Yhdistetään…', needCode: 'Kirjoita ensin laitteen koodi.', failed: 'Yhdistäminen ei onnistunut', blocked: 'Google-kirjautuminen ei latautunut tässä. Hyväksy koodi puhelimen sovelluksessa.', done: 'Yhdistetty. Voit sulkea tämän sivun.' , button: 'Jatka Google-tilillä' , sync: 'Synkronoi sovelluksen kanssa' },
};

/// The language asked for, or the best of the ones the browser says it reads.
function linkLanguage(url: URL, request: Request): string {
  const asked = clean(url.searchParams.get('lang')).toLowerCase().split('-')[0];
  if (LINK_TEXT[asked]) return asked;
  for (const part of (request.headers.get('accept-language') ?? '').split(',')) {
    const code = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (LINK_TEXT[code]) return code;
  }
  return 'en';
}

/// The page a browser or the Windows program sends you to in order to sign in.
///
/// Neither of them can show a Google sign-in dialog itself: an extension has no
/// registered Google client, and a desktop program has no browser. Both can
/// open a web page, so the page does the signing in and hands the finished
/// session back through the pairing code they already hold. Scanning the same
/// link with a phone works too — the camera opens this page, and the phone's
/// own scanner reads the code out of the address.
const linkPage = (code: string, lang: string) => {
  const say = LINK_TEXT[lang] ?? LINK_TEXT.en;
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subtitle Notes — connect</title>
<script src="https://accounts.google.com/gsi/client" async></script>
<style>
  :root { --paper:#faf8f4; --ink:#14201c; --soft:#6b7a74; --hair:#e2ddd3; --accent:#1e7a4c; --wash:#e7f2ea; }
  @media (prefers-color-scheme: dark) {
    :root { --paper:#151b19; --ink:#eaf1ed; --soft:#93a49c; --hair:#2a3733; --accent:#64c795; --wash:#1d2a25; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100dvh; display:flex; align-items:center; justify-content:center;
         padding:24px; background:var(--paper); color:var(--ink);
         font:16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width:100%; max-width:26rem; }
  h1 { margin:0 0 6px; font-size:1.5rem; line-height:1.2; letter-spacing:-.02em; font-weight:640; text-wrap:balance; }
  p { margin:0 0 18px; color:var(--soft); font-size:14.5px; }
  .code { margin:0 0 20px; padding:13px; border:1px solid var(--hair); border-left:3px solid var(--accent);
          border-radius:12px; text-align:center; font:640 25px/1.1 ui-monospace, Consolas, monospace;
          letter-spacing:.24em; text-indent:.24em; }
  input { width:100%; padding:12px; margin-bottom:14px; border:1px solid var(--hair); border-radius:11px;
          background:transparent; color:var(--ink); text-align:center; text-transform:uppercase;
          font:640 19px ui-monospace, Consolas, monospace; letter-spacing:.18em; }
  #button { display:flex; justify-content:center; min-height:44px; }
  .enter { border:0; border-radius:999px; padding:13px 26px; font:inherit; font-weight:700;
           color:#fff; background:var(--accent); cursor:pointer;
           transition:transform .12s, filter .16s, box-shadow .16s; }
  .enter:hover { filter:brightness(1.07); box-shadow:0 10px 24px rgb(20 60 40/.18); }
  .enter:active { transform:translateY(1px) scale(.985); }
  .note { margin:18px 0 0; font-size:13px; color:var(--soft); }
  .done { padding:16px; border-radius:12px; background:var(--wash); color:var(--accent); font-weight:640; text-align:center; }
  .fail { color:#c0453f; font-weight:600; font-size:14px; }
  [hidden] { display:none !important; }
</style></head><body><main>
  <div id="ask">
    <h1>Subtitle Notes</h1>
    <p>${say.sync}</p>
    ${code
      // The code belongs to the other way in. This page was opened by a
      // button that already carries it, so it stays out of sight unless
      // the reader asks for it.
      ? `<div class="code" id="codeBox" hidden>${code}</div>
         <button class="asCode" id="showCode">${say.type}</button>`
      : `<p style="margin-bottom:8px">${say.type}</p><input id="typed" maxlength="8" autocomplete="off" spellcheck="false" placeholder="ABCD2345">`}
    <div id="button"></div>
    <p class="note" id="note"></p>
  </div>
  <div id="ok" hidden><div class="done">${say.done}</div></div>
</main>
<script>
  const CODE = ${JSON.stringify(code)};
  const SAY = ${JSON.stringify(LINK_TEXT[lang] ?? LINK_TEXT.en)};
  const note = document.getElementById('note');
  const codeNow = () => (CODE || (document.getElementById('typed')?.value ?? '')).trim().toUpperCase();

  async function connect(credential) {
    const code = codeNow();
    if (!code) { note.className = 'note fail'; note.textContent = SAY.needCode; return; }
    note.className = 'note'; note.textContent = SAY.connecting;
    const reply = await fetch('/v1/pairings/approve-google', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, access_token: credential }),
    });
    const body = await reply.json().catch(() => ({}));
    if (!reply.ok) { note.className = 'note fail'; note.textContent = body.detail || SAY.failed; return; }
    document.getElementById('ask').hidden = true;
    document.getElementById('ok').hidden = false;
  }

  document.getElementById('showCode')?.addEventListener('click', (event) => {
    document.getElementById('codeBox').hidden = false;
    event.target.hidden = true;
  });

  window.addEventListener('load', () => {
    // The library loads from Google; if it is blocked, say so rather than
    // leaving an empty space where a button should be.
    if (!window.google?.accounts?.id) {
      setTimeout(() => {
        if (window.google?.accounts?.id) return start();
        note.className = 'note fail';
        note.textContent = SAY.blocked;
      }, 2500);
    }
    start();
  });

  function start() {
    // Straight to Google and back, carrying the pairing code in the state:
    // popups get blocked and the rendered Google button needs FedCM, which a
    // browser may have switched off.
    const holder = document.getElementById('button');
    holder.innerHTML = '<button class="enter" id="enter"></button>';
    document.getElementById('enter').textContent = SAY.button;
    document.getElementById('enter').addEventListener('click', () => {
      const code = codeNow();
      if (!code) { note.className = 'note fail'; note.textContent = SAY.needCode; return; }
      note.className = 'note';
      note.textContent = SAY.connecting;
      location.href = 'https://accounts.google.com/o/oauth2/v2/auth' +
        '?client_id=' + encodeURIComponent(${JSON.stringify(CLIENT_ID)}) +
        '&redirect_uri=' + encodeURIComponent(location.origin + '/link') +
        '&response_type=token&scope=' + encodeURIComponent('openid email profile') +
        '&include_granted_scopes=true&prompt=select_account&state=' +
        encodeURIComponent(code + '.' + document.documentElement.lang);
    });

    const back = location.hash.match(/access_token=([^&]+)/);
    const state = location.hash.match(/state=([^&]+)/);
    if (back && state) {
      const [code, lang] = decodeURIComponent(state[1]).split('.');
      if (lang && lang !== document.documentElement.lang) {
        // Google hands the page back without the query, so it arrives in the
        // browser's language; load the asked-for one, token and all.
        location.replace(location.pathname + '?code=' + code + '&lang=' + lang + location.hash);
        return;
      }
      history.replaceState(null, '', location.pathname + '?code=' + code);
      const field = document.getElementById('typed');
      if (field) field.value = code;
      connect(decodeURIComponent(back[1]));
    }
  }
</script></body></html>`;
};

/// A real library for the computer, not the twelve-item "recent" list in the
/// extension popup.  It deliberately has no build step or separate hosting:
/// opening `/library` on the same Worker gives it the same Google account and
/// API origin as the phone, even on a borrowed computer.
const PAGE_STYLE = `
  :root { color-scheme: light dark; }
  body { margin: 0 auto; padding: 2.5rem 1.25rem; max-width: 34rem;
         font: 16px/1.6 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  h1 { font-size: 1.6rem; line-height: 1.25; }
  h2 { font-size: 1.15rem; margin-top: 2rem; }
  li { margin-bottom: .5rem; }
  code { padding: .1rem .3rem; border-radius: .25rem; background: rgba(127,127,127,.18); }
  .updated { color: #888; font-size: .9rem; }`;

/// Google Play will not publish an app that collects an email address without
/// a policy that says so. It is served from the worker for the same reason as
/// the deletion page: one less thing that can quietly go offline.
const PRIVACY_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subtitle Notes — Privacy Policy</title>
<style>${PAGE_STYLE}</style></head><body>
<h1>Privacy Policy</h1>
<p class="updated">Subtitle Notes &middot; last updated 17 August 2026</p>

<p>Subtitle Notes saves words you highlight while watching something, translates
them, and keeps them so you can study them later. This page says exactly what is
stored and who else sees it.</p>

<h2>What is collected</h2>
<ul>
  <li><strong>Your Google account email and display name.</strong> Used only to
      recognise you when you sign in and to keep your words separate from
      everyone else's. No password is ever seen or stored.</li>
  <li><strong>The text you highlight</strong>, its translation, and the title,
      season, episode and timecode of what you were watching.</li>
  <li><strong>A nickname, your friend list and your likes</strong>, if you choose
      to use the social part of the app. Your nickname and the words you save
      are visible to people you are friends with; you can turn that off in
      Settings.</li>
</ul>
<p>There is no advertising, no analytics, no tracking across other apps or
sites, and nothing is sold or shared for marketing.</p>

<h2>Who else sees the text</h2>
<p>To translate a highlighted line, the text of that line is sent to Google
Translate and to Cloudflare Workers AI. Only the line itself is sent — never
your email, your name, or anything identifying you. These services translate the
text and return the result.</p>

<h2>Where it is stored</h2>
<p>In a Cloudflare D1 database, reachable only through this application's
interface. Your words are kept until you delete them or delete your account.</p>

<h2>Deleting your data</h2>
<p>Delete a single word by swiping it away in the app. To remove everything,
open <strong>Settings &rarr; Delete account</strong>, or follow the steps at
<a href="/delete-account">/delete-account</a>. Deletion is immediate and cannot
be undone.</p>

<h2>Children</h2>
<p>The app is not directed at children under 13 and does not knowingly collect
their data.</p>

<h2>Contact</h2>
<p><a href="mailto:andreas.sultseng228@gmail.com">andreas.sultseng228@gmail.com</a></p>
</body></html>`;

const DELETE_ACCOUNT_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Delete your Subtitle Notes account</title>
<style>${PAGE_STYLE}</style></head><body>
<h1>Delete your Subtitle Notes account</h1>
<p>Deleting the account removes everything it holds: your saved words and their
translations, your likes, your friend connections, and any paired computers.
Nothing is kept afterwards, and the deletion cannot be undone.</p>
<h2>From the app</h2>
<ol>
  <li>Open <strong>Subtitle Notes</strong> on your phone.</li>
  <li>Go to <strong>Settings</strong>.</li>
  <li>Choose <strong>Delete account</strong> and confirm.</li>
</ol>
<h2>Without the app</h2>
<p>Write to <a href="mailto:andreas.sultseng228@gmail.com?subject=Delete%20my%20Subtitle%20Notes%20account">andreas.sultseng228@gmail.com</a>
from the email address you signed in with. The account is deleted within 30 days
of the request, and usually the same week.</p>
</body></html>`;

async function card(row: any) { return { ...row, archived: Boolean(row.archived), synonyms: JSON.parse(row.synonyms_json ?? '[]'), sense_note: row.sense_note ?? null, variants: undefined, examples: undefined, created_at: row.created_at }; }

/// Days until a word is shown again, by how many times in a row it has been
/// remembered. The last rung is nearly half a year, which is the point at which
/// a word is simply known.
const REVIEW_LADDER = [0, 1, 3, 7, 16, 35, 75, 160];

/// Nicknames are public, so they are kept short, unambiguous and free of
/// characters that would let one name imitate another.
function nicknameProblem(value: string): string | null {
  if (value.length < 3) return 'A nickname needs at least 3 characters';
  if (value.length > 20) return 'A nickname can be at most 20 characters';
  if (!/^[A-Za-z0-9_.]+$/.test(value)) return 'Use letters, numbers, dots and underscores only';
  if (!/[A-Za-z0-9]/.test(value)) return 'A nickname needs at least one letter or number';
  return null;
}

function person(row: any) {
  return {
    id: row.id,
    nickname: row.nickname ?? null,
    display_name: row.display_name ?? '',
    word_count: Number(row.word_count ?? 0),
    following: Number(row.following ?? 0) > 0,
  };
}

async function profile(env: Env, id: string) {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.nickname, u.share_feed, u.language,
            (SELECT COUNT(*) FROM friendships f WHERE f.follower_id = u.id) AS friend_count,
            (SELECT COUNT(*) FROM friendships f WHERE f.friend_id = u.id) AS follower_count
       FROM users u WHERE u.id = ?`
  ).bind(id).first<any>();
  if (!row) throw new Error('Unauthorized');
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? '',
    nickname: row.nickname ?? null,
    share_feed: Number(row.share_feed ?? 1) > 0,
    language: row.language || 'ru',
    friend_count: Number(row.friend_count ?? 0),
    follower_count: Number(row.follower_count ?? 0),
  };
}
/// Picks the dictionary sense that the sentence actually used.
///
/// Translated on its own, "chanting" comes back as "пение", while the line it
/// came from says "повторяю". The sentence translation already contains the
/// right sense, so the variant whose stem appears there wins.
function contextualSense(variants: string[], sentence: string): string | null {
  const sentenceWords = (sentence.toLowerCase().match(/[\p{L}]+/gu) ?? []);
  if (!sentenceWords.length) return null;
  for (const variant of variants) {
    const terms = variant.replace(/^[^:]*:\s*/, '').split(/,\s*/);
    for (const term of terms) {
      const word = term.trim().toLowerCase();
      // Match on a four-letter stem against whole words, so the infinitive
      // "копить" recognises "копили" without "про" matching everything.
      const stem = word.slice(0, 4);
      if (stem.length < 4) continue;
      if (sentenceWords.some((candidate) => candidate.startsWith(stem))) {
        return term.trim();
      }
    }
  }
  return null;
}

function mergeVariants(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    for (const variant of group) {
      const key = variant.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(variant);
    }
  }
  return merged.slice(0, 8);
}

/// A deliberate two- or three-word selection is kept whole, and the model is
/// never allowed to break one up. A whole sentence is different: the rule there
/// can only guess, and it guesses the first content word — which is how "The
/// kid doesn't need any more static." became a card about "kid". The model may
/// narrow a sentence, and only that: its answer has to be words that really
/// appear in the line, and fewer of them than were highlighted.
function narrowed(selected: string, suggestion: string | undefined): string | null {
  if (!suggestion) return null;
  const count = (text: string) => wordsIn(text).length;
  const size = count(suggestion);
  if (!size || size > PHRASE_MAX_WORDS || size >= count(selected)) return null;
  // "They made her out to be a hero" is worth learning as "made her out to
  // be". Narrowed to "made" — or to "out to" — it is a card about nothing.
  const words = wordsIn(suggestion.toLowerCase());
  // The check is useful for English (it prevents an AI from answering "to"),
  // but other language stop lists would only invent a new source-language
  // restriction. Their model-picked phrase is therefore trusted as long as
  // it is actually part of the highlighted line.
  if (/[A-Za-z]/.test(suggestion) && !words.some((word) => !stop.has(word))) return null;
  return selected.toLowerCase().includes(suggestion.toLowerCase()) ? suggestion : null;
}

/// The expression as a key: the same words, however they were capitalised or
/// punctuated, are the same correction.
const termKey = (value: string) => value.trim().toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, '').replace(/\s+/g, ' ');

/// How many different people have to write the same correction before it
/// becomes the answer everybody gets. Two is a coincidence; three is a
/// dictionary.
const CORRECTION_QUORUM = 3;

/// The reading the readers themselves settled on, if they settled on one.
async function agreedCorrection(env: Env, term: string, language: string) {
  if (!term) return null;
  const row = await env.DB.prepare(
    `SELECT suggestion, COUNT(*) AS votes FROM corrections
      WHERE term = ? AND language = ?
      GROUP BY lower(suggestion) ORDER BY votes DESC, MAX(created_at) DESC LIMIT 1`
  ).bind(termKey(term), language).first<any>();
  return row && Number(row.votes) >= CORRECTION_QUORUM ? String(row.suggestion) : null;
}

async function enrich(env: Env, selected: string, context = '', language = 'ru') {
  // Detect first.  The old order treated a Spanish line as English in both
  // the model prompt and the dictionary, so neither answer was trustworthy.
  const main = await translate(selected, false, language);
  const sourceLanguage = main.source;
  const smart = await smartReading(
    env,
    selected,
    context,
    SMART_MODEL_DEEP,
    language,
    sourceLanguage,
  );
  const deliberatePhrase = isDeliberatePhrase(selected);
  const learning = deliberatePhrase ? null : narrowed(selected, smart?.english);
  const item = focus(learning ?? selected, sourceLanguage);
  // Dictionary entries live under the base form. Asked about "hoarding" the
  // dictionary answers with a noun meaning a fence; asked about "hoard" it
  // gives the verb the sentence actually used. The same lookup carries the
  // usage examples, so this costs no extra requests.
  const phraseTerm = item.phrase || learning || selected;
  // The base form is always consulted as well, and both entries are kept: a
  // word can be a noun in the dictionary and a verb in the line, and the
  // reader deserves to see both. Neither lookup depends on the other, so they
  // go out together rather than one after the other.
  const baseForm = (sourceLanguage === 'en' ? headwords(item.word) : [])
    .slice(1)
    .find((form) => form !== phraseTerm.toLowerCase());
  const [inflected, base] = await Promise.all([
    translate(phraseTerm, true, language, sourceLanguage),
    baseForm ? translate(baseForm, true, language, sourceLanguage) : Promise.resolve(null),
  ]);
  const focusResult = {
    text: inflected.text,
    variants: mergeVariants(inflected.variants, base?.variants ?? []),
    examples: inflected.examples.length ? inflected.examples : (base?.examples ?? []),
  };
  const examples = await translateExamples(focusResult.examples, language, sourceLanguage);
  // The selected line itself is worth keeping as the first example when it is
  // a phrase rather than a bare word.
  const isSentence = wordsIn(selected).length > 1;
  if (isSentence) examples.unshift({ text: selected, translation: main.text });
  const variants = focusResult.variants.length ? focusResult.variants : main.variants;
  const isSingleWord = wordsIn(selected).length === 1;
  // What enough readers have already agreed this expression means, if they
  // have. Their wording wins over the model's.
  const agreed = await agreedCorrection(env, item.phrase || item.word || selected, language);
  return {
    source_lang: main.source || '',
    corrected: Boolean(agreed),
    translation: deliberatePhrase ? main.text : (smart?.line || main.text),
    focus_word: item.word,
    focus_phrase: item.phrase,
    // The reading of the line wins; the dictionary is what is left when the
    // model could not be reached. For a word picked out of a sentence, the
    // sense used in that sentence still beats the dictionary's first entry.
    focus_translation:
      agreed ??
      (deliberatePhrase
        ? main.text
        : (smart?.term ??
            ((isSingleWord ? null : contextualSense(variants, main.text)) ??
                focusResult.text))),
    synonyms: deliberatePhrase ? variants : (smart?.synonyms ?? []),
    sense_note: deliberatePhrase ? null : (smart?.note ?? null),
    variants,
    examples: examples.slice(0, 5),
    source_language: sourceLanguage,
  };
}
async function upsertSelection(env: Env, owner: string, input: any, enriched?: any) {
  const selected = clean(input.selected_text); const data = enriched ?? input; const word = clean(data.focus_word); const phrase = clean(data.focus_phrase); const key = focusKey(phrase, word, selected);
  const rows = await env.DB.prepare('SELECT * FROM selections WHERE owner_id = ?').bind(owner).all<any>();
  const existing = rows.results.find(row => row.client_key === clean(input.client_key) || focusKey(row.focus_phrase, row.focus_word, row.selected_text) === key);
  if (existing) {
    const repairable = String(existing.translation ?? '') === UNAVAILABLE && clean(data.translation) && clean(data.translation) !== UNAVAILABLE;
    if (repairable) {
      await env.DB.prepare('UPDATE selections SET archived = 0, created_at = ?, seen_count = seen_count + 1, translation = ?, focus_word = ?, focus_phrase = ?, focus_translation = ?, synonyms_json = ?, sense_note = ?, variants_json = ?, examples_json = ? WHERE id = ?')
        .bind(now(), clean(data.translation), word || null, phrase || null, clean(data.focus_translation) || null, JSON.stringify(data.synonyms ?? []), clean(data.sense_note) || null, JSON.stringify(data.variants ?? []), JSON.stringify(data.examples ?? []), existing.id).run();
    } else {
      await env.DB.prepare('UPDATE selections SET archived = 0, created_at = ?, seen_count = seen_count + 1 WHERE id = ?').bind(now(), existing.id).run();
    }
    // Marked so a caller that saved without asking — the browser extension's
    // instant capture — can offer to undo a card it created without offering
    // to delete one the library already had.
    const row = await env.DB.prepare('SELECT * FROM selections WHERE id = ?').bind(existing.id).first<any>();
    return { ...row, reused: true };
  }
  const id = uid();
  await env.DB.prepare(`INSERT INTO selections (id, owner_id, client_key, media_title, season, episode, timecode_ms, selected_text, translation, focus_word, focus_phrase, focus_translation, synonyms_json, sense_note, variants_json, examples_json, context, created_at, source_lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, owner, clean(input.client_key), clean(input.media_title) || 'Unknown title', input.season ?? null, input.episode ?? null, input.timecode_ms ?? null, selected, clean(data.translation) || 'Translation unavailable', word || null, phrase || null, clean(data.focus_translation) || null, JSON.stringify(data.synonyms ?? []), clean(data.sense_note) || null, JSON.stringify(data.variants ?? []), JSON.stringify(data.examples ?? []), input.context ?? null, now(), clean(data.source_lang) || null).run();
  return env.DB.prepare('SELECT * FROM selections WHERE id = ?').bind(id).first();
}

export default { async fetch(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(request.url); const path = url.pathname;
  try {
    if (path === '/health') return json({ status: 'ok' });
    if (path === '/desktop/latest') return json(DESKTOP_LATEST);
    // Google Play asks for a page that explains how to delete the account and
    // is reachable without installing anything, so it is served here rather
    // than depending on a separate site staying up.
    if (path === '/delete-account') return new Response(DELETE_ACCOUNT_PAGE, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
    if (path === '/privacy') return new Response(PRIVACY_PAGE, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
    // Opened by the browser extension and by the Windows program, and by a
    // phone camera pointed at the code they show.
    if (path === '/link') {
      const code = clean(url.searchParams.get('code')).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      return new Response(linkPage(code, linkLanguage(url, request)), { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
    }
    // `/library` is kept for people who bookmarked it during development;
    // `/web-library` avoids a legacy route name that was already claimed by
    // an older worker deployment on this account.
    if (path === '/library' || path === '/web-library') {
      return new Response(libraryPage(linkLanguage(url, request), CLIENT_ID), {
        headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    if (path === '/v1/auth/google-access' && request.method === 'POST') {
      const body: any = await request.json();
      const user = await googleAccountFromAccess(env, clean(body.access_token));
      return json({ token: await token(user, env.TOKEN_SECRET), user });
    }
    if (path === '/v1/auth/google' && request.method === 'POST') { const body: any = await request.json(); const user = await googleAccount(env, clean(body.id_token)); return json({ token: await token(user, env.TOKEN_SECRET), user }); }
    // Approving from the sign-in page rather than from the phone. The pairing
    // code is what proves the request came from the device that is waiting:
    // it was issued seconds ago, expires in ten minutes, and is used once.
    if (path === '/v1/pairings/approve-google' && request.method === 'POST') {
      const body: any = await request.json();
      const row = await env.DB.prepare('SELECT * FROM device_pairings WHERE code = ?').bind(clean(body.code).toUpperCase()).first<any>();
      if (!row || row.expires_at < Date.now() || row.user_id) throw new Error('That code has expired - ask the device for a new one');
      const account = body.access_token
        ? await googleAccountFromAccess(env, clean(body.access_token))
        : await googleAccount(env, clean(body.id_token));
      await env.DB.prepare('UPDATE device_pairings SET user_id = ?, token = ? WHERE id = ?').bind(account.id, await token(account, env.TOKEN_SECRET), row.id).run();
      return json({ status: 'approved', device_name: row.device_name, email: account.email });
    }
    if (path === '/v1/pairings/start' && request.method === 'POST') { const body: any = await request.json(); const code = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(value => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32]).join(''); const secret = b64(crypto.getRandomValues(new Uint8Array(24))); const hash = await sign(secret, env.TOKEN_SECRET); const id = uid(); await env.DB.prepare('INSERT INTO device_pairings (id, code, request_hash, device_name, expires_at) VALUES (?, ?, ?, ?, ?)').bind(id, code, hash, clean(body.device_name) || 'New device', Date.now() + 600000).run(); return json({ pairing_id: id, code, request_secret: secret, expires_at: new Date(Date.now() + 600000).toISOString() }, 201); }
    if (path === '/v1/pairings/poll' && request.method === 'POST') { const body: any = await request.json(); const row = await env.DB.prepare('SELECT * FROM device_pairings WHERE id = ?').bind(clean(body.pairing_id)).first<any>(); if (!row || row.expires_at < Date.now() || row.request_hash !== await sign(clean(body.request_secret), env.TOKEN_SECRET)) throw new Error('Pairing code expired'); if (!row.user_id) return json({ status: 'waiting' }); await env.DB.prepare('DELETE FROM device_pairings WHERE id = ?').bind(row.id).run(); const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(row.user_id).first<any>(); return json({ status: 'connected', token: row.token, user: { email: user?.email ?? '' } }); }
    const user = await userFrom(request, env);

    // Anki imports plain tab-separated text: front, back, then the line the
    // word came from. Tabs and newlines inside a field would split it into the
    // wrong columns, so they are flattened out.
    if (path === '/v1/export/anki' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM selections WHERE owner_id = ? ORDER BY created_at DESC').bind(user.id).all<any>();
      const field = (value: unknown) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
      const lines = rows.results.map((row) => {
        const front = field(row.focus_phrase || row.focus_word || row.selected_text);
        const synonyms = JSON.parse(row.synonyms_json ?? '[]');
        const back = [field(row.focus_translation || row.translation), synonyms.length ? `(${synonyms.map(field).join(', ')})` : '']
          .filter(Boolean)
          .join(' ');
        return [front, back, field(row.context || row.selected_text), field(row.media_title)].join('\t');
      });
      return new Response(`#separator:tab\n#html:false\n${lines.join('\n')}\n`, {
        headers: { ...cors, 'content-type': 'text/tab-separated-values; charset=utf-8', 'content-disposition': 'attachment; filename="subtitle-notes.txt"' },
      });
    }

    // ---- revision ----------------------------------------------------------
    // Cards that have never been reviewed come first, oldest save first; after
    // that, whatever is overdue by the longest. Twenty is about five minutes of
    // work, which is the most anyone does in one sitting.
    if (path === '/v1/review' && request.method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT s.*, r.step AS review_step, r.due_at AS review_due
           FROM selections s LEFT JOIN reviews r ON r.selection_id = s.id
          WHERE s.owner_id = ? AND s.archived = 0
            AND (r.due_at IS NULL OR r.due_at <= ?)
          ORDER BY (r.due_at IS NULL) DESC, r.due_at ASC, s.created_at ASC
          LIMIT 20`
      ).bind(user.id, now()).all<any>();
      return json(await Promise.all(rows.results.map(card)));
    }

    const review = path.match(/^\/v1\/selections\/([^/]+)\/review$/);
    if (review && request.method === 'POST') {
      const body: any = await request.json();
      const row = await env.DB.prepare('SELECT id FROM selections WHERE id = ? AND owner_id = ?').bind(review[1], user.id).first();
      if (!row) throw new Error('Selection not found');
      const previous = await env.DB.prepare('SELECT step FROM reviews WHERE selection_id = ?').bind(review[1]).first<any>();
      const step = Number(previous?.step ?? 0);
      const result = clean(body.result);
      // Forgetting sends a word back to the beginning of the ladder rather than
      // out of the rotation; an easy one skips a rung.
      const next = result === 'again' ? 0 : result === 'easy' ? step + 2 : step + 1;
      const days = REVIEW_LADDER[Math.min(next, REVIEW_LADDER.length - 1)];
      const due = new Date(Date.now() + days * 86400000).toISOString();
      await env.DB.prepare(
        `INSERT INTO reviews (selection_id, owner_id, step, due_at, last_result, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(selection_id) DO UPDATE SET step = excluded.step, due_at = excluded.due_at,
           last_result = excluded.last_result, reviewed_at = excluded.reviewed_at`
      ).bind(review[1], user.id, next, due, result || 'good', now()).run();
      return json({ step: next, due_at: due });
    }

    // ---- profile -----------------------------------------------------------
    if (path === '/v1/me' && request.method === 'GET') return json(await profile(env, user.id));
    // Deleting the account takes everything with it: the saved words, the
    // likes given and received, both directions of every friendship, and the
    // paired computers. Nothing is kept for later, because a deletion that
    // leaves a copy behind is not a deletion.
    if (path === '/v1/me' && request.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM selection_likes WHERE user_id = ?').bind(user.id),
        env.DB.prepare('DELETE FROM selection_likes WHERE selection_id IN (SELECT id FROM selections WHERE owner_id = ?)').bind(user.id),
        env.DB.prepare('DELETE FROM friendships WHERE follower_id = ? OR friend_id = ?').bind(user.id, user.id),
        env.DB.prepare('DELETE FROM device_pairings WHERE user_id = ?').bind(user.id),
        env.DB.prepare('DELETE FROM selections WHERE owner_id = ?').bind(user.id),
        env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
      ]);
      return new Response(null, { status: 204, headers: cors });
    }
    if (path === '/v1/me' && request.method === 'PATCH') {
      const body: any = await request.json();
      const updates: string[] = [];
      const values: unknown[] = [];
      if (body.nickname !== undefined) {
        const nickname = clean(body.nickname);
        const problem = nicknameProblem(nickname);
        if (problem) throw new Error(problem);
        const taken = await env.DB.prepare('SELECT id FROM users WHERE lower(nickname) = ? AND id != ?').bind(nickname.toLowerCase(), user.id).first();
        if (taken) throw new Error('That nickname is already taken');
        updates.push('nickname = ?'); values.push(nickname);
      }
      if (body.share_feed !== undefined) { updates.push('share_feed = ?'); values.push(body.share_feed ? 1 : 0); }
      // Changing it only affects cards saved from now on: rewriting a library
      // into another language is a different, deliberate act.
      if (body.language !== undefined) {
        const code = clean(body.language).toLowerCase();
        if (!LANGUAGE_NAMES[code]) throw new Error('That language is not supported yet');
        updates.push('language = ?'); values.push(code);
      }
      if (updates.length) await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values, user.id).run();
      return json(await profile(env, user.id));
    }

    // ---- people ------------------------------------------------------------
    if (path === '/v1/users/search' && request.method === 'GET') {
      const query = clean(url.searchParams.get('q')).toLowerCase();
      if (query.length < 2) return json([]);
      // Nickname only. Searching by e-mail would let anyone confirm which
      // addresses have an account here.
      const rows = await env.DB.prepare(
        `SELECT u.id, u.nickname, u.display_name,
                (SELECT COUNT(*) FROM friendships f WHERE f.follower_id = ? AND f.friend_id = u.id) AS following,
                (SELECT COUNT(*) FROM selections s WHERE s.owner_id = u.id) AS word_count
           FROM users u
          WHERE u.id != ? AND u.nickname IS NOT NULL AND lower(u.nickname) LIKE ?
          ORDER BY (lower(u.nickname) = ?) DESC, length(u.nickname) LIMIT 25`
      ).bind(user.id, user.id, `%${query}%`, query).all<any>();
      return json(rows.results.map(person));
    }

    if (path === '/v1/friends' && request.method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT u.id, u.nickname, u.display_name, 1 AS following,
                (SELECT COUNT(*) FROM selections s WHERE s.owner_id = u.id) AS word_count
           FROM friendships f JOIN users u ON u.id = f.friend_id
          WHERE f.follower_id = ? ORDER BY f.created_at DESC`
      ).bind(user.id).all<any>();
      return json(rows.results.map(person));
    }

    const friendMatch = path.match(/^\/v1\/friends\/([^/]+)$/);
    if (friendMatch && (request.method === 'POST' || request.method === 'DELETE')) {
      const otherId = friendMatch[1];
      if (otherId === user.id) throw new Error('You are already yourself');
      const other = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(otherId).first();
      if (!other) throw new Error('That person no longer has an account');
      if (request.method === 'POST') {
        await env.DB.prepare('INSERT OR IGNORE INTO friendships (follower_id, friend_id, created_at) VALUES (?, ?, ?)').bind(user.id, otherId, now()).run();
      } else {
        await env.DB.prepare('DELETE FROM friendships WHERE follower_id = ? AND friend_id = ?').bind(user.id, otherId).run();
      }
      return json({ status: request.method === 'POST' ? 'added' : 'removed' });
    }

    // ---- feed --------------------------------------------------------------
    if (path === '/v1/feed' && request.method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT s.id, s.media_title, s.season, s.episode, s.timecode_ms, s.selected_text,
                s.translation, s.focus_word, s.focus_phrase, s.focus_translation, s.created_at,
                u.id AS author_id, u.nickname AS author_nickname, u.display_name AS author_name,
                (SELECT COUNT(*) FROM selection_likes l WHERE l.selection_id = s.id) AS like_count,
                (SELECT COUNT(*) FROM selection_likes l WHERE l.selection_id = s.id AND l.user_id = ?) AS liked
           FROM selections s
           JOIN users u ON u.id = s.owner_id
          WHERE u.share_feed = 1
            AND (s.owner_id = ? OR s.owner_id IN (SELECT friend_id FROM friendships WHERE follower_id = ?))
          ORDER BY s.created_at DESC LIMIT 60`
      ).bind(user.id, user.id, user.id).all<any>();
      return json(rows.results.map((row: any) => ({
        ...row,
        like_count: Number(row.like_count ?? 0),
        liked: Number(row.liked ?? 0) > 0,
        mine: row.author_id === user.id,
      })));
    }

    const likeMatch = path.match(/^\/v1\/selections\/([^/]+)\/like$/);
    if (likeMatch && (request.method === 'POST' || request.method === 'DELETE')) {
      const id = likeMatch[1];
      // Only things the reader can actually see may be liked.
      const visible = await env.DB.prepare(
        `SELECT s.id FROM selections s JOIN users u ON u.id = s.owner_id
          WHERE s.id = ? AND u.share_feed = 1
            AND (s.owner_id = ? OR s.owner_id IN (SELECT friend_id FROM friendships WHERE follower_id = ?))`
      ).bind(id, user.id, user.id).first();
      if (!visible) throw new Error('That word is not in your feed');
      if (request.method === 'POST') {
        await env.DB.prepare('INSERT OR IGNORE INTO selection_likes (selection_id, user_id, created_at) VALUES (?, ?, ?)').bind(id, user.id, now()).run();
      } else {
        await env.DB.prepare('DELETE FROM selection_likes WHERE selection_id = ? AND user_id = ?').bind(id, user.id).run();
      }
      const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM selection_likes WHERE selection_id = ?').bind(id).first<any>();
      return json({ like_count: Number(count?.total ?? 0), liked: request.method === 'POST' });
    }
    if (path === '/v1/pairings/approve' && request.method === 'POST') { const body: any = await request.json(); const row = await env.DB.prepare('SELECT * FROM device_pairings WHERE code = ?').bind(clean(body.code).toUpperCase()).first<any>(); if (!row || row.expires_at < Date.now() || row.user_id) throw new Error('Pairing code expired'); await env.DB.prepare('UPDATE device_pairings SET user_id = ?, token = ? WHERE id = ?').bind(user.id, await token(user, env.TOKEN_SECRET), row.id).run(); return json({ status: 'approved', device_name: row.device_name }); }
    if (path === '/v1/selections' && request.method === 'GET') { const archived = url.searchParams.get('archived') === 'true' ? 1 : 0; const rows = await env.DB.prepare('SELECT * FROM selections WHERE owner_id = ? AND archived = ? ORDER BY created_at DESC LIMIT 100').bind(user.id, archived).all<any>(); return json(await Promise.all(rows.results.map(card))); }
    if (path === '/v1/selections' && request.method === 'POST') { const input: any = await request.json(); const row = await upsertSelection(env, user.id, input); return json(await detail(row), 201); }
    if (path === '/v1/captures' && request.method === 'POST') { const input: any = await request.json(); const row = await upsertSelection(env, user.id, input, await enrich(env, clean(input.selected_text), String(input.context ?? ''), user.language || 'ru')); return json(await detail(row), 201); }
    // The dictionary alone, as fast as the network allows. The model reads the
    // line better, but it takes a second or two, and a person who paused a film
    // wants something on screen now. The card shows this first and replaces it
    // when the better answer arrives - which is why the desktop overlay, which
    // only ever asked the dictionary, always felt quicker.
    if (path === '/v1/quick' && request.method === 'POST') {
      const input: any = await request.json();
      const text = clean(input.text);
      if (!text) throw new Error('Nothing to read');
      const answer = await translate(text, false, user.language || 'ru');
      return json({ translation: answer.text, source_lang: answer.source });
    }

    // The player asks for the same reading to put in its popup, without saving
    // anything: what it shows on screen should not be worse than the card.
    if (path === '/v1/reading' && request.method === 'POST') {
      const input: any = await request.json();
      const text = clean(input.text);
      if (!text) throw new Error('Nothing to read');
      // A small dictionary pass gives us the actual source language before we
      // ask the model to read the line.  It also makes the panel useful when
      // Workers AI is temporarily unavailable instead of returning an error.
      const dictionary = await translate(text, false, user.language || 'ru');
      const deliberatePhrase = isDeliberatePhrase(text);
      const smart = await smartReading(
        env,
        text,
        String(input.context ?? ''),
        SMART_MODEL_FAST,
        user.language || 'ru',
        dictionary.source,
      );
      return json({
        term_en: deliberatePhrase ? text : (smart?.english || text),
        translation: deliberatePhrase
          ? dictionary.text
          : (smart?.line || dictionary.text),
        focus_translation: deliberatePhrase
          ? dictionary.text
          : (smart?.term || null),
        synonyms: deliberatePhrase
          ? dictionary.variants
          : (smart?.synonyms || dictionary.variants),
        sense_note: deliberatePhrase ? null : (smart?.note || null),
        source_language: dictionary.source,
      });
    }
    // Re-runs the current word logic over a card that was saved by an older
    // build. The saved subtitle text is the source of truth and is never
    // touched; only what was derived from it is replaced.
    // Someone read the card and knew better. Their own card changes at once;
    // the suggestion is also counted, and once enough people have written the
    // same thing it becomes what everybody gets for that expression.
    const suggest = path.match(/^\/v1\/selections\/([^/]+)\/suggest$/);
    if (suggest && request.method === 'POST') {
      const body: any = await request.json();
      const text = clean(body.text);
      if (!text || text.length > 120) throw new Error('Write the meaning you would use, up to 120 characters');
      const row = await env.DB.prepare('SELECT * FROM selections WHERE id = ? AND owner_id = ?').bind(suggest[1], user.id).first<any>();
      if (!row) throw new Error('Selection not found');
      const term = termKey(row.focus_phrase || row.focus_word || row.selected_text);
      const language = user.language || 'ru';
      await env.DB.prepare(
        `INSERT INTO corrections (term, language, suggestion, user_id, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(term, language, user_id) DO UPDATE SET suggestion = excluded.suggestion, created_at = excluded.created_at`
      ).bind(term, language, text, user.id, now()).run();
      await env.DB.prepare('UPDATE selections SET focus_translation = ? WHERE id = ?').bind(text, row.id).run();
      const agreed = await env.DB.prepare(
        `SELECT COUNT(*) AS votes FROM corrections WHERE term = ? AND language = ? AND lower(suggestion) = lower(?)`
      ).bind(term, language, text).first<any>();
      const updated = await env.DB.prepare('SELECT * FROM selections WHERE id = ?').bind(row.id).first<any>();
      return json({ ...(await detail(updated)), votes: Number(agreed?.votes ?? 1), quorum: CORRECTION_QUORUM });
    }

    const reenrich = path.match(/^\/v1\/selections\/([^/]+)\/reenrich$/);
    if (reenrich && request.method === 'POST') {
      const row = await env.DB.prepare('SELECT * FROM selections WHERE id = ? AND owner_id = ?').bind(reenrich[1], user.id).first<any>();
      if (!row) throw new Error('Selection not found');
      const data = await enrich(env, clean(row.selected_text), String(row.context ?? ''), user.language || 'ru');
      if (clean(data.translation) === UNAVAILABLE) throw new Error('Translation service unavailable, nothing changed');
      await env.DB.prepare('UPDATE selections SET translation = ?, focus_word = ?, focus_phrase = ?, focus_translation = ?, synonyms_json = ?, sense_note = ?, variants_json = ?, examples_json = ? WHERE id = ?')
        .bind(
          clean(data.translation),
          clean(data.focus_word) || null,
          clean(data.focus_phrase) || null,
          clean(data.focus_translation) || null,
          JSON.stringify(data.synonyms ?? []),
          clean(data.sense_note) || null,
          JSON.stringify(data.variants ?? []),
          JSON.stringify(data.examples ?? []),
          row.id,
        ).run();
      const updated = await env.DB.prepare('SELECT * FROM selections WHERE id = ?').bind(row.id).first<any>();
      return json(await detail(updated));
    }

    const match = path.match(/^\/v1\/selections\/([^/]+)(\/archive)?$/);
    if (match) { const id = match[1]; const row = await env.DB.prepare('SELECT * FROM selections WHERE id = ? AND owner_id = ?').bind(id, user.id).first<any>(); if (!row) throw new Error('Selection not found'); if (match[2] && request.method === 'PATCH') { const body: any = await request.json(); await env.DB.prepare('UPDATE selections SET archived = ? WHERE id = ?').bind(body.archived ? 1 : 0, id).run(); return json(await card({ ...row, archived: body.archived ? 1 : 0 })); } if (!match[2] && request.method === 'DELETE') { await env.DB.prepare('DELETE FROM selections WHERE id = ?').bind(id).run(); return new Response(null, { status: 204, headers: cors }); } if (!match[2] && request.method === 'GET') return json(await detail(row)); }
    return json({ detail: 'Not found' }, 404);
  } catch (error) { return failure(error); }
} };

async function detail(row: any) { return { ...(await card(row)), variants: JSON.parse(row.variants_json ?? '[]'), examples: JSON.parse(row.examples_json ?? '[]'), context: row.context ?? null }; }
