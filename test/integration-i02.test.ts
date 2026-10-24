import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,equip,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {beginSpecialStage,markSpecialReady,finishSpecialStage,specialAfterStep,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {collectSpecialRewards} from '../src/simulation/special-stages/rewards';
import {tickEquipmentLife} from '../src/simulation/starship/lifecycle';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import {buyUnique,castTactical} from '../src/simulation/combat/unique-support';
import {eliteCombat} from '../src/simulation/combat/terran-elite-runtime';
import {registerEquipmentRoster} from '../src/simulation/starship/lifecycle';
import {registerZergRevival,tickZergRevival} from '../src/simulation/combat/zerg-hero-revival';

function fixture(module?:string){
 const account=newEquipmentAccount();
 if(module){const item=grantEquipment(account,{template:module,slot:'control',race:'terran',polluted:EQUIPMENT_TEMPLATES[module].pollution==='required'},'i02:module',{kind:'warehouse'});assert.ok(item.ok);if(item.value.pollution==='uncleansed'){account.dust=100000;assert.ok(cleanseEquipment(account,item.value.id).ok);}assert.ok(equip(account,'terran',item.value.id,'control').ok);}
 const w=new World({seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:account});
 assert.ok(w.start());w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;w.time=20;w.tick=1200;return w;
}
function begin(w:World){assert.ok(beginSpecialStage(w,'resources','fixture'));assert.ok(markSpecialReady(w));}
function finish(w:World){assert.ok(finishSpecialStage(w,'timeout'));assert.equal(w.time,20);}

test('I02 entering a special battlefield does not refresh a cooling manual dash',()=>{
 const w=fixture();assert.ok(w.dash());const ready=w.dashReady;begin(w);
 assert.equal(w.dashReady,ready);assert.equal(w.dash(),false);
});
test('I02 special-field manual cooldowns carry their remaining time back exactly once',()=>{
 const w=fixture();begin(w);w.time=25;w.tick=1500;assert.ok(w.dash());assert.ok(w.castDetection());
 const remaining={dash:w.dashReady-w.time,scan:w.expedition.detectionReady-w.time};finish(w);
 assert.equal(w.dashReady-w.time,remaining.dash);assert.equal(w.expedition.detectionReady-w.time,remaining.scan);
 assert.equal(w.dash(),false);assert.equal(w.castDetection(),false);assert.equal(finishSpecialStage(w,'timeout'),false);
});
test('I02 a special-field tactical cast cannot be refreshed by returning to the original field',()=>{
 const w=fixture();assert.ok(buyUnique(w,'terran.overdrive'));begin(w);w.time=25;w.tick=1500;assert.ok(castTactical(w));
 const remaining=w.expedition.support.unique.ready-w.time;finish(w);
 assert.equal(w.expedition.support.unique.ready-w.time,remaining);assert.equal(castTactical(w),false);
});
test('I02 a phase recovery begun in a special field retains its living projections after return',()=>{
 const w=fixture('module.phase.5');begin(w);const actor=w.allies()[0];w.time=25;w.tick=1500;w.hit(actor,1e12,[],1,'zerg',0,1);
 const pending=w.starship.life.pending.get(actor.id)!;assert.equal(pending.source,'phase');assert.equal(pending.projections.length,2);const remaining=pending.until-w.time;finish(w);
 assert.ok(pending.projections.every(id=>(w.entities.get(id)?.hp??0)>0),'phase projections must remain real actors');
 assert.equal(w.starship.life.pending.get(actor.id)!.until-w.time,remaining);w.time+=remaining;tickEquipmentLife(w);
 assert.ok(w.entities.get(actor.id)!.hp>0);assert.equal(w.starship.life.pending.has(actor.id),false);
});
test('I02 carrier children killed in a special field cannot silently return alive',()=>{
 const w=fixture(),carrier=w.addUnit('carrier','terran',1,0);initializeCarrierSubsystem(w);
 const children=[...w.entities.values()].filter(u=>u.summonOwnerId===carrier.id);assert.ok(children.length>0);begin(w);
 const child=w.entities.get(children[0].id)!;assert.ok(child);w.hit(child,1e12,[],1,'zerg',0,1,undefined,true);assert.equal(child.hp,0);finish(w);
 assert.ok((w.entities.get(child.id)?.hp??0)<=0,'a lost interceptor is not resurrected by scene return');
});

test('I02 nested elite cooldowns and firing age retain their actual remaining time',()=>{
 const w=fixture();const u=w.allies()[0];u.eliteId='marine.1';w.refreshStats(u);begin(w);
 const live=w.entities.get(u.id)!,s=eliteCombat(live);w.time=30;w.tick=1800;s.ready=42;s.started=23;s.lastFire=27;s.lockAt=25;live.lastDamagedAt=28;live.lastSkillAt=26;
 finish(w);assert.equal(u.eliteCombat!.ready,32);assert.equal(u.eliteCombat!.started,13);assert.equal(u.eliteCombat!.lastFire,17);assert.equal(u.eliteCombat!.lockAt,15);assert.equal(u.lastDamagedAt,18);assert.equal(u.lastSkillAt,16);
});
test('I02 original field support packets remain frozen and never replay inside the challenge',()=>{
 const w=fixture(),u=w.allies()[0],target=w.addUnit('roach','zerg',12,10),s=w.expedition.support.unique;
 s.packets.push({id:w.nextId++,kind:'echo',from:{x:u.x,z:u.z},point:{x:target.x,z:target.z},at:21,start:20,damage:70,source:u.id,target:target.id});
 s.orbs.push({id:w.nextId++,point:{x:9,z:9},origin:{x:9,z:9},until:25,amount:40,target:u.id});w.expedition.support.burns.push({id:w.nextId++,source:u.id,target:target.id,damage:10,next:21,until:23});
 const original=structuredClone({packets:s.packets,orbs:s.orbs,burns:w.expedition.support.burns});begin(w);
 assert.equal(w.expedition.support.unique.packets.length,0);assert.equal(w.expedition.support.unique.orbs.length,0);assert.equal(w.expedition.support.burns.length,0);w.advance(1);finish(w);
 assert.deepEqual({packets:s.packets,orbs:s.orbs,burns:w.expedition.support.burns},original);assert.equal(w.expedition.support.unique,s);
});
test('I02 existing normal-field phase recovery and its actors remain frozen through another battlefield',()=>{
 const w=fixture('module.phase.5'),u=w.allies()[0];w.hit(u,1e12,[],1,'zerg',0,1);const life=w.starship.life,record=life.pending.get(u.id)!;assert.ok(record);
 const snapshots=structuredClone({record,actors:record.projections.map(id=>w.entities.get(id))});begin(w);assert.ok(!w.entities.has(u.id));assert.equal(w.starship.life.pending.size,0);w.advance(2);finish(w);
 assert.equal(w.starship.life,life);assert.deepEqual({record,actors:record.projections.map(id=>w.entities.get(id))},snapshots);w.time=record.until;tickEquipmentLife(w);assert.ok(w.entities.get(u.id)!.hp>0);
});
test('I02 native registered recovery produced in a special field completes once after return',()=>{
 const w=fixture();begin(w);const u=w.allies().find(u=>u.unitType==='marine')!,source=w.allies().find(u=>u.unitType==='marauder')!;Object.assign(source,{x:u.x+1,z:u.z});
 w.time=25;w.tick=1500;assert.ok(registerZergRevival(w,source,w.nextId++,5));w.hit(u,1e12,[],1,'zerg',0,1);const r=w.zergHeroes.revivals[0];assert.ok(r.seats.some(s=>s.deadAt!==null));
 const remaining=r.until-w.time;finish(w);assert.equal(r.until-w.time,remaining);w.time=21;tickZergRevival(w);tickEquipmentLife(w);assert.ok(w.entities.get(u.id)!.hp>0);const charges=r.charges;tickZergRevival(w);assert.equal(r.charges,charges);assert.equal([...w.entities.values()].filter(v=>v.id===u.id).length,1);
});
test('I02 a crossing carrier evacuates its current complement and returns each child once',()=>{
 const w=fixture(),carrier=w.addUnit('carrier','terran',1,0);initializeCarrierSubsystem(w);assert.ok(beginSpecialStage(w,'crossing','fixture'));assert.ok(markSpecialReady(w));const a=w.specialStages.active!;
 const children=[...w.entities.values()].filter(u=>u.summonOwnerId===carrier.id);assert.ok(children.length>0);children[0].hp*=.4;const wound=children[0].hp;
 for(const id of a.participants)w.entities.get(id)!.z=-48;specialAfterStep(w);assert.equal(a.phase,'loot');assert.ok(children.every(u=>a.evacuated.has(u.id)));assert.ok(collectSpecialRewards(w));assert.ok(quitSpecialStage(w));
 assert.equal(w.entities.get(children[0].id)!.hp,wound);assert.equal([...w.entities.values()].filter(u=>u.hp>0&&u.summonOwnerId===carrier.id).length,children.length);
});
test('I02 dodge never spends or advances the parked squad command cooldowns',()=>{
 const w=fixture();assert.ok(w.dash());assert.ok(w.castDetection());const before={dash:w.dashReady,dashUntil:w.dashUntil,scan:w.expedition.detectionReady};
 assert.ok(beginSpecialStage(w,'dodge','fixture'));assert.ok(markSpecialReady(w));w.advance(2);assert.ok(finishSpecialStage(w,'success'));assert.deepEqual({dash:w.dashReady,dashUntil:w.dashUntil,scan:w.expedition.detectionReady},before);
});

test('I02 a failed challenge cannot settle a run while the original field still owns a lawful recovery',()=>{
 const w=fixture('module.phase.5'),u=w.allies()[0];w.hit(u,1e12,[],1,'zerg',0,1);const pending=w.starship.life.pending.get(u.id)!;assert.ok(pending);
 begin(w);
 for(const actor of [...w.allies()])if(!actor.summonKind)w.hit(actor,1e12,[],1,'zerg',0,1);
 for(const id of [...w.starship.projections.keys()]){const actor=w.entities.get(id);if(actor)w.hit(actor,1e12,[],1,'zerg',0,1,undefined,true);}
 specialAfterStep(w);assert.equal(w.specialStages.active,null);assert.equal(w.specialStages.last?.result,'failed');
 assert.equal(w.phase,'battle');assert.ok(w.starship.account.run);assert.ok(w.starship.life.pending.has(u.id));
 w.time=pending.until;tickEquipmentLife(w);assert.ok(w.entities.get(u.id)!.hp>0);
});
