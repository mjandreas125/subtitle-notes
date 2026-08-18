const view = (id) => document.getElementById(id);

(async () => {
  const show = () => document.body.classList.add('ready');
  const { token, email, recent } = await chrome.storage.local.get(['token', 'email', 'recent']);

  view('title').textContent = t('appName');
  if (!token) {
    view('state').textContent = t('popupNotPaired');
    view('connect').hidden = false;
    view('connect').textContent = t('popupConnect');
    view('connect').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    view('settings').textContent = t('popupSettings');
    view('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
    show();
    return;
  }

  // Connected: the account belongs at the top as a fact, not as a sentence.
  view('state').hidden = true;
  view('who').hidden = false;
  view('whoTitle').textContent = t('popupConnectedPlain');
  view('whoMail').textContent = email || '';
  view('face').textContent = (email || '?').trim().charAt(0) || '?';
  const settingsButton = view('settings');
  settingsButton.textContent = t('popupSettings');
  settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Everything the phone shows - all the words, practice, achievements - lives
  // on one page. The token rides in the fragment so nobody signs in twice; a
  // fragment is never sent to a server.
  const libraryButton = view('library');
  libraryButton.hidden = false;
  libraryButton.textContent = t('popupLibrary');
  libraryButton.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://subtitle-notes-api.andreas-sultseng228.workers.dev/library#t=' +
        encodeURIComponent(token),
    });
    window.close();
  });

  // Anki reads plain tab-separated text, so the server hands back a file the
  // browser can download without anything in between.
  const exportButton = view('export');
  exportButton.hidden = false;
  exportButton.textContent = t('popupExport');
  exportButton.addEventListener('click', async () => {
    const response = await fetch(
      'https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1/export/anki',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) { exportButton.textContent = t('failed'); return; }
    // A plain link download needs no extra permission, and asking for the
    // downloads permission would widen what the extension may do for nothing.
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subtitle-notes.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    exportButton.textContent = t('saved');
  });

  const saved = recent ?? [];
  if (!saved.length) {
    view('recent').innerHTML =
      `<li class="empty" style="background:none"><b>${escape(t('popupEmptyTitle'))}</b>` +
      `<span>${escape(t('popupEmpty'))}</span></li>`;
    show();
    return;
  }
  view('count').hidden = false;
  view('count').textContent = t('popupRecent');
  view('recent').innerHTML = saved
    .map(
      (item) =>
        `<li><b>${escape(item.label)}</b><br><span>${escape(item.meaning ?? '')}</span></li>`,
    )
    .join('');
  show();
})();

function escape(value) {
  return String(value ?? '').replace(
    /[&<>"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]),
  );
}
