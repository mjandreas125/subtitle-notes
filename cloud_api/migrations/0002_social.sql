-- Nicknames, friends, a shared feed and likes.

-- A public handle, separate from the Google display name, chosen by the user.
-- Unique but case-insensitively so, since "Andreas" and "andreas" are the same
-- person to everyone reading the feed.
ALTER TABLE users ADD COLUMN nickname TEXT;
-- Words are only visible to friends while this is 1. It is a per-account
-- switch because a saved word can be personal.
ALTER TABLE users ADD COLUMN share_feed INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users(lower(nickname));

-- One row per direction: following someone lets you see their words. A pair of
-- rows means both people added each other.
CREATE TABLE IF NOT EXISTS friendships (
  follower_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

CREATE TABLE IF NOT EXISTS selection_likes (
  selection_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (selection_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_selection ON selection_likes(selection_id);
