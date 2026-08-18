const $ = id => document.getElementById(id);
const defaultApi = 'https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1';
chrome.storage.local.get(['apiUrl', 'email']).then(async data => {
  const stored = data.apiUrl || '';
  const apiUrl = stored.includes('.trycloudflare.com') ? defaultApi : (stored || defaultApi);
  $('apiUrl').value = apiUrl;
  if (apiUrl !== stored) await chrome.storage.local.set({apiUrl, token: ''});
});

async function connect() {
  const apiUrl = $('apiUrl').value.trim().replace(/\/+$/, '');
  $('message').textContent = 'Creating a secure connection code…'; $('code').textContent = '';
  try {
    const response = await fetch(`${apiUrl}/pairings/start`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({device_name: 'Chrome browser'})});
    const pair = await response.json();
    if (!response.ok || !pair.pairing_id) throw new Error(pair.detail || 'Unable to create a code');
    $('code').textContent = pair.code;
    $('message').textContent = 'On your phone: Subtitle Notes → Settings → Connect a computer or browser → enter this code.';
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const poll = await fetch(`${apiUrl}/pairings/poll`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({pairing_id: pair.pairing_id, request_secret: pair.request_secret})});
      const result = await poll.json();
      if (result.status !== 'connected' || !result.token) continue;
      await chrome.storage.local.set({apiUrl, token: result.token, email: result.user?.email || ''});
      $('code').textContent = 'CONNECTED'; $('message').textContent = 'This browser is connected. You can close this tab.'; return;
    }
    $('message').textContent = 'The code expired. Press Connect to make another one.';
  } catch (error) { $('message').textContent = error.message || 'Connection failed'; }
}
$('connect').onclick = connect;
