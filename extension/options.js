// Connecting runs here rather than in the service worker on purpose: a worker
// is stopped whenever the browser feels like it, and the wait for approval
// would die halfway through. This page is open for as long as the person is
// looking at the code.

const API_BASE = 'https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1';
const LINK_PAGE = 'https://subtitle-notes-api.andreas-sultseng228.workers.dev/link';
const view = (id) => document.getElementById(id);

/// Named in their own language: a person looking for Estonian is looking for
/// "Eesti", not for "Estonian".
const LANGUAGES = [
  ['ru', 'Русский'], ['en', 'English'], ['et', 'Eesti'], ['de', 'Deutsch'],
  ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português'],
  ['pl', 'Polski'], ['uk', 'Українська'], ['nl', 'Nederlands'], ['tr', 'Türkçe'],
  ['sv', 'Svenska'], ['fi', 'Suomi'],
];

async function post(path, payload) {
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Server error ${response.status}`);
  return body;
}

// ---- connecting -------------------------------------------------------------

async function paintAccount() {
  const { token, email } = await chrome.storage.local.get(['token', 'email']);
  view('connected').hidden = !token;
  view('start').hidden = Boolean(token);
  view('waiting').hidden = true;
  view('startState').hidden = true;
  if (!token) return;
  view('email').textContent = email || '';
  view('initial').textContent = (email || '?').trim().charAt(0) || '?';
  loadLanguage(token);
}

// Without an account there is nowhere to save a language to.
chrome.storage.local.get('token').then(({ token }) => paintLanguages(Boolean(token)));

let cancelled = false;

/// One flow with three doors. All of them approve the same pairing, so the
/// page waits the same way whichever one is used: signing in with Google on
/// the page that opens, scanning the square with a phone, or typing the code
/// into the app.
async function connect({ withGoogle }) {
  cancelled = false;
  view('google').disabled = true;
  view('phoneWay').disabled = true;
  let session;
  try {
    session = await post('/pairings/start', { device_name: browserName() });
  } catch (error) {
    view('startState').hidden = false;
    view('startState').className = 'state fail';
    view('startState').textContent = error.message;
    view('google').disabled = false;
    view('phoneWay').disabled = false;
    return;
  }
  view('google').disabled = false;
  view('phoneWay').disabled = false;
  view('start').hidden = true;
  view('waiting').hidden = false;
  // Signing in with Google needs no code on this page: the window that opens
  // carries it. Showing a code and a square next to it only asked the reader
  // to choose between two things that do the same job.
  view('ways').hidden = withGoogle;
  view('code').textContent = session.code;
  view('state').className = 'state';
  view('state').textContent = t('optWaiting');
  // The same address the sign-in page lives at, so a phone camera and a click
  // both end up in the same place.
  // The page opens in the language the browser is already speaking, rather
  // than in English.
  const link = `${LINK_PAGE}?code=${session.code}&lang=${chrome.i18n.getUILanguage()}`;
  view('qr').innerHTML = snQrSvg(link);
  // A small window rather than a whole tab: signing in is a two-second
  // errand, and it should not bury the page that is waiting for it.
  let signInWindow = null;
  if (withGoogle) {
    signInWindow = await chrome.windows.create({ url: link, type: 'popup', width: 460, height: 660 });
  }

  // The code is good for ten minutes; the server says so and we do not outlast it.
  const deadline = Date.now() + 10 * 60 * 1000;
  while (!cancelled && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (cancelled) return;
    let reply;
    try {
      reply = await post('/pairings/poll', {
        pairing_id: session.pairing_id,
        request_secret: session.request_secret,
      });
    } catch (error) {
      view('state').className = 'state fail';
      view('state').textContent = error.message;
      return;
    }
    if (reply.status === 'connected') {
      await chrome.storage.local.set({ token: reply.token, email: reply.user?.email ?? '' });
      // The sign-in window has done its job; leaving it open makes the person
      // close a window to find out whether anything happened.
      if (signInWindow?.id) chrome.windows.remove(signInWindow.id).catch(() => {});
      view('state').className = 'state ok';
      view('state').textContent = t('optPaired');
      setTimeout(paintAccount, 1200);
      return;
    }
  }
  if (!cancelled) {
    view('state').className = 'state';
    view('state').textContent = t('optExpired');
  }
}

view('google').addEventListener('click', () => connect({ withGoogle: true }));
view('phoneWay').addEventListener('click', () => connect({ withGoogle: false }));

view('cancel').addEventListener('click', () => {
  cancelled = true;
  paintAccount();
});

view('forget').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'email']);
  paintAccount();
});

/// Shown in the phone's list of connected devices, so it should say which
/// browser is asking rather than "New device".
function browserName() {
  const agent = navigator.userAgent;
  if (agent.includes('OPR/')) return 'Opera';
  if (agent.includes('Edg/')) return 'Edge';
  if (agent.includes('Firefox/')) return 'Firefox';
  return 'Chrome';
}

// ---- the language cards are written in --------------------------------------

let language = 'ru';

function paintLanguages(connected) {
  const box = view('language');
  if (!box.children.length) {
    for (const [code, name] of LANGUAGES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = code;
      button.textContent = name;
      box.appendChild(button);
    }
  }
  box.classList.toggle('off', !connected);
  view('languageLocked').hidden = connected;
  for (const button of box.children) {
    button.classList.toggle('on', button.dataset.value === language);
  }
}

async function loadLanguage(token) {
  paintLanguages(true);
  try {
    const response = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const profile = await response.json();
    language = profile.language || 'ru';
    if (profile.email) {
      view('email').textContent = profile.email;
      view('initial').textContent = profile.email.charAt(0);
    }
    paintLanguages(true);
  } catch (_) {
    // Offline: the settings still work, the language just cannot be shown.
  }
}

view('language').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { token } = await chrome.storage.local.get('token');
  if (!token) return;
  const chosen = button.dataset.value;
  const response = await fetch(`${API_BASE}/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ language: chosen }),
  });
  if (!response.ok) return flash(t('failed'));
  language = chosen;
  paintLanguages(true);
  flash();
});

