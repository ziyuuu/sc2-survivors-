/** Bounded diagnostic scenarios; invoked by verify-safari-entry --scene-scope. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function verifySceneScope(page,output){
 const result={};
 try{
  result.first=await page.evaluate(()=>{const a=__QUALITY_APP__;return {race:a.world.expedition.race,difficulty:a.world.difficulty,mission:[...a.view.missionTemplates.keys()],deaths:[...a.view.missionDeathTemplates.keys()],hive:!!a.view.hiveTemplate};});
  assert.equal(result.first.race,'terran');assert.deepEqual(result.first.mission,[]);assert.deepEqual(result.first.deaths,[]);assert.equal(result.first.hive,false);
  result.stage4=await page.evaluate(async()=>{
   const a=__QUALITY_APP__,w=a.world;w.paused=true;w.difficulty='normal';w.stage=3;w.endStage();
   if(w.phase!=='reward')throw Error('stage end blocked');if(w.rewardRound==='building')w.skipReward();
   a.hud.pendingStageAdvance=true;a.hud.onPrepareReinforcement();
   const until=performance.now()+240000;while((a.readiness.state.kind||w.stage!==4)&&performance.now()<until){if(a.readiness.state.phase==='error')throw Error(a.readiness.state.error);await new Promise(r=>setTimeout(r,50));}
   if(w.stage!==4||a.readiness.state.kind)throw Error('stage transition timeout');w.paused=true;
   await a.view.waitForPendingAssets();return {stage:w.stage,mission:[...a.view.missionTemplates.keys()],deaths:[...a.view.missionDeathTemplates.keys()],hive:!!a.view.hiveTemplate};
  });
  assert.deepEqual(new Set(result.stage4.mission),new Set(['command_center','barracks','factory','starport','hatchery']));
  assert.deepEqual(new Set(result.stage4.deaths),new Set(['barracks','factory','starport','hatchery']));
  result.repair=await page.evaluate(()=>{const a=__QUALITY_APP__,w=a.world;w.workers=5;if(!a.spawnMission(w,'repair'))throw Error('repair spawn failed');
   const b=w.missions.bodies.get(w.missions.active.bodyIds[0]);w.anchor.x=b.x;w.anchor.z=b.z;for(const u of w.allies()){u.x=b.x+3;u.z=b.z+3;}
   for(let i=0;i<90;i++)a.view.render(.016,1);a.hud.update();const v=a.view.missionViews.get(b.id);if(!v?.root.visible)throw Error('repair model not rendered');
   return {id:b.id,model:b.model,visible:v.root.visible,deathPrepared:a.view.missionDeathTemplates.has(b.model),phase:w.phase};});
  assert(result.repair.deathPrepared);await page.evaluate(()=>{__QUALITY_APP__.world.paused=false;__QUALITY_APP__.hud.update();});
  await page.screenshot({path:output+'/scope-stage4-repair.png'});await page.evaluate(()=>{__QUALITY_APP__.world.paused=true;});
  result.death=await page.evaluate(()=>{const a=__QUALITY_APP__,w=a.world,b=w.missions.bodies.get(w.missions.active.bodyIds[0]);w.missions.active.phase='active';b.invulnerable=false;w.hit(b,1e6,[],1,'zerg');a.view.render(.016,1);const d=a.view.missionDeaths.get(b.id);if(!d)throw Error('repair death view missing');return {model:b.model,created:true,visible:d.root.visible};});
  result.snapshot=await page.evaluate(async()=>{const a=__QUALITY_APP__,s=a.world.captureRun();await a.view.prepareSnapshotAssets(s);return {prepared:true,mission:[...a.view.missionTemplates.keys()]};});
  result.hard6=await page.evaluate(async()=>{const a=__QUALITY_APP__,w=a.world;w.stage=6;w.difficulty='hard';await a.view.prepareCurrentAssets();return {gateway:a.view.missionTemplates.has('gateway'),tower:a.view.missionTemplates.has('mission.tower'),workers:['scv','drone','probe'].filter(k=>a.view.gpu.has(k)),errors:__SC2_REPORT__().errors};});
  assert(result.hard6.gateway&&result.hard6.tower);assert.equal(result.hard6.workers.length,3);assert.deepEqual(result.hard6.errors,[]);
  result.hell4=await page.evaluate(async()=>{const a=__QUALITY_APP__,w=a.world;w.stage=4;w.difficulty='hell';await a.view.prepareCurrentAssets();return {hive:!!a.view.hiveTemplate,hiveDeath:!!a.view.hiveDeathTemplate,errors:__SC2_REPORT__().errors};});
  assert(result.hell4.hive&&result.hell4.hiveDeath);assert.deepEqual(result.hell4.errors,[]);result.passed=true;
 }catch(e){result.error=String(e);throw e;}finally{await fs.writeFile(output+'/scene-scope.json',JSON.stringify(result,null,2));}
}
