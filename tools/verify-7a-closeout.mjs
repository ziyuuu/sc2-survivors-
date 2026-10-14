import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/7a-20261013',app='dist/MVP7A-Final-R1-Application-20261013';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const delivery=await read(root+'/delivery.json'),protection=await read(root+'/final-r1/protection-after-sync.json');
assert.equal(delivery.passed,true);assert.equal(protection.passed,true);assert.equal(protection.phase,'after-sync');
const manifest=await read(app+'/delivery.json'),mirror=await read('deploy/coze/delivery.json');
assert.equal(manifest.packageBuildId,delivery.packageBuildId);assert.deepEqual(mirror,manifest);assert.equal(manifest.appFiles.length,198);
assert.equal((await read('deploy/coze/package.json')).version,'0.6.26');
await fs.access('dist/.Current-MVP7A-R1-20261013.pending').then(()=>{throw Error('Pending file remains');},e=>{if(e.code!=='ENOENT')throw e;});
for(const file of [delivery.html.path,delivery.zip.path,'docs/project/MVP7A_LOADING_VALIDATION_20261013.md'])await fs.access(file);
const packaged=await fs.readFile(app+'/README.md','utf8');
assert.equal(createHash('sha256').update(packaged).digest('hex'),manifest.appFiles.find(r=>r.path==='README.md').sha256);
const marker='# 当前应用交接入口 · 2026-10-13',at=packaged.indexOf(marker);assert.ok(at>=0);
const oldBody=packaged.slice(at).replace(/^# 当前应用交接入口 · 2026-10-13\r?\n\r?\n/,'');
const current=await fs.readFile('docs/project/CURRENT_COZE_HANDOFF_20261006.md','utf8');
assert.ok(current.includes(oldBody),'Historical handoff body changed');assert.ok(current.indexOf('MVP 7A Final R1')<current.indexOf('Refraction / Science Vessel'));
const documents=[];
for(const file of ['README.md','docs/README.md','docs/project/CURRENT_COZE_HANDOFF_20261006.md','docs/project/MVP7A_LOADING_20261013.md','docs/project/MVP7A_LOADING_VALIDATION_20261013.md']){
 const bytes=await fs.readFile(file);documents.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const report={passed:true,at:new Date().toISOString(),artifactLinks:true,mirrorVersion:'0.6.26',pendingConsumed:true,historicalHandoffBodyRetained:true,postSyncProtection:{...protection,files:undefined},documents,priorReadCheck:root+'/final-r1/closeout-read-path-r1.json',priorSyncFailure:root+'/sync-failure-r1.json',onlineOperations:false,gitWrites:false};
await fs.writeFile(root+'/final-r1/closeout.json',JSON.stringify(report,null,2),{flag:'wx'});
const qa=await read('reports/qa/7a-20261013.json');assert.equal(qa.packageBuildId,delivery.packageBuildId);qa.postSyncProtection=report.postSyncProtection;qa.closeout={...report,postSyncProtection:undefined};
await fs.writeFile('reports/qa/7a-20261013.json',JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({...report,postSyncProtection:{passed:true,counts:protection.counts},documents:documents.length}));
