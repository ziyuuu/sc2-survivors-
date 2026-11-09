import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../src/simulation/world.ts';
import {newEquipmentAccount} from '../src/simulation/starship/inventory.ts';
import {setDevelopmentDirection} from '../src/simulation/expedition-economy.ts';
import {SOURCE_PRODUCTION_RECIPES} from '../src/data/expansion-units.ts';
import {DEVELOPMENT} from '../src/data/expedition-buildings.ts';
import {supplyPrice} from '../src/simulation/progression/supply-cards.ts';

const report={date:'2026-11-05',scope:'Design arithmetic and current native base quotations only; proposed 700/200 grant, fixed drops/options and one-seat production gate are NOT implemented.',implemented:false,cases:[],source:[]};
for(const [race,family,line,facilityId,end] of [['terran','marine','barracks','barracks',375],['zerg','zergling','zerg.basic','hatchery',375],['protoss','zealot','gateway','crystal',50]]){
 const w=new World({race,seed:17,waves:false,sandbox:true,equipmentAccount:newEquipmentAccount(17)});w.start();w.wallet={minerals:700,gas:200};w.endStage();setDevelopmentDirection(w,line,w.expedition.shopRevision);
 const facility=w.rewards.find(r=>r.expeditionEffect?.kind==='development'&&r.expeditionEffect.definitionId===facilityId),system=DEVELOPMENT.find(d=>d.id==='system.'+line);assert.ok(facility&&system);
 const body=w.productionCost(family),width=SOURCE_PRODUCTION_RECIPES[family].batchBodyCount,production={minerals:body.minerals*width,gas:body.gas*width},supply=supplyPrice(family,1,'direct');
 let minerals=700,gas=200;const ledger=[{step:'accept',minerals,gas}];
 const add=(step,m,g)=>{minerals+=m;gas+=g;assert.ok(minerals>=0&&gas>=0,step);ledger.push({step,delta:{minerals:m,gas:g},minerals,gas});};
 add('drone-pickup',100,50);add('first-one-seat-job',-production.minerals,-production.gas);add('first-facility',-facility.baseMinerals,-facility.baseGas);add('direct-supply',-supply.minerals,-supply.gas);add('second-one-seat-job',-production.minerals,-production.gas);add('second-window-system',-system.minerals,-system.gas);
 assert.equal(minerals,end);assert.equal(gas,200);
 report.cases.push({race,family,priceMode:'proposed fixed 0% discount / native base price',quotes:{perBody:body,bodiesPerSeat:width,oneSeat:production,facility:{id:facilityId,name:facility.name,minerals:facility.baseMinerals,gas:facility.baseGas},system:{id:system.id,minerals:system.minerals,gas:system.gas},directSupply:supply},ledger});
}
for(const file of ['src/simulation/world.ts','src/simulation/expedition-production.ts','src/simulation/expedition-economy.ts','src/data/expedition-buildings.ts','src/data/expansion-units.ts','src/simulation/progression/supply-cards.ts'])report.source.push({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});
report.passed=true;report.notVerified=['New action gate / receipt implementation','Complete fixed script and legal reward branches','Natural combat completion without protection or damage assistance','Physical devices'];
await fs.writeFile('reports/qa/tutorial-guided-design-20261105.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,scope:report.scope,finalWallets:report.cases.map(x=>({race:x.race,...x.ledger.at(-1)}))}));
