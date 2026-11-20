import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const base=process.env.SC2_QA_URL??'http://127.0.0.1:5199';
const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-card-visuals';
// Each probe stops at a genuine receipt or state, then advances to a visible part of its animation.
const cards={
 W01:'heavy',W02:'wide-flame',W03:'reload',W04:'repair-link',W05:'preheated',W06:'fragment',W07:'transform',W08:'cover',W09:'battery',
 G01:'penetrating',G02:'shield',G03:'moving',G04:'repair-link',G05:'tow',G06:'blue',G07:'detected',G08:'nano-scrap',G09:'armor-deflect',
 B01:'armor-body',B02:'blast-ring',B03:'repeat',B04:'moving',B05:'redirect',B06:'intercept',B07:'vikingAssist',B08:'brace',B09:'turret',
 P01:'elite-armor',P02:'knock',P03:'metal-body',P04:'node',P05:'bore-hit',P06:'split-release',
 N01:'nano-dot',N02:'phase-hit',N03:'promotion',N04:'salvo',N05:'rear-crossfire',N06:'station',N07:'cold',N08:'pincer-spent',N09:'resonance'
};
const cases=Object.entries(cards).map(([card,event])=>({card:'M-'+card,event,name:card}));
cases.push({card:'M-O02',event:'sword',variant:2,name:'sword'},{card:'M-O02',event:'barrage',name:'barrage'},
 {card:'M-O02',event:'cannon',name:'cannon'},{card:'M-N02',group:'overload',stage:3,event:'phase-hit',name:'overload'},
 {card:'M-N09',variant:2,event:'resonance',name:'wide-resonance'},
 {card:'M-B04',variant:0,event:'incoming-hit',name:'bare-flank'},
 {card:'M-B04',event:'incoming-hit',name:'phase-flank'},
 {card:'M-B04',theme:'ice',event:'incoming-hit',name:'phase-flank-ice'},
 {card:'M-N02',variant:2,event:'phase-hit',name:'reserved-collapse'});
