import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';

const arg=process.argv.indexOf('--app'),app=path.resolve(arg<0?'dist/UI-Coze-Main-Application-20261007':process.argv[arg+1]);
const out=path.resolve('reports/local/ui-coze-main-20261007');await fs.mkdir(out,{recursive:true});
const root=await fs.mkdtemp(path.resolve('.cache/ui-coze-main-'));
const release=JSON.parse(await fs.readFile(path.join(app,'public/web-release.json'),'utf8'));
const application=JSON.parse(await fs.readFile(path.join(app,'delivery.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={at:new Date().toISOString(),appBuildId:release.appBuildId,packageBuildId:application.packageBuildId,root,method:'Actual packaged v10 launcher and real vendored PGlite, temporary loopback configuration and synthetic database only. Read-only cloud state is injected at the deployment-root write probe; /tmp is remapped into the owned fixture. This is local startup/restore evidence, not live Coze or durable multi-instance acceptance.',cases:[]};
const preload=path.join(root,'probe.mjs');
await fs.writeFile(preload,`
import fs from 'node:fs';import path from 'node:path';import {Server} from 'node:http';
if(process.env.SC2_QA_READONLY_HOME){
 const join=path.join;path.join=(...args)=>args[0]==='/tmp'?join(process.env.SC2_QA_TEMP,...args.slice(1)):join(...args);
 const write=fs.writeFileSync;fs.writeFileSync=(file,...args)=>{if(typeof file==='string'&&path.dirname(file)===process.env.SC2_QA_READONLY_HOME&&path.basename(file).startsWith('.wprobe-')){const error=Error('Synthetic deployment-root EROFS');error.code='EROFS';throw error;}return write(file,...args);};
}
const listen=Server.prototype.listen;Server.prototype.listen=function(...args){
 const server=this,close=server.backend?.close.bind(server.backend);let closing;
 if(close)server.backend.close=()=>closing??=close();
 process.once('message',async message=>{if(message==='close'){await new Promise(r=>server.close(r));if(close)await server.backend.close();process.disconnect();}});
 return listen.apply(server,args);
};
`);
const port=async()=>{const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;};
async function launch(home,{readonly=false}={}){
 const p=await port(),origin='http://127.0.0.1:'+p;
 await fs.writeFile(path.join(home,'sc2-backend.conf'),['SC2_BACKEND_ENABLED=1','SC2_LOCAL_DEV=1','SC2_PUBLIC_ORIGIN='+origin,'SC2_PGLITE_DIR=data/pglite','SC2_DELETION_JOURNAL=data/deletions.jsonl','SC2_PRIVACY_OPERATOR=LOCAL QA ONLY','SC2_PRIVACY_CONTACT=LOCAL QA ONLY','SC2_BACKUP_RETENTION_DAYS=30'].join('\n'));
 const child=spawn(process.execPath,['--import',pathToFileURL(preload).href,path.join(home,'start-coze.mjs')],{cwd:home,env:{...process.env,PORT:String(p),ASSET_ROOT:path.resolve('dist/web'),SC2_QA_READONLY_HOME:readonly?home:'',SC2_QA_TEMP:path.join(root,'tmp')},stdio:['ignore','pipe','pipe','ipc']});
 let log='';child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});let exit;child.once('exit',code=>{exit=code;});
 const started=Date.now();let config;
 while(Date.now()-started<60000){
  if(exit!==undefined)throw Error('Launcher exited '+exit+'\n'+log);
  try{const r=await fetch(origin+'/api/config');if(r.ok){config=await r.json();break;}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 assert.ok(config,'Startup timeout\n'+log);
 return {origin,config,log:()=>log,async close(){if(exit!==undefined)return;child.send('close');const done=new Promise(r=>child.once('exit',r));let timeout;await Promise.race([done,new Promise((_,reject)=>{timeout=setTimeout(()=>{child.kill();reject(Error('Shutdown timeout'));},30000);})]);clearTimeout(timeout);}};
}
async function tarDirectory(dir,prefix){
 const parts=[];
 function entry(name,data,type){const h=Buffer.alloc(512);assert.ok(Buffer.byteLength(name)<100);h.write(name,0,100);h.write('0000700\0',100);h.write('0000000\0',108);h.write('0000000\0',116);h.write(data.length.toString(8).padStart(11,'0')+'\0',124);h.write('00000000000\0',136);h.fill(32,148,156);h[156]=type;h.write('ustar\0',257);h.write('00',263);h.write([...h].reduce((n,b)=>n+b,0).toString(8).padStart(6,'0')+'\0 ',148);parts.push(h,data,Buffer.alloc((512-data.length%512)%512));}
 async function visit(folder,base){entry(base+'/',Buffer.alloc(0),53);for(const item of await fs.readdir(folder,{withFileTypes:true})){const full=path.join(folder,item.name),name=base+'/'+item.name;if(item.isDirectory())await visit(full,name);else entry(name,await fs.readFile(full),48);}}
 await visit(dir,prefix);parts.push(Buffer.alloc(1024));return gzipSync(Buffer.concat(parts));
}
const {openDatabase}=await import(pathToFileURL(path.join(app,'backend/database.mjs')).href);
async function checkHttp(run,enabled){
 assert.equal(run.config.enabled,enabled);const health=await(await fetch(run.origin+'/health')).json();assert.equal(health.appBuildId,release.appBuildId);assert.equal(health.assetReleaseId,release.release);assert.equal(health.runSchema,26);
 assert.equal((await fetch(run.origin)).status,200);
 for(const file of ['', '/app.js','/style.css'])assert.equal((await fetch(run.origin+'/sc2-ops-7f3k9m2q'+file)).status,200);
 assert.equal((await fetch(run.origin+'/admin')).status,404);
 assert.equal((await fetch(run.origin+'/api/sc2-ops-7f3k9m2q/metrics')).status,enabled?401:503);
 if(enabled)assert.equal((await fetch(run.origin+'/api/admin/login',{method:'POST',headers:{Origin:run.origin,'Content-Type':'application/json','X-SC2-Client':'1'},body:'{}'})).status,404);
 return health;
}
try{
 const seed=path.join(root,'seed/pglite'),db=await openDatabase({local:true,localDirectory:seed});
 await db.query('CREATE TABLE ui_coze_marker(value text PRIMARY KEY)');await db.query("INSERT INTO ui_coze_marker VALUES('seed-preserved')");assert.equal((await db.query('SELECT count(*)::int n FROM admin_users')).rows[0].n,0);await db.close();
 for(const readonly of [false,true]){
  const name=readonly?'readonly-bundle':'writable',home=path.join(root,name);await fs.cp(app,home,{recursive:true});await assert.rejects(()=>fs.access(path.join(home,'node_modules')));
  await fs.mkdir(path.join(home,'data'),{recursive:true});await fs.writeFile(path.join(home,'data/deletions.jsonl'),'');
  if(readonly)await fs.writeFile(path.join(home,'data/pglite-bundle.tgz'),await tarDirectory(seed,'pglite'));
  else await fs.cp(seed,path.join(home,'data/pglite'),{recursive:true});
  const row={name,checks:[]};report.cases.push(row);const run=await launch(home,{readonly});
  try{row.health=await checkHttp(run,true);row.checks.push('Packaged launcher serves unchanged new UI and real enabled vendor backend without an app node_modules directory; hidden admin assets respond; old paths fail');
   const feedback={id:randomUUID(),receipt:randomBytes(32).toString('base64url'),category:'other',consentVersion:run.config.version,text:'Synthetic integration test only',contact:'',summary:null};
   const res=await fetch(run.origin+'/api/feedback',{method:'POST',headers:{Origin:run.origin,'Content-Type':'application/json','X-SC2-Client':'1'},body:JSON.stringify(feedback)});assert.equal(res.status,200);
   const removed=await fetch(run.origin+'/api/feedback/delete',{method:'POST',headers:{Origin:run.origin,'Content-Type':'application/json','X-SC2-Client':'1'},body:JSON.stringify({id:feedback.id,receipt:feedback.receipt})});assert.equal(removed.status,200);
  }finally{await run.close();row.startupLog=run.log();}
  const data=readonly?path.join(root,'tmp/sc2-pglite-work/pglite'):path.join(home,'data/pglite'),journal=path.join(path.dirname(data),'deletions.jsonl');
  const reopened=await openDatabase({local:true,localDirectory:data});assert.equal((await reopened.query('SELECT value FROM ui_coze_marker')).rows[0].value,'seed-preserved');assert.equal((await reopened.query('SELECT count(*)::int n FROM admin_users')).rows[0].n,0);assert.equal((await reopened.query('SELECT count(*)::int n FROM feedback')).rows[0].n,0);assert.equal((await reopened.query('SELECT count(*)::int n FROM deletion_manifest')).rows[0].n,1);await reopened.query("INSERT INTO ui_coze_marker VALUES('after-first-start')");await reopened.close();assert.equal((await fs.readFile(journal,'utf8')).trim().split('\n').length,1);row.checks.push('Actual seed data restored; no default administrator; feedback writes and deletes use the independent journal; database closes and reopens');
  if(readonly){assert.match(row.startupLog,/PGLITE_EXTRACT/);assert.match(row.startupLog,/PGLITE_REDIRECT/);const repeat=await launch(home,{readonly});try{await checkHttp(repeat,true);}finally{await repeat.close();}assert.doesNotMatch(repeat.log(),/PGLITE_EXTRACT/);const final=await openDatabase({local:true,localDirectory:data});assert.equal((await final.query('SELECT count(*)::int n FROM ui_coze_marker')).rows[0].n,2);await final.close();assert.equal((await fs.readFile(journal,'utf8')).trim().split('\n').length,1);row.checks.push('Second startup reuses writable data and journal, does not extract the old bundle again');}
 }
 const activeHome=path.join(root,'active-release'),directory='releases/'+application.packageBuildId;
 await fs.mkdir(activeHome,{recursive:true});await fs.cp(app,path.join(activeHome,directory),{recursive:true});await fs.copyFile(path.join(app,'start-coze.mjs'),path.join(activeHome,'start-coze.mjs'));
 await fs.writeFile(path.join(activeHome,'active-release.json'),JSON.stringify({directory,assetRoot:path.resolve('dist/web')}));await fs.mkdir(path.join(activeHome,'data'),{recursive:true});await fs.cp(seed,path.join(activeHome,'data/pglite'),{recursive:true});const active=await launch(activeHome);
 try{const health=await checkHttp(active,true);report.cases.push({name:'active-release',health,checks:['Stable launcher loads immutable release UI, vendor and backend with root configuration and pre-existing root data'],startupLog:active.log()});}finally{await active.close();}
 const home=path.join(root,'invalid-database');await fs.cp(app,home,{recursive:true});await fs.mkdir(path.join(home,'data'),{recursive:true});await fs.writeFile(path.join(home,'data/pglite'),'synthetic non-directory');const run=await launch(home);
 try{const health=await checkHttp(run,false);assert.match(run.log(),/backend init failed/);report.cases.push({name:'invalid-database',health,checks:['Database failure is logged; static UI still serves; config disabled; protected API fails closed'],startupLog:run.log()});}finally{await run.close();}
 report.passed=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}
await fs.writeFile(path.join(out,'startup.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,cases:report.cases.map(c=>({name:c.name,checks:c.checks})),failure:report.failure}));
