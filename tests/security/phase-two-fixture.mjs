/** LOCAL ONLY: seed a declared Phase 1-completed fixture, then exercise the real Phase 2 UI/API. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,pbkdf2Sync} from 'node:crypto';
import assert from 'node:assert/strict';
import {phaseTwoFlow} from './phase-two-flow.mjs';
import {createTestCase} from './test-case.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),origin='http://127.0.0.1:8812';
const output=path.join(here,'artifacts','phase-two-'+Date.now()),state=path.join(here,'tools','phase-two-'+Date.now());
await fs.mkdir(output,{recursive:true});await fs.mkdir(state,{recursive:true});
const config=path.join(here,'wrangler.security.jsonc'),wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js'),runtime=path.join(here,'tools/runtime/workerd.exe');
const env={...process.env};if(await fs.stat(runtime).catch(()=>null))env.MINIFLARE_WORKERD_PATH=runtime;
try{await fetch(origin+'/api/health',{signal:AbortSignal.timeout(600)});throw Error('Port 8812 is already in use.');}catch(error){if(error.message.includes('already in use'))throw error;}
execFileSync(process.execPath,[wrangler,'d1','migrations','apply','afa-launch-security-local','--local','--config',config,'--persist-to',state],{cwd:root,env,windowsHide:true,stdio:'pipe'});
async function findDb(dir){for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory()){const result=await findDb(p);if(result)return result;}else if(p.endsWith('.sqlite')&&p.includes('d1')&&!p.endsWith('metadata.sqlite'))return p;}}
const db=new DatabaseSync(await findDb(state));db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=10000;');
const pass='Local-Phase-Two-'+randomUUID(),salt=randomUUID(),hash=salt+':'+pbkdf2Sync(pass,salt,100000,32,'sha256').toString('hex');
const actors={};for(const [key,role] of [['owner','owner'],['admin','admin'],['finance','finance'],['red','customer'],['blue','customer']]){
 const id=randomUUID();actors[key]={id,email:key+'@phase-two-fixture.example',name:'QA '+key};db.prepare('INSERT INTO users(id,name,email,password,role,status,iban) VALUES(?,?,?,?,?,?,?)').run(id,actors[key].name,actors[key].email,hash,role,'active','AL-DEMO-'+id.replaceAll('-','').toUpperCase());
}
const round=randomUUID();db.prepare('INSERT INTO launch_rounds(id,title,team_size,creator,created_at) VALUES(?,?,?,?,?)').run(round,'Isolated Phase 1 completion fixture',20,actors.owner.id,Date.now());
for(const team of ['red','blue']){const id=actors[team].id;db.prepare('INSERT INTO launch_players(round_id,user_id,team,ready,terms_at,terms_version,joined_at) VALUES(?,?,?,1,?,?,?)').run(round,id,team,Date.now(),'launch-level-1-v1',Date.now());db.prepare('INSERT INTO launch_wallets(id,round_id,user_id,name,iban) VALUES(?,?,?,?,?)').run(randomUUID(),round,id,actors[team].name,'AL-DEMO-'+id.replaceAll('-','').toUpperCase());}
db.prepare("UPDATE launch_rounds SET stage='completed' WHERE id=?").run(round);
db.prepare('INSERT INTO launch_verdicts(round_id,winner,grades,reason,actor,created_at) VALUES(?,?,?,?,?,?)').run(round,'red',JSON.stringify({red:{total:86},blue:{total:71}}),'Fixture only: Phase 1 is already completed for the isolated Phase 2 regression.',actors.owner.id,Date.now());
db.prepare('INSERT INTO launch_casepacks(id,payload) VALUES(?,?)').run(randomUUID(),JSON.stringify(createTestCase()));
const log=await fs.open(path.join(output,'server.log'),'w');const server=spawn(process.execPath,[wrangler,'dev','--local','--ip','127.0.0.1','--port','8812','--config',config,'--persist-to',state],{cwd:root,env,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));const checks=[],errors=[];const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});console.log('PASS',name);};
let browser;try{
 for(let i=0;i<90;i++){try{if((await fetch(origin+'/api/health')).ok)break;}catch{}await sleep(500);if(i===89)throw Error('Local fixture server did not start.');}
 const pw=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');browser=await pw.chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const pages={},contexts={};for(const actor of Object.keys(actors)){
  contexts[actor]=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});await contexts[actor].addInitScript(()=>{if(!localStorage.getItem('afa-language'))localStorage.setItem('afa-language','en');});
  pages[actor]=await contexts[actor].newPage();pages[actor].setDefaultTimeout(15000);pages[actor].on('pageerror',error=>errors.push({actor,message:error.message}));
  await pages[actor].goto(origin+'/#/login');await pages[actor].locator('[name="email"]').fill(actors[actor].email);await pages[actor].locator('[name="password"]').fill(pass);await pages[actor].getByRole('button',{name:'Sign in',exact:true}).click();await pages[actor].waitForURL('**/#/launch');
 }
 await pages.owner.getByRole('button',{name:'Open Phase 2',exact:true}).waitFor();
 await phaseTwoFlow({pages,contexts,actors,round,db,check,output,origin,sleep,browser,pass,hash});
 check('Phase 2 pages have no uncaught errors',errors.length===0);
}catch(error){checks.push({name:'Phase 2 fixture completed',passed:false,error:String(error.stack)});console.error(error);process.exitCode=1;if(browser)for(const [i,c] of browser.contexts().entries())for(const [j,p] of c.pages().entries())await p.screenshot({path:path.join(output,'failure-'+i+'-'+j+'.png'),fullPage:true}).catch(()=>{});}
finally{await fs.writeFile(path.join(output,'result.json'),JSON.stringify({origin,fixture:'Phase 1 completed via local SQL precondition; Phase 2 exercised through real UI/API',checks,errors},null,2));await browser?.close();db.close();if(process.platform==='win32')spawn('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else server.kill();await log.close();console.log('Evidence:',output);}
