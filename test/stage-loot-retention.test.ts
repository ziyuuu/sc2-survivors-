import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {newEquipmentAccount,grantEquipment,itemsAt,BACKPACK_CAPACITY,discardEquipment} from '../src/simulation/starship/inventory';
import {registerEquipmentDrop,equipmentGroundDrops} from '../src/simulation/starship/loot-presentation';
import {collectNearbyEquipment,collectWorldEquipment,dropWorldEquipment,dropEnemyEquipment} from '../src/simulation/starship/drops';
import {advanceStageLoot} from '../src/simulation/stage-loot';
import type {Quality,ItemLocation} from '../src/simulation/starship/types';

const world=(enabled=true)=>{const w=new World({seed:529,difficulty:'easy',sandbox:true,waves:false,terrain:false,obstacles:[],endlessTerrain:new FlatTerrain(),...(enabled?{equipmentAccount:newEquipmentAccount(529)}:{})});assert.ok(w.start());return w;};
const input=(q:Quality)=>({template:q===5?'set.orange.hero.5':'attribute.'+q,race:'terran' as const,slot:'offense1' as const,...(q===5?{binding:{hero:'raynor' as const}}:{})});
function grant(w:World,q:Quality,location:ItemLocation,receipt='retention:'+w.starship.account.serial){const r=grantEquipment(w.starship.account,input(q),receipt,location);assert.ok(r.ok);return r.value;}
function drop(w:World,q:Quality,x=10,z=0){const item=grant(w,q,{kind:'ground',run:w.starship.account.run!.id,x,z});assert.ok(registerEquipmentDrop(w,item));return item;}
function finishMenu(w:World){for(let n=0;w.phase==='reward'&&n<3;n++)assert.ok(w.skipReward());assert.notEqual(w.phase,'reward');}
function next(w:World){w.endStage();assert.equal(w.phase,'reward');finishMenu(w);assert.equal(w.phase,'battle');}
function stage(w:World,n:number){w.stage=n;w.stageElapsed=0;w.prepareStage();}

for(const [q,life] of [[1,2],[2,3],[3,4],[4,5],[5,6]] as const)test(`ground quality ${q} lasts exactly ${life} stages including its drop stage`,()=>{
 const w=world();stage(w,5);const a=w.starship.account,item=drop(w,q),contents=structuredClone(item),source=Object.entries(a.receipts).find(([,ids])=>ids.includes(item.id))![0];
 assert.equal(a.locations[item.id].kind,'ground');
 for(let age=1;age<life;age++){
  next(w);assert.equal(w.stage,5+age);assert.deepEqual(a.items[item.id],contents);assert.ok(equipmentGroundDrops(w).some(d=>d.item.id===item.id));
  const loc=a.locations[item.id];assert.equal(loc.kind,'ground');if(loc.kind==='ground')assert.equal(loc.droppedStage,5);
  assert.equal(registerEquipmentDrop(w,item),false,'presentation cannot renew the lifetime');
 }
 const rng=a.rng,dust=a.dust,acquired=structuredClone(a.acquired);next(w);
 assert.equal(w.stage,5+life);assert.equal(a.items[item.id],undefined);assert.equal(a.locations[item.id],undefined);assert.equal(w.starship.loot.ground.has(item.id),false);
 assert.ok(!w.starship.loot.events.some(e=>e.item?.id===item.id));assert.ok(!equipmentGroundDrops(w).some(d=>d.item.id===item.id));
 assert.deepEqual(a.receipts[source],[item.id]);assert.equal(grantEquipment(a,input(q),source,{kind:'ground',run:a.run!.id,x:0,z:0}).ok,false,'expired source cannot mint another item');
 assert.equal(a.rng,rng);assert.equal(a.dust,dust);assert.deepEqual(a.acquired,acquired);
});

for(const enabled of [false,true])test(`uncollected resources clear only when entering the next stage (equipment ${enabled})`,()=>{
 const w=world(enabled);w.drop({x:15,z:10},[15,7]);w.drop({x:-15,z:10},[0,9]);const original=structuredClone(w.pickups);assert.equal(original.length,2);
 w.paused=true;w.advance(2);assert.deepEqual(w.pickups,original);w.paused=false;w.endStage();assert.equal(w.phase,'reward');assert.deepEqual(w.pickups,original);
 const paid={...w.wallet},totals=structuredClone(w.economyTotals);assert.ok(w.skipReward());assert.equal(w.phase,'reward');assert.deepEqual(w.pickups,original);
 finishMenu(w);assert.equal(w.stage,2);assert.equal(w.pickups.length,0);assert.deepEqual(w.wallet,paid);assert.deepEqual(w.economyTotals,totals);
 assert.equal(w.skipReward(),false);assert.deepEqual(w.wallet,paid,'duplicate Continue cannot settle again');
 w.drop({x:15,z:10},[3,2]);assert.equal(w.pickups.length,1,'next-stage drops remain until the next transition');
});

