import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='reports/local/v01-20261024',sha=b=>createHash('sha256').update(b).digest('hex');
const original=await fs.readFile('tools/qa-v01-dense-comparison.mjs','utf8');
let runner=original.slice(0,original.indexOf(' report.groups=[];'));
runner=runner.replace("process.argv[2]??'dense-r2',variant=process.argv[3]??'r2'","process.argv[2]??'dense-quality-r1',variant=process.argv[3]??'dense-adopted-r1'");
runner=runner.replace('Full/native/complete 1440x900 DPR1, real RAF/FixedStepper. One 30-simulation-second controlled dense segment in an interleaved fresh-profile A/B comparison:', 'Existing full/medium/low combat presets; native resolution and complete animation at 1440x900 DPR1. One page, three full-workload warmups, then nine balanced-order real RAF/FixedStepper 30-simulation-second segments:');
runner=runner.replace('discardStart=0,stepCount=0;', 'discardStart=0,stepCount=0,samples=[],endLiveBacklog=0;');
runner=runner.replace('stepCount++;if(w.tick>=', 'stepCount++;if([120,240,600,1200,1800].includes(stepCount))samples.push({tick:w.tick,state:encode()});if(w.tick>=');
runner=runner.replace('final=encode();w.paused=true;', 'final=encode();endLiveBacklog=a.driver.accumulator;w.paused=true;');
runner=runner.replace('stepCount=0;initial=encode();', 'stepCount=0;samples=[];endLiveBacklog=0;initial=encode();');
runner=runner.replace('finish(){return {initial,final,frames,', 'finish(){return {initial,final,frames,samples,endLiveBacklog,presentation:v.report(),');
runner+=`
 report.groups=[];report.performanceFailures=[];report.warmups=[];
 const race='terran';setPhase('prepare-'+race);
 const fixture=await page.evaluate(r=>V01Steady.configure(r),race);
 await fs.writeFile(root+'/terran-fixture.json',JSON.stringify(fixture,null,2));
 const prep=await page.evaluate(()=>V01Steady.prepare());assert.equal(prep.errors.length,0);assert.equal(prep.pending,0);
 const group={race,prep,runs:[]};report.groups.push(group);await save();
 const settings=()=>page.evaluate(()=>{const v=A03.app.view,r=v.report();return {preset:v.combatPreset,detail:r.combatDetail,resolution:r.resolution,animation:r.animationMode,camera:r.camera};});
 function checkRun(result){assert.equal(result.stepCount,1800);assert.equal(result.endTick-result.startTick,1800);assert.ok(Math.abs(result.endTime-result.startTime-30)<1e-7);assert.equal(result.phase,'battle');assert.equal(result.errors.length,0);assert.ok(result.frames.length>100);const invalid=result.frames.filter(f=>f.pending||f.skip||f.discarded||f.allies!==16||f.enemies!==300);assert.equal(invalid.length,0,'Assets/population/skip/live discard invariant');assert.equal(result.presentation.resolution.quality,'native');assert.equal(result.presentation.resolution.width,1440);assert.equal(result.presentation.resolution.height,900);assert.equal(result.presentation.animationMode,'complete');}
 for(const preset of ['full','medium','low']){
  setPhase('warm-'+preset);await page.evaluate(p=>{A03.app.view.setCombatPreset(p);window.V01TargetTicks=1800;V01Steady.start('terran');},preset);
  await page.waitForFunction(()=>V01Steady.done(),null,{timeout:120000});const result=await page.evaluate(()=>V01Steady.finish());checkRun(result);
  report.warmups.push({preset,...result,summary:{interval:stats(result.frames.map(f=>f.interval).filter(v=>v!==null))}});await save();
 }
 assert.ok(report.warmups.every(r=>r.final===report.warmups[0].final),'Warmup final state across presets');
 const order=['full','medium','low','medium','low','full','low','full','medium'];report.order=order;
 for(let repeat=0;repeat<order.length;repeat++){
  const preset=order[repeat];setPhase('measure-'+repeat+'-'+preset);
  await page.evaluate(p=>A03.app.view.setCombatPreset(p),preset);const before=await settings();assert.equal(before.preset,preset);
  await page.evaluate(()=>V01Steady.start('terran'));await page.waitForFunction(()=>V01Steady.done(),null,{timeout:120000});const result=await page.evaluate(()=>V01Steady.finish());
  const row={...result,repeat,preset,settingsBefore:before,summary:{interval:stats(result.frames.map(f=>f.interval).filter(v=>v!==null)),cpu:stats(result.frames.map(f=>f.cpu)),renderCpu:stats(result.frames.map(f=>f.renderCpu)),backlog:stats(result.frames.map(f=>f.backlog))}};
  group.runs.push(row);await save();checkRun(result);assert.equal(result.presentation.combatPreset,preset);
  assert.equal(result.initial,group.runs[0].initial,'Same initial world/account');assert.equal(result.final,group.runs[0].final,'Same final world/account');assert.deepEqual(result.samples,group.runs[0].samples,'Same intermediate simulation states');
  console.log(JSON.stringify({completed:repeat+1,preset,wallMs:result.wallMs,fps:1000/row.summary.interval.mean,peakBacklog:row.summary.backlog.max}));
  await shot('timed-'+repeat+'-'+preset);
 }
 report.checks.push({name:'nine-native-30s-three-presets',stateExact:true,population:[16,300],ticks:1800,livePendingSkipDiscard:0});
 for(const preset of ['full','medium','low']){
  setPhase('controlled-visual-'+preset);await page.evaluate(p=>A03.app.view.setCombatPreset(p),preset);
  const camera=JSON.parse(await fs.readFile('reports/local/v01-20261024/dense-particle-pilot-r1/current-request-frames.json'))[0].camera;
  await page.evaluate(camera=>{const a=A03.app,v=a.view,w=a.world;w.restoreRun(V01Steady.snapshot);v.resetRun();a.driver.reset();a.hud.update();const render=v.render,update=v.cameraController.update;v.render=()=>{};v.cameraController.update=()=>{};v.camera.position.fromArray(camera.position);v.camera.quaternion.fromArray(camera.quaternion);v.camera.updateMatrixWorld(true);window.V01DenseVisual={draw(tick){w.paused=false;while(w.tick<tick){w.step();if(w.tick%4===0)render.call(v,4/60,1);}w.paused=true;a.driver.reset();v.renderScene();return {tick:w.tick,time:w.time,state:V01Steady.encode(),png:v.canvas.toDataURL('image/png'),presentation:v.report()};},restore(){v.render=render;v.cameraController.update=update;}};},camera);
  const visualReport=report['controlledVisual_'+preset]={scope:'Separate deterministic fixed-camera replay rendered every four ticks; not included in timing.',samples:[]};
  for(const tick of [120,240,600]){const {png,...sample}=await page.evaluate(t=>V01DenseVisual.draw(t),tick),file=root+'/'+preset+'-battle-tick-'+tick+'.png';await fs.writeFile(file,Buffer.from(png.split(',')[1],'base64'));await fs.writeFile(root+'/'+preset+'-visual-tick-'+tick+'.json',JSON.stringify(sample));visualReport.samples.push({tick,file,pngSha256:hash(await fs.readFile(file)),stateSha256:hash(sample.state),preset:sample.presentation.combatPreset,particles:sample.presentation.sourceCombat.player?.particles??sample.presentation.sourceCombat.particles});await save();}
  await page.evaluate(()=>V01DenseVisual.restore());
 }
 for(let i=0;i<3;i++)assert.ok(['medium','low'].every(p=>report['controlledVisual_'+p].samples[i].stateSha256===report.controlledVisual_full.samples[i].stateSha256),'Visual workload state equality');
 await page.evaluate(()=>A03.app.view.setCombatPreset('full'));report.finalSettings=await settings();assert.equal(report.finalSettings.preset,'full');
 assert.equal(report.errors.length,0);assert.equal(report.failedRequests.length,0);report.pass=true;
`;
runner+=original.slice(original.indexOf('}catch(e){report.failure='));
await fs.writeFile('tools/qa-v01-dense-quality.mjs',runner,{flag:'wx'});
const files=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())await walk(file);else files.push({file,sha256:sha(await fs.readFile(file))});}}
await walk('src');await walk('test');const currentFile='dist/SC2-Survivors-Current-20261006.html',currentHash=createHash('sha256');for await(const b of createReadStream(currentFile))currentHash.update(b);
const build=JSON.parse(await fs.readFile(base+'/web-game-dense-adopted-r1-build.json'));for(const f of build.inputs)assert.equal(sha(await fs.readFile(f.path)),f.sha256,f.path);
const baseline={date:new Date().toISOString(),files,currentFile,currentSha256:currentHash.digest('hex'),buildFile:base+'/web-game-dense-adopted-r1-build.json',buildHash:sha(await fs.readFile(base+'/web-game-dense-adopted-r1-build.json')),runnerSha256:sha(runner),helperSha256:sha(await fs.readFile('tools/v01-browser-helper.mjs'))};
await fs.writeFile(base+'/dense-quality-baseline.json',JSON.stringify(baseline,null,2),{flag:'wx'});
const plan={date:new Date().toISOString(),authorization:'同一16友军＋300敌人场景高、中、低三档对比帧率、30秒模拟实际耗时和积压，其他条件保持；不换模型或C++，结果后再决定。',status:'measurement-pending',variant:'dense-adopted-r1',baseline:'dense-quality-baseline.json',conditions:{viewport:[1440,900],dpr:1,quality:'native',animation:'complete',seed:529,population:[16,300],simulationTicks:1800,simulationSeconds:30,fixture:'Same existing high-survival fixture with native movement/attacks/damage; no autonomous reinforcements or controller orders.',background:'Same controlled background queue disabled; relevant resources preloaded.',warmup:'One full 1800-tick workload per preset before timing, raw warmups separate.',order:['full','medium','low','medium','low','full','low','full','medium'],repetitions:3,samePage:true,serial:true,profiling:false,heavyConcurrentTasks:false},metrics:['Mean RAF interval and reciprocal FPS','Wall time until 1800 native simulation ticks','Peak recorded live-frame accumulator; pause cleanup separately','Main-thread frame/render wall time as auxiliary measurements'],validation:['Same initial/final state and fixed intermediate simulation states','16/300 throughout; zero live asset waits/skips/discard','Fixed-camera visual samples at ticks 120/240/600 outside measurements','Source/test/Current/build hashes unchanged'],limits:['Controlled desktop Chrome workload; not natural campaign or all-device acceptance.','This run does not select or change production default presets.','No model, language, gameplay, UI, 5-second preparation or early-departure changes.','Spike investigation remains deferred.']};
await fs.writeFile(base+'/dense-quality-plan.json',JSON.stringify(plan,null,2),{flag:'wx'});
const board=JSON.parse(await fs.readFile('docs/project/performance-board.json'));assert.equal(board.revision,170);board.revision=171;board.next='V01';board.updated='2026-10-24';const task=board.tasks.find(t=>t.id==='V01');task.status='进行中';task.result='按用户授权复用当前已优化版本，固定16友军/300敌人高、中、低三档各三轮交错对照；只切现有特效档位，原生分辨率、完整动作、玩法及5秒预算/提前出发保持。结果后再决定，不换模型或C++，不改变默认档位；偶发尖峰继续暂缓。';task.evidence.push('../../'+base+'/dense-quality-plan.json');board.updates.push({date:'2026-10-24',tasks:['V01'],change:task.result,evidence:['../../'+base+'/dense-quality-plan.json']});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=JSON.parse(await fs.readFile('reports/qa/v01-20261024.json'));qa.boardRevision=171;qa.denseQuality={status:'measurement-pending',plan:base+'/dense-quality-plan.json'};await fs.writeFile('reports/qa/v01-20261024.json',JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({prepared:true,sourceFiles:files.length,buildInputs:build.inputs.length,board:171}));
