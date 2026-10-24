import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {registerEquipmentDrop} from '../src/simulation/starship/loot-presentation';
import {beginSpecialStage,markSpecialReady,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {medicalTargets} from '../src/simulation/combat/support-targets';
import {healExpedition} from '../src/simulation/combat/expedition-combat';
import {prepareLabCase} from '../src/diagnostics/fun-lab-cases';
import {lowDangerState} from '../src/render/effects/low-danger-state';

test('optimized medical selection admits neutral infected patients and excludes held bodies before purification',()=>{
 const w=new World({seed:529,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount()});prepareLabCase(w,'fun:infectedTerrans:heal');
 const healer=w.allies().find(u=>u.unitType==='medivac')!,patients=[...w.entities.values()].filter(u=>u.fun?.kind==='infectedTerrans');assert.ok(patients.length>=2);
 w.hasAttackLine=()=>true;for(const [i,u] of patients.entries()){u.x=healer.x+.5+i*.2;u.z=healer.z;u.hp=u.maxHp*.4;}
 const held=patients[0];held.heldBy=999;const target=patients[1];target.hp=target.maxHp*.1;
 assert.equal(medicalTargets(w,healer,8,1)[0],target);assert.ok(!medicalTargets(w,healer,8,8).includes(held));
 healer.energy=1e6;healer.healRate=target.maxHp;healExpedition(w,healer,1);
 assert.equal(target.fun?.mode,'friend');assert.equal(target.owner,'terran');assert.equal(held.fun?.mode,'passive');
});

test('special-field return preserves D03 ground lifetime and D04 planned Boss identity',()=>{
 const w=new World({seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});assert.ok(w.start());w.stage=3;w.prepareStage();assert.ok(w.expedition.firstBossLoot);w.stage=4;w.prepareStage();w.missions.enabled=false;w.encounters.enabled=false;w.pods=[];
 const a=w.starship.account,grant=grantEquipment(a,{template:'attribute.1',race:'terran',slot:'offense1'},'i01-normal-ground',{kind:'ground',run:a.run!.id,x:15,z:10});assert.ok(grant.ok);assert.ok(registerEquipmentDrop(w,grant.value));
 w.drop({x:20,z:10},[15,7]);const before=structuredClone({location:a.locations[grant.value.id],loot:w.starship.loot,pickups:w.pickups,plan:w.expedition.firstBossLoot,time:w.time,tick:w.tick});
 assert.ok(beginSpecialStage(w,'resources','fixture'));assert.equal(w.starship.account.items[grant.value.id],undefined);assert.ok(markSpecialReady(w));for(let i=0;i<60;i++)w.step();assert.ok(finishSpecialStage(w,'timeout'));
 assert.equal(w.starship.account,a);assert.equal(w.starship.loot.ground.get(grant.value.id)!.terrain,w.terrain);assert.deepEqual(structuredClone({location:a.locations[grant.value.id],loot:w.starship.loot,pickups:w.pickups,plan:w.expedition.firstBossLoot,time:w.time,tick:w.tick}),before);
 const next=()=>{w.endStage();for(let n=0;w.phase==='reward'&&n<4;n++)assert.ok(w.skipReward());assert.equal(w.phase,'battle');};
 next();assert.equal(w.stage,5);assert.ok(a.items[grant.value.id]);next();assert.equal(w.stage,6);assert.equal(a.items[grant.value.id],undefined);
});

test('persisted packet credit keeps low-detail danger allegiance across source removal and restore',()=>{
 const w=new World({seed:529});w.time=5;const source=w.addUnit('ravager','terran',0,0),packet={id:1,kind:'bile' as const,source:source.id,tier:'boss' as const,origin:{x:0,z:0},point:{x:3,z:4},points:[{x:3,z:4}],angle:0,at:6,damage:30,count:1,range:10,radius:1,level:1,percent:0,credit:{owner:'terran' as const,source:source.id}};
 w.enemySpecials.casts=[packet];const frozen=structuredClone(w.enemySpecials.snapshot());w.entities.delete(source.id);w.enemySpecials.restore(frozen);assert.equal(lowDangerState(w).length,0);
 w.enemySpecials.casts[0].credit!.owner='zerg';assert.ok(lowDangerState(w).length>0);assert.equal(w.enemySpecials.targetsPlayer(w.enemySpecials.casts[0]),true);
});
