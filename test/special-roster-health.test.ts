import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Entity} from '../src/simulation/types';
import type {Race} from '../src/data/races';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,equip,cleanseEquipment,collectEquipment} from '../src/simulation/starship/inventory';
import {beginSpecialStage,markSpecialReady,finishSpecialStage,specialAfterStep,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import type {SpecialStageKind} from '../src/simulation/special-stages/state';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import {CROSSING_FINISH} from '../src/simulation/special-stages/crossing';
import {createPair,tickBroods} from '../src/simulation/zerg-brood';

const kinds=['resources','arena','crossing'] as const;
const close=(a:number,b:number,label='')=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const pools=(u:Entity)=>({hp:u.hp,maxHp:u.maxHp,shield:u.shield??0,maxShield:u.maxShield??0});
function equalPools(u:Entity,b:ReturnType<typeof pools>){for(const key of ['hp','maxHp','shield','maxShield'] as const)close(u[key]??0,b[key],`${u.id} ${key}`);}
function fixture(race:Race='terran',gear=true,ark=false){
 const account=newEquipmentAccount(529);
 if(gear){const g=grantEquipment(account,{template:'attribute.3',race,slot:'defense1'},'health-fixture',{kind:'warehouse'});assert.ok(g.ok);g.value.allocation=2;assert.ok(equip(account,race,g.value.id,'defense1').ok);}
 if(ark){const g=grantEquipment(account,{template:'module.ark.5',race,slot:'support',polluted:true},'ark-fixture',{kind:'warehouse'});assert.ok(g.ok);account.dust=1e6;assert.ok(cleanseEquipment(account,g.value.id).ok);assert.ok(equip(account,race,g.value.id,'support').ok);}
 const w=new World({race,difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:race==='terran'?['marine']:race==='protoss'?['stalker']:['zergling'],equipmentAccount:account});
 assert.ok(w.start());w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;
}
function reportedSquad(gear=true,wounded=true){const w=fixture('terran',gear);for(let rank=2;rank<=5;rank++)w.addUnit('marine','terran',rank*2,0,rank);w.addUnit('ultralisk','terran',0,3);for(const u of w.allies())u.hp*=wounded?(u.unitType==='marine'&&u.rank<5?.2:.9):1;return w;}
function enter(w:World,kind:SpecialStageKind){assert.ok(beginSpecialStage(w,kind,'fixture'));assert.ok(markSpecialReady(w));return w.specialStages.active!;}

for(const kind of kinds)for(const [gear,wounded] of [[true,true],[true,false],[false,true]] as const)test(`${kind}: all five marines and the ultralisk keep their actual health through entry, return and refresh (gear=${gear}, wounded=${wounded})`,()=>{
 const w=reportedSquad(gear,wounded),original=w.allies(),before=new Map(original.map(u=>[u.id,pools(u)])),entities=w.entities;
 assert.equal(original.length,6);enter(w,kind);
 for(const u of original){const clone=w.entities.get(u.id)!;assert.notEqual(clone,u);equalPools(clone,before.get(u.id)!);}
 assert.ok(finishSpecialStage(w,'timeout'));assert.equal(w.entities,entities);
 for(const u of original){assert.equal(w.entities.get(u.id),u);equalPools(u,before.get(u.id)!);for(let n=0;n<3;n++)w.refreshStats(u);equalPools(u,before.get(u.id)!);}
 assert.equal(w.allies().length,6);
});

for(const kind of kinds)test(`${kind}: real challenge wounds and deaths return without healing or resurrection`,()=>{
 const w=reportedSquad(),original=w.allies(),survivor=original[1],dead=original[0];enter(w,kind);
 const child=w.entities.get(survivor.id)!;w.hit(child,5,[],1,'zerg',0,1,undefined,true);const wounded=pools(child);assert.ok(child.hp>0);
 w.hit(w.entities.get(dead.id)!,1e7,[],1,'zerg',0,1,undefined,true);assert.equal(w.entities.get(dead.id)!.hp,0);
 assert.ok(finishSpecialStage(w,'timeout'));equalPools(survivor,wounded);assert.equal(dead.hp,0);
 for(const u of original)w.refreshStats(u);equalPools(survivor,wounded);assert.equal(dead.hp,0);assert.equal(w.allies().length,5);
});

for(const kind of kinds)test(`${kind}: wounded ordinary, elite and hero shield pools survive repeated visits and saved restoration`,()=>{
 const w=fixture('protoss'),elite=w.addUnit('stalker','terran',2,0,3);elite.eliteId='stalker.1';assert.ok(w.acquireHero('artanis'));
 for(const u of w.allies())w.refreshStats(u,true);for(const u of w.allies()){u.hp*=.23;u.shield=(u.maxShield??0)*.37;}
 const original=w.allies(),before=new Map(original.map(u=>[u.id,pools(u)]));
 for(const stage of [4,7,10]){w.stage=stage;enter(w,kind);for(const u of w.allies())equalPools(u,before.get(u.id)!);finishSpecialStage(w,'timeout');for(const u of original){w.refreshStats(u);equalPools(u,before.get(u.id)!);}}
 const restored=new World({waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:structuredClone(w.starship.account)});restored.restoreRun(w.captureRun());
 for(const u of original)equalPools(restored.entities.get(u.id)!,before.get(u.id)!);
});

test('crossing evacuated wounded bodies keep their native baseline when restored to the normal field',()=>{
 const w=reportedSquad(),original=w.allies(),before=new Map(original.map(u=>[u.id,pools(u)])),a=enter(w,'crossing');
 for(const id of a.participants)w.entities.get(id)!.z=CROSSING_FINISH-1;specialAfterStep(w);assert.equal(a.evacuated.size,6);
 assert.equal(a.phase,'loot');for(const id of a.rewardIds)assert.ok(collectEquipment(w.starship.account,id).ok);assert.ok(quitSpecialStage(w));for(const u of original){w.refreshStats(u);equalPools(u,before.get(u.id)!);}
});

test('carrier children retain their damaged pools and real losses across the scene boundary',()=>{
 const w=fixture('protoss'),carrier=w.addUnit('carrier','terran',4,0);initializeCarrierSubsystem(w);
 const children=[...w.entities.values()].filter(u=>u.summonOwnerId===carrier.id);assert.ok(children.length>1);
 for(const u of children){u.hp*=.2;u.shield=(u.maxShield??0)*.3;}
 const before=new Map(children.map(u=>[u.id,pools(u)]));enter(w,'resources');for(const u of children)equalPools(w.entities.get(u.id)!,before.get(u.id)!);
 const dead=children[0];w.hit(w.entities.get(dead.id)!,1e7,[],1,'zerg',0,1,undefined,true);
 // The surviving children share their mother's equipment pool after a loss.
 // That legitimate pool change must preserve wounds, then cross scenes intact.
 for(const u of children.slice(1)){const child=w.entities.get(u.id)!;w.refreshStats(child);close(child.hp/child.maxHp,.2);close(child.shield!/child.maxShield!,.3);before.set(u.id,pools(child));}
 finishSpecialStage(w,'timeout');assert.equal(dead.hp,0);for(const u of children.slice(1)){w.refreshStats(u);equalPools(u,before.get(u.id)!);}
});

test('permanent Ark keeps its fixed native body and wounded fraction through entry and return',()=>{
 const w=fixture('protoss',true,true),ark=w.allies().find(u=>w.starship.advancedBodies.get(u.id)?.kind==='ark')!;assert.ok(ark);ark.hp*=.2;ark.shield=(ark.maxShield??0)*.3;const before=pools(ark);
 enter(w,'resources');equalPools(w.entities.get(ark.id)!,before);finishSpecialStage(w,'timeout');for(let i=0;i<3;i++)w.refreshStats(ark);equalPools(ark,before);
});

test('dodge preserves parked wounds and native baseline while applying its earned rank changes',()=>{
 const w=reportedSquad(),original=w.allies(),before=new Map(original.map(u=>[u.id,{hp:u.hp/u.maxHp,rank:u.rank}])),a=enter(w,'dodge');
 assert.equal(a.participants.length,4);finishSpecialStage(w,'success');
 for(const u of original){w.refreshStats(u);close(u.hp/u.maxHp,before.get(u.id)!.hp);assert.equal(u.rank,a.participants.includes(u.id)?Math.min(5,before.get(u.id)!.rank+2):before.get(u.id)!.rank);}
});

test('a twin regrown in a challenge carries its new native baseline back with its actual wounds',()=>{
 const w=fixture('zerg');w.entities.clear();w.expedition.zerglingPairs=[];createPair(w,{x:0,z:0},2);
 const original=w.allies(),ids=new Set(original.map(u=>u.id));enter(w,'resources');w.hit(w.entities.get(original[0].id)!,1e7,[],1,'zerg',0,1,undefined,true);
 const pair=w.expedition.zerglingPairs[0];assert.ok(pair.regrowAt!==null);w.tick=pair.regrowAt!;tickBroods(w);
 const newborn=w.allies().find(u=>!ids.has(u.id))!;assert.ok(newborn);newborn.hp*=.2;const before=pools(newborn);
 finishSpecialStage(w,'timeout');const returned=w.entities.get(newborn.id)!;w.refreshStats(returned);equalPools(returned,before);assert.equal(w.entities.get(original[0].id)!.hp,0);
});
