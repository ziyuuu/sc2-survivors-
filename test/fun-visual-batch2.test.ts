import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {beginSpecialStage,markSpecialReady,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {stepDodge} from '../src/simulation/special-stages/dodge';
import {FUN_SHOP_IDS,DICE_BONUSES,funShopCatalogue,funShopDescription,funShopSummary,shopRarityWeights} from '../src/simulation/fun-shop/state';
import {expeditionRarityWeights} from '../src/simulation/progression/expedition-drafts';
import {taskEntries,randomMissionMarkup} from '../src/ui/hud/random-mission';
import {fieldInteractionEntries} from '../src/ui/hud/field-interactions';
import {spawnMission} from '../src/simulation/missions/runtime';
import {spawnFunEncounter} from '../src/simulation/encounters/expanded';
import {unitMaterialIdentity} from '../src/render/materials/elite-visual';
import {cardPresentation} from '../src/ui/intermission-skin/presentation';
import {catalogueCards} from '../src/ui/presentation/intermission';
function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});w.start();w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
for(const kind of ['resources','arena','crossing','dodge'] as const)test(kind+': loading and active challenge reject a player return without state changes',()=>{
 const w=fixture();assert.ok(beginSpecialStage(w,kind,'fixture'));const a=w.specialStages.active!;
 for(const ready of [false,true]){if(ready)assert.ok(markSpecialReady(w));assert.equal(randomMissionMarkup(w),'');const before=w.snapshotData(),clock=a.clock,entities=w.entities;assert.equal(quitSpecialStage(w),false);assert.equal(w.specialStages.active,a);assert.equal(w.entities,entities);assert.equal(a.clock,clock);assert.deepEqual(w.snapshotData(),before);}
});
test('every dodge phrase starts above the arena and crosses downward through the full challenge',()=>{
 const w=fixture();beginSpecialStage(w,'dodge','fixture');markSpecialReady(w);const a=w.specialStages.active!,patterns=new Set<string>(),seen=new Set<number>();
 // Isolate emission from collisions while retaining all real fixed steps and movement.
 a.graceUntil=Infinity;
 let result='';for(let tick=0;tick<3600;tick++){
  stepDodge(w,r=>{result=r;});if(a.cue){assert.equal(a.cue.axis,'z');assert.equal(a.cue.side,-1);patterns.add(a.cue.pattern);}
  for(const b of a.barrage)if(!seen.has(b.id)){seen.add(b.id);assert.ok(b.z< -19.9);assert.ok(b.vz>0);assert.ok(b.vz>2);}
 }
 assert.deepEqual([...patterns].sort(),['aim','cross','fan','ribbon','squeeze']);assert.ok(seen.size>60);assert.equal(result,'success');assert.equal(a.clock,3600);assert.equal(a.participants.length,4);
});
test('nearby portals have no manual button after the approved proximity-entry change',()=>{
 const w=fixture();w.specialStages.portal={kind:'resources',point:{x:w.anchor.x+2,z:w.anchor.z},until:w.time+30};
 assert.deepEqual(fieldInteractionEntries(w),[]);w.paused=true;assert.deepEqual(fieldInteractionEntries(w),[]);w.paused=false;w.anchor.x+=10;assert.deepEqual(fieldInteractionEntries(w),[]);w.anchor.x-=10;w.specialStages.portal.until=w.time;assert.deepEqual(fieldInteractionEntries(w),[]);
});
test('white pack uses native auto-targeting without a redundant contextual attack button',()=>{
 const w=fixture();w.stage=8;assert.ok(spawnFunEncounter(w,'whitePack',{x:12,z:12}));const m=w.encounters.expanded.short!;
 assert.equal(fieldInteractionEntries(w).find(e=>e.kind==='whitePack'),undefined);const target=w.entities.get(m.actors[0])!;assert.equal(w.targetAllowed(w.allies()[0],target),true);const before=w.snapshotData(),entries=taskEntries(w),markup=randomMissionMarkup(w);assert.deepEqual(w.snapshotData(),before);assert.deepEqual(entries,[]);assert.equal(markup,'');assert.doesNotMatch(markup,/<button|待入场|\d+%|倒计时/);m.attackRequested=true;assert.deepEqual(fieldInteractionEntries(w),[]);
});
test('infection progress changes model presentation without mutating the simulation or adding tracker progress',()=>{
 const w=fixture();w.stage=8;w.addUnit('medivac','terran',0,0);assert.ok(spawnFunEncounter(w,'infectedTerrans',{x:12,z:12}));const u=w.entities.get(w.encounters.expanded.short!.actors[0])!;
 const initial=unitMaterialIdentity(u,0);u.fun!.healed=u.maxHp*.15;const halfway=unitMaterialIdentity(u,0);assert.notDeepEqual(initial,halfway);u.fun!.mode='friend';const before=structuredClone(u),friend=unitMaterialIdentity(u,0);assert.notDeepEqual(friend,halfway);assert.deepEqual(u,before);assert.doesNotMatch(randomMissionMarkup(w),/净化|\d+%/);
});
test('all shop tiers populate the existing distinct summary and detail fields',()=>{
 const w=fixture(),cards=catalogueCards(w).filter(c=>c.group==='funShop'&&c.race==='terran');assert.equal(cards.length,funShopCatalogue().length);
 for(const c of cards){const p=cardPresentation(w,c);assert.notEqual(p.simple,p.detail,c.id);assert.ok(p.simple.length<=32,c.id);assert.doesNotMatch(p.simple+p.detail,/tavern|dice/.test(c.id)?/归一|原生判定|队列|事务/:/权重|归一|原生判定|队列|事务/);if(c.id.includes('tavern')){assert.match(p.detail,/权重/);assert.doesNotMatch(p.detail,/每次尝试|间隔30秒/);}}
 for(const id of FUN_SHOP_IDS)assert.ok(funShopSummary(id,1));assert.match(funShopSummary('pandora',1),/后续敌军更强/);assert.match(funShopDescription('pandora',1),/25%.*15%/);
});
for(let level=1;level<=5;level++)test('dice '+level+': displays exact weight increments and explains the changing legal pool',()=>{
 const copy=funShopDescription('dice',level),[purple,orange]=DICE_BONUSES[level];assert.ok(copy.includes('紫色增加'+purple+'、橙色增加'+orange));for(const stage of [1,6,12]){const base=expeditionRarityWeights(stage),weights=shopRarityWeights(base,level);assert.equal(weights[3]-base[3],purple);assert.equal(weights[4]-base[4],orange);}assert.doesNotMatch(copy,/天赋|保底|\d+(?:\.\d+)?%/);assert.match(copy,/装备.*免费刷新/);assert.match(copy,/实际概率随可售商品变化/);assert.match(copy,/每组最多一张/);
});

test('only a real mission keeps its name and one objective while concurrent encounters stay absent',()=>{
 const w=fixture();w.stage=8;assert.ok(spawnMission(w,'intel'));assert.ok(spawnFunEncounter(w,'whitePack',{x:12,z:12}));const entries=taskEntries(w);assert.equal(entries.length,1);assert.equal(entries[0].id,w.missions.active!.id);assert.match(entries[0].objective,/情报/);assert.doesNotMatch(randomMissionMarkup(w),/白色虫群|惊动/);
});
