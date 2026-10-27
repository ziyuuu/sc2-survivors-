import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {newManagementState} from '../src/ui/starship/host';
import {shopProgress} from '../src/ui/presentation/shop-progress';
const out='.cache/v04-20261027/fixtures';await fs.mkdir(out,{recursive:true});
for(const race of ['terran','zerg','protoss'] as const){
 const account=newEquipmentAccount(529),w=new World({equipmentAccount:account,race,seed:529,terrain:campaignTerrain(chooseCampaignMap(529))}),management=newManagementState();
 const equipped=grantEquipment(account,{template:'attribute.3',race,slot:'offense1'},'v04:equipped:'+race,{kind:'warehouse'});assert.ok(equipped.ok);assert.ok(w.equipItem(equipped.value.id,'offense1').ok);
 const stored=grantEquipment(account,{template:'attribute.4',race,slot:'defense1'},'v04:stored:'+race,{kind:'warehouse'});assert.ok(stored.ok);management.favorites.add(stored.value.id);
 assert.ok(w.start());w.stage=3;w.prepareStage();w.wallet={minerals:10000,gas:8000};
 const bag=grantEquipment(account,{template:'attribute.4',race,slot:'offense2'},'v04:bag:'+race,{kind:'backpack',run:w.runId!});assert.ok(bag.ok);w.endStage();if(w.rewardRound==='building')w.skipReward();shopProgress(w).observe();
 const run=w.captureRun(),raw=writeArchive({profile:w.permanentProfile.exportJSON(),run,equipment:run.starship!.runtime.account,management,shopProgress:shopProgress(w).snapshot()});readArchive(raw);await fs.writeFile(out+'/'+race+'.json',raw);
}
console.log('Three current-format intermission fixtures; kept outside all delivery packages.');
