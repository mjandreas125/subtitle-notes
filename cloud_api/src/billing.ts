/**
 * What a person is entitled to, what they have spent today, and the key they
 * brought with them.
 *
 * Everything in here is written so that a copy of the database is worth
 * nothing on its own and a client can never promote itself:
 *
 *   - Keys are sealed with AES-GCM under a master key that lives in a Worker
 *     secret. The database holds ciphertext and four characters.
 *   - A key never leaves this file. Nothing returns it, not even to the
 *     account that set it; clients get `openai ··· 4f2a`.
 *   - `plan` is written by the billing webhook and by nothing else. There is
 *     deliberately no endpoint a client could call to become paid.
 */

export type Plan = 'free' | 'pro';

/** How many readings a free account gets in a day before the deep model
 *  stops being spent on it. Generous on purpose: somebody who meets this
 *  ceiling is watching with a notebook, and that is who a subscription is
 *  for. One constant, one place. */
export const FREE_SMART_PER_DAY = 25;
export const FREE_DEEP_PER_DAY = 3;

/** The providers a person may bring a key for. Anything not on this list is
 *  refused rather than stored, so a typo cannot become a secret we keep. */
export const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'openrouter'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface Env {
  DB: D1Database;
  AI: any;
  KEY_SECRET?: string;
  LEMONSQUEEZY_API_KEY?: string;
  LEMONSQUEEZY_STORE_ID?: string;
  LEMONSQUEEZY_VARIANT_M?: string;
  LEMONSQUEEZY_VARIANT_Y?: string;
  LEMONSQUEEZY_WEBHOOK_SECRET?: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ------------------------------------------------------------------ crypto */

/** The master key, derived once per request from the Worker secret. It is not
 *  the secret itself: SHA-256 of it, so the secret's length and shape do not
 *  have to satisfy AES. */
async function masterKey(env: Env): Promise<CryptoKey> {
  const secret = env.KEY_SECRET;
  if (!secret) throw new Error('KEY_SECRET is not set');
  const material = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Seal a key. The nonce is fresh for every call and travels with the
 *  ciphertext, because reusing a nonce under AES-GCM loses everything. */
export async function seal(env: Env, plain: string): Promise<string> {
  const key = await masterKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
  const out = new Uint8Array(iv.length + body.length);
  out.set(iv, 0);
  out.set(body, iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function open(env: Env, sealed: string): Promise<string> {
  const raw = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
  const key = await masterKey(env);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
  return dec.decode(plain);
}

/** What a person is shown of their own key. Never the key. */
export function hintOf(plain: string): string {
  const tail = plain.trim().slice(-4);
  return tail.replace(/[^A-Za-z0-9]/g, '*');
}

/** A comparison that takes the same time whether the first byte differs or
 *  the last one does. Used on webhook signatures, where a timing difference
 *  is a way to guess a signature one byte at a time. */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------------- usage */

export const today = () => new Date().toISOString().slice(0, 10);

export interface Usage { smart: number; deep: number; ownKey: number; }

export async function usageOf(env: Env, userId: string): Promise<Usage> {
  const row = await env.DB.prepare(
    'SELECT smart, deep, own_key FROM usage WHERE user_id = ? AND day = ?'
  ).bind(userId, today()).first<any>();
  return {
    smart: Number(row?.smart ?? 0),
    deep: Number(row?.deep ?? 0),
    ownKey: Number(row?.own_key ?? 0),
  };
}

/** Count one. Written for every account, paid or not: a ceiling nobody
 *  measures is a guess. */
export async function countUse(
  env: Env, userId: string, what: 'smart' | 'deep', onOwnKey: boolean,
): Promise<void> {
  const column = what === 'deep' ? 'deep' : 'smart';
  await env.DB.prepare(
    `INSERT INTO usage (user_id, day, ${column}, own_key) VALUES (?, ?, 1, ?)
     ON CONFLICT(user_id, day) DO UPDATE SET
       ${column} = ${column} + 1, own_key = own_key + ?`
  ).bind(userId, today(), onOwnKey ? 1 : 0, onOwnKey ? 1 : 0).run();
}

/* -------------------------------------------------------------- entitlement */

export interface Entitlement {
  plan: Plan;
  until: string | null;
  /** True while the deep model may still be spent on this request. */
  deepAllowed: boolean;
  /** True while a full reading may still be spent on this request. */
  smartAllowed: boolean;
  left: number;
  usage: Usage;
  /** A key the person brought, already unsealed, or null. */
  ownKey: { provider: AiProvider; key: string } | null;
}

/** Everything a request needs to know about what it is allowed to spend.
 *  One query, one decision, so no endpoint has to remember the rules. */
export async function entitlementOf(
  env: Env, userId: string, deviceId?: string | null,
): Promise<Entitlement> {
  const row = await env.DB.prepare(
    'SELECT plan, plan_until, ai_provider, ai_key_enc FROM users WHERE id = ?'
  ).bind(userId).first<any>();

  let provider: string | null = row?.ai_provider ?? null;
  let sealed: string | null = row?.ai_key_enc ?? null;

  // A device's own key wins while that device is the one asking.
  if (deviceId) {
    const own = await env.DB.prepare(
      'SELECT ai_provider, ai_key_enc FROM device_pairings WHERE id = ? AND user_id = ?'
    ).bind(deviceId, userId).first<any>();
    if (own?.ai_key_enc) { provider = own.ai_provider; sealed = own.ai_key_enc; }
  }

  let ownKey: Entitlement['ownKey'] = null;
  if (sealed && provider && (AI_PROVIDERS as readonly string[]).includes(provider)) {
    try {
      ownKey = { provider: provider as AiProvider, key: await open(env, sealed) };
    } catch {
      // A key that will not unseal is a key we do not have. Never a 500.
      ownKey = null;
    }
  }

  const until: string | null = row?.plan_until ?? null;
  const paid = row?.plan === 'pro' && (!until || until >= new Date().toISOString());
  const usage = await usageOf(env, userId);

  // Somebody spending their own key is spending their own money, so the
  // ceiling has nothing to protect and does not apply to them.
  const unlimited = paid || !!ownKey;
  return {
    plan: paid ? 'pro' : 'free',
    until,
    smartAllowed: unlimited || usage.smart < FREE_SMART_PER_DAY,
    deepAllowed: unlimited || usage.deep < FREE_DEEP_PER_DAY,
    left: unlimited ? -1 : Math.max(0, FREE_SMART_PER_DAY - usage.smart),
    usage,
    ownKey,
  };
}
