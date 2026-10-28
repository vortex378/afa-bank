/** Called by start-flow.mjs with INCLUDE_PHASE_TWO=1. The parent owns an isolated LOCAL database/server. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
export async function phaseTwoFlow({pages,contexts,actors,round,db,check,output,origin,sleep,browser,pass,hash,students=['red','blue']}){
 const peers=students.filter(key=>key.endsWith('Peer')),teamOf=key=>key.startsWith('red')?'red':'blue';
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 const endpoint='/api/launch/'+round+'/phase2/';
 const evidence=[];
 async function call(actor,action,body,expected){
  const response=await contexts[actor].request.post(origin+endpoint+action,{headers:{Origin:origin},data:body});
  const result=await response.json();
  evidence.push({actor,action,status:response.status(),body,response:result});
  if(expected!==undefined)check(actor+' '+action+' returns '+expected,response.status()===expected);
  return {status:response.status(),body:result};
 }
 async function state(actor){const response=await contexts[actor].request.get(origin+'/api/launch/state');assert.equal(response.status(),200);return response.json();}
 async function ownerClick(label){await pages.owner.getByRole('button',{name:label,exact:true}).click();await pages.owner.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();}
 async function layout(page,name){
  for(const language of ['sq','en']){
   await page.getByRole('button',{name:language==='sq'?'Shqip':'English',exact:true}).click();
   for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
    check(name+' '+language+' fits '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===390||width===1440)await page.screenshot({path:path.join(output,'p2-'+name+'-'+language+'-'+width+'.png'),fullPage:true});
   }
  }
 }
 const balancesBefore=db.prepare('SELECT id,balance FROM launch_wallets WHERE round_id=? ORDER BY id').all(round);
 try{
  for(const key of ['outsider','pending']){
   const id=randomUUID();db.prepare('INSERT INTO users(id,name,email,password,role,status,iban) VALUES(?,?,?,?,?,?,?)').run(id,'QA '+key,key+'@phase-two.example',hash,'customer',key==='pending'?'pending':'active','AL-DEMO-'+randomUUID().replaceAll('-','').toUpperCase());
   const token=randomUUID(),hashed=createHash('sha256').update(token).digest('hex');db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(hashed,id,Date.now()+3600000);
   contexts[key]=await browser.newContext();await contexts[key].addCookies([{name:'afa_session',value:token,url:origin}]);
  }
  // Match the real session cookie name without exposing any session secret in output.
  const cookieName=(await contexts.owner.cookies()).find(c=>c.httpOnly)?.name;
  if(cookieName!=='afa_session')for(const key of ['outsider','pending']){const cookies=await contexts[key].cookies();await contexts[key].clearCookies();await contexts[key].addCookies([{name:cookieName,value:cookies[0].value,url:origin}]);}
  contexts.anonymous=await browser.newContext();
  for(const actor of ['red','blue','admin','finance','outsider'])await call(actor,'open',{confirm:true},403);
  await call('pending','open',{confirm:true},401);await call('anonymous','open',{confirm:true},401);
  await ownerClick('Open Phase 2');
  await pages.red.getByRole('button',{name:'I am ready',exact:true}).waitFor();
  check('Phase 2 transition reaches Red without signing in again',true);
  await pages.red.reload();
  for(const actor of students){
   await pages[actor].getByRole('button',{name:'I am ready',exact:true}).waitFor();
   check(actor+' automatically enters the Phase 2 briefing',true);
  }
  const session=await state('red');
  check('Phase 2 preserves campaign ID and team',session.round.id===round&&session.round.level===2&&session.player.team==='red');
  check('Phase 2 preserves Phase 1 verdict and scores',!!session.phase2.phase1?.grades.red.total);
  check('Student receives no private Phase 2 case',session.phase2.instructor===null&&!JSON.stringify(session).includes('private_case'));
  await call('owner','start',{confirm:true},409);
  await pages.red.getByRole('button',{name:'I am ready',exact:true}).click();
  await pages.red.getByRole('button',{name:'Mark not ready',exact:true}).waitFor();
  check('Phase 2 readiness remains individual',(await state('blue')).player.ready===0);
  await pages.blue.getByRole('button',{name:'I am ready',exact:true}).click();
  for(const actor of peers){await pages[actor].getByRole('button',{name:'I am ready',exact:true}).click();await pages[actor].getByRole('button',{name:'Mark not ready',exact:true}).waitFor();check(actor+' independently marks ready for Phase 2',true);}
  await layout(pages.red,'briefing');await layout(pages.owner,'owner');
  await ownerClick('Start Round A');
  for(const actor of students)await pages[actor].getByRole('button',{name:'Open a sample payment',exact:true}).waitFor();
  check('Round A assigns Red to testing and Blue to defense',(await state('red')).phase2.task==='attack'&&(await state('blue')).phase2.task==='defense');
  const exploitActor='customer-08'; // A public lab identity, not an instructor answer.
  const redState=await state('red'),blueState=await state('blue');
  const redPayment=redState.phase2.payments.find(p=>p.leg===1&&p.amount===200000),bluePayment=blueState.phase2.payments.find(p=>p.leg===1&&p.amount===200000);
  const probeBody={payment_id:redPayment.id,actor_key:exploitActor,second_approval:false,key:randomUUID()};
  await call('blue','probe',{...probeBody,payment_id:bluePayment.id},403);
  await call('red','defense',{policy:{requireActive:true,requireRole:true,checkTenant:true,preventSelf:true,limit:500000},key:randomUUID()},403);
  await call('red','probe',{...probeBody,payment_id:bluePayment.id,key:randomUUID()},404);
  for(const tamper of [{team:'blue'},{user_id:actors.owner.id},{account_id:actors.blue.id},{round_id:randomUUID()},{leg:2}])await call('red','probe',{...probeBody,...tamper,key:randomUUID()},400);
  for(const actor of ['red','blue','admin','finance','outsider'])for(const action of ['start','pause','resume','swap','next','review','complete','end'])await call(actor,action,{confirm:true},403);
  await call('pending','probe',probeBody,401);await call('anonymous','probe',probeBody,401);
  const oldTransfer=await contexts.red.request.post(origin+'/api/launch/'+round+'/transfer',{headers:{Origin:origin},data:{amount:'1',iban:'AL-DEMO-NOT-USED',key:randomUUID()}});
  check('Phase 1 transfer endpoint is unavailable during Phase 2',oldTransfer.status()===409);
  const noCsrf=await contexts.red.request.post(origin+endpoint+'probe',{data:probeBody});check('Phase 2 POST still requires same-origin CSRF protection',noCsrf.status()===403);
  await layout(pages.red,'bank');
  await pages.red.getByRole('button',{name:'Create sample payment',exact:true}).click();
  await pages.red.getByRole('textbox',{name:'Fictional supplier',exact:true}).fill('QA Supplier');
  await pages.red.getByRole('textbox',{name:'Amount in DEMO ALL',exact:true}).fill('1250');
  await pages.red.getByRole('button',{name:'Create payment',exact:true}).click();
  await pages.red.getByRole('heading',{name:'QA Supplier',exact:true}).waitFor();
  check('Student creates a sample payment in their own team lab',(await state('red')).phase2.payments.length===3&&(await state('blue')).phase2.payments.length===2);
  for(const amount of ['-1','0','0.001','1e3','NaN','1000000000'])await call('red','payment',{title:'Invalid amount',amount},400);
  const replay=await call('red','probe',probeBody,201);await call('red','probe',probeBody,200);await call('red','probe',{...probeBody,second_approval:true},409);
  check('Probe replay creates one immutable run',db.prepare('SELECT COUNT(*) AS n FROM phase2_runs WHERE round_id=? AND actor=? AND request_key=?').get(round,actors.red.id,probeBody.key).n===1);
  await ownerClick('Pause');
  await pages.red.getByText('The owner paused the exercise.',{exact:false}).waitFor();
  await call('red','probe',{...probeBody,key:randomUUID()},409);
  const paused=(await state('red')).phase2;await sleep(1100);await ownerClick('Resume');
  const resumed=(await state('red')).phase2;check('Resume preserves remaining time instead of consuming the pause',resumed.deadlineAt>=paused.deadlineAt+1000);
  await pages.red.addInitScript(()=>{const original=Date.now;Date.now=()=>original()+300000;});await pages.red.reload();
  await pages.red.getByRole('button',{name:'Open a sample payment',exact:true}).waitFor();
  const clock=await pages.red.locator('.p2-clock strong').innerText();const [m,sec]=clock.split(':').map(Number);
  check('Phase 2 countdown tolerates a student clock five minutes wrong',Math.abs(m*60+sec-Math.ceil((resumed.deadlineAt-Date.now())/1000))<4);
  async function completeTask(actor,kind){
   const page=pages[actor];await page.getByRole('button',{name:'Laboratory',exact:true}).click();
   if(kind==='attack'){
    const current=await state(actor),payment=current.phase2.payments.find(p=>p.leg===current.phase2.leg&&p.amount===200000);
    await page.getByRole('combobox',{name:'Payment',exact:true}).selectOption(payment.id);
    await page.getByRole('combobox',{name:'Fictional lab identity',exact:true}).selectOption('approver-03');
    await page.getByRole('button',{name:'Send approval probe',exact:true}).click();
    await page.getByText('This was a legitimate approval.',{exact:false}).waitFor();
    check(actor+' verifies a legitimate baseline approval',true);
    let found=false;
    for(const candidate of ['customer-08','approver-09']){
      await page.getByRole('combobox',{name:'Fictional lab identity',exact:true}).selectOption(candidate);
      const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/phase2/probe'));
      await page.getByRole('button',{name:'Send approval probe',exact:true}).click();
      const r=await response;assert.equal(r.status(),201);const result=await r.json();
      if(result.response.unauthorizedApproval){found=true;break;}
    }
    assert.ok(found,'Student must discover an unauthorized approval using visible lab identities.');
    await page.getByText('An unauthorized approval was demonstrated.',{exact:false}).waitFor();
    check(actor+' demonstrates the authorization weakness in the simulator',true);
   }else{
    await page.getByRole('checkbox',{name:'Require an active identity',exact:true}).check();
    await page.getByRole('checkbox',{name:'Require an approval role',exact:true}).check();
    await page.getByRole('checkbox',{name:'Match the payment organization',exact:true}).check();
    await page.getByRole('checkbox',{name:'Prevent self approval',exact:true}).check();
    await page.getByRole('spinbutton',{name:'Second approval above this amount (ALL)',exact:true}).fill('5000');
    const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/phase2/defense'));
    await page.getByRole('button',{name:'Run defense tests',exact:true}).click();
    const result=await response;assert.equal(result.status(),201);const run=await result.json();await page.locator('.p2-run-id').filter({hasText:run.id}).waitFor();
    await page.locator('.p2-result-status').filter({hasText:'10 / 10'}).waitFor();
    check(actor+' validates all ten legitimate and unauthorized payment cases',true);
   }
   const help=page.locator('.learning-help').filter({hasText:'Keep the evidence'});
   await help.getByRole('button',{name:'Show me the button',exact:true}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='p2-pin'&&document.getElementById('p2-pin').classList.contains('learning-highlight'));
   check(actor+' contextual help highlights the real pin button',await page.evaluate(()=>document.activeElement?.id==='p2-pin'&&document.getElementById('p2-pin').classList.contains('learning-highlight')));
   await page.getByRole('button',{name:'Pin this result',exact:true}).click();await page.getByRole('button',{name:'Pinned to team',exact:true}).waitFor();
   if(actor==='red'&&kind==='attack')await layout(page,'attack');
   if(actor==='blue'&&kind==='defense')await layout(page,'defense');
   await page.locator('.learning-help').filter({hasText:'Evidence saved'}).getByRole('button',{name:'Open team notebook',exact:true}).click();await page.getByRole('heading',{name:'Your team runs',exact:true}).waitFor();check(actor+' saved-evidence help opens the actual team notebook',true);
   const snapshot=await state(actor);check(actor+' receives only its own team runs and pins',snapshot.phase2.runs.every(r=>r.team===teamOf(actor))&&snapshot.phase2.pins.every(p=>p.team===teamOf(actor)));
  }
  if(peers.length)await pages.bluePeer.getByRole('button',{name:'Laboratory',exact:true}).click();
  await completeTask('red','attack');await completeTask('blue','defense');
  if(peers.length){
    await pages.bluePeer.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='5000');
    check('Blue teammate automatically receives the saved defense configuration',await pages.bluePeer.getByRole('checkbox',{name:'Require an approval role',exact:true}).isChecked());
    await pages.bluePeer.screenshot({path:path.join(output,'blue-peer-synchronized-defense.png'),fullPage:true});
    await pages.bluePeer.getByRole('spinbutton',{name:'Second approval above this amount (ALL)',exact:true}).fill('4500');
    await pages.blue.getByRole('button',{name:'Laboratory',exact:true}).click();
    await pages.blue.getByRole('spinbutton',{name:'Second approval above this amount (ALL)',exact:true}).fill('6000');
    const saved=pages.blue.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/phase2/defense'));
    await pages.blue.getByRole('button',{name:'Run defense tests',exact:true}).click();assert.equal((await saved).status(),201);
    await pages.bluePeer.getByRole('button',{name:'Load latest team rules',exact:true}).waitFor();
    check('Incoming team update preserves an unsaved draft and blocks stale submission',await pages.bluePeer.getByRole('spinbutton',{name:'Second approval above this amount (ALL)',exact:true}).inputValue()==='4500'&&!(await pages.bluePeer.getByRole('button',{name:'Run defense tests',exact:true}).isEnabled()));
    await pages.bluePeer.screenshot({path:path.join(output,'blue-peer-preserved-draft-conflict.png'),fullPage:true});
    await pages.bluePeer.getByRole('button',{name:'Load latest team rules',exact:true}).click();
    check('Student explicitly loads the latest shared defense',await pages.bluePeer.getByRole('spinbutton',{name:'Second approval above this amount (ALL)',exact:true}).inputValue()==='6000');
    await completeTask('redPeer','attack');await completeTask('bluePeer','defense');
  }
  await call('red','report',{cause:'A sufficiently detailed preliminary explanation of this exercise.',defense:'A sufficiently detailed defense explanation for this exercise.',references:'not enough task evidence',key:randomUUID()},409);
  for(const actor of ['red','blue']){
   await pages[actor].getByRole('button',{name:'Team evidence',exact:true}).click();
   await pages[actor].getByRole('textbox',{name:'Observation or question',exact:true}).fill(actor+' private note <img src=x onerror="window.__phase2xss=1">');
   await pages[actor].getByRole('button',{name:'Share with team',exact:true}).click();
   await pages[actor].locator('.p2-note').filter({hasText:actor+' private note'}).waitFor();
   check(actor+' notebook escapes XSS payloads',await pages[actor].evaluate(()=>!window.__phase2xss&&document.querySelectorAll('.p2-note img').length===0));
  }
  check('Red cannot read Blue private notes',!(await state('red')).phase2.notes.some(n=>n.body.includes('blue private note')));
  check('Blue cannot read Red private notes',!(await state('blue')).phase2.notes.some(n=>n.body.includes('red private note')));
  for(const actor of peers){await pages[actor].getByRole('button',{name:'Team evidence',exact:true}).click();await pages[actor].locator('.p2-note').filter({hasText:teamOf(actor)+' private note'}).waitFor();check(actor+' automatically receives teammate notebook work',true);}
  await ownerClick('Swap tasks');
  if(peers.length){await contexts.bluePeer.setOffline(true);await contexts.bluePeer.setOffline(false);await pages.bluePeer.reload();await pages.bluePeer.getByRole('heading',{name:'Switch perspective. Keep your evidence.',exact:true}).waitFor();check('A student rejoins the current phase after offline/online and reload',true);}
  for(const actor of students)await pages[actor].getByRole('heading',{name:'Switch perspective. Keep your evidence.',exact:true}).waitFor();
  await call('red','probe',{...probeBody,key:randomUUID()},409);
  await ownerClick('Start Round B');
  for(const actor of students)await pages[actor].getByRole('button',{name:'Open a sample payment',exact:true}).waitFor();
  check('Round B swaps tasks for both teams',(await state('red')).phase2.task==='defense'&&(await state('blue')).phase2.task==='attack');
  await completeTask('red','defense');await completeTask('blue','attack');
  for(const actor of peers)await completeTask(actor,teamOf(actor)==='red'?'defense':'attack');
  for(const actor of ['red','blue']){
   const page=pages[actor];await page.getByRole('button',{name:'Team report',exact:true}).click();
   await page.getByRole('textbox',{name:'What permission check failed? Cite an approval probe.',exact:true}).fill('The recorded approval probe demonstrates a missing authorization control. <script>window.__phase2xss=1</script>');
   await page.getByRole('textbox',{name:'How did your defense fix it while preserving legitimate payments?',exact:true}).fill('We validated identity, approval role, organization and self approval, and checked that legitimate payments still succeed.');
   const refs=(await state(actor)).phase2.pins.map(p=>p.run_id).join(', ');
   await page.getByRole('textbox',{name:'Which saved references support your conclusion?',exact:true}).fill(refs);
   await page.getByRole('button',{name:'Submit Phase 2 report',exact:true}).click();
   await page.getByText('Report received',{exact:false}).waitFor();
   check(actor+' submits a report backed by both task types',(await state(actor)).phase2.reports.length===1);
   if(actor==='red')await layout(page,'report');
   check(actor+' cannot read the opposing report',(await state(actor)).phase2.reports.every(r=>r.team===actor));
  }
  await ownerClick('Freeze reports & review');
  for(const actor of students)await pages[actor].getByRole('heading',{name:'Your submitted report',exact:true}).waitFor();
  await call('red','note',{body:'Post-review mutation must be rejected'},409);
  await pages.owner.getByRole('button',{name:'Reports & verdict',exact:true}).click();
  check('Owner review escapes student report markup',await pages.owner.evaluate(()=>!window.__phase2xss&&document.querySelectorAll('.p2-readable-fields script').length===0));
  for(const [team,reasoning,documentation] of [['red',23,9],['blue',20,8]]){
   await pages.owner.locator('[name="'+team+'_reasoning"]').fill(String(reasoning));
   await pages.owner.locator('[name="'+team+'_documentation"]').fill(String(documentation));
  }
  await pages.owner.getByRole('textbox',{name:'Explain the verdict',exact:true}).fill('Both teams completed both roles. Red provided stronger evidence-backed reasoning and documentation.');
  await ownerClick('Publish Phase 2 verdict');
  for(const actor of students){
   await pages[actor].getByRole('heading',{name:'Phase 2 complete',exact:true}).waitFor();
   check(actor+' automatically receives the Phase 2 verdict',true);
   const result=await state(actor);check(actor+' receives preserved Phase 1 and new Phase 2 scores',result.phase2.verdict.grades.red.total===97&&result.phase2.verdict.grades.blue.total===93&&result.phase2.verdict.winner==='red'&&result.phase2.phase1.grades.red.total>0);
   await pages[actor].reload();await pages[actor].getByRole('heading',{name:'Phase 2 complete',exact:true}).waitFor();
   check(actor+' refresh remains signed in at the completed phase',true);
  }
  await call('red','probe',{...probeBody,key:randomUUID()},409);
  assert.deepEqual(db.prepare('SELECT id,balance FROM launch_wallets WHERE round_id=? ORDER BY id').all(round),balancesBefore);check('Phase 2 cannot create or debit Phase 1 money',true);
  check('Database foreign keys remain valid',db.prepare('PRAGMA foreign_key_check').all().length===0);
  await layout(pages.red,'verdict');
  await pages.owner.getByRole('button',{name:'Create a new Level 1 lobby',exact:true}).click();
  await pages.owner.getByRole('button',{name:'Launch Level 1',exact:true}).waitFor();
  const fresh=await state('owner');check('Owner can restart at a fresh Level 1 lobby',fresh.round.id!==round&&fresh.round.level===1&&fresh.round.stage==='lobby');
  for(const actor of students){await pages[actor].getByRole('button',{name:'Join red team',exact:true}).waitFor();check(actor+' automatically leaves completed Phase 2 for the fresh lobby',true);}
  const closedLobby=await contexts.owner.request.post(origin+'/api/launch/'+fresh.round.id+'/cancel',{headers:{Origin:origin},data:{confirm:true,reason:'Closing the isolated fresh-lobby regression before the next fixture.'}});check('Owner can close the newly created test lobby',closedLobby.status()===200);
  const {phaseTwoSecurity}=await import('./phase-two-security.mjs');await phaseTwoSecurity({contexts,actors,db,check,output,origin,sleep,browser,hash});
 }finally{await fs.writeFile(path.join(output,'phase-two-api-evidence.json'),JSON.stringify(evidence,null,2));}
}
