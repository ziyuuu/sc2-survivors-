import {campaignTerrain,MAP_THEMES,type CampaignTheme} from '../src/data/campaign-map';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRunData} from '../src/simulation/persistence/run-fields';
import {RunState} from '../src/simulation/run-state';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {equipmentDropPolicy,planOrdinaryEncounterEquipment} from '../src/simulation/starship/drops';
import {spawnEncounter,tickEncounters,tickEncounterUnit,flushEncounterRewards,cancelEncounters,encounterPointLegal} from '../src/simulation/encounters/runtime';
import {validateEncounterState,type EncounterKind} from '../src/simulation/encounters/state';
function world(difficulty:'easy'|'normal'|'hard'|'hell'='normal',stage=7){
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529),difficulty});
 w.start();w.stage=stage;w.prepareStage();w.encounters.enabled=false;return w;
}
function tick(w:World,n=1){for(let i=0;i<n;i++){w.tick++;w.time=w.tick/60;tickEncounters(w);}}
function spawn(w:World,k:EncounterKind){assert.equal(spawnEncounter(w,k),true);tick(w,120);const m=w.encounters.active!;assert.equal(m.phase,'offered');return {m,u:w.entities.get(m.subject!)!};}
const gear=(w:World)=>Object.values(w.starship.account.items);
test('golden ten nodes guarantee 16 ordinary items and each node pays once',()=>{
 const w=world(),{m,u}=spawn(w,'golden'),total=u.maxHp;
 for(let n=1;n<=9;n++){w.hit(u,total*.1,[],1,'terran',0,1);assert.equal(m.threshold,n);assert.equal(gear(w).length,n+(n>=5?1:0));}
 w.hit(u,total,[],1,'terran',0,1);assert.equal(gear(w).length,16);
 const max=Math.max(...equipmentDropPolicy({difficulty:'normal',stage:7,tier:'regular'}).base.map(r=>r.quality));
 assert.equal(m.plans[9][0].items.at(-1)!.item.quality,max);
 assert.ok(gear(w).every(e=>e.quality<=max));const rng=w.starship.account.rng;
 w.hit(u,total,[],1,'terran',0,1);flushEncounterRewards(w);assert.equal(gear(w).length,16);assert.equal(w.starship.account.rng,rng);assert.equal(w.pickups.length,0);assert.equal(w.rewardDrops.length,0);
 tick(w);assert.equal(w.encounters.active,null);assert.equal(spawnEncounter(w,'golden'),false);
});
test('golden one-shot supplements all nodes; healed thresholds never pay twice',()=>{
 const a=world(),one=spawn(a,'golden');a.hit(one.u,1e9,[],1,'terran',0,1);assert.equal(gear(a).length,16);
 const w=world(),{m,u}=spawn(w,'golden');w.hit(u,u.maxHp*.51,[],1,'terran',0,1);assert.equal(gear(w).length,6);u.hp=u.maxHp;w.hit(u,u.maxHp*.51,[],1,'terran',0,1);assert.equal(gear(w).length,6);assert.equal(m.threshold,5);
});
for(const difficulty of ['easy','normal','hard','hell'] as const)for(const stage of [4,9,17])test(`${difficulty} stage ${stage} highest guarantee never borrows elite or Boss pools`,()=>{
 const w=world(difficulty,stage),policy=equipmentDropPolicy({difficulty,stage,tier:'regular'}),max=Math.max(...policy.base.filter(p=>p.weight>0).map(p=>p.quality));
 const p=planOrdinaryEncounterEquipment(w,{difficulty,stage,tier:'boss',endlessRound:99},'ordinary-test',6,true)!;
 assert.equal(p.items.length,6);assert.equal(p.items.at(-1)!.item.quality,max);assert.ok(p.items.every(i=>policy.base.some(row=>row.weight>0&&row.quality===i.item.quality)));assert.equal(p.context.tier,'regular');assert.equal(p.context.endlessRound,undefined);
 assert.equal(gear(w).length,0);
});
test('golden countdown starts on first damage, pause freezes, escape preserves earlier ground loot',()=>{
 const w=world(),{m,u}=spawn(w,'golden');tick(w,200);assert.equal(m.age,0);
 w.hit(u,u.maxHp*.5,[],1,'terran',0,1);const ids=gear(w).map(i=>i.id);assert.equal(ids.length,6);
 w.paused=true;const before=structuredClone(w.encounters);w.advance(3);assert.deepEqual(w.encounters,before);w.paused=false;
 tick(w,1199);assert.ok(w.encounters.active);tick(w);assert.equal(w.encounters.active,null);assert.equal(w.entities.has(u.id),false);assert.deepEqual(gear(w).map(i=>i.id),ids);
});
test('giant preserves damage percentage, scales collision and pays only its final tier',()=>{
 const w=world(),{m,u}=spawn(w,'giant');w.hit(u,u.maxHp*.25,[],1,'terran',0,1);const base=u.encounter!.base!;
 tick(w,720);assert.equal(m.tier,1);assert.ok(Math.abs(u.hp/u.maxHp-.75)<1e-8);assert.equal(u.unitRadius,base.unitRadius*1.6);assert.equal(gear(w).length,0);
 tick(w,1440);assert.equal(m.tier,3);assert.equal(u.maxHp,Math.ceil(base.maxHp*16));w.hit(u,1e9,[],1,'terran',0,1);
 assert.equal(gear(w).length,m.plans[3].reduce((sum,p)=>sum+p.items.length,0));assert.equal(w.pickups.length,0);
});
test('giant growth waits for physical space, and death beats same-step growth',()=>{
 const w=world(),{m,u}=spawn(w,'giant');m.phase='active';m.growth=719;
 const blocker=w.addUnit('roach','zerg',u.x+u.unitRadius+1,u.z);blocker.unitRadius=2;
 tick(w);assert.equal(m.tier,0);assert.equal(m.growthBlocked,true);blocker.hp=0;tick(w,60);assert.equal(m.tier,1);
 m.growth=719;w.hit(u,1e9,[],1,'terran',0,1);tick(w);assert.equal(w.encounters.active,null);assert.equal(m.tier,1);assert.equal(gear(w).length,m.plans[1].reduce((s,p)=>s+p.items.length,0));
});
test('gentle rescue has no item reward, cancels reinforcements, keeps injuries, and expires after 90 combat seconds',()=>{
 const w=world(),{m,u}=spawn(w,'gentle');const hero=w.allies().find(a=>!a.temporary)!;
 const ordinary=w.addUnit('zergling','zerg',u.x+4,u.z),start=u.hp;
 w.hit(u,1e6,[],1,'terran',0,1,hero.id);w.hit(u,1e6,[],1,'zerg',0,1,ordinary.id);assert.equal(u.hp,start);
 assert.equal(w.targetAllowed(ordinary,u),false);
 w.hit(w.entities.get(m.enemies[0])!,1,[],1,'terran',0,1,hero.id);assert.equal(m.phase,'active');
 w.hit(u,1,[],1,'zerg',0,1,m.enemies[1]);assert.equal(u.hp,start-1);
 for(const id of m.enemies){const enemy=w.entities.get(id)!;w.hit(enemy,1e9,[],1,'terran',0,1,hero.id);}
 w.anchor.x=u.x;w.anchor.z=u.z;hero.x=u.x+2;hero.z=u.z;tick(w,180);
 assert.equal(w.encounters.active,null);assert.equal(u.encounter!.role,'friend');assert.equal(u.hp,start-1);assert.equal(gear(w).length,0);assert.equal(m.pending,0);
 const remaining=w.encounters.friends.get(u.id)!;assert.equal(remaining,5400);
 w.phase='reward';tick(w,120);assert.equal(w.encounters.friends.get(u.id),remaining);w.phase='battle';
 w.stage++;tick(w,5399);assert.ok(w.entities.has(u.id));tick(w);assert.equal(w.entities.has(u.id),false);assert.equal(w.encounters.friends.size,0);assert.equal(gear(w).length,0);
});
test('gentle death beats rescue, guard clear wins over simultaneous wave',()=>{
 const w=world(),{m,u}=spawn(w,'gentle');m.phase='active';m.age=299;for(const id of m.enemies)w.entities.get(id)!.hp=0;
 tick(w);assert.equal(m.phase,'cleared');assert.equal(m.pending,0);assert.equal(m.enemies.length,12);
 m.progress=179;u.hp=0;tick(w);assert.equal(w.encounters.last!.result,'failed');assert.equal(w.encounters.friends.size,0);assert.equal(gear(w).length,0);
});
test('endless and capacity admission cannot create an encounter or replace an existing one',()=>{
 const w=world();w.endless={round:1} as any;for(const k of ['golden','giant','gentle'] as const)assert.equal(spawnEncounter(w,k),false);
 w.endless=null;for(let i=0;i<300;i++)w.addUnit('zergling','zerg',60+i*.01,60);
 assert.equal(spawnEncounter(w,'gentle'),false);assert.equal(w.encounters.used.size,0);for(const u of w.entities.values())if(u.owner==='zerg')u.hp=0;
 spawn(w,'golden');assert.equal(spawnEncounter(w,'giant'),false);w.endless={round:1} as any;tick(w);assert.equal(w.encounters.active,null);assert.equal([...w.entities.values()].some(u=>u.encounter),false);
});
test('run-owned encounter DTO is cloneable and validates pending plans; cancel removes only encounter entities',()=>{
 const w=world(),{u}=spawn(w,'golden');w.hit(u,u.maxHp*.11,[],1,'terran',0,1);
 const state=structuredClone(w.encounters),entities=structuredClone(w.entities);validateEncounterState(state,entities);
 assert.equal(state.active!.threshold,1);const army=w.allies().map(u=>u.id);cancelEncounters(w);assert.equal(w.encounters.pending.length,0);assert.ok(army.every(id=>w.entities.has(id)));
});
test('golden path is legal and custom movement never crosses an obstacle',()=>{
 const w=world(),{m,u}=spawn(w,'golden');assert.equal(m.route.length,6);w.hit(u,1,[],1,'terran',0,1);let moved=false;
 for(let i=0;i<400;i++){const before={x:u.x,z:u.z};tickEncounterUnit(w,u,1/60);moved ||=Math.hypot(u.x-before.x,u.z-before.z)>0;assert.ok(Math.abs(u.x)<w.mapHalf&&Math.abs(u.z)<w.mapHalf);}
 assert.equal(moved,true);assert.equal(encounterPointLegal(w,{x:w.mapHalf,z:0},1),false);
});


