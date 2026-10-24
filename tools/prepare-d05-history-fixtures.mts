import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {writeArchive,readArchive} from '../src/persistence/archive';
for(const [inventory,receipts] of [[24,200],[500,5000],[1000,50000]]){
 const equipment=newEquipmentAccount(529);equipment.warehouseLevel=3;
 for(let i=0;i<inventory;i++)assert.ok(grantEquipment(equipment,{template:'attribute.3',race:'terran',slot:'offense1'},'item:'+i,{kind:'warehouse'}).ok);
 for(let i=0;i<receipts;i++)equipment.receipts['completed-run:'+i+':reward']=['ship-item-'+(i%inventory+1)];
 const raw=writeArchive({profile:new PermanentProfile().exportJSON(),run:null,equipment});readArchive(raw);await fs.writeFile('reports/local/d05-checkpoint-20261023/fixtures/history-'+inventory+'.json',raw);
}
