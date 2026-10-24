import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const names=(process.env.SC2_STARSHIP_CASES??process.env.SC2_STARSHIP_CASE??'fort-terran').split(',');
const root=path.resolve(process.env.SC2_QA_DIR??'reports/local/starship-logic-20261015/browser-r1');await fs.mkdir(root,{recursive:true});
const fortResourceCatalog=JSON.parse(await fs.readFile('deploy/runtime/source-assets.json','utf8'));
const fortResources=fortResourceCatalog.entries.filter((r:any)=>r.runtime.id.startsWith('model.fort.turret_')||r.runtime.id==='model.map.spaceplatformbarrier_02').map((r:any)=>({id:r.runtime.id,file:r.packedFile,bytes:r.bytes,sha256:r.sha256}));
const context=await chromium.launchPersistentContext(path.join(root,'profile-'+names[0]),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=context.pages()[0]??await context.newPage();let report:any,out:string;
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.networkFailures.push({url:r.url(),error:r.failure()?.errorText}));
page.on('console',m=>{if(m.type()==='error')report.consoleErrors?.push(m.text());});
const shot=async(label:string)=>{const file=path.join(out,label+'.png');await page.screenshot({path:file});report.screens.push(file);};
for(const [index,name] of names.entries()){
const [preset,race='terran',hero]=name.split('-');out=path.join(root,name);await fs.mkdir(out,{recursive:true});report={name,preset,race,method:'Production menu, World, BattleRenderer and HUD; deterministic enemy fixture for targeted combat. No natural-campaign or physical-input acceptance.',build:JSON.parse(await fs.readFile('preview/starship-logic-20261015/build-inputs.json','utf8')),bundleSha256:createHash('sha256').update(await fs.readFile('preview/starship-logic-20261015/main.js')).digest('hex'),errors:[],networkFailures:[],screens:[]};
try {
 report.fortResources=fortResources;report.consoleErrors=[];
 if(index===0){
 await page.goto('http://127.0.0.1:4393/?preset='+preset,{timeout:120000});
 await page.waitForFunction(()=>!!(window as any).__STARSHIP_VERIFY__,null,{timeout:120000});
 }else {await page.evaluate(()=>{const a=(window as any).__STARSHIP_VERIFY__;a.hud.onRestart();a.hud.menuPage='title';a.hud.update();});}
 await page.evaluate(({preset,race,hero})=>(window as any).__STARSHIP_VERIFY__.configure(preset,race,hero),{preset,race,hero});
 await page.locator('[data-action=menu-new]').click();await page.locator('[data-action=menu-race][data-race='+race+']').click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
 for(let attempt=0;attempt<12;attempt++){try{await page.waitForFunction(()=>['ready','error'].includes((window as any).__STARSHIP_VERIFY__.readiness.state.phase),null,{timeout:30000});break;}catch{console.log(name+' preparing '+JSON.stringify(await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.readiness.state)));}}
 const readiness=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.readiness.state);assert.equal(readiness.phase,'ready',JSON.stringify(readiness));report.readiness=readiness;
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>(window as any).__STARSHIP_VERIFY__.world.time>.3,null,{timeout:30000});
 report.start=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.summary());await shot('start');
 if(preset==='fort'){
  assert.equal(report.start.forts.length,5);assert.equal(report.start.forts.filter((f:any)=>f.kind==='turret_'+race).length,2);
  report.fixture=await page.evaluate(()=>{const a=(window as any).__STARSHIP_VERIFY__,w=a.world,fort=[...w.fortifications.values()].find((f:any)=>f.kind.startsWith('turret')) as any;const point=w.freePosition('zergling',{x:fort.x,z:fort.z+3},0,3);if(!point)throw Error('No legal enemy fixture position');const e=w.addUnit('zergling','zerg',point.x,point.z);e.hp=e.maxHp=2e6;e.moveSpeed=0;e.nextShotAt=e.specialReady=1e9;w.hash.rebuild(w.entities.values());return {enemy:e.id,time:w.time,hp:e.hp,shots:w.stats.shots,forts:[...w.starship.forts.keys()]};});
  await page.waitForFunction((t:number)=>(window as any).__STARSHIP_VERIFY__.world.time>t+4,report.fixture.time,{timeout:45000});await shot('attack');
  report.combat=await page.evaluate((id:number)=>{const a=(window as any).__STARSHIP_VERIFY__,w=a.world;return {time:w.time,shots:w.stats.shots,enemyHp:w.entities.get(id)?.hp,forts:[...w.starship.forts].map(([id,r]:any)=>({id,...r})),views:[...a.view.fortViews].map(([id,v]:any)=>{const materials:any[]=[],ribbons:any[]=[];v.traverse((n:any)=>{if(n.isMesh){for(const m of Array.isArray(n.material)?n.material:[n.material])materials.push({name:m.name,map:!!m.map,normal:!!m.normalMap});if(n.userData.sc2Spline)ribbons.push({name:n.name,source:n.userData.sc2Spline.sourceBone,end:n.userData.sc2Spline.endBone,span:n.userData.sourceRibbonSpan,finite:Array.from(n.geometry.attributes.position.array).every(x=>Number.isFinite(x))});}});return {id,visible:v.visible,kind:v.userData.fortKind,materials,ribbons};})};},report.fixture.enemy);assert.ok(report.combat.forts.some((f:any)=>f.lastShot>0));assert.ok(report.combat.enemyHp<report.fixture.hp);assert.ok(report.combat.views.filter((v:any)=>v.kind==='cover').every((v:any)=>v.materials.every((m:any)=>m.map)));
  if(race==='zerg')assert.ok(report.combat.views.filter((v:any)=>v.kind==='turret_zerg').every((v:any)=>v.ribbons.length===2&&v.ribbons.every((r:any)=>r.span>0&&r.finite)));
  report.destroyed=await page.evaluate(()=>{const a=(window as any).__STARSHIP_VERIFY__,w=a.world,fort=[...w.fortifications.values()].find((f:any)=>f.kind.startsWith('turret')) as any;w.hit(fort,1e8,[],1,'zerg',0,1);return {id:fort.id,time:w.time};});
  await page.waitForFunction((t:number)=>(window as any).__STARSHIP_VERIFY__.world.time>t+.15,report.destroyed.time);await shot('death');
  report.finish=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.summary());assert.equal(report.finish.forts.length,4);
 }else if(['hero','corrupt','ark','evolution','phantom'].includes(preset)){
  report.fixture=await page.evaluate((preset:string)=>{const a=(window as any).__STARSHIP_VERIFY__,w=a.world;const h=[...w.heroes.values()][0] as any,source=(preset==='hero'||preset==='corrupt')?w.heroEntity(h.id):preset==='ark'?w.entities.get([...w.starship.advancedBodies.keys()][0]):w.allies().find((u:any)=>preset!=='evolution'||u.unitType==='ravager');if(!source)throw Error('Missing equipped source body');const targets=[];for(let n=0;n<6;n++){const p=w.freePosition('zergling',{x:source.x+(n%3-1)*1.3,z:source.z+3+Math.floor(n/3)*1.2},0,2);if(!p)continue;const e=w.addUnit('zergling','zerg',p.x,p.z);e.hp=e.maxHp=2e7;e.armor=0;e.moveSpeed=0;e.nextShotAt=e.specialReady=1e9;targets.push({id:e.id,hp:e.hp});}w.hash.rebuild(w.entities.values());const cast=h&&['hero','corrupt'].includes(preset)?w.castHero(h.id,w.starship.battleView?.()):null;return {source:source.id,hero:h?.id,rank:source.rank,targets,time:w.time,shots:w.stats.shots,damage:w.stats.damage,cast,pendingCasts:w.heroCasts.length};},preset);
  if(preset==='hero'||preset==='corrupt'){assert.equal(report.fixture.cast,true);assert.ok(report.fixture.pendingCasts>0);await page.waitForFunction((t:number)=>(window as any).__STARSHIP_VERIFY__.world.time>t+.5,report.fixture.time);await shot('skill');report.skillRender=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.view.report());}
  if(preset==='evolution')assert.equal(report.start.members.filter((m:any)=>m[1].origin==='opening_roaches').length,2);
  const seconds=preset==='evolution'?15:preset==='phantom'?15:5;
  await page.waitForFunction((end:number)=>(window as any).__STARSHIP_VERIFY__.world.time>end,report.fixture.time+seconds,{timeout:90000});await shot('effect');
  report.combat=await page.evaluate(({source,targets}:any)=>{const a=(window as any).__STARSHIP_VERIFY__,w=a.world,u=w.entities.get(source);return {time:w.time,damage:w.stats.damage,shots:w.stats.shots,source:{id:u?.id,hp:u?.hp,rank:u?.rank,bileCooldown:u?.bileCooldown},targets:targets.map((t:any)=>({id:t.id,hp:w.entities.get(t.id)?.hp??0})),heroJobs:w.starship.hero.jobs.length,projectionCount:w.starship.projections.size,modelErrors:a.view.modelErrors};},report.fixture);assert.ok(report.combat.damage>report.fixture.damage);assert.deepEqual(report.combat.modelErrors,[]);report.finish=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.summary());
 }else{
  await page.waitForFunction((t:number)=>(window as any).__STARSHIP_VERIFY__.world.time>t+3,report.start.time,{timeout:45000});await shot('battle');report.finish=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__.summary());
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors.filter((s:string)=>!s.includes('net::ERR_ABORTED')),[]);report.passed=true;
}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;try{report.last=await page.evaluate(()=>(window as any).__STARSHIP_VERIFY__?.summary());await shot('failure');}catch{}}
finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({name,passed:report.passed??false,errors:report.errors,failures:report.networkFailures.length,failure:report.failure??null}));}
if(!report.passed)break;
}await context.close();