test('equipment checkpoint restore retains plans and exact next threshold',()=>{
 const w=world(),{u}=spawn(w,'golden');w.hit(u,u.maxHp*.35,[],1,'terran',0,1);
 const saved=w.captureRun(),copy=world();
 validateRunData(saved.state,new RunState());copy.restoreRun(saved);
 assert.deepEqual(copy.encounters,w.encounters);assert.equal(copy.starship.account.rng,w.starship.account.rng);
 copy.paused=false;const restored=copy.entities.get(u.id)!;
 copy.hit(restored,restored.maxHp*.2,[],1,'terran',0,1);w.hit(u,u.maxHp*.2,[],1,'terran',0,1);
 assert.deepEqual(gear(copy),gear(w));assert.deepEqual(copy.encounters,w.encounters);
});
test('ordinary battle update makes guards fight only after activation and rescued gentle really attacks',()=>{
 const w=world(),{m,u}=spawn(w,'gentle'),army=w.allies().find(a=>!a.temporary)!;
 const first=w.entities.get(m.enemies[0])!;const before=u.hp;
 for(let n=0;n<30;n++)w.updateUnit(first,1/60);assert.equal(u.hp,before);
 w.hit(first,1,[],1,'terran',0,1,army.id);assert.equal(m.phase,'active');
 assert.equal(w.findTarget(first,100)?.id,army.id);
 w.time+=4;assert.equal(w.findTarget(first,100)?.id,u.id);
 for(const id of m.enemies)w.entities.get(id)!.hp=0;
 w.anchor.x=u.x;w.anchor.z=u.z;army.x=u.x+2;army.z=u.z;tick(w,180);
 const target=w.addUnit('roach','zerg',u.x+2,u.z);target.hp=target.maxHp=100000;target.moveSpeed=0;
 const previous=target.hp,stats={hp:u.maxHp,damage:u.weaponDamage,armor:u.armor,radius:u.unitRadius};
 army.hp=army.maxHp=100000;w.advance(2);
 assert.deepEqual({hp:u.maxHp,damage:u.weaponDamage,armor:u.armor,radius:u.unitRadius},stats);
 assert.ok(target.hp<previous);assert.ok(w.visualEvents.some(e=>e.kind==='attack'&&e.entityId===u.id));
 assert.equal(gear(w).length,0);assert.equal(u.encounter!.role,'friend');
});

