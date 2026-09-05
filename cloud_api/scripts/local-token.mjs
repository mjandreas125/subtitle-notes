// A session for a local `wrangler dev`, signed the way the worker signs one.
//
//   node scripts/local-token.mjs [user-id] [email]
//
// It reads TOKEN_SECRET out of cloud_api/.dev.vars, so it is only ever valid
// against the local server - the real secret lives in Cloudflare and is not on
// this machine. Seed the user first:
//
//   npx wrangler d1 execute subtitle-notes-production --local --command \
//     "INSERT OR REPLACE INTO users (id, email, display_name, language, created_at) \
//      VALUES ('local-user','you@example.com','Local','ru','2026-01-01T00:00:00.000Z')"
import { readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const [, , subject = 'local-user', email = 'you@example.com'] = process.argv;

const vars = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8');
const secret = (vars.match(/^TOKEN_SECRET=(.*)$/m)?.[1] ?? '').trim();
if (!secret) {
  console.error('No TOKEN_SECRET in cloud_api/.dev.vars. Put any string there for local runs.');
  process.exit(1);
}

const encoder = new TextEncoder();
const b64 = (bytes) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const key = await crypto.subtle.importKey(
  'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
);
const head = b64(encoder.encode('{"alg":"HS256","typ":"JWT"}'));
const claims = b64(encoder.encode(JSON.stringify({
  sub: subject, email, exp: Math.floor(Date.now() / 1000) + 3600,
})));
const signature = b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${head}.${claims}`))));
console.log(`${head}.${claims}.${signature}`);