const selected=process.env.DOOMSDAY_QA_CASES?.split(',');
const captures=new Set(['B01','G02','P01','N01','N02','N06','N07','N09','G04','overload','sword','barrage','cannon','bare-flank','phase-flank','phase-flank-ice','reserved-collapse']);
// Redraw the same frozen scene and camera twice. Isolate the circuit clock or
// the defensive core so a submitted effect hidden inside the model fails QA.
async function compareArmorPixels(nano){
 const q=window.doomsdayShowcase,w=q.world,view=q.view,main=w.allies()[0];
 const {displayActiveModelKey}=await import('/src/render/materials/elite-visual.ts');
 const model=view.gpu.get(displayActiveModelKey(main)),canvas=view.canvas,paused=w.paused;
 w.paused=false;view.render(0,1);w.paused=paused;
 const well=view.scene.getObjectByName('doomsday-well'),center=view.camera.position.clone();
 if(nano)center.set(main.x,(w.terrain?.height(main)??0)+model.bodyHeight*.6,main.z);
 else{
  const matrix=well.matrix.clone();well.getMatrixAt(0,matrix);
  center.setFromMatrixPosition(matrix).applyMatrix4(well.matrixWorld);
 }
 center.project(view.camera);
 const sample=document.createElement('canvas'),size=nano?116:64;sample.width=sample.height=size;
 const ctx=sample.getContext('2d',{willReadFrequently:true}),scale=canvas.width/canvas.clientWidth;
 const x=(center.x+1)*canvas.width/2-size*scale/2,y=(1-center.y)*canvas.height/2-size*scale/2;
 function capture(){
  view.heroComposer.render();
  ctx.drawImage(canvas,x,y,size*scale,size*scale,0,0,size,size);
  return ctx.getImageData(0,0,size,size).data;
 }
 const before=capture(),control=capture(),normal=sample.toDataURL();
 const clocks=model.materialSurfaces.map(s=>s.refitTime);
 const times=clocks.map(c=>c.value),visible=well?.material.visible;
 try{
  if(nano)clocks.forEach(c=>c.value+=.53);
  else well.material.visible=false;
  const after=capture(),comparison=sample.toDataURL();
  let changed=0,peak=0;
  for(let i=0;i<after.length;i+=4){
   let diff=0,noise=0;
   for(let channel=i;channel<i+3;channel++){
    diff=Math.max(diff,Math.abs(after[channel]-control[channel]));
    noise=Math.max(noise,Math.abs(control[channel]-before[channel]));
   }
   if(diff>=12&&diff>noise+8)changed++;
   peak=Math.max(peak,diff);
  }
  return {changed,peak,normal,comparison};
 }finally{
  if(nano)clocks.forEach((c,i)=>c.value=times[i]);
  else well.material.visible=visible;
  view.heroComposer.render();
 }
}
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(150000);
const results={cases:[],errors:[]};
page.on('pageerror',e=>results.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')results.errors.push(e.text().slice(0,600));});
try{
 await page.goto(base+'/preview/doomsday-showcase-20261117/');
 await page.waitForFunction(()=>window.doomsdayShowcase?.report().ready,null,{timeout:300000});
 for(const item of cases.filter(c=>!selected||selected.includes(c.name))){
  const report=await page.evaluate(async({card,variant=1,group,stage,event,theme})=>{
   const q=window.doomsdayShowcase;
   if(group)await q.compare(group,stage,false);else await q.load(card,variant,false,{theme});
   const w=q.world,main=w.allies()[0],seen={},styles={heavy:8,penetrating:16,'elite-armor':128,preheated:1024,reload:32768};
   let found=-1,sampled=-1,serial=w.visualEvents.at(-1)?.serial??0,receipt,widest=0;
   w.paused=false;
   for(let n=0;n<720;n++){
    w.step();
    const fresh=w.visualEvents.filter(e=>e.serial>serial);serial=fresh.at(-1)?.serial??serial;
    const ds=w.expedition.doomsday,state=main.doomsday;
    for(const e of fresh){if(e.doomsdayEffect)seen[e.doomsdayEffect]=(seen[e.doomsdayEffect]??0)+1;}
    if(found<0){
     const hit=fresh.find(e=>{
      if(event==='incoming-hit')return e.kind==='hit'&&e.entityId===main.id&&e.hitSourceId!==undefined;
      if(event==='shield')return ['nano-shield','nano-break'].includes(e.doomsdayEffect);
      if(event==='salvo'||event==='rear-crossfire')return e.doomsdayEffect==='crossfire'&&!!e.doomsdayOrigin===(event==='rear-crossfire');
      if(styles[event])return e.kind==='attack'&&e.entityId===main.id&&((e.doomsdayStyle??0)&styles[event])!==0;
      return e.doomsdayEffect===event||e.doomsdaySegment===event;
     });
     let active=!!hit;
     switch(event){
      case 'wide-flame':active=w.effects.some(f=>f.kind==='flame'&&f.doomsdayFlame?.width>1);break;
      case 'transform':active=main.modeTimer>0;break;
      case 'moving':active=Math.hypot(main.velocity.x,main.velocity.z)>.1;break;
      case 'tow':active=state?.tow?.untilTick>w.tick;break;
      case 'blue':active=[...w.entities.values()].some(u=>Object.values(u.doomsday?.blueFlame??{}).some(mark=>mark.untilTick>w.tick));break;
      case 'detected':active=[...w.entities.values()].some(u=>u.cloaked&&u.team!=='player'&&w.visibleTo(u,'terran'));break;
      case 'metal-body':active=!!state?.mechanized;break;
      case 'armor-body':active=!!ds.ranks['M-B01']&&state?.visualScale<1;break;
      case 'sword':active=ds.slashes?.some(s=>w.tick===s.hitTick)??false;break;
      case 'barrage':active=w.weaponFlights.filter(f=>f.doomsdayDerived?.kind==='barrage'&&!f.pendingLaunch&&w.time>=f.start).length===4;break;
     }
     if(active){
      found=w.tick;
      receipt=hit&&{kind:hit.kind,effect:hit.doomsdayEffect,segment:hit.doomsdaySegment,source:hit.entityId,target:hit.targetId,radius:hit.supportRadius,origin:hit.doomsdayOrigin};
     }
    }
    const delay=event==='resonance'||event==='cold'||event==='station'?10:event==='phase-hit'?12:event==='incoming-hit'?7:event==='sword'||event==='barrage'?0:event==='cannon'?3:4;
    if(w.tick%5===0||w.tick===found||found>=0&&w.tick===found+delay){
     q.view.render(1/60,1);
     if(event==='barrage')widest=Math.max(widest,q.view.scene.getObjectByName('doomsday-shell')?.count??0);
    }
    if(found>=0&&w.tick===found+delay){sampled=w.tick;break;}
   }
   const summary=q.report(),counts={};
   q.view.scene.getObjectByName('doomsday-particles')?.traverse(m=>{if(m.isInstancedMesh&&m.count>0)counts[m.name.slice('doomsday-'.length)]=m.count;});
   let materialDrawn;
   if(event==='armor-body'||event==='metal-body'){
    const {UNIT_MATERIAL_REFIT_ROW}=await import('/src/render/materials/unit-material-batch.ts');
    const {displayActiveModelKey}=await import('/src/render/materials/elite-visual.ts');
    const batch=q.view.gpu.get(displayActiveModelKey(main));
    const channel=event==='armor-body'?0:2,expected=event==='armor-body'?1:3;
    materialDrawn=batch?.materialSurfaces.some(surface=>{
     if(!surface.material.visible)return false;
     for(let slot=0;slot<batch.count;slot++){
      const index=4*(UNIT_MATERIAL_REFIT_ROW*surface.capacity+slot)+channel;
      if(surface.data[index]===expected)return true;
     }
     return false;
    })??false;
   }
   const before=JSON.stringify(w.captureRun());q.view.render(1/60,1);const pure=before===JSON.stringify(w.captureRun());w.paused=true;
   return {found,sampled,receipt,seen,counts,models:summary.render.sourceCombat.source.modelDraws.map(m=>m.model),
    fog:summary.render.nonHeroes.medical.fogTargets,draw:summary.render.doomsday,materialDrawn,pure,widest,errors:summary.render.errors};
  },item);
  if(item.name==='B01'||item.name.startsWith('phase-flank')){
   const {changed,peak,normal,comparison}=await page.evaluate(compareArmorPixels,item.name==='B01');
   report.pixels={changed,peak};
   for(const [suffix,data] of [['normal',normal],['comparison',comparison]]){
    await fs.writeFile(path.join(out,item.name+'-'+suffix+'.png'),Buffer.from(data.split(',')[1],'base64'));
   }
  }
  results.cases.push({...item,...report});
  if(captures.has(item.name)&&report.sampled>=0)await page.screenshot({path:path.join(out,item.name+'.png')});
  console.log(item.name,item.event,report.found,report.sampled);
 }
 for(const item of results.cases){
  assert.ok(item.sampled>=0,item.name+' did not reach '+item.event);
  assert.ok(item.pure,item.name+' mutated combat while rendering');assert.deepEqual(item.errors,[]);
  if(item.pixels)assert.ok(item.pixels.changed>=16,item.name+' armor response hidden in the rendered image');
  if(item.materialDrawn!==undefined)assert.ok(item.materialDrawn,item.name+' missing refit on the active model');
  else if(item.event==='incoming-hit'){
   assert.equal(!!item.receipt.origin,item.variant!==0,'incoming contact must belong to phase armor');
   assert.equal(item.counts.well??0,item.variant===0?0:1,'wrong number of armor wells');
  }
  else if(item.event==='tow')assert.ok(item.draw.lineVertices>=4,'missing tow cable');
  else assert.ok(item.draw.objects>0,item.name+' produced no card effect');
  if(item.event==='phase-hit')assert.ok(item.counts.vortex>0,item.name+' missing collapse');
  if(item.name==='reserved-collapse')assert.ok(item.counts.vortex>=2,'missing the reserved second rim');
  if(['cold','station','resonance','repair-link','nano-scrap'].includes(item.event))assert.ok(item.counts.mist>0,item.name+' missing dust or mist');
  if(item.name==='overload'){
   assert.ok(item.fog>0,'missing science vessel green mist');
   assert.ok(item.models.includes('ThorHandGunAttackLaunch')&&item.models.includes('ThorHandGunAttackImpact'),'native Thor actors missing');
  }
  if(item.event==='barrage')assert.ok(item.widest>=4);
  if(item.event==='resonance')assert.equal(item.receipt.radius,item.variant===2?1.6:.8);
 }
 assert.deepEqual(results.errors,[]);
}catch(e){results.failure=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await fs.writeFile(path.join(out,'card-visuals.json'),JSON.stringify(results,null,2));console.log(results.failure??('Verified '+results.cases.length+' card visual checkpoints'));}
