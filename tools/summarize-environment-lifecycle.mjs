import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='reports/local/mvp5-lifecycle-20261014';
const output=process.argv[2]??'reports/qa/environment-lifecycle-20261014.json';
assert.ok(output==='reports/qa/environment-lifecycle-20261014.json'||output.startsWith(root+'/'));
assert.ok(!output.includes('..'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const evidence=async file=>{const bytes=await fs.readFile(file);return {file,bytes:bytes.length,sha256:sha(bytes)};};
const run=async name=>{
 const file=root+'/'+name+'/result.json',data=await read(file);
 return {name,data,evidence:await evidence(file)};
};
const names=['formal-web-r1','formal-offline-r2','formal-web-r2','missing-texture-r2','missing-model-r2','cache-r2','cache-r3','tour-r2','natural-industrial-r1','natural-rest-r1'];
const reports=new Map();for(const name of names)reports.set(name,await run(name));
for(const [name,{data}] of reports){
 assert.equal(data.passed,name!=='cache-r2',name);
 assert.equal(data.errors.length,0,name);
 if(!name.startsWith('missing-')){assert.equal(data.httpErrors.length,0,name);assert.equal(data.consoleErrors?.length??0,0,name);}
}
const formal=await read('dist/MVP5-Lifecycle-Web-20261014-R2/build-inputs.json');
const diagnostic=await read(root+'/diagnostic-r2/build-inputs.json');
const binding=await read(root+'/binding-r2.json');
assert.ok(binding.passed);assert.deepEqual(diagnostic.inputs,formal.inputs);
assert.deepEqual(binding.productionInputsChanged,['src/render/terrain/campaign-map.ts']);
for(const name of ['formal-offline-r2','formal-web-r2','missing-texture-r2','missing-model-r2'])assert.equal(reports.get(name).data.build.appBuildId,formal.appBuildId,name);
for(const name of ['cache-r2','cache-r3','tour-r2','natural-industrial-r1','natural-rest-r1'])assert.equal(reports.get(name).data.build.appBuildId,diagnostic.appBuildId,name);

const compactRun=({name,data,evidence})=>({name,evidence,passed:data.passed,appBuildId:data.build.appBuildId,method:data.method,checks:data.checks.map(({state,...check})=>check),screens:data.screens.length,exports:data.exports?.length??0,pageErrors:data.errors.length,consoleErrors:data.consoleErrors?.length??0,httpErrors:data.httpErrors.length,offlineHttpRequests:data.offlineRequests?.length??null,entryOnly:data.entryOnly??false,...(data.failure?{failure:data.failure}:{} )});
for(const name of ['missing-texture-r2','missing-model-r2']){
 const data=reports.get(name).data;assert.equal(data.httpErrors.length,1);assert.equal(data.httpErrors[0].status,404);assert.equal(data.consoleErrors.length,1);
}
const offline=await read(root+'/offline-build-r2.json'),decoder=await read(root+'/offline-decoder-r2.json');
assert.equal(decoder.htmlSha256,offline.html.sha256);assert.equal(decoder.checked.length,1217);
assert.equal(reports.get('formal-offline-r2').data.offlineRequests.length,0);
const resource=await read(root+'/resource-audit-r2.json'),update=await read(root+'/update-r2/handoff-update.json');
const application=await read(resource.app+'/delivery.json');
assert.ok(resource.passed&&update.passed);assert.equal(resource.appBuildId,formal.appBuildId);
assert.equal(update.activation.appBuildId,formal.appBuildId);assert.equal(update.activation.downloadedMissing,0);
const before=await read(root+'/buffers-before-r1/result.json'),after=await read(root+'/buffers-after-r1/result.json');
assert.ok(before.passed&&before.expectLeak&&after.passed&&!after.expectLeak);
assert.ok(before.growth.every(row=>row.buffers===86));assert.ok(after.growth.every(row=>row.buffers===0&&row.geometries===0&&row.textures===0));
const beforeImage=await evidence(root+'/buffers-before-r1/final-frontier.png'),afterImage=await evidence(root+'/buffers-after-r1/final-frontier.png');assert.equal(beforeImage.sha256,afterImage.sha256);
const cacheRuns=reports.get('cache-r3').data.runs;assert.equal(cacheRuns.length,15);
for(let i=0;i<5;i++){assert.deepEqual(cacheRuns[5+i].state.memory,cacheRuns[10+i].state.memory);assert.equal(cacheRuns[5+i].state.programs,cacheRuns[10+i].state.programs);}

const tour=reports.get('tour-r2').data;
const tours=tour.runs.map(row=>({theme:row.theme,race:row.race,points:tour.routes[row.theme].length,nativeSeconds:row.after.time-row.before.time,nativeTicks:row.after.tick-row.before.tick,samples:row.samples.length,illegalGroundObservations:row.samples.flatMap(s=>s.allies).filter(a=>!a.groundLegal).length,discardedBacklogSeconds:row.after.driver.discarded,shots:row.after.stats.shots,teleportsAfterEntry:0}));
assert.equal(tours.length,5);assert.ok(tours.every(row=>row.points===10&&row.illegalGroundObservations===0&&row.shots===0));
const natural=[];
for(const name of ['natural-industrial-r1','natural-rest-r1']){
 const data=reports.get(name).data;
 for(const row of data.runs){
  const states=[row.before,row.after,...data.transitions.filter(t=>t.theme===row.theme).map(t=>t.state),...data.screens.filter(s=>s.name.startsWith(row.theme+'-')).map(s=>s.state)];
  const record={theme:row.theme,race:row.race,run:name,seed:row.after.seed,startStage:row.before.stage,endStage:row.after.stage,nativeSeconds:row.after.time-row.before.time,nativeTicks:row.after.tick-row.before.tick,outcome:row.after.phase,shots:row.after.stats.shots,productionPaid:row.after.economy.production,paidPassengersReleased:row.after.ledger.flatMap(j=>j.passengers).filter(p=>p.status==='released').length,targetsRescued:row.after.economicTargets.filter(t=>t.status==='rescued').length,targetsKilled:row.after.economicTargets.filter(t=>t.status==='killed').length,samples:row.samples.length,allSamplesVisible:row.samples.every(s=>s.visible===true),allSamplesFocused:row.samples.every(s=>s.focused===true),discardedBacklogSeconds:row.after.driver.discarded,illegalGroundObservations:states.flatMap(s=>s.allies).filter(a=>!a.groundLegal).length,guardedPodObserved:states.some(s=>s.pods.some(p=>p.guardAlive>0))};
  // This summary closes bounded gameplay checks only when real payment, guarded delivery,
  // movement and economic-target interaction were actually observed for each map.
  assert.ok(record.nativeSeconds>=100&&record.outcome==='battle'&&record.endStage>=2&&record.shots>0,record.theme);
  assert.ok(record.productionPaid.minerals>0&&record.paidPassengersReleased>0&&record.targetsRescued>0&&record.guardedPodObserved,record.theme);
  assert.equal(record.illegalGroundObservations,0,record.theme);
  natural.push(record);
 }
}
assert.equal(new Set(natural.map(r=>r.theme)).size,5);assert.equal(new Set(natural.map(r=>r.race)).size,3);

const reviewed=[];
for(const name of names){
 const file=root+'/review-sheets/'+name+'/selection.json',selection=await read(file);assert.equal(selection.status,'REVIEWED',name);
 reviewed.push({run:name,evidence:await evidence(file),sheets:selection.pages.length,images:selection.pages.flatMap(p=>p.images).length,findings:selection.findings});
}
const regression=await fs.readFile(root+'/regression-r1.log','utf8');assert.match(regression,/pass 1412/);assert.match(regression,/fail 0/);
assert.match(await fs.readFile(root+'/docs-check-r1.log','utf8'),/Game reference matches runtime data/);
const result={
 at:new Date().toISOString(),passed:true,status:'Authorized environment plan steps 3 and 4 locally implemented and verified; step 5 delivery and user viewing remain separate.',
 wholeMvpComplete:false,wholeMvp5Complete:false,step5Delivered:false,currentOrApplicationMirrorSynchronized:false,onlineDeployment:false,
 productionChange:{file:'src/render/terrain/campaign-map.ts',description:'Dispose InstancedMesh-owned GPU instance buffers when a campaign map is released; existing geometry, material and texture disposal retained.',unchanged:['map layout and source art','terrain/collision and stage areas','combat/economy/building rules','input and camera','run26/profile6/maprecipe3','backend and dependencies']},
 formal:{web:formal.output,appBuildId:formal.appBuildId,compiledInputs:formal.inputs.length,builtFiles:formal.builtFiles},
 diagnostic:{web:diagnostic.output,appBuildId:diagnostic.appBuildId,compiledInputs:diagnostic.inputs.length,onlyNativeObjectReferencesExposed:true},
 binding:{evidence:await evidence(root+'/binding-r2.json'),...binding},
 html:{...offline.html,formalModuleAndCssExact:binding.htmlFormalModuleAndCssExact,actualDecoder:{evidence:await evidence(root+'/offline-decoder-r2.json'),records:decoder.assets,logicalBytes:decoder.rawBytes,hashChecked:decoder.checked.length}},
 applicationCandidate:{path:resource.app,appBuildId:resource.appBuildId,packageBuildId:resource.packageBuildId,version:'0.6.27-rc.1',appFiles:application.appFiles.length,purpose:'Isolated external-resource update verification; not step 5 final delivery.',resources:{release:resource.release,records:resource.records,files:resource.physicalFiles,physicalBytes:resource.physicalBytes,logicalBytes:resource.logicalBytes,oldRetained:resource.retained,added:resource.added,newBytes:resource.newBytes,sceneryTextures:resource.sceneryTextures,originalModelReferenceClosures:resource.originalModelReferences.length},unchangedBackendFiles:resource.unchangedBackendFiles,dependenciesChanged:resource.dependenciesChanged,update:{evidence:await evidence(root+'/update-r2/handoff-update.json'),passed:update.passed,reused:update.expectedReused,added:update.expectedAdded,downloads:0,checks:update.checks}},
 bufferDisposal:{before:{evidence:await evidence(root+'/buffers-before-r1/result.json'),expectedDefectConfirmed:true,bundleSha256:before.sha256,growth:before.growth},after:{evidence:await evidence(root+'/buffers-after-r1/result.json'),bundleSha256:after.sha256,growth:after.growth},cycles:3,themes:5,finalScreenshotByteExact:true,screenshotSha256:afterImage.sha256,measurement:'WebGL-created minus explicitly deleted buffers, plus Three geometry/texture counts; not VRAM or garbage-collection measurement.'},
 lifecycle:['formal-web-r1','formal-offline-r2','formal-web-r2','missing-texture-r2','missing-model-r2'].map(name=>compactRun(reports.get(name))),
 cache:{...compactRun(reports.get('cache-r3')),cycles:3,loads:15,maxCampaignMaps:2,maxInitialFlatMaps:1,lastTwoCycles:reports.get('cache-r3').data.runs.slice(5).map(r=>({cycle:r.cycle,theme:r.theme,memory:r.state.memory,programs:r.state.programs})),failedAssumption:compactRun(reports.get('cache-r2'))},
 tour:{...compactRun(reports.get('tour-r2')),maps:tours,fixture:'Stage 18, waves/events/production isolated, hive HP zero before archive creation; real pointer movement and following thereafter. No post-entry teleportation. Not native campaign/boss progression.'},
 natural:{reports:['natural-industrial-r1','natural-rest-r1'].map(name=>compactRun(reports.get(name))),maps:natural,method:'Fresh normal new-run menus on easy; map ticket selects each theme and seed 529 (also the World seed via configureCampaign). Native default-speed loop, pointer orders and native reward UI. No forced health, wallet, clock, stage, enemy, carrier or passenger state. Read-only diagnostic observations. No FPS claim.'},
 visualReview:{uniqueSelectedImages:reviewed.reduce((n,r)=>n+r.images,0),contactSheets:reviewed.reduce((n,r)=>n+r.sheets,0),runs:reviewed,additionalOriginalSizeViews:{priorFormalWeb:2,tour:11,natural:3},scope:'Bounded screenshot inspection; original-size views overlap selected images. No all-frame, physical-device, human, actual-client calibration or full-campaign acceptance.'},
 regression:{tests:1412,failed:0,typecheckPassed:true,dataDocsPassed:true,evidence:await Promise.all(['regression-r1.log','typecheck-r1.log','docs-check-r1.log'].map(file=>evidence(root+'/'+file)))},
 retainedFailures:[
  'Pre-fix native WebGL buffer counters grow by 86 per additional five-map cycle; the old build remains labeled with this defect.',
  'cache-r2 incorrectly asserted two total map views; production retains one initial flat map plus at most two campaign maps. Only the helper assertion changed for cache-r3.',
  'Initial freeze Git child process and initial application build hit sandbox EPERM; authorized isolated retries succeeded; earlier logs/attempts retained.',
  'Initial resource-group audit assumed all historical resources were common/campaign. It was corrected to preserve historical race groups and verify only the new delta.',
  'R1 baseline Web/application/HTML candidates retain their identities; baseline lifecycle evidence is not relabeled as the final R2 build.'
 ],
 remaining:['Step 5 final local delivery and user viewing / MVP5 baseline freeze','Full natural campaign and integrated-content performance / ordinary-play 60 FPS / 7B','Physical input, high-refresh, low-memory and human playtesting','Deferred dense-effect occlusion and retained camera/tiny-body/child-bar/dark-Char limitations','Production/B4 and whole-MVP acceptance'],
 clientAmplitudeCalibrated:false,
};
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,passed:true,naturalMaps:natural.length,tourPoints:tours.reduce((n,r)=>n+r.points,0),images:result.visualReview.uniqueSelectedImages,sheets:result.visualReview.contactSheets,productionInputsChanged:binding.productionInputsChanged}));
