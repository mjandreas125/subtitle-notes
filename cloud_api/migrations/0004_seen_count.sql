-- How many times the same expression has been picked out again. Meeting a word
-- for the fifth time is worth knowing about; until now every encounter looked
-- like the first.
ALTER TABLE selections ADD COLUMN seen_count INTEGER NOT NULL DEFAULT 1;
