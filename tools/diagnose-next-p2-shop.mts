import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES,FAMILIES_BY_RACE,type Race} from '../src/data/races';
import {PRODUCTION_LINES,lineResearch} from '../src/data/expedition-buildings';
import {draftContext} from '../src/simulation/expedition-economy';
import {beginExpeditionWindow,drawExpeditionReinforcements,inspectReinforcementPool} from '../src/simulation/progression/expedition-drafts';
import {supplyEligibility,applySupply} from '../src/simulation/progression/supply-cards';
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const report:any={method:'Engineering fixed seeds 1..1000, three races × four fixtures, actual draft generator. Conditional weights are per rarity before bucket sampling, not unconditional probabilities. No balance acceptance or changed weights.',cases:[],draws:0,walletIdentical:0};
for(const race of ['terran','zerg','protoss'] as Race[])for(const scenario of ['base','mid','full','inflight']){
 const w=new World({rulesVersion:THREE_RACE_RULES,race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();for(const p of Object.values(w.expedition.production))p!.enabled={};w.stage=14;
 if(scenario!=='base')for(const [line,d] of Object.entries(PRODUCTION_LINES))if(d.race===race){if(!w.expedition.facilities.some(f=>f.line===line))w.expedition.facilities.push({id:w.nextId++,kind:line,line:line as any,techLab:false} as any);w.expedition.tech[lineResearch(line as any,'weapon')]=3;w.expedition.tech[lineResearch(line as any,'defense')]=3;}
 if(scenario==='full'){w.entities.clear();w.expedition.familySlots=FAMILIES_BY_RACE[race].slice(0,5);for(const family of w.expedition.familySlots)for(let i=0;i<5;i++)w.addFamilyMember(family,{x:-5+i*2,z:0});}
 if(scenario==='inflight')assert.ok(applySupply(w,FAMILIES_BY_RACE[race][0],2,'pod',{minerals:103,gas:1}));
 beginExpeditionWindow(w.expedition,14);const base=draftContext(w),pool=inspectReinforcementPool(base),eligibility=FAMILIES_BY_RACE[race].flatMap(f=>['pod','direct'].flatMap(mode=>[1,2,3].map(count=>({family:f,mode,count,...supplyEligibility(w,f,count,mode as any)}))));
 const row:any={race,scenario,pool,eligibility,rarities:{},families:{},cards:{},pagesWithRepeatedFamily:0};
 const draw=(seed:number)=>{let id=0;return drawExpeditionReinforcements({...base,state:structuredClone(base.state),currentOffers:[],random:rng(seed),nextOfferId:key=>`${id++}:${key}`},true);};
 for(let seed=1;seed<=1000;seed++){w.wallet={minerals:0,gas:0};const offers=draw(seed);w.wallet={minerals:999999,gas:999999};assert.deepEqual(draw(seed),offers);report.walletIdentical++;const families:string[]=[];for(const offer of offers){row.rarities[offer.rarity]=(row.rarities[offer.rarity]??0)+1;row.cards[offer.id]=(row.cards[offer.id]??0)+1;const effect=offer.expeditionEffect;if('family' in effect){const f=effect.family;families.push(f);row.families[f]=(row.families[f]??0)+1;}}if(new Set(families).size<families.length)row.pagesWithRepeatedFamily++;report.draws++;}
 report.cases.push(row);console.log(race,scenario,'1000 seeds; wallet identical');
}
await fs.mkdir('reports/local/next-p2-20261003',{recursive:true});await fs.writeFile('reports/local/next-p2-20261003/shop-diagnostic.json',JSON.stringify(report,null,2));console.log(JSON.stringify({draws:report.draws,walletIdentical:report.walletIdentical}));
