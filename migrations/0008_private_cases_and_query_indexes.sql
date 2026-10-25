CREATE TABLE launch_casepacks(id TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload)),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)));
CREATE TABLE launch_round_cases(round_id TEXT PRIMARY KEY REFERENCES launch_rounds(id),answer TEXT NOT NULL CHECK(json_valid(answer)),debrief TEXT NOT NULL CHECK(json_valid(debrief)),evidence TEXT NOT NULL CHECK(json_valid(evidence)),batch_ref TEXT NOT NULL);
ALTER TABLE launch_rounds ADD COLUMN incident_ref TEXT;
CREATE INDEX launch_wallet_user ON launch_wallets(round_id,user_id);
CREATE INDEX launch_tx_sender ON launch_transactions(round_id,sender,created_at DESC);
CREATE INDEX launch_tx_recipient ON launch_transactions(round_id,recipient,created_at DESC);
CREATE INDEX launch_players_team ON launch_players(round_id,team);
CREATE INDEX launch_evidence_category ON launch_evidence(round_id,category,occurred_at);
DROP TRIGGER launch_incident_guard;
CREATE TRIGGER launch_incident_guard BEFORE INSERT ON launch_incidents BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM launch_round_cases WHERE round_id=NEW.round_id) THEN RAISE(ABORT,'Launch private assessment required') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor AND role='owner' AND status='active') THEN RAISE(ABORT,'Launch owner required') END;
 SELECT CASE WHEN (SELECT stage FROM launch_rounds WHERE id=NEW.round_id)!='banking' THEN RAISE(ABORT,'Launch wrong stage') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=NEW.round_id AND p.terms_at IS NOT NULL AND u.role='customer' AND u.status='active') THEN RAISE(ABORT,'Launch no players') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM launch_wallets w JOIN launch_players p ON p.round_id=w.round_id AND p.user_id=w.user_id JOIN users u ON u.id=p.user_id WHERE w.round_id=NEW.round_id AND u.role='customer' AND u.status='active' AND (w.balance<1000000 OR p.terms_at IS NULL)) THEN RAISE(ABORT,'Launch incident preflight failed') END;
END;
DROP TRIGGER launch_incident_apply;
CREATE TRIGGER launch_incident_apply AFTER INSERT ON launch_incidents BEGIN
 INSERT INTO launch_transactions(id,round_id,sender,recipient,amount,kind,note,request_key,created_at,batch_ref) SELECT lower(hex(randomblob(16))),NEW.round_id,w.id,(SELECT id FROM launch_wallets WHERE round_id=NEW.round_id AND user_id IS NULL),1000000,'incident','Simulated unauthorized transfer · investigate related records','incident:'||w.id,NEW.created_at,(SELECT batch_ref FROM launch_round_cases WHERE round_id=NEW.round_id) FROM launch_wallets w JOIN launch_players p ON p.round_id=w.round_id AND p.user_id=w.user_id JOIN users u ON u.id=p.user_id WHERE w.round_id=NEW.round_id AND u.role='customer' AND u.status='active' AND p.terms_at IS NOT NULL;
 UPDATE launch_rounds SET stage='investigation',incident_at=NEW.created_at,incident_ref=(SELECT batch_ref FROM launch_round_cases WHERE round_id=NEW.round_id),version=version+1 WHERE id=NEW.round_id;
END;
-- Public legacy exercises cannot be reused as a private assessment. Preserve their ledgers/history.
INSERT INTO launch_events(round_id,event,created_at) SELECT id,'Public legacy assessment retired during security upgrade; open a new private round',CAST(strftime('%s','now') AS INTEGER)*1000 FROM launch_rounds WHERE stage!='completed' AND NOT EXISTS(SELECT 1 FROM launch_round_cases c WHERE c.round_id=launch_rounds.id);
UPDATE launch_rounds SET stage='completed',version=version+1 WHERE stage!='completed' AND NOT EXISTS(SELECT 1 FROM launch_round_cases c WHERE c.round_id=launch_rounds.id);
