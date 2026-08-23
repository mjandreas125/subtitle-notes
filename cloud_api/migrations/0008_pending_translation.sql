-- A card whose translation never arrived.
--
-- Every provider can be down or rate-limiting at the moment somebody selects a
-- word, and the card was written anyway: older builds stored the English
-- marker `Translation unavailable`, newer ones fell back to the selected text
-- itself. Either way the failure became permanent — the card sat in the
-- library forever looking like a translation that simply happened to be in the
-- wrong language, and nothing ever went back to it.
--
-- The flag says "this one still owes a translation". It costs one column, and
-- it lets the server come back later, when the providers answer again, and
-- finish the job.
ALTER TABLE selections ADD COLUMN needs_translation INTEGER NOT NULL DEFAULT 0;

-- The cards already spoiled this way. The literal marker is unambiguous; a
-- translation identical to the words that were selected is the other shape the
-- same failure takes.
UPDATE selections
   SET needs_translation = 1
 WHERE translation IS NULL
    OR trim(translation) = ''
    OR lower(trim(translation)) = 'translation unavailable'
    OR lower(trim(translation)) = lower(trim(selected_text));

CREATE INDEX IF NOT EXISTS selections_pending_translation
    ON selections (owner_id, needs_translation);