test('pause, stage preparation, render registration and reward submenus do not age ground equipment',()=>{
 const w=world(),item=drop(w,1),a=w.starship.account,loc=structuredClone(a.locations[item.id]);
 w.paused=true;w.advance(120);for(let i=0;i<8;i++){w.prepareStage();registerEquipmentDrop(w,item);}assert.deepEqual(a.locations[item.id],loc);
 w.paused=false;w.endStage();const held=structuredClone(a.locations[item.id]);w.advance(120);assert.deepEqual(a.locations[item.id],held);assert.ok(w.skipReward());assert.equal(w.phase,'reward');assert.deepEqual(a.locations[item.id],held);
 finishMenu(w);assert.equal(w.stage,2);assert.ok(a.items[item.id]);w.endStage();assert.ok(a.items[item.id]);finishMenu(w);assert.equal(a.items[item.id],undefined);
});

test('owned inventory is exempt; collecting then deliberately dropping starts a new ground lifetime',()=>{
 const w=world(),a=w.starship.account,item=drop(w,1);next(w);w.anchor={x:10,z:0};assert.ok(collectWorldEquipment(w,item.id).ok);
 const warehouse=grant(w,2,{kind:'warehouse'}),equipped=grant(w,1,{kind:'backpack',run:a.run!.id});w.endStage();assert.ok(w.equipItem(equipped.id,'offense1').ok);finishMenu(w);
 for(let n=0;n<5;n++)next(w);assert.equal(w.stage,8);assert.equal(a.locations[item.id].kind,'backpack');assert.equal(a.locations[warehouse.id].kind,'warehouse');assert.equal(a.locations[equipped.id].kind,'equipped');
 assert.ok(dropWorldEquipment(w,item.id).ok);const loc=a.locations[item.id];assert.equal(loc.kind,'ground');if(loc.kind==='ground')assert.equal(loc.droppedStage,8);
 next(w);assert.ok(a.items[item.id]);next(w);assert.equal(a.items[item.id],undefined);assert.ok(a.items[warehouse.id]);assert.ok(a.items[equipped.id]);
});

test('full-bag retries do not extend lifetime; freeing space before expiry collects exactly once',()=>{
 const w=world(),a=w.starship.account;for(let n=0;n<BACKPACK_CAPACITY;n++)grant(w,1,{kind:'backpack',run:a.run!.id});
 const expires=drop(w,1,0,0),rescued=drop(w,2,0,0);for(let n=0;n<5;n++)collectNearbyEquipment(w);assert.equal(a.locations[expires.id].kind,'ground');next(w);collectNearbyEquipment(w);next(w);
 assert.equal(a.items[expires.id],undefined);assert.equal(collectWorldEquipment(w,expires.id).ok,false);assert.equal(itemsAt(a,'backpack').length,64);assert.equal(a.locations[rescued.id].kind,'ground');
 assert.ok(discardEquipment(a,itemsAt(a,'backpack')[0].id).ok);collectNearbyEquipment(w);assert.equal(a.locations[rescued.id].kind,'backpack');assert.equal(itemsAt(a,'backpack').length,64);assert.equal(collectWorldEquipment(w,rescued.id).ok,false);
 next(w);assert.ok(a.items[rescued.id]);assert.equal(a.locations[rescued.id].kind,'backpack');
});

test('unstamped in-memory ground grants are counted from the outgoing stage once',()=>{
 const w=world();stage(w,5);const a=w.starship.account,item=grant(w,1,{kind:'ground',run:a.run!.id,x:10,z:0});
 next(w);assert.ok(a.items[item.id]);const loc=a.locations[item.id];assert.equal(loc.kind,'ground');if(loc.kind==='ground')assert.equal(loc.droppedStage,5);
 next(w);assert.equal(a.items[item.id],undefined);
});

