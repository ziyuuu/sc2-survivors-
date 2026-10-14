// Synchronize the verified local 7A artifacts. No online operations or Git writes.
import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root='reports/local/7a-20261013',app='dist/MVP7A-Final-R1-Application-20261013',alias='dist/SC2-Survivors-Current-20261006.html',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
const preflight=await read(root+'/delivery-preflight.json'),application=await read(app+'/delivery.json'),baseline=await read(root+'/baseline/delivery.json');assert.equal(preflight.passed,true);assert.equal(application.appBuildId,preflight.appBuildId);assert.equal(application.packageBuildId,preflight.packageBuildId);
await fs.access(root+'/delivery.json').then(()=>{throw Error('Delivery already synchronized');},e=>{if(e.code!=='ENOENT')throw e;});
assert.equal(await hash(preflight.html.path),preflight.html.sha256);assert.equal(await hash(preflight.zip.path),preflight.zip.sha256);assert.equal(await hash(alias),baseline.html.sha256,'Current changed since baseline');
for(const r of application.appFiles)assert.equal(await hash(app+'/'+r.path),r.sha256,r.path);
const previous=await read('deploy/coze/delivery.json');assert.equal(previous.packageBuildId,baseline.packageBuildId);for(const r of previous.appFiles)assert.equal(await hash('deploy/coze/'+r.path),r.sha256,r.path);
const temporary='dist/.Current-MVP7A-R1-20261013.pending';
const resumePending=process.argv.includes('--resume-pending');
let pendingExists=false;try{await fs.access(temporary);pendingExists=true;}catch(error){if(error.code!=='ENOENT')throw error;}
if(pendingExists){assert.ok(resumePending,'Pending copy exists; explicit verified resume required');assert.equal(await hash(temporary),preflight.html.sha256);}
else {assert.equal(resumePending,false,'No pending copy to resume');await fs.copyFile(preflight.html.path,temporary,1);assert.equal(await hash(temporary),preflight.html.sha256);}
process.argv[2]=app;await import('./sync-current-handoff.mjs');
await fs.writeFile(root+'/mirror-sync.log',JSON.stringify({passed:true,method:'in-process sync-current-handoff.mjs',app,localRepositoryOnly:true})+'\n',{flag:'wx'});
for(const r of application.appFiles)assert.equal(await hash('deploy/coze/'+r.path),r.sha256,r.path);assert.equal(await hash('deploy/coze/delivery.json'),await hash(app+'/delivery.json'));
await fs.rename(temporary,alias);assert.equal(await hash(alias),preflight.html.sha256);
const delivery={passed:true,at:new Date().toISOString(),appBuildId:preflight.appBuildId,packageBuildId:preflight.packageBuildId,html:preflight.html,zip:preflight.zip,current:{path:alias,identical:true},localMirror:{path:'deploy/coze',files:application.appFiles.length,identical:true,priorPackage:previous.packageBuildId},resumedVerifiedPending:resumePending,priorSyncFailure:resumePending?root+'/sync-failure-r1.json':null,onlineOperations:false,gitSynchronization:'Not performed in this turn; unrelated existing work remains unstaged.'};
await fs.writeFile(root+'/delivery.json',JSON.stringify(delivery,null,2),{flag:'wx'});await fs.writeFile('reports/qa/7a-20261013.json',JSON.stringify({...preflight,currentAndMirrorSynchronized:true,localDelivery:delivery},null,2)+'\n');console.log(JSON.stringify(delivery));
