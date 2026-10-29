import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment,equip,equipmentRandom} from '../src/simulation/starship/inventory';
import {equipmentBaseDropChance,equipmentDropPolicy,qualityWeightedPool,planTaskEquipment} from '../src/simulation/starship/drops';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {talentModifiers} from '../src/simulation/combat/expedition-combat';
import {newBuildingState,PROJECTS,setDirection,getOffers,getEvolutionOffers,purchase,nextPhase,nextWindow} from '../src/simulation/building/rules';
import {syncBuildingViews} from '../src/simulation/building/expedition';
import {supplyEligibility,supplyUnlocked} from '../src/simulation/progression/supply-cards';

// Uses the production inheritance sampler; no inheritance ID is written into an item.
function inherited(id:string,template='module.formation.4'){
 for(let seed=1;seed<10000;seed++){
  const slot=EQUIPMENT_TEMPLATES[template].slots[0],a=newEquipmentAccount(seed),r=grantEquipment(a,{template,race:'terran',slot,polluted:true},'i03:'+seed,{kind:'warehouse'});assert.ok(r.ok);
  if(!r.value.inherited.includes(id))continue;
  a.dust=10000;assert.ok(cleanseEquipment(a,r.value.id).ok);assert.ok(equip(a,'terran',r.value.id,slot).ok);
  const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:a});assert.ok(w.start());w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;
 }
 throw Error('No seeded inheritance witness: '+id);
}
test('I03 naturally rolled M03 inheritance affects the real aiming modifier without granting moving-fire chance',()=>{
 const w=inherited('M03'),u=w.allies()[0],m=talentModifiers(w,u);assert.equal(m.aimingSpeedMultiplier,2.5);assert.equal(m.movingFireChance??0,0);
 const enemy=w.addUnit('roach','zerg',u.x+3,u.z);w.hash.rebuild(w.entities.values());u.attackTarget=enemy.id;u.thinkAt=100;u.facing=u.attackFacing=0;u.weaponCooldown=0;u.nextShotAt=0;w.time=1;w.updateUnit(u,1/60);assert.ok(u.attackFacing>.3,'real aiming rotates faster with inherited multiplier');
});
function pickupModule(template?:string){const a=newEquipmentAccount(529);if(template){const r=grantEquipment(a,{template,race:'terran',slot:'gathering'},'i03:pickup',{kind:'warehouse'});assert.ok(r.ok);assert.ok(equip(a,'terran',r.value.id,'gathering').ok);}const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:a});assert.ok(w.start());w.pods=[];return w;}
test('I03 blue, purple and inherited pickup bonuses increase probabilistic natural drops by 15 percent relatively',()=>{
 const policy=equipmentDropPolicy({difficulty:'easy',stage:1,tier:'regular'});assert.equal(policy.baseChance,.0035);
 for(const w of [pickupModule('module.pickup.3'),pickupModule('module.pickup.4'),inherited('C06','module.workers.4')]){
  assert.ok(Math.abs(equipmentBaseDropChance(w,policy.baseChance)-.004025)<1e-12);assert.equal(equipmentBaseDropChance(w,0),0);assert.equal(equipmentBaseDropChance(w,1),1);
  const boss=equipmentDropPolicy({difficulty:'hell',stage:13,tier:'boss',endlessRound:7});assert.deepEqual(qualityWeightedPool(w,boss.guaranteed,true),boss.guaranteed);
 }
});
test('I03 an unchanged natural equipment RNG seed can cross the new rate while non-Boss cards remain disabled',()=>{
 let seed=1;for(;seed<100000;seed++){const r=equipmentRandom(newEquipmentAccount(seed));if(r>=.0035&&r<.004025)break;}assert.ok(seed<100000);
 for(const enabled of [false,true]){const w=pickupModule(enabled?'module.pickup.3':undefined);w.difficulty='easy';w.starship.account.rng=seed;const e=w.addUnit('roach','zerg',12,12,1,'regular');const before=Object.keys(w.starship.account.items).length;w.hit(e,1e12,[],1,'terran',0,1,w.allies()[0].id);assert.equal(Object.keys(w.starship.account.items).length-before,enabled?1:0);assert.equal(w.rewardDrops.length,0);const count=Object.keys(w.starship.account.items).length;w.hit(e,1e12,[],1,'terran');assert.equal(Object.keys(w.starship.account.items).length,count);}
});
test('I03 explicit task equipment stays one item with or without a natural drop-rate bonus',()=>{
 const context={difficulty:'normal' as const,stage:7,tier:'elite' as const},native=equipmentDropPolicy(context).baseChance;let seed=1;for(;seed<100000;seed++){const r=equipmentRandom(newEquipmentAccount(seed));if(r>=native&&r<native*1.15)break;}assert.ok(seed<100000);
 for(const enabled of [false,true]){const w=pickupModule(enabled?'module.pickup.3':undefined);w.starship.account.rng=seed;const plan=planTaskEquipment(w,context,'i03:task')!;assert.equal(plan.items.filter(i=>i.layer==='guaranteed').length,1);assert.equal(plan.items.length,1);}
});
test('I03 naturally rolled M04 inheritance affects the real moving-shot recovery without granting turn multiplier',()=>{
 const w=inherited('M04'),u=w.allies()[0],m=talentModifiers(w,u);assert.equal(m.movingFireChance,1);assert.equal(m.aimingSpeedMultiplier??1,1);
 const enemy=w.addUnit('roach','zerg',u.x,u.z+3);w.hash.rebuild(w.entities.values());u.attackTarget=enemy.id;u.pendingTarget=enemy.id;u.thinkAt=100;u.windup=1/60;u.facing=u.attackFacing=0;u.nextShotAt=0;u.weaponCooldown=1;w.time=1;w.marchDirection={x:0,z:1};const shots=w.stats.shots;w.updateUnit(u,1/60);assert.ok(w.stats.shots>shots);assert.equal(u.repositionUntil,w.time);
});
test('I03 one lawfully dual-evolved hatchery qualifies basic, ground and air supply cards together',()=>{
 const b=newBuildingState('zerg',{minerals:20000,gas:20000},529);
 const sequence=['unlock.queen','evolve-zerg.evolution','evolve-zerg.air','system.zerg.air','research.zerg.air.weapon','research.zerg.air.defense','system.zerg.evolution','research.zerg.evolution.weapon','research.zerg.evolution.defense'];
 for(const id of sequence){const d=PROJECTS.find(p=>p.id===id)!;assert.ok(setDirection(b,d.line!).ok);b.frozenTarget=id;const q=(d.kind==='evolution'?getEvolutionOffers(b):getOffers(b)).find(q=>q.projectId===id);assert.ok(q,id);assert.ok(purchase(b,q,q.targets[0]).ok);assert.ok(nextPhase(b).ok);assert.ok(nextPhase(b).ok);assert.ok(nextWindow(b).ok);}
 assert.equal(b.groups.length,1);assert.deepEqual(b.groups[0].directions,['ground','air']);
 const w=new World({race:'zerg',seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});assert.ok(w.start());w.stage=12;w.expedition.building=b;w.expedition.tech=b.tech;w.wallet=b.wallet;syncBuildingViews(w.expedition);
 for(const f of ['queen','hydralisk','mutalisk'] as const){assert.equal(supplyUnlocked(w,f,2),true,f);for(const mode of ['pod','direct'] as const){const e=supplyEligibility(w,f,3,mode);assert.equal(e.legal,true,JSON.stringify({f,mode,e}));}}
});
