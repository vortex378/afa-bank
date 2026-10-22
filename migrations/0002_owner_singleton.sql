CREATE UNIQUE INDEX one_owner ON users(role) WHERE role='owner';
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires);
