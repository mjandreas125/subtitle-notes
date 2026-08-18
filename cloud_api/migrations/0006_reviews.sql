-- Spaced repetition. A word is saved once and then has to be met again a few
-- times, at widening intervals, or it is only a list.
--
-- One row per card, created the first time it is reviewed: a card with no row
-- has never been shown and is due immediately.
CREATE TABLE IF NOT EXISTS reviews (
  selection_id TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL,
  -- Position in the interval ladder, not a count of reviews: a wrong answer
  -- moves it back down.
  step         INTEGER NOT NULL DEFAULT 0,
  due_at       TEXT NOT NULL,
  last_result  TEXT,
  reviewed_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS reviews_owner_due ON reviews (owner_id, due_at);
