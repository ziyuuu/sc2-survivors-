// Publish only the verified local alias and repository application mirror.
// No online Coze/backend/database/admin operation is performed.
import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const root='reports/local/combat-effects-20261012',app='dist/Combat-Effects-Final-R3-Application-20261012',alias='dist/SC2-Survivors-Current-20261006.html',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
const preflight=await read(root+'/delivery-preflight.json'),application=await read(app+'/delivery.json'),baseline=await read(root+'/baseline.json');assert.ok(preflight.passed);assert.equal(application.appBuildId,preflight.appBuildId);assert.equal(application.packageBuildId,preflight.packageBuildId);
await fs.access(root+'/delivery.json').then(()=>{throw Error('Delivery already synchronized');},e=>{if(e.code!=='ENOENT')throw e;});
assert.equal(await hash(preflight.html.path),preflight.html.sha256);assert.equal(await hash(preflight.zip.path),preflight.zip.sha256);const prior=baseline.files.find(r=>r.file===alias);assert.ok(prior);assert.equal(await hash(alias),prior.sha256,'Current changed since baseline');
for(const r of application.appFiles)assert.equal(await hash(app+'/'+r.path),r.sha256,r.path);
const previous=await read('deploy/coze/delivery.json');for(const r of previous.appFiles)assert.equal(await hash('deploy/coze/'+r.path),r.sha256,r.path);
const temporary='dist/.Current-Combat-Effects-R3-20261012.pending';
// A verified temporary copy can remain after a child-process launch failure.
// Reuse it only while the old alias and complete old mirror still match above.
try{await fs.access(temporary);}catch(e){if(e.code!=='ENOENT')throw e;await fs.copyFile(preflight.html.path,temporary,1);}assert.equal(await hash(temporary),preflight.html.sha256);
const sync=spawnSync(process.execPath,['tools/sync-current-handoff.mjs',app],{encoding:'utf8'}),launch={status:sync.status,signal:sync.signal,error:sync.error?{code:sync.error.code,message:sync.error.message}:null};
const log=JSON.stringify(launch)+'\n'+(sync.stdout??'')+(sync.stderr??'');await fs.writeFile(root+'/mirror-sync-r2.log',log,{flag:'wx'});if(sync.error)throw sync.error;assert.equal(sync.status,0,log);
for(const r of application.appFiles)assert.equal(await hash('deploy/coze/'+r.path),r.sha256,r.path);assert.equal(await hash('deploy/coze/delivery.json'),await hash(app+'/delivery.json'));
await fs.rename(temporary,alias);assert.equal(await hash(alias),preflight.html.sha256);
const delivery={passed:true,at:new Date().toISOString(),appBuildId:preflight.appBuildId,packageBuildId:preflight.packageBuildId,html:preflight.html,zip:preflight.zip,current:{path:alias,identical:true},localMirror:{path:'deploy/coze',files:application.appFiles.length,identical:true,priorPackage:previous.packageBuildId},onlineOperations:false,gitSynchronization:'Pending normal main commit/push; see git-sync.json after completion.'};
await fs.writeFile(root+'/delivery.json',JSON.stringify(delivery,null,2),{flag:'wx'});
await fs.writeFile('reports/qa/combat-effects-20261012.json',JSON.stringify({...preflight,currentAndMirrorSynchronized:true,localDelivery:delivery},null,2)+'\n');console.log(JSON.stringify(delivery));
