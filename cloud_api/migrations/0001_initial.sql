CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS selections (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  client_key TEXT NOT NULL,
  media_title TEXT NOT NULL,
  season TEXT,
  episode TEXT,
  timecode_ms INTEGER,
  selected_text TEXT NOT NULL,
  translation TEXT NOT NULL,
  focus_word TEXT,
  focus_phrase TEXT,
  focus_translation TEXT,
  variants_json TEXT NOT NULL DEFAULT '[]',
  examples_json TEXT NOT NULL DEFAULT '[]',
  context TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, client_key)
);
CREATE INDEX IF NOT EXISTS idx_selections_owner_created ON selections(owner_id, archived, created_at DESC);

CREATE TABLE IF NOT EXISTS device_pairings (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  device_name TEXT NOT NULL,
  user_id TEXT,
  token TEXT,
  expires_at INTEGER NOT NULL
);
