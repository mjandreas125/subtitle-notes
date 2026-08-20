// The only place that talks to the server.
//
// Content scripts run inside whatever page you are reading, and a page can read
// anything its scripts can reach. So the pairing token lives here, in the
// extension's own world, and pages only ever receive the finished translation.

const API_BASE = 'https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1';
const MENU_ID = 'subtitle-notes-save';

async function session() {
  const stored = await chrome.storage.local.get(['token', 'email']);
  return stored.token ? stored : null;
}

async function call(path, payload) {
  const auth = await session();
  if (!auth) throw new Error('not-paired');
  const response = await fetch(API_BASE + path, {
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

async function reading({ text, context }) {
  return call('/reading', { text, context: context || '' });
}

/// Saving does not send a translation with it. The server reads the line again
/// with its slower, better model while it stores the card, so anything sent
/// from here would be thrown away — and waiting for it first would double how
/// long an instant capture takes.
/// A phrase is usually caught in two or three goes - a word, then the words
/// around it. Sending each attempt under its own key left the library holding
/// three pieces of one line, so an attempt that reaches for the same words
/// within this window is sent under the first one's key and replaces it.
const SETTLE_MS = 90000;
let lastCapture = null;

function sameThought(first, second) {
  const left = String(first || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const right = String(second || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return Boolean(left) && Boolean(right) && (left.includes(right) || right.includes(left));
}

async function capture({ text, context, title, timecodeMs }) {
  const fresh = await clientKey([title, String(timecodeMs ?? ''), text]);
  const settling = lastCapture && Date.now() - lastCapture.at < SETTLE_MS
    && sameThought(lastCapture.text, text) ? lastCapture.key : null;
  const key = settling ?? fresh;
  lastCapture = { key, text, at: Date.now() };
  const saved = await call('/captures', {
    client_key: key,
    media_title: title || 'Web',
    season: null,
    episode: null,
    timecode_ms: timecodeMs ?? null,
    selected_text: text,
    context: context || null,
  });
  const recent = (await chrome.storage.local.get('recent')).recent ?? [];
  const label = saved.focus_phrase || saved.focus_word || saved.selected_text;
  recent.unshift({ id: saved.id, label, meaning: saved.focus_translation || saved.translation, at: Date.now() });
  await chrome.storage.local.set({ recent: recent.slice(0, 12) });
  await badge('ok');
  return saved;
}

/// Instant capture saves without asking, so taking it back has to be as cheap
/// as making it. Only ever called for a card this browser just created.
async function undo(id) {
  const auth = await session();
  if (!auth) throw new Error('not-paired');
  const response = await fetch(`${API_BASE}/selections/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Server error ${response.status}`);
  const recent = (await chrome.storage.local.get('recent')).recent ?? [];
  await chrome.storage.local.set({ recent: recent.filter((item) => item.id !== id) });
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

chrome.runtime.onInstalled.addListener((details) => {
  // Shown once, when the extension is first added. An update must not reopen
  // it: nobody wants a tutorial for something they already use.
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
  // The right-click route is the one that survives everywhere: it still gives
  // us the selected text inside Chrome's built-in PDF viewer, where an ordinary
  // content script cannot reach the page at all.
  chrome.contextMenus.create({
    id: MENU_ID,
    // %s is the context menu's own placeholder for the selected text, filled
    // in by Chrome — it survives translation untouched.
    title: chrome.i18n.getMessage('menuSave'),
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
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
    quick: () => call('/quick', { text: message.text }),
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
