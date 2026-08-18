-- A card is written by a model reading one line, and now and then it picks the
-- wrong sense. The reader knows better, so they can say so.
--
-- One row per person per expression: a suggestion is a vote, and the same
-- person voting twice is still one voice. When enough people write the same
-- thing, it becomes the answer everybody gets.
CREATE TABLE IF NOT EXISTS corrections (
  term       TEXT NOT NULL,   -- the expression, normalised
  language   TEXT NOT NULL,   -- the language it is being explained in
  suggestion TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (term, language, user_id)
);

CREATE INDEX IF NOT EXISTS corrections_lookup ON corrections (term, language);

-- What language the highlighted text was in. Everything used to assume
-- English, which is why a French film came back as nonsense.
ALTER TABLE selections ADD COLUMN source_lang TEXT;