test('a late real enemy kill starts its lifetime in the kill stage and duplicate death receipts stay closed',()=>{
 const w=world();stage(w,7);const a=w.starship.account,enemy=w.addUnit('zergling','zerg',10,10);enemy.enemyTier='boss';w.stageElapsed=w.duration-1/60;w.hit(enemy,1e9,[],1,'terran');
 const items=Object.values(a.items);assert.ok(items.length>0);for(const item of items){const loc=a.locations[item.id];assert.equal(loc.kind,'ground');if(loc.kind==='ground')assert.equal(loc.droppedStage,7);}
 const prior=structuredClone(a);assert.deepEqual(dropEnemyEquipment(w,enemy),[]);assert.deepEqual(a,prior);next(w);for(const item of items)assert.ok(a.items[item.id]);
});

test('successful campaign-to-endless commit ages once and relocates survivors; failed and repeated commits do nothing',()=>{
 const w=world();stage(w,17);const a=w.starship.account,old=drop(w,1);next(w);assert.equal(w.stage,18);const fresh=drop(w,1,12,10),rare=drop(w,5,-12,10);w.drop({x:15,z:10},[30,20]);
 w.hive!.hp=0;const event=campaign18Schedule(campaign18StageConfig(18,w.difficulty),529).specials[0],boss=(w as any).spawnCampaignSpecial(event);assert.ok(boss);w.hit(boss,1e9,[],1,'terran');w.stageElapsed=w.duration;w.endStage();assert.equal(w.phase,'won');
 assert.ok(w.chooseCampaignExit('endless'));finishMenu(w);assert.equal(w.phase,'endless-ready');
 const plan=w.previewEndlessTransition()!,token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`,before=structuredClone({account:a,pickups:w.pickups});
 assert.equal(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,'missing'),false);assert.deepEqual({account:a,pickups:w.pickups},before);
 assert.ok(w.backFromEndlessPreparation());assert.ok(w.chooseCampaignExit('endless'));assert.deepEqual({account:a,pickups:w.pickups},before);
 assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token));assert.equal(w.endless!.round,1);assert.equal(w.draftWindowId,19);assert.equal(w.pickups.length,0);assert.equal(a.items[old.id],undefined);
 for(const item of [fresh,rare]){assert.ok(a.items[item.id]);const loc=a.locations[item.id];assert.equal(loc.kind,'ground');if(loc.kind==='ground'){assert.equal(loc.droppedStage,18);assert.ok(w.terrain!.canOccupy({x:loc.x!,z:loc.z!},.2));}assert.equal(w.starship.loot.ground.get(item.id)!.terrain,w.terrain);assert.ok(equipmentGroundDrops(w).some(d=>d.item.id===item.id));}
 const committed=structuredClone({account:a,pickups:w.pickups});assert.equal(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token),false);assert.deepEqual({account:a,pickups:w.pickups},committed);
 next(w);assert.equal(w.endless!.round,2);assert.equal(a.items[fresh.id],undefined);assert.ok(a.items[rare.id]);
});

test('each endless round consumes one stage even at high round numbers',()=>{
 const w=world();w.stage=18;w.endless={round:4097,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};w.prepareStage();
 const a=w.starship.account,white=drop(w,1),orange=drop(w,5);w.drop({x:10,z:10},[5,3]);next(w);assert.equal(w.endless.round,4098);assert.equal(w.pickups.length,0);assert.ok(a.items[white.id]);next(w);assert.equal(a.items[white.id],undefined);
 for(let n=0;n<3;n++){next(w);assert.ok(a.items[orange.id]);}next(w);assert.equal(w.endless.round,4103);assert.equal(a.items[orange.id],undefined);
});

test('expiry preserves histories, outstanding pods, resources already earned, acquisition records and both random streams',()=>{
 const w=world(),a=w.starship.account,item=drop(w,1);next(w);const pod=w.spawnPod('marine',{x:-12,z:-12});pod.status='destroyed';pod.guardTypes=['zergling','zergling'];
 w.expedition.ledger.push({id:999,family:'marine',line:'barracks',facilityIds:[],remaining:0,state:'settled',podId:null,passengers:[]});w.expedition.completedReceipts.push('prior-paid');w.expedition.draftHistory.push({shown:['saved'],chosen:'saved'});a.acquired.known={template:'attribute.1',race:'terran',slot:'offense1',binding:{}};
 const snapshot=()=>structuredClone({ledger:w.expedition.ledger,completed:w.expedition.completedReceipts,history:w.expedition.draftHistory,pods:w.pods,wallet:w.wallet,economy:w.economyTotals,acquired:a.acquired,receipts:a.receipts,runReceipts:a.run!.receipts,runLocked:a.run!.locked,rng:w.rngState,equipmentRng:a.rng,dust:a.dust});const before=snapshot();
 advanceStageLoot(w);assert.equal(a.items[item.id],undefined);assert.deepEqual(snapshot(),before);
});
