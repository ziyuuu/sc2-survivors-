/** Run with node --import tsx. Isolates selling out two white team upgrades; no natural balance claim. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world.ts';
import {draftContext} from '../src/simulation/expedition-economy.ts';
import {drawExpeditionReinforcements,inspectShopWeights} from '../src/simulation/progression/expedition-drafts.ts';
import {teamCardKey} from '../src/simulation/progression/team-cards.ts';
const rows=[],samples=2000;
for(const stage of [1,8,16]){
 const variants=[];
 for(const sold of [false,true]){
  const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.stage=stage;w.prepareStage();w.endStage();w.skipReward();
  if(sold)for(const kind of ['firepower','defense'])w.expedition.cardTotals[teamCardKey(kind,'white')]=3;
  const context=draftContext(w),weights=inspectShopWeights(context,true),total=weights.reduce((n,c)=>n+c.weight,0),bluePurple=weights.filter(c=>c.rarity==='blue'||c.rarity==='purple').reduce((n,c)=>n+c.weight,0);
  let seed=529,count=0,resourceMax=0;context.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let n=0;n<samples;n++){const cards=drawExpeditionReinforcements(context,true);assert.equal(cards.length,3);count+=cards.filter(c=>c.rarity==='blue'||c.rarity==='purple').length;resourceMax=Math.max(resourceMax,cards.filter(c=>c.expeditionEffect.kind==='resource').length);}
  variants.push({soldWhiteTeamCards:sold,firstSlotBluePurpleShare:bluePurple/total,sampledAllSlotsBluePurpleShare:count/(samples*3),maxResourceCards:resourceMax,resourceWeights:weights.filter(c=>c.group==='resource').map(c=>({id:c.id,weight:c.weight}))});
 }
 assert.ok(variants[1].firstSlotBluePurpleShare>variants[0].firstSlotBluePurpleShare);assert.deepEqual(variants[1].resourceWeights,variants[0].resourceWeights);assert.ok(variants.every(v=>v.maxResourceCards<=1));rows.push({stage,variants});
}
await fs.mkdir('reports/local/feedback-actions-20261029',{recursive:true});
await fs.writeFile('reports/local/feedback-actions-20261029/shop-results.json',JSON.stringify({seed:529,shelvesPerCase:samples,scope:'Three stage bands, same one-family fixture before/after selling out white team firepower and defense; no dice, roster or inventory changes between each pair',rows},null,2));
console.log(JSON.stringify(rows.map(({stage,variants})=>({stage,before:variants[0].sampledAllSlotsBluePurpleShare,after:variants[1].sampledAllSlotsBluePurpleShare,firstSlotBefore:variants[0].firstSlotBluePurpleShare,firstSlotAfter:variants[1].firstSlotBluePurpleShare})),null,2));
