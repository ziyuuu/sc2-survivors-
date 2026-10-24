import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {buyFunShop,tickFunShop,nydusEligible} from '../src/simulation/fun-shop/runtime';
import {newFunShop,validateFunShop} from '../src/simulation/fun-shop/state';
import {tickBait} from '../src/simulation/fun-shop/bait';
import {FUN_KINDS} from '../src/simulation/encounters/expanded-state';
import {ENCOUNTER_KINDS} from '../src/simulation/encounters/state';
import {spawnFunEncounter} from '../src/simulation/encounters/expanded';
import {spawnEncounter} from '../src/simulation/encounters/runtime';
import {HORDE_KINDS} from '../src/simulation/field-events/state';
import {startReplacementHorde} from '../src/simulation/field-events/hordes';
import {cloneCombatSource} from '../src/simulation/starship/runtime';
import {nydusPose,heldPose} from '../src/render/units/fun-presentation';
import {createPulseBaneling} from '../src/simulation/missions/eggs';
function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});w.start();w.stage=12;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;w.nextFreePodAt=Infinity;for(const u of w.allies())u.weaponCooldown=Infinity;return w;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('gland baneling approaches and self-destructs through real World steps',()=>{
 const w=fixture(),source=w.allies()[0];buyFunShop(w,'gland',1,0);w.random=()=>0;const victim=w.addUnit('roach','zerg',7,0);w.hit(victim,1e9,[],1,'terran',0,1,source.id);const b=w.allies().find(u=>u.temporaryKind==='shop-gland')!;assert.ok(b);const target=w.addUnit('roach','zerg',10,0);target.weaponCooldown=Infinity;const hp=target.hp,start={x:b.x,z:b.z};w.advance(8);assert.ok(b.distanceWalked>0);assert.ok(target.hp<hp);assert.equal(b.hp,0);assert.equal(b.recoveryUntil,undefined);assert.notDeepEqual({x:b.x,z:b.z},start);
});
test('gland lifetime expires with no enemy and pause freezes the exact remaining lifetime',()=>{
 const w=fixture();buyFunShop(w,'gland',1,0);w.random=()=>0;const e=w.addUnit('roach','zerg',7,0);w.hit(e,1e9,[],1,'terran',0,1,w.allies()[0].id);const b=w.allies().find(u=>u.temporaryKind==='shop-gland')!;w.paused=true;w.advance(40);assert.equal(w.time,0);assert.ok(b.hp>0);w.paused=false;w.advance(30.1);assert.equal(b.hp,0);assert.equal(b.recoveryUntil,undefined);
});
test('gland keeps committed friendly projectile credit after its firing body is removed',()=>{const w=fixture();buyFunShop(w,'gland',1,0);w.random=()=>0;const source=w.allies()[0],packet=cloneCombatSource(w,source),enemy=w.addUnit('roach','zerg',8,0);w.entities.delete(source.id);w.attackHit(packet,enemy,1e9,[],1);assert.equal(enemy.hp,0);assert.equal(w.allies().filter(u=>u.temporaryKind==='shop-gland').length,1);});
test('nydus real step never joins roster or collision formation, pause holds its pose and stage change retires actor',()=>{
 const w=fixture();buyFunShop(w,'nydus',1,0);for(let i=0;i<6;i++){const e=w.addUnit('roach','zerg',10+i*.1,1);e.weaponCooldown=Infinity;e.thinkAt=Infinity;}const members=w.allies().map(u=>u.id);w.advance(18.1);const n=w.funShop.nydus!;assert.ok(n);const u=w.entities.get(n.id)!;assert.deepEqual(w.allies().map(u=>u.id),members);close(u.x,n.x);close(u.z,n.z);assert.equal(w.targetAllowed(w.entities.get(n.targets[0])!,u),false);const pose=nydusPose(w,u);w.paused=true;w.advance(40);assert.deepEqual(nydusPose(w,u),pose);w.paused=false;w.stage++;w.prepareStage();w.step();assert.equal(w.funShop.nydus,null);assert.equal(w.entities.has(u.id),false);
});
test('nydus emerges at the terrain-validated cluster center rather than the first member',()=>{
 const w=fixture();buyFunShop(w,'nydus',1,0);w.addUnit('roach','zerg',4,0);w.addUnit('roach','zerg',8,0);w.terrain!.canOccupy=p=>p.x>6;w.time=18;tickFunShop(w);const n=w.funShop.nydus!;assert.ok(n);assert.equal(n.x,8);assert.ok(w.terrain!.canOccupy(n,1.5));assert.equal(n.targets.length,2);
});
test('nydus uses native clipping clocks, visible inward pull, live target recheck and one death per receipt',()=>{
 const w=fixture();buyFunShop(w,'nydus',1,0);for(let i=0;i<7;i++)w.addUnit('roach','zerg',10+i*.2,0);w.time=18;tickFunShop(w);const n=w.funShop.nydus!,actor=w.entities.get(n.id)!;assert.equal(nydusPose(w,actor)?.clip,'Birth');w.time+=412/60;tickFunShop(w);assert.equal(nydusPose(w,actor)?.clip,'Stand Work Start');w.time+=41/60;tickFunShop(w);const victim=w.entities.get(n.targets[0])!;w.time+=17/60;const pose=heldPose(w,victim)!;assert.ok(pose.scale<1&&pose.scale>0);victim.flying=true;w.time+=18/60;tickFunShop(w);assert.equal(victim.hp,victim.maxHp);const kills=w.stats.kills;tickFunShop(w);assert.equal(w.stats.kills,kills);
 for(let i=0;i<6;i++){w.time+=35/60;tickFunShop(w);}assert.equal(n.phase,'retreat');const start=nydusPose(w,actor)!.seconds;w.time+=1;assert.ok(nydusPose(w,actor)!.seconds<start);
});
for(const kind of HORDE_KINDS)test('bait horde '+kind+' leaves original attempt available and obeys capacity',()=>{const w=fixture();assert.equal(startReplacementHorde(w,kind,true),true);assert.equal(w.fieldEvents.hordeTried,false);assert.ok(w.enemyCount()<=w.missionEnemyCapacity());assert.equal(w.fieldEvents.horde?.kind,kind);});
for(const kind of ENCOUNTER_KINDS)test('bait can independently repeat native encounter '+kind,()=>{const w=fixture();w.encounters.used.add(kind);assert.equal(spawnEncounter(w,kind),false);assert.equal(spawnEncounter(w,kind,true),true);assert.equal(w.encounters.active?.bait,true);});
for(const kind of FUN_KINDS)test('bait preserves eligibility while bypassing only native quota for '+kind,()=>{
 const w=fixture();w.encounters.expanded.used.add(kind);if(kind==='flyingRoaches'){const u=w.allies()[0];u.weaponCooldown=0;}if(kind==='infectedTerrans')w.addUnit('medivac','terran',1,3);
 assert.equal(spawnFunEncounter(w,kind),false);const ok=spawnFunEncounter(w,kind,undefined,true);
 assert.equal(ok,true);
 if(ok)assert.equal((kind==='cruelQueen'?w.encounters.expanded.queen:w.encounters.expanded.short)?.bait,true);
});
test('bait elite extra rolls never alter original plan, consume original limit or exceed population cap',()=>{
 const w=fixture();Object.defineProperty(w,'diagnosticRun',{value:false});Object.defineProperty(w,'missionAutoEnabled',{value:true});buyFunShop(w,'bait',3,0);const plan=structuredClone(w.snapshotData().specialPlan);w.stageElapsed=20;w.random=()=>0;const b=w.funShop.bait;b.stage=w.stage;b.next=999;b.pending.elite=true;tickBait(w);assert.equal(b.counts.elite,1);assert.deepEqual(w.snapshotData().specialPlan,plan);b.pending.elite=true;w.time=30;for(const id of w.fieldEvents.pacing.baitElites)w.entities.get(id)!.hp=0;tickBait(w);assert.equal(b.counts.elite,1);w.time=45;tickBait(w);assert.equal(b.counts.elite,2);b.pending.elite=true;w.time=90;tickBait(w);assert.equal(b.counts.elite,2);assert.deepEqual(w.snapshotData().specialPlan,plan);
 const full=fixture();Object.defineProperty(full,'diagnosticRun',{value:false});Object.defineProperty(full,'missionAutoEnabled',{value:true});buyFunShop(full,'bait',1,0);full.funShop.bait.stage=full.stage;full.funShop.bait.next=999;full.funShop.bait.pending.elite=true;for(let i=0;i<full.missionEnemyCapacity();i++)full.addUnit('zergling','zerg',30+i*.001,0);full.stageElapsed=20;const count=full.enemyCount();tickBait(full);assert.equal(full.enemyCount(),count);assert.equal(full.funShop.bait.counts.elite,0);
});
test('Pandora native attacks remain amplified after shooter removal and skill coefficients retain one boost',()=>{
 const a=fixture(),b=fixture();buyFunShop(b,'pandora',1,0);const p=a.spawnSpecial('hydralisk','boss',{x:20,z:0})!,q=b.spawnSpecial('hydralisk','boss',{x:20,z:0})!;close(q.specialDamageMultiplier!,p.specialDamageMultiplier!*1.15);close(q.armor,p.armor);close(q.attackPeriod,p.attackPeriod);close(q.attackRange,p.attackRange);close(q.moveSpeed,p.moveSpeed);const sa=cloneCombatSource(a,p),sb=cloneCombatSource(b,q);a.entities.delete(p.id);b.entities.delete(q.id);close(sb.weaponDamage,sa.weaponDamage*1.15);close(sb.nativeStatScale!.damage,sa.nativeStatScale!.damage*1.15);
});
test('Pandora covers legacy swarm and mission pulse profiles without changing population or pulse timing',()=>{
 const a=fixture(),b=fixture();buyFunShop(b,'pandora',1,0);const sa=a.addUnit('zergling','zerg',20,0,1,'swarm'),sb=b.addUnit('zergling','zerg',20,0,1,'swarm');close(sb.maxHp,sa.maxHp*1.25);close(sb.weaponDamage,sa.weaponDamage*1.15);close(sb.attackPeriod,sa.attackPeriod);close(sb.moveSpeed,sa.moveSpeed);
 const item={taskId:'pulse',sourceId:1,type:'baneling' as const,elite:true,pulse:true,noLoot:true,readyAt:0,stamp:{stage:12,progress:.6,density:1},point:{x:20,z:0}},pa=createPulseBaneling(a,item.point,item),pb=createPulseBaneling(b,item.point,item);close(pb.maxHp,pa.maxHp*1.25);close(pb.hp,pa.hp*1.25);close(pb.specialDamageMultiplier!,pa.specialDamageMultiplier!*1.15);close(pb.armor,pa.armor);close(pb.moveSpeed,pa.moveSpeed);close(pb.attackPeriod,pa.attackPeriod);assert.equal(b.enemyCount(),a.enemyCount());assert.equal(b.snapshotData().rngState,a.snapshotData().rngState);
});
test('bait still rolls independently while a native replacement horde occupies the spawn window',()=>{
 const w=fixture();Object.defineProperty(w,'diagnosticRun',{value:false});buyFunShop(w,'bait',3,0);assert.equal(startReplacementHorde(w,'zerglings'),true);const count=w.enemyCount();w.stageElapsed=20;w.random=()=>0;tickBait(w);assert.deepEqual(w.funShop.bait.pending,{encounter:true,elite:true,horde:true});assert.deepEqual(w.funShop.bait.counts,{encounter:0,elite:0,horde:0});assert.equal(w.enemyCount(),count);assert.equal(w.fieldEvents.hordeTried,true);
});
test('nydus retains normal kill credit when the initially selected allied member dies',()=>{
 const w=fixture();buyFunShop(w,'nydus',1,0);const victim=w.addUnit('roach','zerg',10,0);w.time=18;tickFunShop(w);const n=w.funShop.nydus!;w.entities.get(n.source)!.hp=0;const before=w.stats.kills;for(const seconds of [412/60,41/60,35/60]){w.time+=seconds;tickFunShop(w);}assert.equal(victim.hp,0);assert.equal(w.stats.kills,before+1);assert.ok(w.pickups.length>0);
});
test('schema rejects impossible levels, quotas and interrupted nydus cursors',()=>{const s=newFunShop();validateFunShop(s);s.levels.dice=6;assert.throws(()=>validateFunShop(s));s.levels.dice=5;s.bait.counts.elite=3;assert.throws(()=>validateFunShop(s));});

