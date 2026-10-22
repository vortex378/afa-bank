PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin','finance','owner')),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','rejected')),iban TEXT NOT NULL UNIQUE,balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0),salary INTEGER NOT NULL DEFAULT 0 CHECK(salary>=0),created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE transactions(id TEXT PRIMARY KEY,sender TEXT REFERENCES users(id),recipient TEXT REFERENCES users(id),amount INTEGER NOT NULL CHECK(amount>0),kind TEXT NOT NULL CHECK(kind IN ('transfer','salary','incident','reversal')),note TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')),idempotency TEXT UNIQUE NOT NULL);
CREATE INDEX transactions_sender ON transactions(sender,created_at); CREATE INDEX transactions_recipient ON transactions(recipient,created_at);
CREATE TABLE incidents(id TEXT PRIMARY KEY,customer TEXT NOT NULL REFERENCES users(id),transaction_id TEXT NOT NULL REFERENCES transactions(id),status TEXT NOT NULL DEFAULT 'open',created_at TEXT NOT NULL DEFAULT (datetime('now')),resolved_at TEXT);
CREATE TABLE audit(id TEXT PRIMARY KEY,actor TEXT REFERENCES users(id),action TEXT NOT NULL,target TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TRIGGER transfer_debit AFTER INSERT ON transactions WHEN NEW.kind IN ('transfer','incident') BEGIN
SELECT CASE WHEN (SELECT status FROM users WHERE id=NEW.sender)!='active' THEN RAISE(ABORT,'Account is not active') END;
SELECT CASE WHEN (SELECT balance FROM users WHERE id=NEW.sender)<NEW.amount THEN RAISE(ABORT,'Insufficient balance') END;
UPDATE users SET balance=balance-NEW.amount WHERE id=NEW.sender;
END;
CREATE TRIGGER transfer_credit AFTER INSERT ON transactions WHEN NEW.recipient IS NOT NULL BEGIN
SELECT CASE WHEN (SELECT status FROM users WHERE id=NEW.recipient)!='active' THEN RAISE(ABORT,'Recipient is not active') END;
UPDATE users SET balance=balance+NEW.amount WHERE id=NEW.recipient;
END;
