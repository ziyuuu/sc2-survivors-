/** Finite, isolated production-UI entry cycles; no real account/save is used. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function verifyRetainedUnitAssets(page,output){
 const result={cycles:[]},click=action=>page.locator(`[data-action="${action}"]:visible`).first().click();
 try{
  await page.evaluate(()=>{const v=__QUALITY_APP__.view,trim=v.trimIdleUnitAssets.bind(v);globalThis.__UNIT_CACHE_TRIMS__=[];v.trimIdleUnitAssets=function(){const result=trim();if(result)__UNIT_CACHE_TRIMS__.push({...result,cacheEpoch:v.cacheEpoch});return result;};});
  const capture=async label=>{
   const state=await page.evaluate(async()=>{const a=__QUALITY_APP__,release=await a.readiness.background.enter();try{await a.view.waitForPendingAssets();return {race:a.world.expedition.race,time:a.world.time,models:[...a.view.gpu.keys()],cacheEpoch:a.view.cacheEpoch,gl:__ENTRY_GL__(),errors:a.view.modelErrors,common:[...a.view.preparedCommon],heroes:a.view.confirmedHeroes.report().attacks,source:a.view.sourceCombatEffects.report().source.models};}finally{release();}});
   state.label=label;assert.deepEqual(state.errors,[]);assert.equal(state.gl.lost,0);result.cycles.push(state);console.log(JSON.stringify({cycle:label,models:state.models.length,textureBytes:state.gl.estimatedBytes,epoch:state.cacheEpoch}));
  };
  await capture('terran-1');
  for(const [race,label]of [['terran','terran-2'],['terran','terran-3'],['protoss','protoss-1'],['terran','terran-rebuilt']]){
   await click('restart');await page.waitForFunction(()=>__QUALITY_APP__.world.phase==='menu'&&__QUALITY_APP__.readiness.background.report().held===0);
   await click('menu-new');await page.locator(`[data-action="menu-race"][data-race="${race}"]`).click();
   for(const action of ['menu-race-next','menu-difficulty-next','menu-start'])await click(action);
   await page.waitForFunction(()=>['ready','error'].includes(__QUALITY_APP__.readiness.state.phase),null,{timeout:300000});assert.equal(await page.evaluate(()=>__QUALITY_APP__.readiness.state.phase),'ready');
   await click('flow-continue');await page.waitForFunction(()=>__QUALITY_APP__.world.time>4);await click('pause');await capture(label);
   if(label==='protoss-1'||label==='terran-rebuilt'){
    const image=await page.evaluate(async()=>{const a=__QUALITY_APP__,release=await a.readiness.background.enter();try{a.view.render(.016,1);a.view.renderScene();return a.view.canvas.toDataURL('image/png').split(',')[1];}finally{release();}});await fs.writeFile(`${output}/${label}-canvas.png`,Buffer.from(image,'base64'));
   }
  }
  result.trims=await page.evaluate(()=>__UNIT_CACHE_TRIMS__);
  assert(result.trims.some(t=>t.evicted.length),'Cross-race test did not exercise cache retirement');
  for(const trim of result.trims)if(trim.evicted.length)assert(trim.after<=48*1024**2,'Idle cache did not reach low water');
  const [a,b,c]=result.cycles;assert(c.gl.estimatedBytes<=b.gl.estimatedBytes*1.04,'Identical third entry keeps accumulating textures');assert(c.models.length<=b.models.length+4,'Identical third entry keeps accumulating models');
  for(const key of ['marine','marine.death','tank','tank.siege','tank.morph'])assert(result.cycles.at(-1).models.includes(key),'Rebuilt roster missing '+key);
  result.passed=true;
 }catch(error){result.error=String(error);throw error;}finally{await fs.writeFile(output+'/retained-unit-assets.json',JSON.stringify(result,null,2));}
}
