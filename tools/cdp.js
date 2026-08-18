// Small Chrome DevTools Protocol driver: open a URL in the running browser,
// wait, run some JavaScript, take a screenshot.
//
//   node cdp.js <url> <out.png> [ "expression" ] [ waitMs ] [ width height ]

const fs = require('fs');

const [, , url, out, expression = '', waitMs = '1500', width = '900', height = '1500', scale = '1'] = process.argv;

async function targets() {
  const reply = await fetch('http://127.0.0.1:9222/json/list');
  return reply.json();
}

function send(socket, id, method, params = {}, sessionId) {
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
}

(async () => {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
    .then((r) => r.json())
    .catch(() => null);
  const page = created?.webSocketDebuggerUrl
    ? created
    : (await targets()).find((t) => t.type === 'page' && t.url.startsWith(url.slice(0, 40)));
  if (!page) throw new Error('no page target');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const waiting = new Map();
  let next = 1;
  const call = (method, params) =>
    new Promise((resolve) => {
      const id = next++;
      waiting.set(id, resolve);
      send(socket, id, method, params);
    });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      waiting.get(message.id)(message.result ?? message.error);
      waiting.delete(message.id);
    }
  });

  await new Promise((resolve) => socket.addEventListener('open', resolve));
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: Number(width), height: Number(height), deviceScaleFactor: Number(scale), mobile: false,
  });
  await call('Page.navigate', { url });
  await new Promise((resolve) => setTimeout(resolve, Number(waitMs)));
  if (expression) {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    console.log(JSON.stringify(result?.result?.value ?? result, null, 1).slice(0, 4000));
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  if (out && out !== '-') {
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('screenshot', out);
  }
  socket.close();
  process.exit(0);
})();
