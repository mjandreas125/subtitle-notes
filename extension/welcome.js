// The first thing anyone sees. It explains the one gesture that is not
// obvious - holding a key over a subtitle - and then gets out of the way.

for (const node of document.querySelectorAll('[data-i18n]')) {
  node.textContent = t(node.dataset.i18n);
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
