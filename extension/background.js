// The only place that talks to the server.
//
// Content scripts run inside whatever page you are reading, and a page can read
// anything its scripts can reach. So the pairing token lives here, in the
// extension's own world, and pages only ever receive the finished translation.

// The one address. It was briefly two, while the account subdomain still
// carried the owner's e-mail; that one is gone.
const API_HOSTS = ['https://app.subtitlenotes.workers.dev/v1'];
let apiBase = API_HOSTS[0];

async function pickHost() {
  const remembered = (await chrome.storage.local.get('apiBase')).apiBase;
  if (remembered && API_HOSTS.includes(remembered)) {
    apiBase = remembered;
    return;
  }
  for (const host of API_HOSTS) {
    try {
      const answer = await fetch(host.replace('/v1', '/desktop/latest'));
      if (!answer.ok) continue;
      apiBase = host;
      await chrome.storage.local.set({ apiBase: host });
      return;
    } catch (_) {
      // try the next one
    }
  }
}
pickHost();
const MENU_ID = 'subtitle-notes-save';

// Banking pages must be completely left alone. Content scripts are excluded
// in manifest.json; this guard also prevents saving from the right-click menu.
function isProtectedSite(url) {
  try {
    const host = new URL(url || '').hostname.toLowerCase().replace(/^www\./, '');
    return host === 'bank.ee' || host.endsWith('.bank.ee');
  } catch (_) {
    return false;
  }
}

async function session() {
  const stored = await chrome.storage.local.get(['token', 'email']);
  return stored.token ? stored : null;
}

