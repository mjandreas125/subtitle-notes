/**
 * Everything that talks to Stripe, in one file, so that swapping the provider
 * is a change to one import rather than an archaeology exercise.
 *
 * Two things here are security, not plumbing:
 *
 *   - A webhook is only believed when its signature verifies against the
 *     secret, and the comparison is constant-time. A signature checked with
 *     `===` can be guessed one byte at a time by watching how long the answer
 *     takes.
 *   - The entitlement is written from the webhook and from nowhere else. The
 *     browser is told to go to Stripe and nothing it says on the way back is
 *     trusted; only Stripe's own signed message moves an account to `pro`.
 */

import type { Env } from './billing';
import { sameSecret } from './billing';

const API = 'https://api.stripe.com/v1';

/** Stripe wants form encoding, including for nested keys. */
function form(fields: Record<string, string | undefined>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) body.set(k, v);
  return body.toString();
}

async function call(env: Env, path: string, fields: Record<string, string | undefined>) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form(fields),
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Stripe refused that');
  return data;
}

/**
 * A checkout page for this account, for one of the two prices.
 *
 * `client_reference_id` carries our user id there and back, which is how the
 * webhook knows whose account to change without trusting anything the browser
 * says. The customer's e-mail is prefilled because they have already signed
 * in - one field fewer between wanting the thing and having it.
 */
export async function checkoutUrl(
  env: Env, userId: string, email: string, period: 'monthly' | 'yearly', origin: string,
): Promise<string> {
  const price = period === 'yearly' ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
  if (!env.STRIPE_SECRET_KEY || !price) throw new Error('Payments are not configured yet');
  const session = await call(env, '/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: userId,
    customer_email: email || undefined,
    // Back to the library, not to the page they were trying to leave. Being
    // returned to a payment page after paying reads as "it did not work".
    success_url: `${origin}/library?pro=1`,
    cancel_url: `${origin}/library?pro=cancelled`,
    allow_promotion_codes: 'true',
    'subscription_data[metadata][user_id]': userId,
  });
  return String(session.url);
}

/** A link to Stripe's own portal, where somebody can change or cancel their
 *  subscription. Building that ourselves would mean holding card details in
 *  our own screens, which is the last thing worth doing. */
export async function portalUrl(env: Env, customer: string, origin: string): Promise<string> {
  const session = await call(env, '/billing_portal/sessions', {
    customer,
    return_url: `${origin}/pro`,
  });
  return String(session.url);
}

/* ------------------------------------------------------------- the webhook */

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * True when this body really came from Stripe.
 *
 * The header carries a timestamp and one or more signatures; the signed
 * payload is `timestamp.body`. The timestamp is checked as well as the
 * signature, because a valid old message replayed forever is its own problem.
 */
export async function verify(env: Env, body: string, header: string | null): Promise<boolean> {
  if (!header || !env.STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=').map((x) => x.trim()) as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Five minutes, the tolerance Stripe itself suggests.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
  return sameSecret(hex(mac), signature);
}

/**
 * What a verified event does to an account.
 *
 * Only three events matter, and each of them says the same thing in a
 * different tense: this account is paid until then, or it is not paid any
 * more. Anything else is acknowledged and ignored - an unknown event is not
 * an error, and answering 400 to one only makes Stripe retry it forever.
 */
export async function applyEvent(env: Env, event: any): Promise<void> {
  const type = String(event?.type ?? '');
  const object = event?.data?.object ?? {};

  if (type === 'checkout.session.completed') {
    const userId = String(object.client_reference_id ?? '');
    if (!userId) return;
    await env.DB.prepare(
      `UPDATE users SET plan = 'pro', billing_ref = ?, plan_until = NULL WHERE id = ?`
    ).bind(String(object.customer ?? ''), userId).run();
    return;
  }

  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const customer = String(object.customer ?? '');
    if (!customer) return;
    const live = type === 'customer.subscription.updated'
      && ['active', 'trialing', 'past_due'].includes(String(object.status ?? ''));
    // A cancelled subscription keeps working until the end of the period it
    // was paid for. Taking it away the moment somebody cancels is the sort of
    // thing people remember about a product.
    const until = object.current_period_end
      ? new Date(Number(object.current_period_end) * 1000).toISOString()
      : null;
    await env.DB.prepare(
      `UPDATE users SET plan = ?, plan_until = ? WHERE billing_ref = ?`
    ).bind(live ? 'pro' : 'pro', live ? null : until, customer).run();
    if (!live && !until) {
      await env.DB.prepare(`UPDATE users SET plan = 'free' WHERE billing_ref = ?`)
        .bind(customer).run();
    }
  }
}
