import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {chooseTutorial,offerShortTutorial} from '../src/simulation/tutorial/runtime';
import {guided,guidedStep,guidedOffer,guidedItem,guidedClickRef,acknowledgeGuidedSave,activateGuidedTarget,beginGuidedClick,finishGuidedClick,finishGuidedResult,presentGuidedResult,withGuidedCommand,permitGuidedProduction,prepareGuided} from '../src/simulation/tutorial/guided';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {dropEnemyEquipment,collectWorldEquipment} from '../src/simulation/starship/drops';
import {validateTutorialAccount} from '../src/simulation/tutorial/types';
import type {Race} from '../src/data/races';
import {launchWeaponFlight} from '../src/simulation/combat/weapon-flight';

const normal=chooseCampaignMap(17),lesson={...normal,lesson:3 as const};
function menu(race:Race='terran'){
 const a=newEquipmentAccount(529);a.tutorial={status:'eligible',version:3};
 const w=new World({race,seed:17,terrain:campaignTerrain(lesson),equipmentAccount:a});return w;
}
function invite(w:World){return offerShortTutorial(w,{race:w.expedition.race,difficulty:'normal',preset:0,hero:null,map:normal,accepted:false});}
function start(race:Race='terran'){const w=menu(race);assert.ok(invite(w));assert.ok(chooseTutorial(w,true));assert.ok(w.start());return w;}
function wait(w:World){for(let i=0;i<3600&&guided(w)?.phase==='running';i++){acknowledgeGuidedSave(w);if(w.phase!=='battle'&&guided(w)?.feedback)finishGuidedResult(w);else w.step();}assert.equal(guided(w)?.phase,'waiting',guided(w)?.step);}
function action(w:World){
 const g=guided(w)!,s=guidedStep(w)!;acknowledgeGuidedSave(w);
 if(['worker','ling','drone','resources','landing','boss','loot'].includes(s.kind)){assert.ok(activateGuidedTarget(w));wait(w);return;}
 assert.ok(beginGuidedClick(w,guidedClickRef(w)));withGuidedCommand(w,()=>{
  if(['build','supply'].includes(s.kind)){assert.ok(w.choose(guidedOffer(w)!.offerId));finishGuidedClick(w);}
  else if(s.kind==='apply'){assert.ok(w.applyBuildingPlacement(w.beginBuildingPlacement()!));finishGuidedClick(w);}
  else if(s.kind==='supply-round'){assert.ok(w.skipReward());finishGuidedClick(w);}
  else if(s.kind==='front'){permitGuidedProduction(w);assert.ok(w.skipReward());}
  else if(s.kind==='repair'){const q=w.previewRepair(w.allies().map(u=>u.id));if(q?.health)assert.ok(w.purchaseRepair(q.id));finishGuidedClick(w);}
  else if(s.kind==='detail')finishGuidedClick(w);
  else if(s.kind==='equip'){const id=guidedItem(w)!;assert.ok(w.equipItem(id,w.starship.account.items[id].slot).ok);}
  else if(s.kind==='extract')assert.ok(w.extractEquipment());
 });w.changed();if(guided(w))wait(w);
}
function until(w:World,step:string){for(let i=0;i<20&&guided(w)?.step!==step;i++)action(w);assert.equal(guided(w)?.step,step);}

