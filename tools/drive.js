// Drives a page through a list of steps and prints what each one returns.
//
//   node drive.js <url> <steps.json>
//
// A step is one of:
//   { "wait": 3000 }
//   { "eval": "expression", "world": "Subtitle Notes" }   world optional
//   { "click": [x, y] }                                   real mouse events
//   { "key": "ArrowRight" }
//   { "shot": "file.png" }

const fs = require('fs');
const [, , url, stepsPath] = process.argv;
const steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

(async () => {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((r) => r.json());
  const socket = new WebSocket(created.webSocketDebuggerUrl);
  const waiting = new Map();
  const contexts = [];
  let next = 1;
  const call = (method, params) =>
    new Promise((resolve) => {
      const id = next++;
      waiting.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      waiting.get(message.id)(message.result ?? message.error);
      waiting.delete(message.id);
      return;
    }
    if (message.method === 'Runtime.executionContextCreated') contexts.push(message.params.context);
    if (message.method === 'Runtime.executionContextsCleared') contexts.length = 0;
  });

  await new Promise((resolve) => socket.addEventListener('open', resolve));
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.navigate', { url });

  let last = null;
  for (let step of steps) {
    if (step.wait) await new Promise((resolve) => setTimeout(resolve, step.wait));
    if (step.eval) {
      const chosen = step.world
        ? contexts.find((c) => (c.name || '').toLowerCase().includes(step.world.toLowerCase()))
        : contexts.find((c) => c.auxData?.isDefault);
      const result = await call('Runtime.evaluate', {
        expression: step.eval, contextId: chosen?.id, awaitPromise: true, returnByValue: true,
        userGesture: true,
      });
      const value = result?.result?.value;
      last = value;
      console.log('>', (step.label || step.eval.slice(0, 40)).replace(/\s+/g, ' '));
      console.log(typeof value === 'string' ? value.slice(0, 5000) : JSON.stringify(value ?? result).slice(0, 5000));
    }
    if (step.move) {
      const [x, y] = step.move;
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 2, y: y + 2 });
      console.log('> moved to', x, y);
    }
    if (step.clickLast) {
      const spot = typeof last === 'string' ? JSON.parse(last) : last;
      const x = spot.x ?? spot.x1;
      const y = spot.y ?? spot.y1;
      const modifiers = step.modifiers ?? 0;
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
      for (const type of ['mousePressed', 'mouseReleased']) {
        await call('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, modifiers });
      }
      console.log('> clicked where the last step pointed:', x, y, 'modifiers', modifiers);
    }
    if (step.dragLast) {
      const spot = typeof last === 'string' ? JSON.parse(last) : last;
      step = { ...step, drag: [spot.x1, spot.y1, spot.x2, spot.y2] };
    }
    if (step.press) {
      const [x, y] = step.press;
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers: step.modifiers ?? 0 });
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, modifiers: step.modifiers ?? 0 });
      console.log('> pressed', x, y);
    }
    if (step.moveTo) {
      const [x, y] = step.moveTo;
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1, modifiers: step.modifiers ?? 0 });
      console.log('> moved while down', x, y);
    }
    if (step.release) {
      const [x, y] = step.release;
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, modifiers: step.modifiers ?? 0 });
      console.log('> released', x, y);
    }
    if (step.drag) {
      const [x1, y1, x2, y2] = step.drag;
      const modifiers = step.modifiers ?? 0;
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1, modifiers });
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1, modifiers });
      for (let step2 = 1; step2 <= 6; step2 += 1) {
        await call('Input.dispatchMouseEvent', {
          type: 'mouseMoved', button: 'left', buttons: 1, modifiers,
          x: Math.round(x1 + ((x2 - x1) * step2) / 6), y: Math.round(y1 + ((y2 - y1) * step2) / 6),
        });
      }
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1, modifiers });
      console.log('> dragged', x1, y1, '->', x2, y2, 'modifiers', modifiers);
    }
    if (step.click) {
      const [x, y] = step.click;
      for (const type of ['mousePressed', 'mouseReleased']) {
        await call('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
      }
      console.log('> clicked', x, y);
    }
    if (step.key) {
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: step.key });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: step.key });
    }
    if (step.shot) {
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(step.shot, Buffer.from(shot.data, 'base64'));
      console.log('> screenshot', step.shot);
    }
  }
  socket.close();
  process.exit(0);
})();
