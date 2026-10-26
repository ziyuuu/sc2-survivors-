import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {prepareDecision} from './decision-fixture';
import {STATIC_CASES} from './static-catalogue';
const rows=[];
for(const c of STATIC_CASES.filter(c=>c.action==='decision')){
 const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[]});
 try{const result=prepareDecision(w,c.race as 'terran'|'zerg'|'protoss',c.target!);rows.push({id:c.id,status:'prepared',result,pending:{loot:!!w.expedition.pendingTalentLoot,supply:!!w.expedition.pendingShopSupply,shopElite:!!w.expedition.pendingShopElite,receipt:!!w.expedition.pendingReceipt,elite:!!w.eliteChoice,rescue:!!w.eliteRescueChoice}});}
 catch(e){rows.push({id:c.id,status:'failed',error:String(e)});}
}
await fs.writeFile(process.argv[2],JSON.stringify({scope:'Tool fixture setup audit; not UI or gameplay acceptance',rows},null,2));
console.log(JSON.stringify({total:rows.length,failures:rows.filter(r=>r.status==='failed')}));