test('v3 departure choice is saved before a run; no old account or permanent decision qualifies',()=>{
 const w=menu(),entities=w.entities.size;assert.ok(invite(w));assert.equal(w.phase,'menu');assert.equal(w.runId,null);assert.equal(w.entities.size,entities);assert.equal(w.expedition.tutorial,undefined);
 const saved=structuredClone(w.starship.account);validateTutorialAccount(saved.tutorial);assert.equal(saved.tutorial?.departure?.accepted,false);
 assert.ok(chooseTutorial(w,true));assert.equal(w.starship.account.tutorial?.departure?.accepted,true);validateTutorialAccount(w.starship.account.tutorial);
 for(const status of [undefined,'skipped','completed','closed'] as const){const other=menu();other.starship.account.tutorial=status?{status,version:3}:undefined;assert.equal(invite(other),false);}
 const no=menu();invite(no);assert.ok(chooseTutorial(no,false));assert.equal(no.starship.account.tutorial?.status,'skipped');assert.equal(no.starship.account.tutorial?.departure,undefined);assert.equal(invite(no),false);
});
for(const race of ['terran','zerg','protoss'] as const)test(`v3 ${race}: two natural scenes, real payment, recovery, two white identities and extraction`,()=>{
 const w=start(race),a=w.starship.account;assert.equal(guided(w)?.step,'rescue-worker');assert.equal(w.campaignRecipe?.lesson,3);assert.equal(w.terrain?.definition?.width,96);
 const initialWorkers=w.workers;until(w,'development');assert.ok(w.workers>initialWorkers);assert.equal(w.phase,'reward');assert.ok(w.stageElapsed<30);assert.deepEqual(w.wallet,{minerals:800,gas:250});
 until(w,'depart');assert.equal(w.allies().length,race==='zerg'?6:3);const before={...w.wallet};acknowledgeGuidedSave(w);beginGuidedClick(w,guidedClickRef(w));permitGuidedProduction(w);assert.ok(withGuidedCommand(w,()=>w.skipReward()));
 w.advance(9.99);assert.deepEqual(w.wallet,before);assert.equal(w.expedition.ledger.length,0);w.advance(.1);assert.equal(w.expedition.ledger.length,1);assert.equal(w.wallet.minerals,before.minerals-(race==='protoss'?100:50));wait(w);assert.equal(guided(w)?.step,'receive');
 action(w);assert.equal(w.expedition.ledger[0].state,'settled');assert.ok(w.expedition.ledger[0].passengers.every(p=>p.status==='released'&&p.entityId!==null));
 action(w);const items=guided(w)!.bosses['2'].items;assert.equal(items.length,2);assert.deepEqual(items.map(i=>[i.race,i.quality,i.pollution,i.template,i.slot]),[[race,1,'none','attribute.1','defense1'],[race,1,'none','module.logistics.1','logistics']]);
 const captured=w.captureRun(),copy=new World({seed:17});copy.restoreRun(captured);assert.deepEqual(guided(copy)!.bosses['2'].items,items);
 action(w);assert.equal(w.phase,'reward');assert.equal(guided(w)?.step,'recover');const q=w.previewRepair(w.allies().map(u=>u.id)),wallet={...w.wallet};action(w);assert.ok(w.allies().every(u=>u.hp===u.maxHp));assert.equal(w.wallet.minerals,wallet.minerals-(q?.minerals??0));
 const module=items[1].id;assert.equal(w.equipItem(module,'logistics').ok,false);until(w,'leave');assert.equal(a.equipped[race].defense1,items[0].id);const points=w.permanentProfile.balance;action(w);assert.equal(a.tutorial?.tail?.module,module);assert.equal(a.locations[module].kind,'warehouse');assert.equal(w.phase,'finished');assert.equal(w.permanentProfile.balance,points);assert.equal(points,0);
});
test('v3 each step restores and skip transfers to the ordinary map without deleting items, orders or resources',()=>{
 const w=start();for(let i=0;i<16;i++){
  const snapshot=w.captureRun(),copy=new World({seed:17});copy.restoreRun(snapshot);assert.equal(guided(copy)?.step,guided(w)?.step);
  const wallet={...copy.wallet},items=structuredClone(copy.starship.account.items),orders=structuredClone(copy.expedition.ledger),run=copy.runId,stage=copy.stage;
  assert.ok(chooseTutorial(copy,false));assert.ok(copy.exitShortTutorial(normal));assert.equal(copy.runId,run);assert.equal(copy.stage,stage);assert.equal(copy.campaignRecipe?.lesson,undefined);assert.equal(guided(copy),undefined);assert.deepEqual(copy.wallet,wallet);assert.deepEqual(copy.starship.account.items,items);assert.deepEqual(copy.expedition.ledger,orders);
  const restored=new World({seed:17});restored.restoreRun(copy.captureRun());assert.equal(restored.starship.account.tutorial?.status,'skipped');assert.equal(restored.campaignRecipe?.lesson,undefined);action(w);
 }
});
test('v3 elite death plan is deterministic across replay, repeated events, full bag and skip',()=>{
 const w=start();w.stage=2;guided(w)!.step='elite';prepareGuided(w);const before=w.captureRun(),id=guided(w)!.bosses['2'].id;
 w.hit(w.entities.get(id)!,1e8,[],1,'terran');const items=structuredClone(guided(w)!.bosses['2'].items);assert.equal(items.length,2);assert.deepEqual(dropEnemyEquipment(w,w.entities.get(id)!),[]);
 const replay=new World({seed:17});replay.restoreRun(before);replay.hit(replay.entities.get(id)!,1e8,[],1,'terran');assert.deepEqual(guided(replay)!.bosses['2'].items,items);
 for(let i=0;i<64;i++)assert.ok(grantEquipment(w.starship.account,{template:'attribute.1',slot:'offense1',race:'terran',polluted:false},'full:'+i,{kind:'backpack',run:w.runId!}).ok);
 chooseTutorial(w,false);for(const item of items){assert.equal(collectWorldEquipment(w,item.id).ok,false);assert.equal(w.starship.account.locations[item.id].kind,'ground');}
 assert.ok(w.exitShortTutorial(normal));assert.equal(Object.keys(w.starship.account.items).length,66);
 const ordinary=new World({seed:17});ordinary.restoreRun(before);chooseTutorial(ordinary,false);ordinary.hit(ordinary.entities.get(id)!,1e8,[],1,'terran');assert.equal(ordinary.starship.account.tutorial?.status,'skipped');assert.equal(ordinary.expedition.tutorial?.guided?.bosses['2'].receipt,undefined);assert.ok(Object.keys(ordinary.starship.account.items).length<2);
});
test('v3 skip translates real in-flight attacks and economic origins without changing payloads or time',()=>{
 const w=start();until(w,'elite');const boss=w.entities.get(guided(w)!.bosses['2'].id)!,target=w.allies()[0];assert.ok(launchWeaponFlight(w,boss,target,[],0,1));
 const flight=w.weaponFlights.at(-1)!,before=structuredClone(flight),origin=[...w.economicTargets.values()][0]?.origin,oldOrigin=origin?{...origin}:undefined,dx=w.anchor.x,dz=w.anchor.z;
 assert.ok(Math.hypot(dx,dz)>.1);assert.ok(chooseTutorial(w,false));assert.ok(w.exitShortTutorial(normal));
 for(const key of ['from','point','lastSeen'] as const)assert.deepEqual(flight[key],{x:before[key].x-dx,z:before[key].z-dz});
 assert.deepEqual([flight.damage,flight.start,flight.expires,flight.attackId,flight.target],[before.damage,before.start,before.expires,before.attackId,before.target]);
 if(origin&&oldOrigin)assert.deepEqual(origin,{x:oldOrigin.x-dx,z:oldOrigin.z-dz});const copy=new World({seed:17});copy.restoreRun(w.captureRun());assert.deepEqual(copy.weaponFlights,w.weaponFlights);
});

