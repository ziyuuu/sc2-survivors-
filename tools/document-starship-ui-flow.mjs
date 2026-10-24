import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=process.cwd(), base='reports/local/starship-ui-flow-20261015-r18', preview='preview/starship-ui-flow-20261015-r18';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const digest=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const write=async(file,data)=>fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
const browserDirectory=process.argv[2];
assert.ok(browserDirectory?.startsWith(base+'/browser-'),'Provide the completed browser evidence directory');
const [build,browser,inputs,art,resources,mapping,technical,contacts,fullLog,typeLog,dataLog,catalog,tests]=await Promise.all([
 read(base+'/build.json'),read(browserDirectory+'/report.json'),read(base+'/source-input-hashes.json'),read(preview+'/hero-art.json'),
 read(preview+'/resources.json'),read(base+'/mapping-audit.json'),read(base+'/art-review/verification.json'),read(browserDirectory+'/contact-sheets/manifest.json'),
 fs.readFile(base+'/full-tests-final.log','utf8'),fs.readFile(base+'/typecheck-delivery.log','utf8'),fs.readFile(base+'/docs-check-final.log','utf8'),
 read('src/ui/starship/catalog-data.json'),fs.readFile('test/starship-ui-flow.test.ts','utf8')
]);
assert.equal(browser.pass,true);assert.equal(browser.build.sha256,build.sha256);
assert.equal(browser.errors.length+browser.consoleErrors.length+browser.external.length,0);
const currentInputs=[];
for(const input of inputs){const sha256=await digest(input.file);assert.equal(sha256,input.sha256,'Compiled input changed: '+input.file);currentInputs.push({...input,verified:true});}
const name='Starship-UI-Flow-R18-20261015.html', copies=[];
for(const file of [preview+'/'+name,preview+'/index.html','dist/'+name]){
 const sha256=await digest(file),size=(await fs.stat(file)).size;assert.equal(sha256,build.sha256);assert.equal(size,build.bytes);copies.push({file,bytes:size,sha256});
}
assert.equal(art.records.length,54);assert.equal(new Set(art.records.map(r=>r.hero+'/'+r.pose)).size,54);
const keys=new Set(resources.resources.map(r=>r.key));assert.equal(keys.size,498);assert.equal(resources.resources.length,498);
for(const r of resources.resources){assert.equal(await digest(path.join(preview,r.file)),r.sha256,r.key);if(r.detail)assert.equal(await digest(path.join(preview,r.detail)),r.detailSha256,r.key+' detail');}
for(const r of art.records){
 assert.ok(r.prompt.length>30,r.hero+' prompt');assert.ok(r.actualArchivePath.toLowerCase().startsWith('d:\\星际\\'));
 for(const [file,hash] of [['original','originalSha256'],['runtime','runtimeSha256'],['detail','detailSha256']])assert.equal(await digest(r[file]),r[hash]);
 assert.equal(await digest(r.actualArchivePath),r.originalSha256);
}
for(const r of catalog.assets){assert.equal(await digest(r.source),r.sha256);assert.equal(await digest(path.join(preview,r.file)),r.sha256);}
const count=Number(fullLog.match(/ℹ tests (\d+)/)?.[1]),pass=Number(fullLog.match(/ℹ pass (\d+)/)?.[1]),fail=Number(fullLog.match(/ℹ fail (\d+)/)?.[1]);
assert.equal(count,1581);assert.equal(pass,count);assert.equal(fail,0);assert.match(typeLog,/tsc --noEmit/);assert.doesNotMatch(typeLog,/error TS\d/);assert.match(dataLog,/Game reference matches runtime data/);
const uiTests=(tests.match(/^test\(/gm)??[]).length;assert.equal(uiTests,20);
assert.equal(contacts.screens.length,72);assert.equal(contacts.sheets.length,12);assert.equal(technical.contactSheets.length,9);
for(const f of [...contacts.screens,...contacts.sheets,...technical.contactSheets])await fs.access(f);
const at=new Date().toISOString();
const visual={
 at,reviewer:'assistant visual inspection',userAcceptance:false,buildSha256:build.sha256,
 runtimeScreens:72,runtimeContactSheets:contacts.sheets,detailViews:[browserDirectory+'/hero-fenix-none.png',browserDirectory+'/touch-large-text-320.png'],
 sourceContactSheets:technical.contactSheets,selectedHeroPoses:54,priorR17Images:33,
 result:'No obvious missing images, wrong pose mapping, clipped bodies, overlapping controls or horizontal overflow found in this bounded review.',
 repairs:'Cropped generation candidates retained; selected Fenix defense R2 has complete feet. Final UI uses two columns at width 320 and transient feedback clears.',
 limits:['Model review only; user art acceptance is separate','Contact sheets are bounded composition checks, not all-pixel acceptance','No actual-client frame matching or physical device/performance claim'],
 technicalVerification:base+'/art-review/verification.json'
};
await write(base+'/visual-review.json',visual);
const summary={
 schema:1,batch:'starship-ui-flow-r18-20261015',verifiedAt:at,status:'local-independent-delivery-verified',
 deliverable:copies[2],document:'docs/project/STARSHIP_UI_FLOW_R18_20261015.md',previewReadme:preview+'/README.md',
 implementation:{sharedUI:true,sharedController:true,sharedProductionRules:true,memoryHost:true,realWorldHost:true,sameWorldEquipmentAccount:true,nativePickup:true,regularMainMenuMounted:false,saveMigration:false},
 resources:{keys:498,existingEquipmentArt:441,heroes:18,selectedHeroPoses:54,shipBackgrounds:3,sourceRows:mapping.sourceRecords,legalRows:mapping.rows,excludedLegacyRows:mapping.excluded.length,templates:new Set(catalog.rows.map(r=>r.template)).size,allHashesPass:true,manifest:preview+'/resources.json',prompts:preview+'/hero-art.json'},
 tests:{total:count,pass,fail,skipped:0,uiFlowTests:uiTests,fullLog:base+'/full-tests-final.log',typecheck:{pass:true,log:base+'/typecheck-delivery.log'},dataDocumentation:{pass:true,log:base+'/docs-check-final.log'}},
 browser:{report:browserDirectory+'/report.json',checks:browser.checks.length,screens:browser.screens.length,pageErrors:browser.errors.length,consoleErrors:browser.consoleErrors.length,externalRequests:browser.external.length,decodedVariants:browser.decoded.count,heroPoseKeys:browser.decoded.heroes,remount:browser.lifecycle,actualFileURL:true,automatedInput:['mouse','keyboard','emulated touch'],viewports:[[1440,900],[844,390],[390,844],[320,740]],largeTextScale:1.3},
 parity:{outside:'Full equipment accounts equal after the same production commands',runStart:'Clone after actual World opening; memory does not simulate unit opening',runExcludedFields:['account.run.receipts'],reason:'Native mineral and shop window receipts are World-owned; stage-resource:1 is separately asserted',remainingFields:'All other account fields including RNG, item IDs, locations, dust and revision compared exactly'},
 visualReview:base+'/visual-review.json',compiledInputs:{count:inputs.length,allCurrentBytesMatch:true,file:base+'/source-input-hashes.json'},
 historicalEvidence:{retained:true,notes:['Adapter r2-r4 retained: fixture data, opening RNG boundary, native window receipts and continue flow failure','Full r1 retained: obsolete in-battle equip assertion','Full r2 retained: three old audio/render fixtures lacked pickup state; only fixtures repaired','Earlier generated candidates, browser runs and Fenix defense before-R2 kept']},
 boundaries:{formalCurrentReplaced:false,gitCommitOrPush:false,onlinePublication:false,naturalCampaign:false,fullContent60FPS:false,physicalInputAcceptance:false,userArtAcceptance:false,wholeMVP:false}
};
await write('reports/qa/starship-ui-flow-r18-20261015.json',summary);
await write(base+'/delivery.json',{at,build,copies,sourceInputs:inputs.length,sourceInputAudit:base+'/source-input-hashes.json',sourceBytesMatch:true,resourcesManifestSha256:await digest(preview+'/resources.json'),heroArtManifestSha256:await digest(preview+'/hero-art.json'),browserReportSha256:await digest(browserDirectory+'/report.json'),qaReport:'reports/qa/starship-ui-flow-r18-20261015.json',boundaries:summary.boundaries});
console.log(JSON.stringify({copies:copies.length,bytes:build.bytes,sha256:build.sha256,inputs:inputs.length,resources:keys.size,tests:count,uiTests,browser:browser.checks.length,screens:browser.screens.length,pass:true}));
