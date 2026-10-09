import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {inspectReinforcementPool,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {supplyEligibility} from '../src/simulation/progression/supply-cards';
import {dropBossLoot} from '../src/simulation/boss-loot';
import {offerView} from '../src/ui/presentation/intermission';
import {referenceCard} from '../src/ui/presentation/reference-card';
const out='reports/local/maintenance-audit-20261008';
const fresh=()=>{const w=new World({race:'terran',seed:10812,terrain:false,waves:false,sandbox:true});assert.ok(w.start());w.wallet={minerals:1e6,gas:1e6};return w;};
const pool=[];
for(const unlocked of [false,true])for(const alive of [false,true])for(const selected of [false,true])for(const enabled of [false,true]){
 const w=fresh();w.expedition.tech['unlock.medivac']=Number(unlocked);const line=w.expedition.production.starport!;line.outputs=selected?['medivac']:[];line.enabled.medivac=enabled;
 if(alive){w.expedition.familySlots.push('medivac');w.addUnit('medivac','terran',0,0,1);}
 const cards=inspectReinforcementPool(draftContext(w)).filter(c=>c.effect.kind==='card'&&c.effect.family==='medivac');
 pool.push({unlocked,alive,selected,enabled,effects:[...new Set(cards.map(c=>c.effect.kind==='card'?c.effect.effect:''))]});
}
const capacity=[];for(const count of [4,5])for(const rank of [1,5]){const w=fresh();for(const u of w.ordinaryUnits('marine'))u.rank=rank;for(let i=w.familySeatCount('marine');i<count;i++)w.addUnit('marine','terran',i,0,rank);for(const amount of [1,2,3])for(const mode of ['direct','pod']as const)capacity.push({members:count,rank,amount,mode,...supplyEligibility(w,'marine',amount,mode)});}
const buildings=[];for(const [building,family]of [['factory','hellion'],['starport','medivac']]as const){
 const w=fresh();if(building==='starport'){w.expedition.tech.factory=1;w.expedition.facilities.push({id:w.expedition.nextFacility++,kind:'factory',line:'factory',techLab:false});}
 w.endStage();assert.ok(w.setDevelopmentDirection(building,w.expedition.shopRevision));let r=(w.rewards as ExpeditionReward[]).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===building);
 for(let n=0;!r&&n<50;n++){assert.ok(w.reroll());r=(w.rewards as ExpeditionReward[]).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===building);}
 assert.ok(r);assert.ok(w.choose(r.offerId));buildings.push({building,family,built:w.expedition.facilities.some(f=>f.kind===building),unlockLevel:w.expedition.tech['unlock.'+family]??0,available:w.isFamilyAvailable(family),outputs:w.expedition.production[building]?.outputs});
}
const w=fresh(),enemy=w.addUnit('roach','zerg',3,3,1);enemy.enemyTier='boss';enemy.hp=0;enemy.deadAt=w.time;assert.ok(dropBossLoot(w,enemy));const reward=w.rewardDrops[0],before=w.allies().length;assert.ok(w.collectRewardDrop(reward.id));const boss={kind:(reward.reward as ExpeditionReward).expeditionEffect.kind,joined:w.allies().length-before,queue:w.expedition.bossLootQueue.length,opensPage:w.expedition.bossLootOpen,blocksPlay:w.requiresPlayerDecision};
const store=fresh();store.endStage();store.skipReward();let discounted:ExpeditionReward|undefined;
for(let n=0;!discounted&&n<50;n++){discounted=(store.rewards as ExpeditionReward[]).find(r=>r.discount&&r.minerals>0);if(!discounted)store.reroll();}
assert.ok(discounted);store.wallet={minerals:0,gas:0};const view=offerView(store,discounted),html=referenceCard(view);
const shortage={name:view.name,discount:view.discount,short:view.short,disabled:html.includes('disabled'),badge:/class="im-card-status">([^<]+)/.exec(html)?.[1],visibleShortage:html.includes('资源不足')};
assert.ok(boss.opensPage&&boss.queue===1&&boss.joined===0);assert.ok(buildings.every(b=>b.built&&!b.available));assert.ok(shortage.short&&!shortage.visibleShortage);assert.ok(capacity.filter(c=>c.members===5&&c.rank===1).every(c=>!c.legal));
const result={at:new Date().toISOString(),method:'Read-only diagnostic probes against actual World commands and draft eligibility. These record current defects and differences; they are not assertions of approved behavior.',pool,capacity,buildings,boss,shortage};
await fs.writeFile(out+'/rules-findings.json',JSON.stringify(result,null,2));console.log(JSON.stringify({poolCases:pool.length,capacityCases:capacity.length,buildings,boss,shortage}));
