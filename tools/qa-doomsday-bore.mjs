import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const base=process.env.SC2_QA_URL??'http://127.0.0.1:5199';
const out=path.resolve(process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-bore-20261118');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(base+'/preview/doomsday-showcase-20261117/?group=artillery&stage=2');
 await page.waitForFunction(()=>window.doomsdayShowcase?.report().ready,null,{timeout:300000});
 const results=[];
 for(const name of ['ordinary','tiger','destroyer','repeat','fortress-repeat','no-card','mobile']){
  const result=await page.evaluate(async name=>{
   const q=window.doomsdayShowcase;
   if(name==='tiger')await q.compare('tiger',4,false);
   else await q.compare('artillery',name==='no-card'?0:2,false);
   const w=q.world,view=q.view,gun=w.allies()[0],ranks=w.expedition.doomsday.ranks;
   if(name==='destroyer'||name==='mobile'){
    const {ELITES}=await import('/src/data/elites.ts');
    gun.eliteId=name==='mobile'?'tank.1':'tank.3';gun.modelKey=ELITES[gun.eliteId].model;
    if(name==='mobile')gun.mode=gun.desiredMode='tank';
   }
   if(name.endsWith('repeat'))ranks['M-B03']=1;
   if(name==='fortress-repeat'){
    const {acquireDoomsdayBlueprint}=await import('/src/simulation/combat/doomsday-refits.ts');
    ranks['M-O03']=1;acquireDoomsdayBlueprint(w,'M-O03');
   }
   w.refreshStats(gun);
   await view.prepareSnapshotAssets(w.captureRun());await view.prepareCurrentAssets();await view.warmPresentationBatches();
   const player=view.sourceCombatEffects.player,originalAdd=player.add,blasts=[],rounds=[],frames=[];
   const model='SiegeTankSiegedAttackImpact';
   player.add=function(request,ground){
    if(request.model===model&&request.age===0)blasts.push({x:request.placement.x,z:request.placement.z});
    return originalAdd.call(this,request,ground);
   };
   let serial=w.visualEvents.at(-1)?.serial??0,lastAt=0,draw,pure=true;
   try{
    w.paused=false;
    for(let i=0;i<720;i++){
     w.step();
     const fresh=w.visualEvents.filter(e=>e.serial>serial);serial=fresh.at(-1)?.serial??serial;
     for(const e of fresh)if(e.kind==='attack'&&e.entityId===gun.id)rounds.push({seq:e.shotSequence,target:e.targetId,tick:w.tick});
     const contacts=fresh.filter(e=>e.doomsdayEffect==='bore-hit');
     if(contacts.length){
      const rear=contacts.filter(e=>e.kind==='support-impact'&&e.doomsdayOrigin);
      const round=rounds.find(r=>r.seq===contacts[0].shotSequence);
      if(!round)throw Error('Missing launch for '+name);
      const ids=[...new Set([round.target,...rear.map(e=>e.targetId)])];
      blasts.length=0;
      const before=JSON.stringify(w.captureRun());
      view.render(1/60,1);
      pure&&=before===JSON.stringify(w.captureRun());
      frames.push({round:round.seq,launch:round.tick,impact:w.tick,drawn:blasts.slice(),victims:ids.map(id=>{
       const target=w.body(id),hit=fresh.filter(e=>e.kind==='hit'&&e.entityId===id&&e.hitSourceId===gun.id);
       return {id,x:target.x,z:target.z,lossReceipts:hit.length,blasts:blasts.filter(p=>p.x===target.x&&p.z===target.z).length};
      })});
      lastAt=w.tick;
     }
     if(lastAt&&w.tick===lastAt+4){
      view.render(1/60,1);
      draw=player.report().modelDraws.find(m=>m.model===model);
      if(frames.length===(name.endsWith('repeat')?2:1))break;
     }
     if((name==='no-card'||name==='mobile')&&rounds.length>=3&&w.tick>rounds[2].tick+45)break;
    }
    return {name,frames,rounds,draw,pure};
   }finally{player.add=originalAdd;w.paused=true;}
  },name);
  assert.ok(result.rounds.length>=3,name+' 未到第三发');
  assert.equal(result.frames.length,['mobile','no-card'].includes(name)?0:name.endsWith('repeat')?2:1,name);
  for(const f of result.frames){
   assert.equal(f.round,3);assert.ok(f.victims.length>=2);
   assert.ok(f.victims.every(v=>v.lossReceipts===1&&v.blasts===1),JSON.stringify(f));
  }
  if(result.frames.length){
   assert.ok(result.pure&&result.draw?.particles>0,JSON.stringify(result.draw));
   if(name==='ordinary'||name==='tiger')await page.locator('#battle').screenshot({path:path.join(out,name+'.png')});
  }
  results.push(result);console.log(name,result.frames.map(f=>[f.launch,f.impact,f.victims.length]),result.draw?.particles);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
