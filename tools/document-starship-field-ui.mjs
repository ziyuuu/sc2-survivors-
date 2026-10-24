import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='reports/local/starship-field-ui-20261016-r21';
const preview='preview/starship-field-ui-20261016-r21';
const name='Starship-UI-Flow-R21-20261016.html';
const qa='reports/qa/starship-field-ui-20261016-r21.json';
const browserFile=root+'/browser-1792126058462/report.json';
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const json=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const record=async file=>({file,bytes:(await fs.stat(file)).size,sha256:await hash(file)});
const build=await json(root+'/build.json');
const inputs=await json(root+'/source-input-hashes.json');
for(const input of inputs)assert.equal(await hash(input.file),input.sha256,input.file);
const copies=[];
for(const file of [preview+'/'+name,preview+'/index.html','dist/'+name]){
 const row=await record(file);assert.equal(row.sha256,build.sha256,file);assert.equal(row.bytes,build.bytes,file);copies.push(row);
}
const resources=(await json(preview+'/resources.json')).resources;
const oldResources=new Map((await json('preview/starship-ui-settings-20261016-r20/resources.json')).resources.map(r=>[r.key,r]));
let resourceFiles=0;
for(const r of resources){
 const old=oldResources.get(r.key);assert.ok(old,r.key);assert.equal(r.sha256,old.sha256,r.key);
 assert.equal(await hash(path.resolve(preview,r.file)),r.sha256,r.key);resourceFiles++;
 if(r.detail){assert.equal(r.detailSha256,old.detailSha256,r.key);assert.equal(await hash(path.resolve(preview,r.detail)),r.detailSha256,r.key+' detail');resourceFiles++;}
}
assert.equal(resources.length,502);assert.equal(resourceFiles,625);
const historical=[];
for(const [dir,fileName,sha] of [
 ['preview/starship-ui-settings-20261016-r20','Starship-UI-Flow-R20-20261016.html','64acff406053834aab6b8dbdbc183af56d13b819d74999d2848f28dcc798c79f'],
 ['preview/starship-ui-polish-20261016-r19','Starship-UI-Flow-R19-20261016.html','a2b928d894cc679e68587c4f34b4b0d51a233dfc1a3ed327c8abdb33d3697a4c'],
 ['preview/starship-ui-flow-20261015-r18','Starship-UI-Flow-R18-20261015.html','2fa9cb5159db4c068238538dc9af4a73b05460e0bd2813626b4d9997bebfe112'],
])for(const file of [dir+'/'+fileName,dir+'/index.html','dist/'+fileName]){
 assert.equal(await hash(file),sha,file);historical.push({file,sha256:sha});
}
const browser=await json(browserFile);
assert.equal(browser.pass,true);assert.equal(browser.build.sha256,build.sha256);
assert.equal(browser.checks.length,12);assert.equal(browser.screens.length,24);assert.equal(browser.layout.length,27);
assert.ok(browser.layout.every(r=>r.pass));
assert.equal(browser.errors.length,0);assert.equal(browser.consoleErrors.length,0);assert.equal(browser.external.length,0);
const screens=[];for(const file of browser.screens)screens.push(await record(file));
const fullTests=await fs.readFile(root+'/full-tests-r2.log','utf8');assert.match(fullTests,/tests 1615/);assert.match(fullTests,/pass 1615/);assert.match(fullTests,/fail 0/);
const targeted=await fs.readFile(root+'/targeted-r3.log','utf8');assert.match(targeted,/tests 58/);assert.match(targeted,/pass 58/);assert.match(targeted,/fail 0/);
const served=Buffer.from(await (await fetch('http://127.0.0.1:4420/')).arrayBuffer());
assert.equal(createHash('sha256').update(served).digest('hex'),build.sha256);
const links=[];
for(const file of ['docs/project/STARSHIP_FIELD_UI_R21_20261016.md',preview+'/README.md']){
 const content=await fs.readFile(file,'utf8');
 for(const match of content.matchAll(/\]\(([^)]+)\)/g)){
  const target=match[1];if(/^(?:https?:|#)/.test(target))continue;
  const resolved=path.resolve(path.dirname(file),target.split('#')[0]);
  if(resolved!==path.resolve(qa))await fs.access(resolved);links.push({file,target});
 }
}
const evidence=[];
for(const file of [root+'/full-tests-r2.log',root+'/targeted-r3.log',root+'/typecheck-r3.log',root+'/docs-check-r1.log',root+'/browser-r6.log',browserFile,'tools/qa-starship-field-ui.mjs','test/starship-field-ui.test.ts','test/starship-tiers.test.ts','test/starship-ui-flow.test.ts'])evidence.push(await record(file));
const report={
 at:new Date().toISOString(),
 scope:'R21 compact battlefield/intermission loadout, complete homepage/battlefield/intermission demonstration flows, acquired-only crafting including random outputs; retain existing art and real equipment rules.',
 build,copies,compiledInputs:{count:inputs.length,manifest:root+'/source-input-hashes.json',currentFilesMatch:true},evidence,
 resources:{keys:resources.length,files:resourceFiles,existingEquipment:441,heroPoses:54,unchangedFromR20:true},historical,
 validation:{
  fullSuite:{passed:1615,failed:0,log:root+'/full-tests-r2.log',note:'Final TypeScript implementation; the subsequent final build changes only CSS for sticky field return and narrow sort width.'},
  targeted:{passed:58,log:root+'/targeted-r3.log'},typecheck:root+'/typecheck-r3.log',dataDocs:root+'/docs-check-r1.log',
  browser:{report:browserFile,checks:12,screens:24,layouts:27,layoutDimensions:{races:3,viewports:3,textScales:3},checksPerformed:browser.checks,pageErrors:0,consoleErrors:0,externalRequests:0,worldAndMemoryHosts:true},
  visual:{reviewer:'model',allFinal24ImagesIndividuallyReviewed:true,images:screens,humanAcceptance:false},
  httpBytesMatch:true,verifiedLinks:links.length,
 },
 rules:{fieldBagOnly:true,battle:{pause:true,view:true,drop:true,destroy:true,equip:false,dismantle:false},intermission:{view:true,equip:'eligible current-run attribute and special equipment only',dismantle:true,destroy:true},atlasRemoved:true,acquiredRecipeIdentity:['template including quality','race','slot','binding'],randomCraftAcquiredOnly:true,dustPricesUnchanged:true,dropPreservesInstanceAndEmitsNativeEvent:true},
 integration:{sharedProductionRules:true,realWorldAdapterValidated:true,formalStarshipUiMounted:false,applicationCallbacksStillRequired:['resolveImage','inputReset','begin','continue'],saveWorkDeferred:true,currentReplaced:false,committed:false,pushed:false,published:false},
 failures:[
  {kind:'sandbox child process EPERM',logs:[root+'/build-r1.log',root+'/targeted-r1.log',root+'/browser-r1.log'],recovery:'Permitted local subprocess retries succeeded; original logs retained.'},
  {kind:'crafting test fixture used setTemplate rather than template for prerequisite grant',evidence:root+'/targeted-r2.log',recovery:'Corrected the fixture; targeted-r3 passed all 58.'},
  {kind:'demonstration shield fixture specified an illegal slot',evidence:root+'/browser-1792125405018/report.json',recovery:'Choose the catalog legal slot; subsequent real World and memory flows passed.'},
  {kind:'QA text-scale select value .85 did not match 0.85',evidence:root+'/browser-1792125525151/report.json',recovery:'Corrected the automation string; retained the failed report.'},
  {kind:'visual review found field overlay in document flow and narrow sort text shrinkage',recovery:'Fixed the demo overlay, sticky return bar and minimum sort width; final 24 screenshots reviewed and final layout assertions passed.'},
  {kind:'documentation counted the layout matrix as 81 rather than 27',recovery:'Corrected documentation to match the actual 3 races × 3 viewports × 3 text scales; no additional coverage claimed.'},
 ],
 limits:[
  'The demo battlefield is a 2D clickable scene; World uses waves:false and terrain:false. Pickup moves its demonstration anchor before calling the production pickup interface.',
  'No full main-game mounting, natural gameplay, physical-device, full 3D pickup rendering or FPS acceptance in this batch.',
  'Acquired-recipe history is runtime account state; persistence and migration remain deferred to MVP closeout.',
 ],
};
await fs.writeFile(root+'/delivery.json',JSON.stringify(report,null,2));
await fs.writeFile(qa,JSON.stringify(report,null,2));
await fs.access(qa);
console.log(JSON.stringify({pass:true,sha256:build.sha256,compiledInputs:inputs.length,resourceFiles,olderCopiesVerified:historical.length,checks:12,layouts:27,screens:24,links:links.length}));