test('v3 a killed drone stays visible as a result before the separate real pickup instruction',()=>{
 const w=start();until(w,'defeat-drone');acknowledgeGuidedSave(w);assert.ok(activateGuidedTarget(w));
 for(let i=0;i<1200&&!guided(w)?.feedback;i++)w.step();const g=guided(w)!;assert.ok(g.feedback);assert.equal(g.step,'defeat-drone');assert.equal(w.pickups.length,1);assert.deepEqual(w.wallet,{minerals:700,gas:200});
 const copy=new World({seed:17});copy.restoreRun(w.captureRun());copy.paused=false;copy.advance(.3);assert.equal(guided(copy)?.step,'defeat-drone');assert.equal(copy.pickups.length,1);copy.advance(.4);assert.equal(guided(copy)?.step,'collect-resources');assert.deepEqual(copy.wallet,w.wallet);
});
test('v3 real resource credit has a brief feedback hold before intermission, survives reload, and cannot pay again',()=>{
 const w=start();until(w,'collect-resources');acknowledgeGuidedSave(w);assert.ok(activateGuidedTarget(w));for(let i=0;i<1200&&!guided(w)?.feedback;i++)w.step();
 assert.equal(w.phase,'battle');assert.equal(guided(w)?.step,'collect-resources');assert.deepEqual(w.wallet,{minerals:800,gas:250});assert.equal(guided(w)?.feedback?.minerals,100);assert.equal(guided(w)?.feedback?.gas,50);assert.equal(w.pickups.length,0);w.endStage();assert.equal(w.phase,'battle');
 const copy=new World({seed:17});copy.restoreRun(w.captureRun());copy.paused=false;copy.advance(.3);assert.equal(copy.phase,'battle');copy.advance(.4);assert.equal(copy.phase,'reward');assert.equal(guided(copy)?.step,'development');const wallet={...copy.wallet};copy.advance(5);assert.deepEqual(copy.wallet,wallet);
 const skipped=new World({seed:17});skipped.restoreRun(w.captureRun());assert.ok(chooseTutorial(skipped,false));assert.equal(skipped.expedition.tutorial?.guided?.feedback,undefined);assert.ok(skipped.exitShortTutorial(normal));assert.deepEqual(skipped.wallet,wallet);assert.equal(skipped.starship.account.tutorial?.status,'skipped');
});
test('v3 intermission feedback restores an already-purchased receipt without buying twice',()=>{
 const w=start();until(w,'development');acknowledgeGuidedSave(w);assert.ok(beginGuidedClick(w,guidedClickRef(w)));assert.ok(withGuidedCommand(w,()=>w.choose(guidedOffer(w)!.offerId)));presentGuidedResult(w);
 const before={...w.wallet},copy=new World({seed:17});copy.restoreRun(w.captureRun());assert.ok(guided(copy)?.feedback);assert.equal(guided(copy)?.step,'development');assert.equal(beginGuidedClick(copy,guidedClickRef(copy)),false);assert.ok(finishGuidedResult(copy));assert.equal(finishGuidedResult(copy),false);assert.equal(guided(copy)?.step,'facilities');assert.deepEqual(copy.wallet,before);
});
