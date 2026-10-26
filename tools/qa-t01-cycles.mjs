import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';

// Each requested entry retains its own actual production execution and frames.
// A successful capture is deliberately separate from visual review.
const run=process.argv[2],selectionFile=process.argv[3];
assert.match(run,/^[a-z0-9-]+$/);assert.ok(selectionFile);
const requests=JSON.parse(await fs.readFile(selectionFile,'utf8'));
const jpeg=process.argv[5]==='jpeg',extension=jpeg?'jpg':'png';
const compressedEvidence=process.env.T01_GZIP_EVIDENCE==='1';
const root=path.resolve('reports/local/t01-20261024/'+run);
await fs.mkdir(root,{recursive:false});
const evidenceRoot=process.argv[6]?path.resolve(process.argv[6],run):root;
if(evidenceRoot!==root){
 const allowed=path.resolve('C:/Users/zyuu/.codex/visualizations/2026/09/20/01a0bf9c-1981-7eb3-8a7e-55c9fd6884c9/t01-evidence');
 assert.equal(path.dirname(evidenceRoot),allowed,'Evidence must remain inside the dedicated writable T01 folder');
 await fs.mkdir(allowed,{recursive:true});await fs.mkdir(evidenceRoot,{recursive:false});
}
const profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
const server=await serveT01(process.argv[4]?{buildPath:process.argv[4]}:{});
const report={run,selectionFile,capture:{width:1440,height:900,format:jpeg?'jpeg':'png',quality:jpeg?92:undefined},scope:'Individual controlled production execution and rendered keyframe sequence. Capture does not equal visual acceptance.',build:server.build,rows:[],errors:[],requests:[]};
report.profilePath=profile;
report.evidenceRoot=evidenceRoot;
report.evidenceFile=compressedEvidence?'evidence.json.gz':'evidence.json';
const save=async()=>{await fs.writeFile(root+'/report-next.json',JSON.stringify(report,null,2));await fs.rename(root+'/report-next.json',root+'/report.json');};
let browser,child,timer;
try{
 await fs.mkdir(profile,{recursive:true});
 await fs.copyFile(new URL(import.meta.url),root+'/runner.mjs');
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});
 const page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1440,height:900});
 const cdp=await page.context().newCDPSession(page);
 report.foreground={scope:'CDP foreground emulation for hidden controlled capture; not native focus or performance acceptance.'};
 await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('requestfailed',r=>report.requests.push({url:r.url(),failure:r.failure()}));
 await page.goto(server.url+'/dynamic.html');await page.waitForFunction(()=>globalThis.T01||document.querySelector('#t01-fatal'),null,{timeout:180000});
 assert.equal(await page.locator('#t01-fatal').count(),0);
 const catalogue=await page.evaluate(()=>T01.cases);const byId=new Map(catalogue.map(c=>[c.id,c]));
 if(process.env.T01_CHECK_APPLICABILITY==='1'){
  report.applicability=await page.evaluate(async()=>{const rows=[];for(const c of T01.cases.filter(c=>c.applicability)){const loaded=await T01.load(c.id),trigger=T01.runtime.trigger(),step=T01.runtime.step();rows.push({id:c.id,reason:loaded.applicability?.reason,loaded:loaded.caseId,triggerPlaying:trigger.playing,stepTimeUnchanged:step.time===trigger.time,result:T01.results[c.id]?.status});}return rows;});
  assert.equal(report.applicability.length,catalogue.filter(c=>c.applicability).length);
  for(const r of report.applicability){assert.equal(r.loaded,r.id);assert.ok(r.reason);assert.equal(r.triggerPlaying,false);assert.equal(r.stepTimeUnchanged,true);assert.equal(r.result,'not-applicable');}
  await page.screenshot({path:root+'/not-applicable.png'});
 }
 timer=setInterval(()=>{console.log(JSON.stringify({done:report.rows.filter(r=>r.status!=='running').length,total:requests.length,current:report.rows.at(-1)?.id}));},25000);
 for(const[index,request]of requests.entries()){
  const spec=typeof request==='string'?{id:request}:request,c=byId.get(spec.id);assert.ok(c,'Missing '+spec.id);assert.ok(!c.applicability,'Source-declared inapplicable entry cannot become a visual pass: '+c.id);
  const row={id:c.id,condition:spec.condition??'normal',status:'running',directory:String(index+1).padStart(4,'0')};report.rows.push(row);
  for(const volume of new Set([root,evidenceRoot])){const disk=await fs.statfs(volume);assert.ok(disk.bavail*disk.bsize>512*1024*1024,'Insufficient free space: '+volume);}
  await save();
  const dir=evidenceRoot+'/'+row.directory;await fs.mkdir(dir);const evidence={case:c,request:spec,frames:[],sourceBuild:server.build.inputs,readyFile:'000-ready.'+extension,receiptFile:'001-receipt.'+extension};
  const shot=file=>page.screenshot({path:dir+'/'+file,...(jpeg?{type:'jpeg',quality:92}:{type:'png'})});
  try{
   const errorStart=report.errors.length;await page.bringToFront();await page.evaluate(()=>{const v=T01.app.view;if(v.__t01CameraUpdate){v.cameraController.update=v.__t01CameraUpdate;delete v.__t01CameraUpdate;}});await page.evaluate(id=>T01.load(id),c.id);await page.evaluate(()=>T01.capture(true));
   if(spec.targetAngle!==undefined){
    assert.ok(Number.isFinite(spec.targetAngle));
    evidence.targetPlacement=await page.evaluate(angle=>{const w=T01.app.world,s=T01.runtime.snapshot(),a=w.entities.get(s.actor?.id),t=w.entities.get(s.target?.id);if(!a||!t)throw Error('Target framing requires actor and target');const before={x:t.x,z:t.z},distance=Math.hypot(t.x-a.x,t.z-a.z),r=angle*Math.PI/180;t.x=a.x+distance*Math.cos(r);t.z=a.z+distance*Math.sin(r);t.prev={x:t.x,z:t.z};const ground=w.entities.get(s.enemy?.receipt.groundWitnessId);if(ground){ground.x=t.x;ground.z=t.z;ground.prev={x:t.x,z:t.z};}w.hash.rebuild(w.entities.values());T01.app.view.render(0,1);return {before,after:{x:t.x,z:t.z},distance,angle,groundWitness:ground?{id:ground.id,x:ground.x,z:ground.z}:null,scope:'Rotate the controlled target and its co-located ground witness at unchanged distance before the native trigger to keep effects above HUD.'};},spec.targetAngle);
   }
   if(spec.framing)await page.evaluate(f=>{const v=T01.app.view;v.setCameraZoom(f.zoom);v.setCameraPitch(f.pitch);v.render(.3,1);},spec.framing);
   const frameInspection=async()=>{
    if(!spec.framing?.followInspection)return;
    return page.evaluate(()=>{
     const w=T01.app.world,v=T01.app.view,s=T01.runtime.snapshot(),ids=[s.actor?.id,s.target?.id,s.patient?.id].filter(id=>id!==undefined&&id!==null);
     if(!ids.length)return null;
     const center=()=>{const bodies=ids.map(id=>w.entities.get(id)).filter(Boolean);if(!bodies.length)return {x:0,y:0,z:0};const x=(Math.min(...bodies.map(b=>b.x))+Math.max(...bodies.map(b=>b.x)))/2,z=(Math.min(...bodies.map(b=>b.z))+Math.max(...bodies.map(b=>b.z)))/2;return {x,y:w.terrain?.height({x,z})??0,z};};
     // Retain the inspection center through browser RAFs between rendering and
     // screenshot capture. Restore the original controller before the next case.
     if(!v.__t01CameraUpdate){v.__t01CameraUpdate=v.cameraController.update;v.cameraController.update=function(_anchor,dt,reduced,frame){const p=center();this.target.set(p.x,p.y,p.z);return v.__t01CameraUpdate.call(this,p,dt,reduced,frame);};}
     v.render(0,1);const p=center();
     return {target:[p.x,p.z],scope:'Inspection-only camera centering held through screenshot RAFs; World anchor, entity positions and fixed simulation steps unchanged.'};
    });
   };
   if(spec.isolateSkill)await page.evaluate(()=>{const w=T01.app.world,id=T01.runtime.snapshot().actor?.id,u=w.entities.get(id);if(!u?.heroId)throw Error('Isolated manual hero skill expected');u.weaponCooldown=1e6;u.nextShotAt=1e6;});
   if(spec.isolateSupport)await page.evaluate(()=>{const w=T01.app.world;for(const u of w.allies()){u.weaponCooldown=1e6;u.nextShotAt=1e6;u.moveSpeed=0;}w.fortifications.clear();});
   evidence.inspectionFraming=await frameInspection();evidence.before=await page.evaluate(()=>T01.runtime.snapshot());assert.equal(evidence.before.memoryOnly,true);
   const immediate=['card','development'].includes(c.runner)||c.runner==='card-effect'&&c.data.effect.kind==='funShop'&&c.data.effect.item==='dice';
   if(!immediate){assert.ok(evidence.before.render.map);assert.equal(evidence.before.render.assetsPending,0);assert.deepEqual(evidence.before.render.errors,[]);}
   if(immediate)await settleUI(page);
   await shot(evidence.readyFile);
   evidence.trigger=await page.evaluate(condition=>{const s=T01.runtime.trigger(condition);T01.runtime.pause();return s;},row.condition);
   if(immediate){await settleUI(page);await shot(evidence.receiptFile);assert.ok(evidence.trigger.receipt);}
   else{
    const seconds=spec.seconds??c.seconds??6;
    const times=[...new Set((spec.times??(c.action==='mode'?[1/60,...Array.from({length:30},(_,i)=>(i+1)/10),4,6,8,10]:[.05,.15,.35,.7,1.2,2,3,4,6,8,10,12,16,18,20,22,25,30])).filter(t=>t<seconds).concat(seconds,...(spec.stopAttacksAt!==undefined?[spec.stopAttacksAt]:[]),...(spec.depleteReserveAt!==undefined?[spec.depleteReserveAt]:[])))].sort((a,b)=>a-b);
    if(spec.stopAttacksAt!==undefined)assert.ok(spec.stopAttacksAt>=0&&spec.stopAttacksAt<=seconds,'Stop time must stay inside the captured cycle');
    if(spec.depleteReserveAt!==undefined){assert.equal(c.data.effect.support,'protoss.reserve');assert.ok(spec.depleteReserveAt>0&&spec.depleteReserveAt<seconds);}
    for(const[n,t]of times.entries()){
     await page.bringToFront();const visibility=await page.evaluate(()=>{const w=T01.app.world,s={paused:w.paused,hidden:document.hidden,focused:document.hasFocus()};w.paused=false;return s;});
     let state=await page.evaluate(t=>T01.runtime.advanceTo(t),t);const file=String(n+1).padStart(3,'0')+'-'+t+'.'+extension;
     const inspectionFraming=await frameInspection();if(inspectionFraming)state=await page.evaluate(()=>T01.runtime.snapshot());
     assert.equal(state.phase,'battle','Scene ended before requested cycle');assert.deepEqual(state.render.errors,[]);assert.ok(state.elapsed>=t-1e-7);
     assert.equal(state.render.assetsPending,0,'Captured frame has pending models');
     if(spec.inspectPose){const detail=await page.evaluate(id=>{const s=T01.app.view.animationStates.get(id),w=T01.app.world,u=w.entities.get(id),t=w.entities.get(T01.runtime.snapshot().target?.id);return {presentation:s?structuredClone(s.sampled):null,attackState:u?{windup:u.windup,nextShotAt:u.nextShotAt,pendingTarget:u.pendingTarget,shotSequence:u.shotSequence,lastShotAt:u.lastShotAt,weaponCooldown:u.weaponCooldown,shotInterval:u.shotInterval,attackPeriod:u.attackPeriod,edgeDistance:t?w.edgeDistance(u,t):null}:null};},state.actor?.id);Object.assign(state,detail);}
     if(spec.inspectProjectiles)state.projectiles=await page.evaluate(()=>{const w=T01.app.world,p=T01.app.view.sourceCombatEffects.player;return {flights:structuredClone(w.weaponFlights),lines:w.zergElites.lines.map(l=>({id:l.id,kind:l.kind,point:{...l.point},progress:l.progress,length:l.length,air:l.air})),endings:[...p.loops].filter(([,e])=>e.stopped!==undefined).map(([key,e])=>({key,model:e.request.model,stopped:e.stopped,age:(w.time-e.stopped)*(e.request.clockRate??1)}))};});
     await shot(file);evidence.frames.push({at:t,file,visibility,state,...(inspectionFraming?{inspectionFraming}:{})});
     if(spec.stopAttacksAt!==undefined&&Math.abs(t-spec.stopAttacksAt)<1e-7){
      evidence.stopAttacks=await page.evaluate(()=>{const w=T01.app.world,ids=[];for(const u of w.entities.values()){if(u.owner!=='terran'||u.hp<=0)continue;u.weaponCooldown=1e6;if(u.summonKind==='interceptor')u.nextShotAt=1e6;ids.push(u.id);}return {at:T01.runtime.snapshot().elapsed,ids,scope:'Controlled suppression of later primary attacks for live friendly bodies. Ordinary pending windups retain nextShotAt so they finish normally; native interceptors use nextShotAt only for starting a later shot. Existing packets, burns and native expiry continue unchanged.'};});
     }
     if(spec.depleteReserveAt!==undefined&&Math.abs(t-spec.depleteReserveAt)<1e-7){
      evidence.reserveDamage=await page.evaluate(()=>{const w=T01.app.world,s=T01.runtime.snapshot(),hits=[];for(const u of w.allies()){const reserve=w.expedition.support.unique.reserves[u.id]?.amount??0,shield=u.shield??0;if(!reserve||!shield)continue;const damage=reserve+shield*.5,before={reserve,shield,hp:u.hp};w.hit(u,damage,[],1,'zerg',0,0,s.target?.id,false,false,0,true);hits.push({id:u.id,damage,before,after:{reserve:w.expedition.support.unique.reserves[u.id]?.amount??0,shield:u.shield,hp:u.hp}});}return {at:s.elapsed,hits,scope:'Native shield hit consumes the real stored reserve and half the remaining shield; no visual state or expiry timer is directly changed.'};});
      assert.ok(evidence.reserveDamage.hits.length,'A live reserve must exist before depletion');
      for(const h of evidence.reserveDamage.hits){assert.ok(h.before.reserve>0);assert.equal(h.after.reserve,0);assert.equal(h.after.hp,h.before.hp);}
     }
    }
   }
   evidence.after=await page.evaluate(()=>T01.runtime.snapshot());assert.equal(report.errors.length,errorStart,'Page error');
   if(c.runner==='actor'){
    const b=evidence.before,a=evidence.after;
    if(c.action==='hit')assert.ok(evidence.trigger.actor&&((evidence.trigger.actor.hp<b.actor.hp)||(evidence.trigger.actor.shield??0)<(b.actor.shield??0)),'Native hit must reduce HP or shield');
    if(c.action==='death')assert.ok(!a.actor||a.actor.hp<=0,'Native death did not kill the inspected actor');
    if(c.action==='move')assert.ok(evidence.frames.some(f=>f.state.actor&&Math.hypot(f.state.actor.x-b.actor.x,f.state.actor.z-b.actor.z)>.5),'Native movement never left the start');
    if(spec.expectedMovePose){const moving=evidence.frames.filter(f=>f.state.actor?.action==='move');assert.ok(moving.length,'No moving frame to inspect');assert.ok(moving.every(f=>f.state.presentation?.action===spec.expectedMovePose),'Native movement selected an incorrect rendered pose');}
    if(spec.expectedAttackPoses){for(const pose of spec.expectedAttackPoses)assert.ok(evidence.frames.some(f=>f.state.presentation?.action===pose),'Expected rendered attack pose missing: '+pose);const last=evidence.frames.at(-1);assert.equal(last.state.attackState.windup,0,'Pending native windup must finish after suppression of new attacks');assert.equal(last.state.presentation?.action,spec.expectedEndPose);const settled=evidence.frames.filter(f=>f.at>=6);assert.ok(settled.length>=2);assert.equal(new Set(settled.map(f=>f.state.attackState.shotSequence)).size,1,'New primary shots occurred after natural recovery');}
    if(c.action==='attack'){assert.ok(a.target?.hp<b.target.hp,'Native attack never damaged the target');if(c.fixture?.selectedWeapon)assert.ok(evidence.frames.some(f=>f.state.actor?.weapon===c.fixture.selectedWeapon),'Expected native weapon never selected');if(c.fixture?.via==='native-interceptor')assert.ok(evidence.frames.some(f=>f.state.actor?.children?.some(child=>child.shots>0)),'Native interceptor never fired');}
    if(spec.expectedCadenceRatio!==undefined){const shots=evidence.frames.filter(f=>f.state.attackState?.shotSequence>0);assert.ok(shots.length,'No real shots to inspect cadence');for(const f of shots){assert.ok(Math.abs(f.state.attackState.shotInterval/f.state.attackState.attackPeriod-spec.expectedCadenceRatio)<1e-7,'Unexpected native cadence');if(c.fixture?.cadence==='hydralisk-close')assert.ok(f.state.attackState.edgeDistance<=.5+1e-7,'Near-distance fixture left its native branch');}}
    if(spec.expectedNaturalRecovery){const last=evidence.frames.at(-1).state;assert.equal(last.attackState.windup,0);assert.equal(last.presentation?.action,'idle');const tail=evidence.frames.filter(f=>f.at>=10);assert.ok(tail.length>=2);assert.equal(new Set(tail.map(f=>f.state.actor.shots)).size,1);}
    if(spec.expectedMeshGoneAt!==undefined){const tail=evidence.frames.filter(f=>f.at>=spec.expectedMeshGoneAt);assert.ok(tail.length);for(const f of tail)for(const model of spec.endingModels)assert.equal(f.state.render.sourceCombat.source.modelDraws.find(d=>d.model===model)?.meshes??0,0,'Authored ending mesh retained: '+model+' at '+f.at);}
    if(c.fixture?.mode)assert.ok(evidence.frames.filter(f=>f.state.actor?.hp>0).every(f=>(c.family==='tank'?f.state.actor.mode:f.state.actor.nativeMode)===c.fixture.mode),'Actor left the requested native form');
   }
   if(c.runner==='enemy'){
    const b=evidence.before,a=evidence.after,e=a.enemy,frames=evidence.frames,kind=c.fixture.enemy.skill;
    // The diagnostic counter belongs to the reused World, not this fixture.
    const damage=e.diagnostic.damage-b.enemy.diagnostic.damage;
    assert.equal(e.receipt.spawn.nativeLevel,c.fixture.enemy.level);
    if(c.fixture.enemy.trait)assert.equal(e.receipt.spawn.trait,c.fixture.enemy.trait);
    if(c.action==='hit')assert.ok(evidence.trigger.actor.hp<b.actor.hp,'Immediate enemy hit missing');
    if(c.action==='death')assert.ok(!a.actor||a.actor.hp<=0,'Enemy death missing');
    if(c.action==='move')assert.ok(frames.some(f=>f.state.actor&&Math.hypot(f.state.actor.x-b.actor.x,f.state.actor.z-b.actor.z)>.5),'Enemy movement missing');
    if(c.action==='mode')assert.ok(frames.some(f=>f.state.actor?.nativeMode===c.data.mode),'Native enemy transition missing');
    if(c.action==='attack'){assert.ok(damage>0,'Enemy attack damage missing');assert.ok(frames.some(f=>f.state.actor?.shots>0),'Enemy shot missing');if(c.fixture.selectedWeapon)assert.ok(frames.some(f=>f.state.actor?.weapon===c.fixture.selectedWeapon),'Enemy weapon mismatch');}
    if(c.action==='skill'){
     assert.equal(e.receipt.firstCast?.kind,kind,'Native enemy cast mismatch');
     if(c.fixture.enemy.interruption){assert.ok(e.receipt.interruption,'Enemy source death missing');if(c.fixture.enemy.interruption==='before-commit'&&kind!=='bile')assert.equal(damage,0,'Uncommitted enemy skill caused damage');}
     else if(kind==='heal')assert.ok(a.patient.hp>b.patient.hp,'Enemy boss healing missing');
     else if(damage===0){evidence.functionalFinding={id:'T01-ENEMY-QUEEN-ZERO-SPECIAL',scope:'Native elite queen bile cast uses boss healing-only zero damage cap. Actual observed behavior, not accepted damage validation.'};assert.equal(c.actor,'elite');assert.equal(c.family,'queen');assert.equal(e.receipt.firstCast.damage,0);row.functionalFinding=evidence.functionalFinding.id;}
     assert.equal(e.casts.length+e.missiles.length+e.charges.length+e.acidZones.length+e.corrosionZones.length,0,'Enemy packets outlived full cycle');
    }
    if(c.action==='auto-ability'){assert.ok(e.receipt.autoCast,'Native transfusion missing');assert.ok(a.patient.hp>b.patient.hp,'Native transfusion healing missing');}
    if(c.action==='aura'){assert.ok(e.receipt.auraExit,'Native aura exit missing');assert.equal(e.patient.armorAura+e.patient.damageAura+e.patient.speedAura,0,'Enemy aura persisted outside radius');}
   }
   if(c.runner==='card-effect'&&c.data.effect.kind==='support'&&c.data.effect.support==='zerg.parasite'){
    const marked=evidence.frames.filter(f=>Object.keys(f.state.cardEffect?.support.unique.parasites??{}).length>0);
    assert.ok(marked.length,'Parasite fixture must land a real primary hit and capture the live parasite before host death');
    assert.ok(evidence.frames.some(f=>f.state.events.some(e=>e.kind==='support-impact')),'Parasite host death must emit the native acid impact');
    assert.equal(Object.keys(evidence.after.cardEffect.support.unique.parasites).length,0,'No live parasite remains after host death');
    evidence.activation={kind:'zerg.parasite',markedAt:marked.map(f=>f.state.elapsed),nativeDeathImpact:true};
    const witness=evidence.after.cardEffect.parasiteWitness;
    if(witness){
     assert.ok(witness.before>witness.after,'Native parasite acid must damage the nearby enemy witness');
     evidence.activation.witness={...witness,actualDamage:witness.before-witness.after};
    }
   }
   row.status=immediate?'receipt-captured':'cycle-captured';row.visualReview='pending';row.seconds=evidence.after.elapsed;row.eventKinds=[...new Set(evidence.after.events.map(e=>e.kind))];
  }catch(e){row.status='failed';row.failure=String(e);try{evidence.failureState=await page.evaluate(()=>T01.runtime.snapshot());await shot('failed.'+extension);}catch{}}
  const evidenceBytes=Buffer.from(JSON.stringify(evidence));
  await fs.writeFile(dir+'/'+report.evidenceFile,compressedEvidence?gzipSync(evidenceBytes):evidenceBytes);await page.evaluate(()=>{T01.runtime.pause();T01.capture(false);}).catch(()=>{});await save();
 }
 report.complete=true;report.visualPass=false;
}catch(e){report.failure=String(e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({rows:report.rows.length,failed:report.rows.filter(r=>r.status==='failed').length,errors:report.errors.length,failure:report.failure}));}

async function settleUI(page){await page.evaluate(async()=>{await Promise.race([Promise.allSettled(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished)),new Promise(r=>setTimeout(r,1500))]);await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width&&i.getBoundingClientRect().height).map(i=>i.decode().catch(()=>{})));});}
