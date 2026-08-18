const MENU_ID = 'send-to-subtitle-notes';
const CLOUD_API = 'https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1';

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({id: MENU_ID, title: 'Send to Subtitle Notes', contexts: ['selection']});
  const current = await chrome.storage.local.get(['apiUrl']);
  if ((current.apiUrl || '').includes('.trycloudflare.com')) {
    await chrome.storage.local.set({apiUrl: CLOUD_API, token: ''});
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id || !info.selectionText?.trim()) return;
  const config = await chrome.storage.local.get(['apiUrl', 'token']);
  if (!config.apiUrl || !config.token) {
    await chrome.runtime.openOptionsPage();
    return;
  }
  try {
    const injected = await chrome.scripting.executeScript({target: {tabId: tab.id, allFrames: false}, func: pageContext});
    const page = injected[0]?.result || {};
    const payload = {
      client_key: crypto.randomUUID(),
      selected_text: info.selectionText.trim(),
      media_title: page.title || tab.title || 'Web or other app',
      timecode_ms: Number.isFinite(page.timecodeMs) ? Math.round(page.timecodeMs) : null,
      context: page.context || null
    };
    const response = await fetch(`${config.apiUrl.replace(/\/+$/, '')}/captures`, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`}, body: JSON.stringify(payload)});
    if (!response.ok) throw new Error((await response.json()).detail || `Server ${response.status}`);
    await chrome.action.setBadgeText({tabId: tab.id, text: 'OK'});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#197b62'});
    setTimeout(() => chrome.action.setBadgeText({tabId: tab.id, text: ''}), 1800);
  } catch (error) {
    await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#b74343'});
    console.error('Subtitle Notes Capture:', error);
  }
});

function pageContext() {
  const selection = window.getSelection();
  const anchor = selection?.anchorNode?.parentElement;
  const video = [...document.querySelectorAll('video')].find(item => item.readyState > 0) || document.querySelector('video');
  const cleanTitle = (document.title || '').replace(/\s*[-|]\s*(YouTube|Netflix|Prime Video|Disney\+).*/i, '').trim();
  return {
    title: cleanTitle || document.title,
    timecodeMs: video && Number.isFinite(video.currentTime) ? video.currentTime * 1000 : null,
    context: anchor?.closest('[role="dialog"], [class*="caption" i], [class*="subtitle" i], [class*="cue" i]')?.innerText?.trim().slice(0, 4000) || selection?.toString().trim() || null
  };
}
