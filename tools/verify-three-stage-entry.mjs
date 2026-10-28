/** One finite native-RAF campaign sample with simulated movement and UI choices.
 * No added units/equipment, changed HP/money, clock fast-forward or forced stage. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function verifyThreeStageEntry(page,output){
 const result={states:[],method:'seed529 normal Terran, native RAF/fixed steps, simulated directional input, production UI rewards, three stages maximum'};
 const click=a=>page.locator(`[data-action="${a}"]:visible`).first().click();
 try{
  await page.evaluate(()=>{
   const w=__QUALITY_APP__.world,native=w.step,v=__QUALITY_APP__.view,render=v.render;let next=0,direction={x:0,z:0};
   globalThis.__THREE_STAGE_MISSING__=0;v.render=function(...args){const result=render.apply(this,args);globalThis.__THREE_STAGE_MISSING__=Math.max(globalThis.__THREE_STAGE_MISSING__,v.sourceCombatEffects.player.counts.missing);return result;};
   globalThis.__THREE_STAGE_STOP__=false;
   w.step=function(...args){
    if(!__THREE_STAGE_STOP__&&w.phase==='battle'&&!w.paused&&w.time>=next){
     next=w.time+.15;const allies=w.allies().filter(u=>u.hp>0&&!u.temporary),center=allies.length?{x:allies.reduce((n,u)=>n+u.x,0)/allies.length,z:allies.reduce((n,u)=>n+u.z,0)/allies.length}:w.anchor;
     const distance=p=>Math.hypot(p.x-center.x,p.z-center.z);let threat;
     for(const u of w.entities.values())if(u.hp>0&&u.owner==='zerg'&&(!threat||distance(u)<distance(threat)))threat=u;
     let goal;const pods=w.pods.filter(p=>['falling','active','opening'].includes(p.status));
     for(const p of [...pods,...w.pickups])if(!goal||distance(p)<distance(goal))goal=p;
     if(threat&&distance(threat)<4.5){const dx=center.x-threat.x,dz=center.z-threat.z,n=Math.hypot(dx,dz)||1;goal={x:center.x+dx/n*6,z:center.z+dz/n*6};}
     else if(threat&&distance(threat)<7)goal=undefined;
     if(goal){const dx=goal.x-w.anchor.x,dz=goal.z-w.anchor.z,n=Math.hypot(dx,dz);direction=n>.7?{x:dx/n,z:dz/n}:{x:0,z:0};}else direction={x:0,z:0};
    }if(!__THREE_STAGE_STOP__&&w.phase==='battle'&&!w.paused)w.input={...direction};return native.apply(this,args);
   };
  });
  await page.locator('.pause-modal .primary[data-action="pause"]').click();let lastKey='',roundChosen='';const deadline=Date.now()+480000;
  while(Date.now()<deadline){
   const state=await page.evaluate(()=>{const a=__QUALITY_APP__,w=a.world;return {phase:w.phase,stage:w.stage,time:w.time,elapsed:w.stageElapsed,duration:w.duration,paused:w.paused,round:w.rewardRound,readiness:a.readiness.state.phase,kind:a.readiness.state.kind,allies:w.allies().length,errors:a.view.report().errors,saveFailed:a.session.saveFailed,missing:globalThis.__THREE_STAGE_MISSING__};});
   const key=[state.stage,state.phase,state.round,state.readiness].join(':');if(key!==lastKey){result.states.push(state);console.log(JSON.stringify({campaign:state}));lastKey=key;}
   assert.deepEqual(state.errors,[]);assert.equal(state.saveFailed,false);assert.notEqual(state.readiness,'error');assert.equal(state.missing,0,'Combat effect dependency missing');
   if(state.stage===3&&state.phase==='reward'){result.completedThree=true;break;}
   if(['lost','won','finished','menu'].includes(state.phase)){result.terminal=state.phase;break;}
   if(state.phase==='reward'&&!state.kind){
    const round=state.stage+':'+state.round,choices=page.locator('[data-action="reward"]:visible:not(:disabled)');
    if(roundChosen!==round&&await choices.count()){await choices.first().click();roundChosen=round;}
    else if(await page.locator('[data-action="skip"]:visible:not(:disabled)').count())await click('skip');
   }
   await page.waitForTimeout(1000);
  }
  await page.evaluate(()=>{__THREE_STAGE_STOP__=true;__QUALITY_APP__.world.paused=true;__QUALITY_APP__.hud.update();});
  await page.screenshot({path:output+'/three-stage-final.png'});assert.equal(result.completedThree,true,'Bounded normal campaign did not finish stages 1–3');result.passed=true;
 }catch(error){result.error=String(error);throw error;}finally{await page.evaluate(()=>{globalThis.__THREE_STAGE_STOP__=true;__QUALITY_APP__.world.paused=true;}).catch(()=>{});await fs.writeFile(output+'/three-stage.json',JSON.stringify(result,null,2));}
}
