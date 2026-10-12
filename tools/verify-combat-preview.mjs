import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='reports/local/combat-effects-20261012',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const delivered=await read(root+'/delivery.json'),application=await read('deploy/coze/delivery.json'),processInfo=JSON.parse((await fs.readFile(root+'/preview.stdout.log','utf8')).trim());
assert.ok(delivered.passed);assert.equal(processInfo.appBuildId,delivered.appBuildId);assert.equal(processInfo.backendEnabled,false);
assert.equal(new URL(processInfo.game).hostname,'127.0.0.1');assert.equal(new URL(processInfo.gallery).hostname,'127.0.0.1');
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,url);return Buffer.from(await r.arrayBuffer());}
const health=JSON.parse(await get(processInfo.game+'/health')),backend=JSON.parse(await get(processInfo.game+'/api/config')),runtime=JSON.parse(await get(processInfo.game+'/runtime-config.json'));
assert.equal(health.appBuildId,delivered.appBuildId);assert.equal(health.resources,'local');assert.equal(backend.enabled,false);assert.equal(runtime.assetBaseUrl,'');
const httpFiles=[];
for(const row of application.appFiles.filter(r=>r.path.startsWith('public/'))){const bytes=await get(processInfo.game+'/'+row.path.slice(7));assert.equal(bytes.length,row.bytes,row.path);assert.equal(sha(bytes),row.sha256,row.path);httpFiles.push({file:row.path,sha256:row.sha256});}
const galleryOrigin=new URL(processInfo.gallery).origin;
for(const file of ['comparison.html','gallery-data.json','gallery-files.json']){const bytes=await get(galleryOrigin+'/'+file);assert.equal(sha(bytes),sha(await fs.readFile(root+'/'+file)),file);httpFiles.push({file,sha256:sha(bytes)});}
const gallery=await read(root+'/gallery-files.json');assert.ok(gallery.passed);assert.equal(gallery.records,1117);assert.equal(gallery.pairs,895);assert.equal(gallery.images,2012);
const recordings=await read(root+'/final-recordings-r2/result.json'),videos=[];
for(const row of recordings.records){const file='final-recordings-r2/'+row.video,url=galleryOrigin+'/'+file,r=await fetch(url,{headers:{Range:'bytes=0-255'},signal:AbortSignal.timeout(15000)});assert.equal(r.status,206);assert.match(r.headers.get('content-type'),/^video\/webm/);assert.equal((await r.arrayBuffer()).byteLength,256);videos.push({file,rangeStatus:206,contentRange:r.headers.get('content-range')});}
const report={passed:true,at:new Date().toISOString(),...processInfo,health,backendEnabled:backend.enabled,httpFiles,videos,gallery:{records:gallery.records,pairs:gallery.pairs,images:gallery.images,identities:gallery.identities,videos:gallery.videos},method:'Local delivery HTTP bytes and video range serving checked. Server startup verifies every one of the 1110 local resource file hashes. This is not another gameplay or FPS run.'};
await fs.writeFile(root+'/preview.json',JSON.stringify(report,null,2),{flag:'wx'});
const post=await read(root+'/final-r3/protection-after-sync.json'),agents=await read(root+'/AGENTS-preservation.json');assert.ok(post.passed&&agents.passed);assert.equal(post.total,4820);assert.equal(post.counts.UNEXPECTED??0,0);assert.equal(sha(await fs.readFile('AGENTS.md')),agents.afterSha256);
delivered.postSynchronizationProtection={file:'final-r3/protection-after-sync.json',total:post.total,counts:post.counts,unexpected:0};delivered.priorInstructionsRetained=agents.priorBytesRetainedAsExactSuffix;delivered.preview={pid:processInfo.pid,game:processInfo.game,gallery:processInfo.gallery,backendEnabled:false,evidence:'preview.json'};
await fs.writeFile(root+'/delivery.json',JSON.stringify(delivered,null,2));
const summary=await read('reports/qa/combat-effects-20261012.json');summary.localDelivery=delivered;summary.currentAndMirrorSynchronized=true;await fs.writeFile('reports/qa/combat-effects-20261012.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({passed:true,pid:processInfo.pid,game:processInfo.game,gallery:processInfo.gallery,backendEnabled:false,httpFiles:httpFiles.length,videoRanges:videos.length,postProtection:delivered.postSynchronizationProtection}));
