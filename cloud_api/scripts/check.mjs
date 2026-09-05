// Walks the whole server the way the three clients do, and says what broke.
//
//   node scripts/check.mjs <base-url> [token]
//
// Without a token it checks only what an unauthenticated visitor can see: the
// pages, the version feed, and that everything private really is private. With
// one it goes through the whole path a selection takes - dictionary, reading,
// save, repair, practice, export - and deletes the cards it made on the way out.
//
// Against a local `wrangler dev`, mint the token with `scripts/local-token.mjs`.
// A typo in an SQL string only shows up when the statement runs, which is why
// this exists: the compiler cannot see inside `prepare('…')`.

const [, , base = 'http://127.0.0.1:8799', token = ''] = process.argv;
const root = base.replace(/\/+$/, '');

let failures = 0;
let checks = 0;
const made = [];

function report(name, ok, detail = '') {
  checks += 1;
  if (!ok) failures += 1;
  const mark = ok ? '  ok  ' : ' FAIL ';
  console.log(`${mark} ${name}${detail ? `  - ${detail}` : ''}`);
}

async function call(path, { method = 'GET', body, auth = true } = {}) {
  const started = Date.now();
  const response = await fetch(root + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  return { status: response.status, body: parsed, text, ms: Date.now() - started };
}

/// An answer is only an answer if it is in the reader's language and is not the
/// English it was made from. Both failures used to reach the library looking
/// like translations.
function isTranslated(value, source) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  if (text.toLowerCase() === 'translation unavailable') return false;
  if (source && text.toLowerCase() === String(source).toLowerCase()) return false;
  return /\p{Script=Cyrillic}/u.test(text);
}

// ---- what anyone can see ----------------------------------------------------
{
  const health = await call('/health', { auth: false });
  report('health', health.status === 200 && health.body?.status === 'ok');

  const latest = await call('/desktop/latest', { auth: false });
  const version = latest.body?.version ?? '';
  const url = latest.body?.url ?? '';
  report('desktop/latest names a version and a file',
    latest.status === 200 && /^\d+\.\d+\.\d+$/.test(version) && url.endsWith(`${version}.exe`),
    `${version} → ${url.split('/').pop()}`);

  for (const [path, must] of [
    ['/link?code=ABCD2345&lang=ru', 'Войти через Google'],
    ['/link?code=ABCD2345&lang=et', 'Google'],
    ['/privacy', '<!doctype html>'],
    ['/delete-account', '<!doctype html>'],
    ['/library', '<!doctype html>'],
  ]) {
    const page = await call(path, { auth: false });
    report(`page ${path.split('?')[0]}`, page.status === 200 && page.text.includes(must));
  }

  // The sign-in page has to carry the code it was opened with, and has to be
  // able to redirect before it draws.
  const link = await call('/link?code=ABCD2345&lang=ru&straight=1', { auth: false });
  report('sign-in page redirects before drawing',
    link.text.includes("params.get('straight')") && link.text.includes('ABCD2345'));

  const pairing = await call('/v1/pairings/start', {
    method: 'POST', body: { device_name: 'check.mjs' }, auth: false,
  });
  report('pairing code issued',
    pairing.status === 201 && /^[A-Z0-9]{8}$/.test(pairing.body?.code ?? ''),
    pairing.body?.code);

  for (const path of ['/v1/selections', '/v1/review', '/v1/me']) {
    const refused = await call(path, { auth: false });
    report(`${path} refuses a stranger`, refused.status === 401);
  }
}

if (!token) {
  console.log(`\n${checks - failures}/${checks} checks passed (no token: the private half was skipped)`);
  process.exit(failures ? 1 : 0);
}