// The program for the computer has no store to be found in, so the browser
// that already has the extension is the one place a person will look.
view('getProgram').addEventListener('click', async () => {
  const button = view('getProgram');
  button.disabled = true;
  try {
    const reply = await fetch(`${LINK_PAGE.replace('/link', '')}/desktop/latest`);
    const latest = await reply.json();
    chrome.tabs.create({ url: latest.url });
  } catch (_) {
    flash(t('failed'));
  } finally {
    button.disabled = false;
  }
});

// ---- settings ---------------------------------------------------------------

let settings = { ...SN_DEFAULTS };
let toastTimer = null;

function flash(message) {
  view('toast').textContent = message || t('optSavedToast');
  view('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => view('toast').classList.remove('show'), 1100);
}

async function store(patch) {
  settings = { ...settings, ...patch };
  await chrome.storage.sync.set({ settings });
  flash();
}

/// Fills every element carrying a data-i18n key from the locale Chrome picked
/// for this browser. Run once, before anything is shown.
function translatePage() {
  document.title = t('appName');
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0];
}

function paintSettings() {
  view('capture').textContent = snHotkeyLabel(settings.hotkey);
  view('instantAlways').checked = Boolean(settings.instantAlways);
  view('subtitles').checked = settings.subtitles !== false;
  view('pauseVideo').checked = settings.pauseVideo !== false;
  view('speak').checked = Boolean(settings.speak);
  view('hideAfter').value = settings.hideAfter ?? 6;
  view('blocked').value = (settings.blocked ?? []).join('\n');
  for (const button of view('positions').querySelectorAll('button')) {
    button.classList.toggle('on', button.dataset.value === settings.position);
  }
  const keys = snSubtitleKeys(settings);
  const none = !keys.ctrl && !keys.alt && !keys.shift;
  for (const button of view('subtitleKey').querySelectorAll('button')) {
    const value = button.dataset.value;
    button.classList.toggle('on', value === 'none' ? none : Boolean(keys[value]));
  }
  // A character no translation contains, so the substitution cannot land in
  // the middle of a word.
  view('comboNow').innerHTML = none
    ? t('optSubKeyNoneNow')
    : t('optSubKeyNow', '').replace('', `<b>${snSubtitleKeyLabel(settings)}</b>`);
  // A hotkey is meaningless when everything saves anyway.
  view('capture').disabled = Boolean(settings.instantAlways);
}

