import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {newManagementState} from '../src/ui/starship/host';
import {shopProgress} from '../src/ui/presentation/shop-progress';
const base='reports/local/d05-checkpoint-20261023/fixtures';await fs.mkdir(base,{recursive:true});const records=[];
for(const stage of [1,3,6]){const account=newEquipmentAccount(529),w=new World({equipmentAccount:account,seed:529,terrain:campaignTerrain(chooseCampaignMap(529)),endlessTerrain:new FlatTerrain()}),management=newManagementState();
 for(const slot of ATTRIBUTE_SLOTS){const item=grantEquipment(account,{template:'attribute.3',race:'terran',slot},'fixture:equipped:'+slot,{kind:'warehouse'});assert.ok(item.ok);assert.ok(w.equipItem(item.value.id,slot).ok);}
 for(const [i,slot] of ['offense1','defense1'].entries()){const item=grantEquipment(account,{template:'attribute.4',race:'terran',slot:slot as EquipmentSlot},'fixture:warehouse:'+i,{kind:'warehouse'});assert.ok(item.ok);}
 account.dust=1000;management.presets.terran[0]={...account.equipped.terran};management.presetNames.terran[0]='守望';management.favorites.add('ship-item-1');
 w.start();w.stage=stage;w.prepareStage();w.wallet={minerals:10000,gas:8000};
 const bag=grantEquipment(account,{template:'attribute.4',race:'terran',slot:'offense2'},'fixture:earned:'+stage,{kind:'backpack',run:w.runId!});assert.ok(bag.ok);
 w.endStage();if(w.rewardRound==='building')w.skipReward();shopProgress(w).observe();const run=w.captureRun(),bundle={profile:w.permanentProfile.exportJSON(),run,equipment:run.starship!.runtime.account,management,shopProgress:shopProgress(w).snapshot()},raw=writeArchive(bundle);readArchive(raw);await fs.writeFile(base+'/reward-'+stage+'.json',raw);records.push({file:'reward-'+stage+'.json',stage,run:w.runId,gear:Object.keys(account.items),earned:bag.value.id,wallet:w.wallet,offers:w.rewards.map(r=>({id:r.offerId,name:r.name}))});
 if(stage===3){const corrupt=structuredClone(bundle);corrupt.equipment.locations[bag.value.id]={kind:'equipped'};await fs.writeFile(base+'/invalid-ownership.json',writeArchive(corrupt));}
}
const a=newEquipmentAccount(812),w=new World({equipmentAccount:a,seed:812,terrain:campaignTerrain(chooseCampaignMap(812)),endlessTerrain:new FlatTerrain()});const r=grantEquipment(a,{template:'attribute.3',race:'terran',slot:'defense1'},'fixture:account-only',{kind:'warehouse'});assert.ok(r.ok);await fs.writeFile(base+'/warehouse-only.json',writeArchive({profile:w.permanentProfile.exportJSON(),run:null,equipment:a,management:newManagementState()}));
await fs.writeFile(base+'/manifest.json',JSON.stringify({scope:'Controlled legal native states for persistence/UI; not natural campaign clear evidence',records},null,2));console.log(records.map(r=>({file:r.file,items:r.gear.length,stage:r.stage})));
