import fs from 'node:fs/promises';
import {createReadStream,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='reports/local/mvp5-delivery-20261014',alias='dist/SC2-Survivors-Current-20261006.html',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex')}
const preflight=await read(root+'/verification-before-sync.json'),baseline=await read(root+'/baseline/baseline.json'),app=preflight.app,delivery=await read(app+'/delivery.json');assert.equal(preflight.passed,true);assert.equal(delivery.packageBuildId,preflight.packageBuildId);
await fs.access(root+'/delivery.json').then(()=>{throw Error('Already synchronized')},e=>{if(e.code!=='ENOENT')throw e});
assert.equal(await hash(alias),baseline.retained.find(r=>r.file===alias).sha256,'Current changed since freeze');assert.equal((await read('deploy/coze/delivery.json')).packageBuildId,baseline.priorApp.packageBuildId);
assert.equal(await hash(preflight.game.html.path),preflight.game.html.sha256);for(const r of delivery.appFiles)assert.equal(await hash(app+'/'+r.path),r.sha256,r.path);
const pending='dist/.Current-MVP5-Final-20261014.pending';await fs.copyFile(preflight.game.html.path,pending,constants.COPYFILE_EXCL);assert.equal(await hash(pending),preflight.game.html.sha256);
process.argv[2]=app;await import('./sync-current-handoff.mjs');
for(const r of delivery.appFiles)assert.equal(await hash('deploy/coze/'+r.path),r.sha256,r.path);assert.equal(await hash('deploy/coze/delivery.json'),await hash(app+'/delivery.json'));
await fs.rename(pending,alias);assert.equal(await hash(alias),preflight.game.html.sha256);
const report={passed:true,at:new Date().toISOString(),appBuildId:delivery.appBuildId,packageBuildId:delivery.packageBuildId,html:preflight.game.html,packages:Object.fromEntries(['application','resources','increment'].map(k=>[k,{...preflight.packages[k],entries:undefined}])),viewer:preflight.viewer,current:{path:alias,sha256:preflight.game.html.sha256,identical:true},localMirror:{path:'deploy/coze',files:delivery.appFiles.length,identical:true,priorPackageBuildId:baseline.priorApp.packageBuildId},onlineOperations:false,gitReceipt:root+'/git-sync.json'};
await fs.writeFile(root+'/delivery.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
