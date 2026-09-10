-- What a person is entitled to, what they have used today, and the key they
-- brought with them.
--
-- Three rules this schema exists to keep:
--
--   1. Entitlement is a property of the account, not of a device or a store.
--      Buy in the browser, and the phone and the desktop know at their next
--      request. There is nothing to "restore".
--   2. A key is never stored in the clear. `ai_key_enc` holds AES-GCM
--      ciphertext whose master key lives in a Worker secret, so a copy of this
--      database is worth nothing on its own. `ai_hint` is the four characters
--      shown back to the person, and is all any client ever receives.
--   3. Usage is counted per day per account, so the ceiling can be generous
--      and still be a ceiling. The row is written whether or not anybody is
--      paying, because knowing whether people reach it is the whole reason to
--      have one.

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_until TEXT;
ALTER TABLE users ADD COLUMN billing_ref TEXT;
ALTER TABLE users ADD COLUMN ai_provider TEXT;
ALTER TABLE users ADD COLUMN ai_key_enc TEXT;
ALTER TABLE users ADD COLUMN ai_hint TEXT;

-- A device may carry its own key, which wins over the account's while that
-- device is the one asking.
ALTER TABLE device_pairings ADD COLUMN ai_provider TEXT;
ALTER TABLE device_pairings ADD COLUMN ai_key_enc TEXT;
ALTER TABLE device_pairings ADD COLUMN ai_hint TEXT;

CREATE TABLE IF NOT EXISTS usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,              -- UTC, YYYY-MM-DD
  smart INTEGER NOT NULL DEFAULT 0,
  deep INTEGER NOT NULL DEFAULT 0,
  own_key INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_usage_day ON usage (day);
CREATE INDEX IF NOT EXISTS idx_users_billing ON users (billing_ref);
