import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ALL_FAMILIES} from '../src/data/races';
import {draftContext,purchaseOffer} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectReinforcementPool,finishExpeditionDraft,beginExpeditionWindow} from '../src/simulation/progression/expedition-drafts';
import {supplyTier} from '../src/simulation/progression/supply-cards';
import {supplyWorld,familyWorld} from './lib/i03-fixtures.mts';
import {World} from '../src/simulation/world';
const base='reports/local/integration-i03-20261022',report=JSON.parse(await fs.readFile(base+'/cards-paths.json','utf8')),expectedSupply=ALL_FAMILIES.flatMap(f=>['pod','direct'].flatMap(mode=>[1,2,3].filter(n=>n-1>=supplyTier(f)).map(n=>`supply.${mode}.${f}.${n}`))),additional:any[]=[];
for(const family of ALL_FAMILIES){
 const missing=expectedSupply.filter(id=>id.split('.')[2]===family&&!report.rows[id]);if(!missing.length)continue;const {w,witness}=supplyWorld(family),ctx=draftContext(w),pool=inspectReinforcementPool(ctx);for(const id of missing)assert.ok(pool.some(p=>p.id===id),id);
 const found=new Map<string,any>();for(let draw=0;draw<20000&&found.size<missing.length;draw++)for(const offer of drawExpeditionReinforcements(ctx,true))if(missing.includes(offer.id))found.set(offer.id,{draw,offer:structuredClone(offer)});
 for(const id of missing){const sample=found.get(id);assert.ok(sample,id);const {w:buyer}=supplyWorld(family);buyer.rewards=[sample.offer];assert.ok(purchaseOffer(buyer,sample.offer.offerId),id);assert.equal(purchaseOffer(buyer,sample.offer.offerId),false);report.rows[id]={family,buildingSeed:witness.seed,buildingPath:witness.path.map((x:any)=>x.project),...sample,effect:sample.offer.expeditionEffect,purchaseReceipt:sample.offer.purchaseReceipt,verified:'native research path, seeded shelf, paid supply purchase and duplicate rejection'};additional.push(id);}
}
// Dice is intentionally sequential: each higher candidate is generated only after a real prior purchase.
const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());w.wallet={minerals:100000,gas:100000};w.stage=6;w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,6);for(let level=1;level<=5;level++){
 const ctx=draftContext(w);let sample:any;for(let draw=0;draw<15000&&!sample;draw++){const offer=drawExpeditionReinforcements(ctx,true).find(o=>o.expeditionEffect.kind==='funShop'&&o.expeditionEffect.item==='dice'&&o.expeditionEffect.level===level);if(offer)sample={draw,offer};}assert.ok(sample,'dice '+level);w.rewards=[sample.offer];assert.ok(purchaseOffer(w,sample.offer.offerId));assert.equal(w.funShop.levels.dice,level);const id=sample.offer.id;report.rows[id]={family:'marine',...sample,effect:sample.offer.expeditionEffect,purchaseReceipt:sample.offer.purchaseReceipt,verified:'successive actual dice purchase; no direct level injection'};additional.push(id);
 if(level<5){finishExpeditionDraft(w.expedition);w.stage++;beginExpeditionWindow(w.expedition,w.stage);w.rewards=[];}
}
report.additional=additional;report.expectedSupply=expectedSupply;report.missingSupply=expectedSupply.filter(id=>!report.rows[id]);await fs.writeFile(base+'/cards-paths-expanded.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:Object.keys(report.rows).length,supply:expectedSupply.length,missing:report.missingSupply,added:additional.length}));
