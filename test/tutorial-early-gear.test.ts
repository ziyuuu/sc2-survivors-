import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {chooseTutorial,tutorialBeat} from '../src/simulation/tutorial/runtime';
import {collectWorldEquipment} from '../src/simulation/starship/drops';
import {registerEquipmentDrop} from '../src/simulation/starship/loot-presentation';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
function fixture(){const a=newEquipmentAccount(17);a.tutorial={status:'eligible'};const w=new World({seed:17,terrain:campaignTerrain(chooseCampaignMap(17)),sandbox:true,waves:false,equipmentAccount:a});assert.ok(w.start());chooseTutorial(w,true);return w;}
function pickup(w:World,template:string,slot:'offense1'|'logistics'){
 const r=grantEquipment(w.starship.account,{template,race:'terran',slot},'early:'+template,{kind:'ground',run:w.runId!,x:w.anchor.x,z:w.anchor.z});assert.ok(r.ok);registerEquipmentDrop(w,r.value);assert.ok(collectWorldEquipment(w,r.value.id).ok);return r.value;
}
test('an earlier real pickup and intermission outfit do not suppress the later third-campaign-boss plan',()=>{
 const w=fixture(),early=pickup(w,'attribute.1','offense1');w.endStage();assert.equal(tutorialBeat(w),'equip');assert.ok(w.equipItem(early.id,early.slot).ok);assert.equal(w.expedition.tutorial!.attributeEquipped,true);
 while(w.stage<3){while(w.phase==='reward')w.skipReward();if(w.stage<3)w.endStage();}
 const boss=(w as any).spawnCampaignSpecial({at:30,type:'zergling',tier:'boss',role:'boss',budget:10});assert.ok(boss);w.hit(boss,1e8,[],1,'terran',0,1,w.allies()[0].id);const plan=w.expedition.tutorial!.boss!;assert.ok(plan&&[2,3].includes(plan.items.length));
 for(const item of plan.items){const loc=w.starship.account.locations[item.id];assert.equal(loc.kind,'ground');w.anchor.x=loc.x!;w.anchor.z=loc.z!;assert.ok(collectWorldEquipment(w,item.id).ok);}w.endStage();assert.equal(w.expedition.tutorial!.attribute,early.id);assert.equal(tutorialBeat(w),'extract');
});
test('an early module can be extracted before stage three and completes only when that same ID is fitted',()=>{
 const w=fixture(),module=pickup(w,'module.logistics.1','logistics');assert.equal(w.expedition.tutorial!.firstItem,module.id);assert.equal(w.expedition.tutorial!.module,module.id);w.endStage();assert.ok(w.extractEquipment());assert.equal(w.starship.account.locations[module.id].kind,'warehouse');assert.equal(tutorialBeat(w),'flagship');assert.ok(w.equipItem(module.id,module.slot).ok);assert.equal(w.starship.account.tutorial!.status,'completed');assert.equal(w.expedition.tutorial!.boss,undefined);
});