/// Records the next combination pressed. Modifiers alone are a valid answer —
/// "hold Ctrl+Alt and select" is the whole idea — so the recording ends when
/// the keys come back up rather than on the first keydown.
view('capture').addEventListener('click', () => {
  if (settings.instantAlways) return;
  const button = view('capture');
  button.classList.add('listening');
  button.textContent = t('optHotkeyPress');
  let pressed = { ctrl: false, alt: false, shift: false, meta: false, key: '' };

  const down = (event) => {
    event.preventDefault();
    const named = ['Control', 'Alt', 'Shift', 'Meta'].includes(event.key);
    pressed = {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
      key: named ? '' : event.key.length === 1 ? event.key.toLowerCase() : '',
    };
    button.textContent = snHotkeyLabel(pressed) || t('optHotkeyPress');
  };
  const up = async (event) => {
    event.preventDefault();
    if (!pressed.ctrl && !pressed.alt && !pressed.shift && !pressed.meta) return; // ignore a bare tap
    window.removeEventListener('keydown', down, true);
    window.removeEventListener('keyup', up, true);
    button.classList.remove('listening');
    await store({ hotkey: pressed });
    paintSettings();
  };
  window.addEventListener('keydown', down, true);
  window.addEventListener('keyup', up, true);
});

view('resetKey').addEventListener('click', async () => {
  await store({ hotkey: { ...SN_DEFAULTS.hotkey } });
  paintSettings();
});

view('instantAlways').addEventListener('change', async (event) => {
  await store({ instantAlways: event.target.checked });
  paintSettings();
});
view('subtitles').addEventListener('change', (event) => store({ subtitles: event.target.checked }));
view('pauseVideo').addEventListener('change', (event) => store({ pauseVideo: event.target.checked }));
view('speak').addEventListener('change', (event) => store({ speak: event.target.checked }));
view('hideAfter').addEventListener('change', (event) =>
  store({ hideAfter: Math.min(60, Math.max(2, Number(event.target.value) || 6)) }),
);
view('blocked').addEventListener('change', (event) =>
  store({ blocked: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }),
);

view('subtitleKey').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const value = button.dataset.value;
  const keys = snSubtitleKeys(settings);
  // The three modifiers toggle and combine; "no key" is the way back to none.
  const next = value === 'none'
    ? { ctrl: false, alt: false, shift: false }
    : { ...keys, [value]: !keys[value] };
  await store({ subtitleKey: next });
  paintSettings();
});

view('positions').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  // A different corner should start from that corner, not from wherever the
  // panel was dragged in the previous one.
  await store({ position: button.dataset.value, offset: { x: 0, y: 0 } });
  paintSettings();
});

// Anki reads plain tab-separated text, so the server hands back a file the
// browser can download without anything in between.
view('export').addEventListener('click', async (event) => {
  event.preventDefault();
  const { token } = await chrome.storage.local.get('token');
  if (!token) return flash(t('popupNotPaired'));
  const response = await fetch(`${API_BASE}/export/anki`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return flash(t('failed'));
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'subtitle-notes.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});

(async () => {
  translatePage();
  settings = await snLoadSettings();
  paintSettings();
  paintAccount();
})();