async function call(path, payload) {
  const auth = await session();
  if (!auth) throw new Error('not-paired');
  const response = await fetch(apiBase + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    // The session was revoked or the account deleted; stop pretending we have one.
    await chrome.storage.local.remove(['token', 'email']);
    throw new Error('not-paired');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Server error ${response.status}`);
  return body;
}

/// Two clips of the same subtitle should not become two cards, so the key is
/// built from what was selected and where, exactly as the desktop does it.
async function clientKey(parts) {
  const data = new TextEncoder().encode(parts.filter(Boolean).join('|'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/// Answers already given, kept for as long as the browser keeps this worker
/// alive. Reading a subtitle twice is normal - you rewind, or the same word
/// turns up two lines later - and the second time should cost nothing.
///
/// Keyed by the words and the line they were in, because that pair is what the
/// answer depends on. Small on purpose: this is a speed-up, not storage.
const answers = new Map();
const ANSWER_LIMIT = 120;

function remember(key, value) {
  answers.delete(key);
  answers.set(key, value);
  while (answers.size > ANSWER_LIMIT) answers.delete(answers.keys().next().value);
  return value;
}

async function cached(key, produce) {
  if (answers.has(key)) return answers.get(key);
  const value = await produce();
  return remember(key, value);
}

const flatKey = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

async function reading({ text, context }) {
  return cached(`r|${flatKey(text)}|${flatKey(context)}`, () =>
    call('/reading', { text, context: context || '' }));
}

/// Saving does not send a translation with it. The server reads the line again
/// with its slower, better model while it stores the card, so anything sent
/// from here would be thrown away - and waiting for it first would double how
/// long an instant capture takes.
/// A phrase is usually caught in two or three goes - a word, then the words
/// around it. Sending each attempt under its own key left the library holding
/// three pieces of one line, so an attempt that reaches for the same words
/// within this window is sent under the first one's key and replaces it.
const SETTLE_MS = 90000;
let lastCapture = null;

function sameThought(first, second) {
  const flat = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const left = flat(first.text);
  const right = flat(second.text);
  const firstLine = flat(first.context);
  const secondLine = flat(second.context);
  // A word and a wider phrase from the same subtitle are one selection. The
  // same word from the next subtitle is a different sense until proven
  // otherwise, even when the two clicks happen within the settling window.
  if (firstLine && secondLine && firstLine !== left && secondLine !== right) {
    return firstLine === secondLine;
  }
  return Boolean(left) && Boolean(right) && (left.includes(right) || right.includes(left));
}

async function capture({ text, context, title, season, episode, timecodeMs }) {
  // The episode belongs in the key as well: the same word in the same minute
  // of two different episodes is two cards, not one seen twice.
  const fresh = await clientKey([title, season, episode, String(timecodeMs ?? ''), text]);
  const settling = lastCapture && Date.now() - lastCapture.at < SETTLE_MS
    && sameThought(lastCapture, { text, context }) ? lastCapture.key : null;
  const key = settling ?? fresh;
  lastCapture = { key, text, context, at: Date.now() };
  const saved = await call('/captures', {
    client_key: key,
    media_title: title || 'Web',
    // Which episode the line came from, as the page on screen has it. It used
    // to be sent as null from here whatever the player showed, so every
    // series arrived in the library as one undifferentiated pile.
    season: season || null,
    episode: episode || null,
    timecode_ms: timecodeMs ?? null,
    selected_text: text,
    context: context || null,
  });
  await badge('ok');
  remember(`r|${flatKey(text)}|${flatKey(context)}`, {
    translation: saved.translation,
    focus_translation: saved.focus_translation,
    focus_word: saved.focus_word,
    focus_phrase: saved.focus_phrase,
    source_lang: saved.source_lang,
  });
  return saved;
}

/// Instant capture saves without asking, so taking it back has to be as cheap
/// as making it. Only ever called for a card this browser just created.
async function undo(id) {
  const auth = await session();
  if (!auth) throw new Error('not-paired');
  const response = await fetch(`${apiBase}/selections/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Server error ${response.status}`);
  return {};
}

async function badge(state) {
  const marks = { ok: ['✓', '#2fbf6b'], busy: ['…', '#4a90d9'], fail: ['!', '#d94a4a'] };
  const [text, colour] = marks[state] ?? ['', '#000000'];
  await chrome.action.setBadgeText({ text });
  if (text) await chrome.action.setBadgeBackgroundColor({ color: colour });
  if (state === 'ok' || state === 'fail') {
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
  }
}

/// Space used to translate on every page, in every browser, whether or not
/// there was a film on it. In VLC space is the pause key and nothing else; in a
/// browser it scrolls, plays, presses whatever is under the cursor and goes
/// into every comment box, and a translation window on all of those is an
/// interruption. The new default is off - but a browser that has already saved
/// its settings carries the old value, so it is turned off once here.
///
/// The mark is what makes it once. Anybody who turns it back on keeps it: the
/// next update finds the mark and leaves the setting alone.
async function quietenSpaceOnce() {
  try {
    const done = await chrome.storage.local.get('spaceDefaultMoved');
    if (done.spaceDefaultMoved) return;
    const stored = (await chrome.storage.sync.get('settings')).settings;
    if (stored && stored.spaceLine === true) {
      await chrome.storage.sync.set({ settings: { ...stored, spaceLine: false } });
    }
    await chrome.storage.local.set({ spaceDefaultMoved: 1 });
  } catch (_) {
    // Settings that cannot be read are settings that cannot be wrong yet.
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  // The popup no longer has a local "recent" list. Clear the old cache once
  // so an update also removes this data from existing browsers.
  if (details.reason === 'update') chrome.storage.local.remove('recent');
  if (details.reason === 'update' || details.reason === 'install') quietenSpaceOnce();
  // Shown once, when the extension is first added. An update must not reopen
  // it: nobody wants a tutorial for something they already use.
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
  // The right-click route is the one that survives everywhere: it still gives
  // us the selected text inside Chrome's built-in PDF viewer, where an ordinary
  // content script cannot reach the page at all.
  // Chrome keeps the item across updates, and creating it again fails with
  // "duplicate id" - which is only ever seen as an unchecked runtime error.
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({
    id: MENU_ID,
    // %s is the context menu's own placeholder for the selected text, filled
    // in by Chrome - it survives translation untouched.
    title: chrome.i18n.getMessage('menuSave'),
    contexts: ['selection'],
  }));
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  if (isProtectedSite(info.pageUrl || tab?.url)) return;
  const text = (info.selectionText || '').trim();
  if (!text) return;
  await badge('busy');
  try {
    await capture({ text, context: '', title: titleFor(tab, info) });
  } catch (error) {
    await badge('fail');
    if (String(error.message) === 'not-paired') chrome.runtime.openOptionsPage();
  }
});

/// A PDF opened from disk has no useful tab title, so the file name is a better
/// answer than "chrome-extension://…".
function titleFor(tab, info) {
  const url = info?.pageUrl || tab?.url || '';
  if (/\.pdf(\?|#|$)/i.test(url)) {
    try {
      const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
      if (name) return name.replace(/\.pdf$/i, '');
    } catch (_) {
      // Not a URL we can parse; fall through to the tab title.
    }
  }
  return (tab?.title || 'Web').replace(/\s*[-–—|]\s*(YouTube|Netflix).*$/i, '').trim() || 'Web';
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const handlers = {
    reading: () => reading(message),
    // The dictionary alone: back in a moment, and good enough to read while
    // the better answer is still being worked out.
    quick: () => cached(`q|${flatKey(message.text)}`, () => call('/quick', { text: message.text })),
    capture: () => capture({ ...message, title: message.title || titleFor(sender.tab) }),
    status: async () => ({ paired: Boolean(await session()) }),
    undo: () => undo(message.id),
    // The server re-reads the saved line with its slower model, which is a
    // different answer from the fast one the card first showed.
    rerun: () => call(`/selections/${message.id}/reenrich`, {}),
    // The reader's own wording. It replaces the meaning on their card at once,
    // and counts as a vote: when enough people write the same thing for the
    // same expression, everybody starts getting it.
    suggest: () => call(`/selections/${message.id}/suggest`, { text: message.text }),
    options: async () => {
      await chrome.runtime.openOptionsPage();
      return {};
    },
  };
  const handler = handlers[message?.type];
  if (!handler) return false;
  handler()
    .then((data) => respond({ ok: true, data }))
    .catch((error) => respond({ ok: false, error: String(error.message || error) }));
  return true; // keeps the message channel open for the async reply
});
