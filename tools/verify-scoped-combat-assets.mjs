/** Finite injected identities exercise real rules/rendering; not a campaign playthrough. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function verifyScopedCombatAssets(page,output){
 const result={};
 try{
  result.before=await page.evaluate(()=>Object.keys(__QUALITY_APP__.view.confirmedHeroes.report().attacks));assert.deepEqual(result.before,[]);
  await page.evaluate(()=>{const w=__QUALITY_APP__.world;w.paused=true;for(let i=0;i<3;i++)if(!w.acquireHero('raynor'))throw Error('fixture hero grant failed');const h=w.heroEntity('raynor');w.addUnit('ultralisk','zerg',h.x+3,h.z,1);});
  await page.evaluate(()=>__QUALITY_APP__.readiness.prepare('reinforcement'));
  await page.waitForFunction(()=>!__QUALITY_APP__.readiness.blocking,null,{timeout:300000});
  result.hero=await page.evaluate(async()=>{
   const a=__QUALITY_APP__,w=a.world,v=a.view,release=await a.readiness.background.enter();
   try{
    if(a.readiness.state.phase==='error')throw Error(a.readiness.state.error);w.paused=false;
    for(let i=0;i<6;i++)w.step();const cast=w.castHero('raynor');if(!cast)throw Error('fixture skill has no valid target');
    const frames=[],missing=[];for(let i=0;i<120;i++){const t=performance.now();w.step();v.render(1/60,1);frames.push(performance.now()-t);if(v.sourceCombatEffects.report().source.missing)missing.push(i);if(i%6===0)await new Promise(r=>requestAnimationFrame(r));}
    w.paused=true;v.render(0,1);v.renderScene();const preparedHeroes=Object.keys(v.confirmedHeroes.report().attacks),image=v.canvas.toDataURL('image/png').split(',')[1],saved=w.captureRun(),before=JSON.stringify(saved);await v.prepareSnapshotAssets(saved);if(JSON.stringify(w.captureRun())!==before)throw Error('asset preparation changed saved rules');
    return {cast,rank:w.heroes.get('raynor').rank,preparedHeroes,snapshotPreparedHeroes:Object.keys(v.confirmedHeroes.report().attacks),sourceMissingFrames:missing,frameMax:Math.max(...frames),errors:v.modelErrors,snapshotUnchanged:true,originalParserRetained:[...v.batches.values()].some(b=>'parser'in b.gltf||'scene'in b.gltf),image};
   }finally{release();}
  });
  await fs.writeFile(output+'/scoped-raynor-canvas.png',Buffer.from(result.hero.image,'base64'));delete result.hero.image;
  assert.deepEqual(result.hero.preparedHeroes,['raynor']);assert.deepEqual(result.hero.sourceMissingFrames,[]);assert.deepEqual(result.hero.errors,[]);assert.equal(result.hero.originalParserRetained,false);result.passed=true;
 }catch(error){result.error=String(error);throw error;}finally{await fs.writeFile(output+'/scoped-combat.json',JSON.stringify(result,null,2));}
}

/** Inject one valid module into an isolated test account; run its real tick/cast.
 * The fixture fixes the proc RNG/timer, not the resulting damage or FX. */
export async function verifyScopedEquipmentAssets(page,output){
 const {newEquipmentAccount,createEquipmentItem}=await import('../src/simulation/starship/inventory.ts');
 const item=createEquipmentItem(newEquipmentAccount(529),{template:'module.yamato.5',race:'terran',slot:'support'});assert(item.ok);
 const result={method:'isolated valid Yamato module; fixed proc RNG/timer, actual World.step and renderer'};
 try{
  await page.evaluate(item=>{const w=__QUALITY_APP__.world,a=w.starship.account;w.paused=true;a.items[item.id]=item;a.locations[item.id]={kind:'equipped'};a.equipped.terran.support=item.id;a.revision++;},item.value);
  await page.evaluate(()=>__QUALITY_APP__.readiness.prepare('reinforcement'));
  await page.waitForFunction(()=>!__QUALITY_APP__.readiness.blocking,null,{timeout:300000});
  result.runtime=await page.evaluate(async()=>{
   const a=__QUALITY_APP__,w=a.world,v=a.view,release=await a.readiness.background.enter();
   try{
    if(a.readiness.state.phase==='error')throw Error(a.readiness.state.error);
    const preparedHeroes=Object.keys(v.confirmedHeroes.report().attacks);if(!preparedHeroes.includes('yamato_battlecruiser'))throw Error('Equipment native hero kit not prepared');
    const ally=w.allies()[0],target=w.addUnit('ultralisk','zerg',ally.x+3,ally.z,1);target.hp=target.maxHp=1e8;w.hash.rebuild(w.entities.values());
    w.paused=false;w.step();const effect=w.starship.effects.find(e=>e.key==='yamato_support');if(!effect)throw Error('Module not active');
    const key=effect.source+':'+effect.key;w.starship.numbers.set(key+':elapsed',5);w.starship.account.rng=1;ally.attackTarget=target.id;
    const casts=new Set(),frames=[];let missing=0,image;
    for(let i=0;i<420;i++){const start=performance.now();w.step();for(const c of w.heroCasts)if(c.hero==='yamato_battlecruiser')casts.add(c.id);v.render(1/60,1);frames.push(performance.now()-start);missing=Math.max(missing,v.sourceCombatEffects.player.counts.missing);if(i===60){v.renderScene();image=v.canvas.toDataURL('image/png').split(',')[1];}if(i%6===0)await new Promise(r=>requestAnimationFrame(r));}
    w.paused=true;return {preparedHeroes,casts:casts.size,damage:target.maxHp-target.hp,missing,errors:v.modelErrors,permanentHeroes:w.heroes.size,frameMax:Math.max(...frames),image};
   }finally{release();}
  });
  await fs.writeFile(output+'/scoped-yamato-canvas.png',Buffer.from(result.runtime.image,'base64'));delete result.runtime.image;
  assert.equal(result.runtime.casts,3);assert(result.runtime.damage>0);assert.equal(result.runtime.missing,0);assert.deepEqual(result.runtime.errors,[]);assert.equal(result.runtime.permanentHeroes,0);result.passed=true;
 }catch(error){result.error=String(error);throw error;}finally{await fs.writeFile(output+'/scoped-equipment.json',JSON.stringify(result,null,2));}
}