for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[])test(`${theme}: all three encounters admit real legal footprints and golden route`,()=>{
 for(const kind of ['golden','giant','gentle'] as const){
  const w=new World({terrain:campaignTerrain({version:3,seed:529,theme}),waves:false,equipmentAccount:newEquipmentAccount(529),seed:529});
  w.start();w.stage=7;w.prepareStage();w.encounters.enabled=false;
  for(const [id,u]of w.entities)if(u.owner==='zerg')w.entities.delete(id);
  let placed=false;for(let n=0;n<4&&!placed;n++)placed=spawnEncounter(w,kind);
  assert.ok(placed,theme+':'+kind);tick(w,120);const m=w.encounters.active!,u=w.entities.get(m.subject!)!;
  assert.ok(u,theme+':'+kind+' subject');assert.ok(w.terrain!.canOccupy(u,u.unitRadius));
  if(kind==='golden')for(let i=1;i<m.route.length;i++)assert.ok(w.terrain!.walkLine(m.route[i-1],m.route[i],u.unitRadius));
  if(kind==='giant')assert.ok(w.terrain!.canOccupy(u,u.encounter!.base!.unitRadius*2.6));
  if(kind==='gentle')for(const id of m.enemies){const guard=w.entities.get(id)!;assert.ok(w.terrain!.canOccupy(guard,guard.unitRadius));}
 }
});