// ---- what a signed-in reader does -------------------------------------------
{
  const me = await call('/v1/me');
  report('the session is accepted', me.status === 200 && Boolean(me.body?.id), me.body?.email);
  const language = me.body?.language ?? 'ru';

  const quick = await call('/v1/quick', { method: 'POST', body: { text: 'financial aid' } });
  report('dictionary answers, and quickly',
    quick.status === 200 && isTranslated(quick.body?.translation, 'financial aid'),
    `${quick.body?.translation} in ${quick.ms}ms`);
  if (quick.ms > 4000) report('dictionary is fast enough', false, `${quick.ms}ms is too slow`);

  const reading = await call('/v1/reading', {
    method: 'POST', body: { text: 'a record', context: 'No one wants a record.' },
  });
  report('the line is read, not the word',
    reading.status === 200 && isTranslated(reading.body?.translation, 'a record'),
    `${reading.body?.translation} in ${reading.ms}ms`);

  const key = `check-${Date.now()}`;
  const capture = await call('/v1/captures', {
    method: 'POST',
    body: {
      client_key: key,
      media_title: 'Check Show',
      season: '4',
      episode: '11',
      timecode_ms: 61000,
      selected_text: 'take it for granted',
      context: 'They will not take it for granted.',
    },
  });
  if (capture.body?.id) made.push(capture.body.id);
  report('saving answers with a meaning, not a wait',
    capture.status === 201 && isTranslated(capture.body?.focus_translation || capture.body?.translation, 'take it for granted'),
    `${capture.body?.focus_translation || capture.body?.translation} in ${capture.ms}ms`);
  report('the episode is kept',
    capture.body?.season === '4' && capture.body?.episode === '11',
    `s${capture.body?.season}e${capture.body?.episode}`);
  report('nothing is left owing a translation', capture.body?.pending_translation === false);

  // The same line again is the same card, not a second one.
  const again = await call('/v1/captures', {
    method: 'POST',
    body: {
      client_key: key,
      media_title: 'Check Show',
      selected_text: 'take it for granted',
      context: 'They will not take it for granted.',
    },
  });
  report('the same line does not become a second card', again.body?.reused === true);
  report('a card keeps where it was first met',
    again.body?.season === '4' && again.body?.episode === '11');

  // A card that never got a translation is retried, not left broken.
  const broken = await call('/v1/captures', {
    method: 'POST',
    body: {
      client_key: `${key}-broken`,
      media_title: 'Check Show',
      selected_text: 'inflammatory',
      context: 'Objection. Irrelevant and inflammatory.',
    },
  });
  if (broken.body?.id) made.push(broken.body.id);
  const repair = await call('/v1/repair', { method: 'POST' });
  report('the repair run reports what is still waiting',
    repair.status === 200 && typeof repair.body?.waiting === 'number',
    `repaired ${repair.body?.repaired}, waiting ${repair.body?.waiting}`);

  const list = await call('/v1/selections');
  const mine = Array.isArray(list.body) ? list.body : [];
  report('the library lists the cards', list.status === 200 && mine.length > 0, `${mine.length} cards`);
  const untranslated = mine.filter((card) => !isTranslated(card.translation, card.selected_text));
  report('no card in the library shows English where a meaning belongs',
    untranslated.length === 0,
    untranslated.map((card) => card.selected_text).slice(0, 3).join(' / '));

  const review = await call('/v1/review');
  report('practice has something to ask', review.status === 200 && Array.isArray(review.body));

  const anki = await call('/v1/export/anki');
  report('the Anki export is three columns of text',
    anki.status === 200 && anki.text.startsWith('#separator:tab') && anki.text.includes('\t'));

  if (capture.body?.id) {
    const own = await call(`/v1/selections/${capture.body.id}/suggest`, {
      method: 'POST', body: { text: 'считать само собой разумеющимся' },
    });
    report('a reader can write their own wording',
      own.status === 200 && own.body?.focus_translation === 'считать само собой разумеющимся',
      `${own.body?.votes}/${own.body?.quorum} votes`);

    const fresh = await call(`/v1/selections/${capture.body.id}/reenrich`, { method: 'POST' });
    report('a card can be read again', fresh.status === 200 && isTranslated(fresh.body?.translation));
  }

  report('the reader is answered in their own language', language.length === 2, language);
}

// ---- put the shelf back the way it was --------------------------------------
for (const id of made) {
  const gone = await call(`/v1/selections/${id}`, { method: 'DELETE' });
  if (gone.status !== 204 && gone.status !== 404) report(`cleaned up ${id}`, false, `status ${gone.status}`);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
