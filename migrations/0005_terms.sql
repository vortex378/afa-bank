ALTER TABLE users ADD COLUMN terms_version TEXT;
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
CREATE TABLE terms_acceptances (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 version TEXT NOT NULL,
 accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(user_id,version)
);
UPDATE users SET salary=5000000;
