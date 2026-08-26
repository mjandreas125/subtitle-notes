const view = (id) => document.getElementById(id);

/// What the extension is doing on the page behind this popup.
///
/// A person on a site where nothing happens has no way to tell "this player is
/// not recognised" from "working, you just have not selected anything". One
/// line answers both, and says which key to hold.
async function describeThisPage() {
  const line = view('state');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const state = await chrome.tabs.sendMessage(tab.id, { type: 'pageState' });
    if (!state) return;
    if (state.blocked) line.textContent = t('pageOff');
    else if (state.captions > 0) {
      line.textContent = state.subtitles
        ? t('pageSubtitles', state.keys || t('pageNoKey'))
        : t('pageSubtitlesOff');
    } else {
      line.textContent = t('pageText');
    }
    line.hidden = false;
  } catch (_) {
    // No content script on this page - a store page, a PDF viewer, a tab
    // opened before the extension was installed. Nothing to report.
  }
}

function setActionLabel(button, label) {
  button.querySelector('.action-label').textContent = label;
}

(async () => {
  const show = () => document.body.classList.add('ready');
  const { token } = await chrome.storage.local.get(['token']);

  view('title').textContent = t('appName');
  if (!token) {
    view('state').textContent = t('popupNotPaired');
    view('entry').hidden = false;
    view('connectGoogle').textContent = t('popupConnectGoogle');
    view('connectCode').textContent = t('popupConnectCode');
    // The settings page is where the waiting happens - it has to stay open
    // while the server is polled - but it is told which way in was chosen, so
    // nobody is asked twice.
    const enter = (how) => {
      chrome.tabs.create({ url: chrome.runtime.getURL(`options.html?connect=${how}`) });
      window.close();
    };
    view('connectGoogle').addEventListener('click', () => enter('google'));
    view('connectCode').addEventListener('click', () => enter('code'));
    setActionLabel(view('settings'), t('popupSettings'));
    view('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
    show();
    return;
  }

  // Connected: the library remains tied to the signed-in account, but its
  // e-mail is deliberately never rendered in the popup.
  view('state').textContent = '';
  describeThisPage();
  const settingsButton = view('settings');
  setActionLabel(settingsButton, t('popupSettings'));
  settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Everything the phone shows - all the words, practice, achievements - lives
  // on one page. The token rides in the fragment so nobody signs in twice; a
  // fragment is never sent to a server.
  const libraryButton = view('library');
  libraryButton.hidden = false;
  setActionLabel(libraryButton, t('popupLibrary'));
  libraryButton.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://app.subtitlenotes.workers.dev/library#t=' +
        encodeURIComponent(token),
    });
    window.close();
  });

  // Anki reads plain tab-separated text, so the server hands back a file the
  // browser can download without anything in between.
  const exportButton = view('export');
  exportButton.hidden = false;
  setActionLabel(exportButton, t('popupExport'));
  exportButton.addEventListener('click', async () => {
    const response = await fetch(
      'https://app.subtitlenotes.workers.dev/v1/export/anki',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) { setActionLabel(exportButton, t('failed')); return; }
    // A plain link download needs no extra permission, and asking for the
    // downloads permission would widen what the extension may do for nothing.
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subtitle-notes.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setActionLabel(exportButton, t('saved'));
  });

  show();
})();
