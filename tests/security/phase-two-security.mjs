/** LOCAL ONLY. A four-student Phase-1-completed SQL fixture isolates Phase 2 race/authorization checks. */
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function phaseTwoSecurity({contexts,actors,db,check,output,origin,sleep,browser,hash}){
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 const rows=[],round=randomUUID(),students=[['red',actors.red.id],['blue',actors.blue.id]];
 for(const team of ['red','blue']){
  const key=team+'2',id=randomUUID(),token=randomUUID();
  db.prepare('INSERT INTO users(id,name,email,password,role,status,iban) VALUES(?,?,?,?,?,?,?)').run(id,'QA '+key,key+'@p2-race.example',hash,'customer','active','AL-DEMO-'+randomUUID().replaceAll('-',''));
  db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,Date.now()+3600000);
  contexts[key]=await browser.newContext();await contexts[key].addCookies([{name:(await contexts.owner.cookies()).find(c=>c.httpOnly).name,value:token,url:origin}]);students.push([key,id]);
 }
 db.prepare('INSERT INTO launch_rounds(id,title,team_size,creator,created_at) VALUES(?,?,20,?,?)').run(round,'LOCAL four-student security fixture',actors.owner.id,Date.now());
 for(const [key,id] of students)db.prepare('INSERT INTO launch_players(round_id,user_id,team,ready,terms_at,terms_version,joined_at) VALUES(?,?,?,1,?,?,?)').run(round,id,key.startsWith('red')?'red':'blue',Date.now(),'launch-level-1-v1',Date.now());
 db.prepare("UPDATE launch_rounds SET stage='completed' WHERE id=?").run(round);
 db.prepare('INSERT INTO launch_verdicts(round_id,winner,grades,reason,actor,created_at) VALUES(?,?,?,?,?,?)').run(round,'draw',JSON.stringify({red:{total:75},blue:{total:75}}),'Explicit SQL precondition for Phase 2 security checks only.',actors.owner.id,Date.now());
 const base=origin+'/api/launch/'+round+'/phase2/';
 const call=async(actor,action,data)=>{const r=await contexts[actor].request.post(base+action,{headers:{Origin:origin},data});const body=await r.json();rows.push({actor,action,request:data,status:r.status(),response:body});return{status:r.status(),body};};
 const state=async actor=>(await contexts[actor].request.get(origin+'/api/launch/state?round='+round)).json();
 const expect=async(actor,action,data,status)=>{const r=await call(actor,action,data);check('P2 security '+actor+' '+action+' rejects with '+status,r.status===status);return r;};
 try{
  const opened=await Promise.all(Array.from({length:10},()=>call('owner','open',{confirm:true})));
  check('Ten concurrent opens create exactly one Phase 2 session',opened.filter(r=>r.status===201).length===1&&opened.every(r=>[201,409].includes(r.status))&&db.prepare('SELECT COUNT(*) n FROM phase2_sessions WHERE round_id=?').get(round).n===1);
  check('All four students carry forward to Phase 2',db.prepare('SELECT COUNT(*) n FROM phase2_participants WHERE round_id=?').get(round).n===4);
  await sleep(5200);
  for(const [key]of students)assert.equal((await call(key,'ready',{ready:true})).status,200);
  const started=await Promise.all(Array.from({length:10},()=>call('owner','start',{confirm:true})));
  check('Concurrent starts execute one stage transition',started.filter(r=>r.status===200).length===1&&started.every(r=>[200,409].includes(r.status)));
  await sleep(3200);
  await expect('red','ready',{ready:false},409);
  const s=await state('red'),pay=s.phase2.payments.find(v=>v.amount===200000),fault=JSON.parse(db.prepare('SELECT private_case FROM phase2_sessions WHERE round_id=?').get(round).private_case).fault;
  const request={payment_id:pay.id,actor_key:fault==='role'?'customer-08':'approver-09',second_approval:false,key:randomUUID()};
  const race=await Promise.all(Array.from({length:50},()=>call('red2','probe',request)));
  check('Fifty simultaneous identical probes create one immutable result and replay safely',race.filter(r=>r.status===201).length===1&&race.every(r=>[200,201].includes(r.status))&&new Set(race.map(r=>r.body.id)).size===1&&db.prepare('SELECT COUNT(*) n FROM phase2_runs WHERE round_id=? AND request_key=?').get(round,request.key).n===1);
  await expect('red2','probe',{...request,second_approval:true},409);
  const original=(await call('red','probe',{...request,key:randomUUID()})).body.id;
  assert.equal((await call('red','pin',{run_id:original})).status,200);
  for(let batch=0;batch<15;batch++){
   const results=await Promise.all(Array.from({length:5},()=>call('red2','probe',{...request,key:randomUUID()})));
   assert.ok(results.every(r=>r.status===201));
  }
  check('Saved evidence remains visible after more than seventy later runs',(await state('red')).phase2.runs.some(r=>r.id===original));
  check('Repeating successful probes does not multiply team points',(await state('red')).phase2.progress.find(v=>v.kind==='probe').score===30);
  await expect('blue','pin',{run_id:original},404);
  await expect('blue','note',{body:'attempt to write opposing team',team:'red'},400);
  await expect('blue','note',{body:'attempt to edit an arbitrary ID',id:randomUUID()},400);
  await expect('red','report',{cause:'x'.repeat(40),defense:'x'.repeat(40),references:original,key:randomUUID(),team:'blue'},400);
  await expect('red','note',{body:'x'.repeat(100*1024)},413);
  assert.equal((await call('red','note',{body:'Evidencë 🔐 e\u0308 — مرحبا 漢字'})).status,200);
  check('Same-team students receive shared notes',(await state('red2')).phase2.notes.some(n=>n.body.includes('Evidencë')));
  const blue=await state('blue2');check('Opposing team receives no private runs, pins or notes',!blue.phase2.runs.length&&!blue.phase2.pins.length&&!blue.phase2.notes.length);
  const outsider=await state('outsider');check('Unenrolled student receives no lab content',!outsider.player&&!outsider.phase2.runs.length&&!outsider.phase2.payments.length&&!outsider.phase2.notes.length&&outsider.phase2.instructor===null);
  await expect('outsider','note',{body:'not enrolled'},403);
  await expect('red','defense',{policy:{requireActive:true,requireRole:true,checkTenant:true,preventSelf:true,limit:500000},key:randomUUID()},403);
  assert.equal((await call('owner','pause',{confirm:true})).status,200);
  for(const [action,body]of [['probe',{...request,key:randomUUID()}],['pin',{run_id:original}],['note',{body:'paused'}],['payment',{title:'paused',amount:'1'}]])await expect('red',action,body,409);
  await expect('blue','defense',{policy:{requireActive:true,requireRole:true,checkTenant:true,preventSelf:true,limit:500000},key:randomUUID()},409);
  let guarded=false;try{db.prepare('INSERT INTO phase2_notes(id,round_id,team,actor,body,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),round,'red',actors.red.id,'direct frozen write',Date.now());}catch(error){guarded=/frozen/.test(error.message);}
  check('Database guard rejects frozen writes independently of route checks',guarded);
  assert.equal((await call('owner','resume',{confirm:true})).status,200);
  db.prepare('UPDATE phase2_sessions SET deadline_at=? WHERE round_id=?').run(Date.now()-100,round);
  await expect('red','probe',{...request,key:randomUUID()},409);
  assert.equal((await call('owner','swap',{confirm:true})).status,200);
  const endRace=await Promise.all([call('owner','next',{confirm:true}),call('owner','end',{confirm:true,reason:'Isolated concurrent end regression.'})]);
  const end=endRace[1];if(end.status!==200)assert.equal((await call('owner','end',{confirm:true,reason:'Isolated concurrent end retry.'})).status,200);
  const ended=db.prepare('SELECT s.stage,r.stage round_stage FROM phase2_sessions s JOIN launch_rounds r ON r.id=s.round_id WHERE s.round_id=?').get(round);
  check('Concurrent start/end cannot reactivate a completed phase',ended.stage==='completed'&&ended.round_stage==='completed');
  await expect('red','probe',{...request,key:randomUUID()},409);
  check('Phase 2 security fixture preserves valid foreign keys',db.prepare('PRAGMA foreign_key_check').all().length===0);
 }finally{await fs.writeFile(path.join(output,'phase-two-security-evidence.json'),JSON.stringify(rows,null,2));}
}
