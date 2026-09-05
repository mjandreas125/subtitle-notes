// The first thing anyone sees. It explains the one gesture that is not
// obvious - holding a key over a subtitle - and then gets out of the way.

for (const node of document.querySelectorAll('[data-i18n]')) {
  node.textContent = t(node.dataset.i18n);
}
// The subtitle on the card, with the picked part marked inside it. Written
// here rather than in the HTML because the line itself changes with the
// language: an English reader is shown a French one, since an English line
// answered in English demonstrates nothing.
const line = t('tourSubtitle');
const pick = t('tourPick');
const at = line.indexOf(pick);
const caption = document.getElementById('caption');
if (at < 0) {
  caption.textContent = line;
} else {
  caption.append(line.slice(0, at));
  const marked = document.createElement('span');
  marked.className = 'pick';
  marked.textContent = pick;
  caption.append(marked, line.slice(at + pick.length));
}

document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0];
document.title = t('appName');

document.getElementById('connect').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
document.getElementById('desktop').addEventListener('click', async () => {
  const reply = await fetch('https://app.subtitlenotes.workers.dev/desktop/latest');
  const latest = await reply.json();
  window.open(latest.url, '_blank');
});
document.getElementById('later').addEventListener('click', () => window.close());
