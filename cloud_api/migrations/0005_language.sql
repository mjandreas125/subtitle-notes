-- Which language the meanings are written in. Until now every card was
-- Russian, no matter who was reading it.
ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'ru';
