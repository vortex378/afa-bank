UPDATE users SET salary=5000000;
CREATE TRIGGER salary_on_activation AFTER UPDATE OF status ON users WHEN NEW.status='active' AND OLD.status!='active' BEGIN
INSERT INTO transactions(id,recipient,amount,kind,note,idempotency) SELECT lower(hex(randomblob(16))),NEW.id,5000000,'salary','Pagë virtuale mujore · '||strftime('%Y-%m','now'),'salary:'||NEW.id||':'||strftime('%Y-%m','now') WHERE NOT EXISTS(SELECT 1 FROM transactions WHERE idempotency='salary:'||NEW.id||':'||strftime('%Y-%m','now'));
END;
CREATE TRIGGER salary_on_active_insert AFTER INSERT ON users WHEN NEW.status='active' BEGIN
UPDATE users SET salary=5000000 WHERE id=NEW.id;
INSERT INTO transactions(id,recipient,amount,kind,note,idempotency) SELECT lower(hex(randomblob(16))),NEW.id,5000000,'salary','Pagë virtuale mujore · '||strftime('%Y-%m','now'),'salary:'||NEW.id||':'||strftime('%Y-%m','now') WHERE NOT EXISTS(SELECT 1 FROM transactions WHERE idempotency='salary:'||NEW.id||':'||strftime('%Y-%m','now'));
END;
INSERT INTO transactions(id,recipient,amount,kind,note,idempotency) SELECT lower(hex(randomblob(16))),u.id,5000000,'salary','Pagë virtuale mujore · '||strftime('%Y-%m','now'),'salary:'||u.id||':'||strftime('%Y-%m','now') FROM users u WHERE u.status='active' AND NOT EXISTS(SELECT 1 FROM transactions t WHERE t.idempotency='salary:'||u.id||':'||strftime('%Y-%m','now'));
INSERT INTO audit(id,actor,action,target) VALUES(lower(hex(randomblob(16))),NULL,'payroll.initialize.50000.ALL',strftime('%Y-%m','now'));
