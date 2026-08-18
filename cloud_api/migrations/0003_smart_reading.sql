-- A card now carries what the expression means in its line, not just what the
-- dictionary says: Russian synonyms for the sense, and the literal image
-- behind a figurative expression.
ALTER TABLE selections ADD COLUMN synonyms_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE selections ADD COLUMN sense_note TEXT;
