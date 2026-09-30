import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {tickWeaponFlights,weaponFlightSpeed} from '../src/simulation/combat/weapon-flight';
import {settleWeaponFlights} from './helpers/weapon-flight';
import {campaignTerrain,chooseCampaignMap,MAP_STAGE_AREAS,makeCampaignDefinition} from '../src/data/campaign-map';
import {HERO_SPECTACLE} from '../src/data/hero-spectacle';
import {ALL_HERO_IDS} from '../src/data/heroes';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
const world=()=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};
test('weapon flight preserves launch damage, reads impact armor, and survives source removal and save',()=>{
 const w=world(),u=w.addUnit('marauder','terran',0,0),target=w.addUnit('roach','zerg',5,0);target.hp=target.maxHp=10000;target.armor=0;
 const before=target.hp;w.hash.rebuild(w.entities.values());w.fire(u,target);assert.equal(target.hp,before);assert.equal(w.weaponFlights.length,1);
 const frozen=w.weaponFlights[0].damage;u.weaponDamage=99999;target.armor=2;w.entities.delete(u.id);const copy=world();copy.restoreRun(w.captureRun());assert.equal(copy.visualEvents.length,0);
 settleWeaponFlights(copy);assert.ok(copy.entities.get(target.id)!.hp<before);assert.ok(before-copy.entities.get(target.id)!.hp<100);assert.equal(copy.weaponFlights.length,0);assert.ok(frozen>0);
 const health=copy.entities.get(target.id)!.hp;tickWeaponFlights(copy,1/60);assert.equal(copy.entities.get(target.id)!.hp,health);
});
test('unseen target freezes the last visible destination and cannot be reacquired by a flying round',()=>{
 const w=world(),u=w.addUnit('stalker','terran',0,0),target=w.addUnit('roach','zerg',5,0);target.hp=target.maxHp=10000;w.hash.rebuild(w.entities.values());w.fire(u,target);
 target.cloaked=true;target.x=20;w.time+=1/60;tickWeaponFlights(w,1/60);assert.equal(w.weaponFlights[0].lastSeen.x,5);assert.equal(w.weaponFlights[0].lost,true);target.cloaked=false;settleWeaponFlights(w);assert.equal(target.hp,10000);
});
test('paused simulation does not advance missiles',()=>{
 const w=world(),u=w.addUnit('marauder','terran',0,0),target=w.addUnit('roach','zerg',5,0);w.fire(u,target);const point={...w.weaponFlights[0].point};w.paused=true;w.step();assert.deepEqual(w.weaponFlights[0].point,point);
});
test('impact uses current armor, not the source stats changed after launch',()=>{
 const run=(armor:number)=>{const w=world(),u=w.addUnit('marauder','terran',0,0),t=w.addUnit('roach','zerg',5,0);t.hp=t.maxHp=10000;t.armor=0;w.fire(u,t);const shot=w.weaponFlights[0];u.weaponDamage=9000;t.armor=armor;settleWeaponFlights(w);return {damage:10000-t.hp,shot};};
 const unarmored=run(0),armored=run(4);assert.ok(unarmored.damage<100);assert.equal(unarmored.damage-armored.damage,4*armored.shot.hits);
});
test('a real new-map blocker prevents a ground projectile arriving through it',()=>{
 const terrain=campaignTerrain({version:1,seed:1041,theme:'industrial',layout:0});terrain.setStage(18);const b=terrain.definition.placements[0],x=b.position[0]-80,z=80-b.position[1];
 const w=world();const u=w.addUnit('marauder','terran',x-5,z),t=w.addUnit('roach','zerg',x-4,z);t.hp=t.maxHp=10000;w.hash.rebuild(w.entities.values());w.fire(u,t);assert.equal(w.weaponFlights.length,1);w.terrain=terrain;t.x=x+5;w.hash.rebuild(w.entities.values());settleWeaponFlights(w);assert.equal(t.hp,10000);
});
test('line skill windup cannot hit a touching enemy before the actual release',()=>{
 const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.acquireHero('kerrigan');const u=w.heroEntity('kerrigan')!;u.x=u.z=0;const t=w.addUnit('roach','zerg',.25,0);t.hp=t.maxHp=10000;w.hash.rebuild(w.entities.values());assert.equal(w.castHero('kerrigan'),true);
 w.time=.29;resolveExpeditionHeroCasts(w);assert.equal(t.hp,10000);w.time=.31;resolveExpeditionHeroCasts(w);assert.ok(t.hp<10000);
});
test('pinned projectile timing excludes firearms, true beams, carrier mothers and high-impact Thor',()=>{
 const w=world();for(const [family,speed] of [['marauder',28],['hydralisk',56],['banshee',70],['stalker',26.25],['marine',0],['reaper',0],['void_ray',0],['carrier',0]] as const){const u=w.addUnit(family,'terran',0,0);assert.equal(weaponFlightSpeed(u),speed);}
});
test('nine sparse maps have exact net areas, level terrain and permanently open center/corridors',()=>{
 for(const theme of ['industrial','mar-sara','char'] as const)for(const layout of [0,1,2] as const){const d=makeCampaignDefinition({version:1,seed:1041,theme,layout});
  assert.equal(d.walkWidth,320);assert.ok(d.heights.every(h=>h===0));assert.ok(d.walk.filter(v=>!v).length/d.walk.length<.05);
  for(let stage=1;stage<=18;stage++){const area=d.walk.reduce((n,v,i)=>n+(v&&d.opening[i]>0&&d.opening[i]<=stage?.25:0),0);assert.equal(area,MAP_STAGE_AREAS[stage-1]);}
  // Every open walk cell must connect to the central spawn, including new edge cells.
  for(let stage=1;stage<=18;stage++){const seen=new Uint8Array(d.walk.length),queue=[160*320+160];seen[queue[0]]=1;for(let q=0;q<queue.length;q++){const at=queue[q];for(const to of [at-1,at+1,at-320,at+320])if(to>=0&&to<seen.length&&!seen[to]&&d.walk[to]&&d.opening[to]>0&&d.opening[to]<=stage){seen[to]=1;queue.push(to);}}assert.equal(queue.length,Math.round(MAP_STAGE_AREAS[stage-1]*4),`${theme}/${layout} stage${stage} connection`);}
  const terrain=campaignTerrain({version:1,seed:1041,theme,layout});terrain.setStage(18);for(let i=-51;i<=51;i+=3){assert.ok(terrain.canOccupy({x:i,z:0},3.9));assert.ok(terrain.canOccupy({x:0,z:i},3.9));}
 }
});
test('preparing another snapshot of the same map cannot change the live chapter boundary',()=>{
 const recipe=chooseCampaignMap(123),live=campaignTerrain(recipe);live.setStage(1);const candidate=campaignTerrain(recipe);candidate.setStage(18);assert.notEqual(live,candidate);assert.equal(live.isOpen({x:40,z:0}),false);assert.equal(candidate.isOpen({x:40,z:0}),true);
});
test('campaign recipe survives load from a different map and combat randomness is independent',()=>{
 const recipe=chooseCampaignMap(777),a=new World({terrain:campaignTerrain(recipe),seed:777,waves:false}),b=new World({terrain:campaignTerrain(chooseCampaignMap(999)),waves:false});a.start();a.stage=10;a.terrain?.setStage?.(10);const saved=a.captureRun();b.restoreRun(saved);assert.equal(b.runConfig?.mapHash,a.runConfig?.mapHash);assert.deepEqual(b.campaignRecipe,recipe);assert.equal(b.paused,true);
 assert.notEqual(chooseCampaignMap(777,recipe.theme).theme,recipe.theme);assert.equal(new Set(ALL_HERO_IDS.map(id=>HERO_SPECTACLE[id].rhythm)).size,18);
});
