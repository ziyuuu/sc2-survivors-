import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,itemsAt,grantEquipment,equip} from '../src/simulation/starship/inventory';
import {beginSpecialStage,markSpecialReady,quitSpecialStage,finishSpecialStage,specialAfterStep,claimSpecialTicket,enterSpecialTicket} from '../src/simulation/special-stages/runtime';
import {collectSpecialRewards} from '../src/simulation/special-stages/rewards';
import {initializeArena} from '../src/simulation/special-stages/arena';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import {CROSSING_FINISH} from '../src/simulation/special-stages/crossing';
import {barrageIntersection} from '../src/simulation/special-stages/dodge';
import {selectFour,canSelectFour} from '../src/simulation/special-stages/participants';
import {createPair} from '../src/simulation/zerg-brood';
import {FIELD_PICKUPS} from '../src/simulation/field-events/state';
import {withEquipmentWeapon,cloneCombatSource} from '../src/simulation/starship/runtime';
function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});w.start();w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
function begin(w:World,kind:Parameters<typeof beginSpecialStage>[1]){assert.equal(beginSpecialStage(w,kind,'fixture'),true);assert.equal(markSpecialReady(w),true);return w.specialStages.active!;}
test('special loading, pause and duplicate entry cannot consume challenge time or duplicate quota',()=>{
 const w=fixture();assert.equal(beginSpecialStage(w,'resources','fixture'),true);const a=w.specialStages.active!;w.advance(10);assert.equal(a.clock,0);assert.equal(w.time,0);assert.equal(beginSpecialStage(w,'arena','fixture'),false);markSpecialReady(w);w.paused=true;w.advance(10);assert.equal(a.clock,0);w.paused=false;w.step();assert.equal(a.clock,1);finishSpecialStage(w,'timeout');assert.equal(w.specialStages.used.size,1);assert.equal(beginSpecialStage(w,'resources','fixture'),false);
});
test('resource return preserves normal world identity, time, RNG, orders, jobs, actors and projectile budgets',()=>{
 const w=fixture(),enemy=w.addUnit('roach','zerg',22,0);w.issueMove({x:8,z:8});const snapshot=w.snapshotData(),entities=w.entities,expedition=w.expedition,starship=w.starship,terrain=w.terrain,order=w.order,normalHp=enemy.hp;
 const a=begin(w,'resources');assert.notEqual(w.entities,entities);assert.notEqual(w.starship.account,starship.account);assert.equal(w.entities.has(enemy.id),false);w.advance(30);
 assert.equal(a.clock,1800);assert.equal(w.specialStages.active,null);assert.equal(w.time,snapshot.time);assert.equal(w.tick,snapshot.tick);assert.equal(w.snapshotData().rngState,snapshot.rngState);assert.equal(w.entities,entities);assert.equal(w.expedition,expedition);assert.equal(w.starship,starship);assert.equal(w.terrain,terrain);assert.equal(w.order,order);assert.equal(enemy.hp,normalHp);assert.equal(w.expedition.ledger,snapshot.expedition.ledger);assert.equal(quitSpecialStage(w),false);
});
test('resources use real damage, once-only drops, ordinary highest-quality chests and deadline pickup',()=>{
 const w=fixture(),old=w.wallet.minerals,a=begin(w,'resources'),b=[...a.resources.values()].find(b=>b.kind==='mineral')!;
 w.anchor.x=b.x;w.anchor.z=b.z;w.hit(b,1e9);assert.equal(b.paid,true);const count=w.pickups.length;w.hit(b,1e9);assert.equal(w.pickups.length,count);w.step();assert.ok(w.wallet.minerals>old);
 const chest=[...a.resources.values()].find(b=>b.kind==='highChest')!;w.hit(chest,1e9);const drops=itemsAt(w.starship.account,'ground');assert.equal(drops.length,2);assert.ok(drops.some(i=>i.quality===3));assert.ok(drops.every(i=>i.quality<=3));const gain=w.wallet.minerals-old;finishSpecialStage(w,'timeout');assert.equal(w.wallet.minerals,old+gain);assert.equal(itemsAt(w.starship.account,'ground').length,0);
});
test('normal ground equipment is absent in challenge and returns at its original coordinates',()=>{
 const w=fixture(),account=w.starship.account;const result=grantEquipment(account,{template:'attribute.1',slot:'defense3',race:'terran'},'normal-ground',{kind:'ground',run:account.run!.id,x:9,z:11});
 assert.ok(result.ok);if(!result.ok)return;const location=structuredClone(account.locations[result.value.id]);begin(w,'resources');assert.equal(w.starship.account.items[result.value.id],undefined);finishSpecialStage(w,'timeout');assert.deepEqual(account.locations[result.value.id],location);
});
test('arena has approved 1+6 count and genuine boss/elite drops with victory loot phase',()=>{
 const w=fixture(),a=begin(w,'arena');assert.equal(a.enemies.length,7);assert.equal(a.heroIds.length,1);
 for(const id of a.enemies){const u=w.entities.get(id)!;w.hit(u,1e10,[],1,'terran',0,1,w.allies()[0].id,true);}
 specialAfterStep(w);assert.equal(a.phase,'loot');assert.equal(a.result,'success');assert.ok(itemsAt(w.starship.account,'ground').length>=7);assert.ok(w.rewardDrops.some(d=>d.bossLootReceipt));const clock=a.clock;w.advance(10);assert.equal(a.clock,clock);collectSpecialRewards(w);assert.ok(itemsAt(w.starship.account,'backpack').length>=7);assert.ok(a.cards.length>=1);quitSpecialStage(w);assert.equal(w.specialStages.active,null);assert.equal(w.stage,4);
});
test('arena carrier hero retains damaging weapon children without extra hero attacks',()=>{
 const w=fixture(),a=begin(w,'arena');for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);a.enemies=[];a.heroIds=[];initializeArena(w,['purifier_flagship']);initializeCarrierSubsystem(w);
 for(const id of a.enemies.slice(1)){w.entities.delete(id);}a.enemies=a.enemies.slice(0,1);const hero=w.entities.get(a.enemies[0])!;for(const u of w.allies()){u.x=hero.x;u.z=hero.z+3;u.hp=u.maxHp=1e9;}
 const children=[...w.entities.values()].filter(u=>u.summonOwnerId===hero.id);assert.ok(children.length>0);assert.ok(children.every(u=>!u.arenaHero&&u.owner==='zerg'));const hp=w.allies().reduce((n,u)=>n+u.hp,0);w.advance(3);assert.ok(w.allies().reduce((n,u)=>n+u.hp,0)<hp);assert.equal(w.heroAttackEvents.length,0);assert.equal(w.heroCasts.length,0);
});
test('dodge selects four actual ground bodies with priority and preserves health at level boundaries',()=>{
 const w=fixture();const base=w.allies();base[0].eliteId='marine.2';base[0].rank=4;w.refreshStats(base[0]);base[0].hp=base[0].maxHp*.4;const selected=selectFour(w)!;assert.equal(selected.length,4);assert.ok(selected.some(u=>u.id===base[0].id));const a=begin(w,'dodge'),u=w.entities.get(base[0].id)!,hp=u.hp,shield=u.shield;
 w.hit(u,1e9,[],1,'zerg');assert.equal(u.hp,hp);assert.equal(u.shield,shield);assert.equal(w.dash(),false);a.clock=3599;a.nextPattern=9999;w.step();assert.equal(w.specialStages.active,null);assert.equal(base[0].rank,5);assert.ok(Math.abs(base[0].hp/base[0].maxHp-.4)<1e-10);assert.ok(w.specialStages.last!.ranks.every(r=>r.after===Math.min(r.before+2,r.id===base[0].id?5:5)));
});
test('dodge fifth hit at 60 seconds fails, simultaneous overlaps count once, no HP loss',()=>{
 const w=fixture(),a=begin(w,'dodge');a.clock=3599;a.nextPattern=9999;a.hits=4;
 const u=w.entities.get(a.participants[0])!;const originals=a.participants.map(id=>({id,hp:w.entities.get(id)!.hp}));a.barrage=[{id:90001,x:u.x,z:u.z,vx:0,vz:0,radius:10,hit:false,born:0},{id:90002,x:u.x,z:u.z,vx:0,vz:0,radius:10,hit:false,born:0}];w.step();
 assert.equal(w.specialStages.last?.result,'failed');assert.equal(a.hits,5);for(const p of originals){assert.equal(w.entities.get(p.id)!.rank,1);assert.equal(w.entities.get(p.id)!.hp,p.hp);}
});
test('dodge twin selection is atomic and shared promotion commits once',()=>{
 const w=fixture();w.entities.clear();w.expedition.zerglingPairs=[];createPair(w,{x:0,z:0},2);createPair(w,{x:3,z:0},2);assert.equal(canSelectFour(w),true);const a=begin(w,'dodge');finishSpecialStage(w,'success');assert.equal(a.participants.length,4);assert.ok(w.allies().every(u=>u.rank===4));assert.ok(w.expedition.zerglingPairs.every(p=>p.rank===4));
});
test('relative swept barrage collision catches a low-frame crossing',()=>{
 assert.equal(barrageIntersection({x:-10,z:0},{x:10,z:0},{x:0,z:-1},{x:0,z:1},.5),true);assert.equal(barrageIntersection({x:-10,z:3},{x:10,z:3},{x:0,z:0},{x:0,z:0},.5),false);
});
test('crossing has no time failure, requires medical member arrival and produces 3 power items',()=>{
 const w=fixture();w.addUnit('medivac','terran',0,0);const a=begin(w,'crossing');a.clock=100000;a.nextSwarm=Infinity;w.step();assert.equal(w.specialStages.active,a);const ids=[...a.participants],medic=ids.find(id=>w.entities.get(id)?.unitType==='medivac')!;
 for(const id of ids)if(id!==medic)w.entities.get(id)!.z=CROSSING_FINISH-1;specialAfterStep(w);assert.equal(a.phase,'active');assert.equal(a.escaped.size,ids.length-1);w.entities.get(medic)!.z=CROSSING_FINISH-1;specialAfterStep(w);assert.equal(a.phase,'loot');assert.equal(a.rewardIds.length,3);assert.ok(a.rewardIds.every(id=>['defense3','defense4'].includes(w.starship.account.items[id].slot)));assert.equal(quitSpecialStage(w),false);collectSpecialRewards(w);assert.equal(quitSpecialStage(w),true);assert.equal(w.allies().length,ids.length);
});
test('crossing threats give no drops, cards or kill growth; a failed challenge has no completion reward',()=>{
 const w=fixture(),a=begin(w,'crossing');a.clock=180;Object.assign(w.anchor,{x:-10,z:42});specialAfterStep(w);const enemy=[...w.entities.values()].find(u=>u.specialNoLoot)!;assert.ok(enemy);const stats={...w.stats};w.hit(enemy,1e9,[],1,'terran',0,1,w.allies()[0].id,true);assert.equal(w.stats.kills,stats.kills);assert.equal(w.pickups.length,0);assert.equal(w.rewardDrops.length,0);assert.equal(itemsAt(w.starship.account,'ground').length,0);finishSpecialStage(w,'failed');assert.equal(w.specialStages.last?.result,'failed');assert.equal(w.phase,'battle');assert.equal(itemsAt(w.starship.account,'backpack').length,0);
});
test('claimed ticket rechecks four-body eligibility without spending entry quota',()=>{
 const w=fixture();w.phase='reward';w.stage=3;w.specialStages.ticket={stage:4,kind:'dodge',claimed:false};assert.equal(claimSpecialTicket(w),true);assert.equal(claimSpecialTicket(w),false);for(const u of w.allies().slice(1))w.entities.delete(u.id);w.stage=4;w.phase='battle';assert.equal(enterSpecialTicket(w),false);assert.equal(w.specialStages.ticket,null);assert.equal(w.specialStages.used.size,0);assert.equal(w.phase,'battle');
});
test('dodge uses native mobile stances then returns burrow and siege without changing original cooldowns',()=>{
 const w=fixture();w.entities.clear();for(let i=0;i<4;i++){const u=w.addUnit(i<2?'lurker':'tank','terran',i*2,0);if(i<2)u.nativeMode=u.desiredNativeMode='lurker_burrowed';else u.mode=u.desiredMode='siege';w.refreshStats(u);u.weaponCooldown=7;u.hp=u.maxHp*.4;}
 const old=w.allies().map(u=>({u,mode:u.mode,native:u.nativeMode}));const a=begin(w,'dodge');
 assert.ok(a.participants.every(id=>w.entities.get(id)!.moveSpeed>0));const z=w.anchor.z;w.input={x:0,z:-1};w.advance(2);assert.ok(w.anchor.z<z-1);finishSpecialStage(w,'timeout');
 for(const p of old){assert.equal(p.u.mode,p.mode);assert.equal(p.u.nativeMode,p.native);assert.equal(p.u.weaponCooldown,7);assert.ok(Math.abs(p.u.hp/p.u.maxHp-.4)<1e-10);}
});
test('unchosen free ticket expires on the next stage without consuming its entrance quota',()=>{
 const w=fixture();w.specialStages.ticket={stage:4,kind:'resources',claimed:false};assert.equal(enterSpecialTicket(w),false);assert.equal(w.specialStages.ticket,null);assert.equal(w.specialStages.used.size,0);
});
test('a real deferred weapon source and its finite budget remain frozen through a special scene',()=>{
 const w=fixture(),u=w.allies()[0],enemy=w.addUnit('roach','zerg',10,0);
 const item=grantEquipment(w.starship.account,{template:'attribute.1',slot:'offense1',race:'terran'},'weapon-budget',{kind:'backpack',run:w.runId!});
 assert.ok(item.ok);if(!item.ok)return;assert.ok(equip(w.starship.account,'terran',item.value.id,'offense1').ok);
 let source:typeof u|undefined;withEquipmentWeapon(w,u,enemy,()=>{source=cloneCombatSource(w,u);});
 assert.ok(source);const budget=w.starship.attacks.get(source!);assert.ok(budget);const before=structuredClone(budget),runtime=w.starship;
 begin(w,'resources');w.advance(1);finishSpecialStage(w,'timeout');
 assert.equal(w.starship,runtime);assert.equal(w.starship.attacks.get(source!),budget);assert.deepEqual(budget,before);
});
