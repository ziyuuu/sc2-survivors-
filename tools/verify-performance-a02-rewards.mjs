import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-a02-20261020',revision=process.argv[2]??'candidate-r1';
const libs={baseline:await import('../'+root+'/baseline-logic/main.mjs'),candidate:await import('../'+root+'/'+revision+'-logic/main.mjs')};
const hash=x=>createHash('sha256').update(x).digest('hex'),rows=[];
const encode=x=>JSON.stringify(x,(_key,v)=>v instanceof Map?{map:[...v]}:v instanceof Set?{set:[...v]}:v);
function make(lib,race,seed,enemies){
 const w=new lib.World({race,seed,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:lib.newEquipmentAccount(seed)});assert.ok(w.start());
 const old=w.runId;w.runId='00000000-0000-4000-8000-000000000529';w.starship.account.run.id=w.runId;
 if(w.expedition.support.stageReceipt?.startsWith(old+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(old.length);
 w.wallet={minerals:10000,gas:10000};w.pods=[];w.expedition.ledger=[];
 for(let i=0;i<enemies;i++)w.addUnit('zergling','zerg',5+i%15,5+Math.floor(i/15));
 return w;
}
function state(lib,w){return {run:lib.selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account};}
for(const race of ['terran','zerg','protoss'])for(const seed of [1,529,917])for(const enemies of [0,300]){
 const worlds=Object.fromEntries(Object.entries(libs).map(([k,lib])=>[k,make(lib,race,seed,enemies)]));
 const check=async(label,fn)=>{
  const results={};for(const [key,lib]of Object.entries(libs)){const w=worlds[key],result=fn(lib,w);results[key]=encode({result,world:state(lib,w)});}
  if(results.baseline!==results.candidate){await fs.writeFile(`${root}/reward-mismatch-baseline.json`,results.baseline);await fs.writeFile(`${root}/reward-mismatch-candidate.json`,results.candidate);assert.fail(`${race}/${seed}/${enemies}/${label}`);}
  rows.push({race,seed,enemies,label,sha256:hash(results.baseline),bytes:results.baseline.length});
 };
 await check('initial-context',(lib,w)=>lib.draftContext(w));
 for(let round=0;round<8;round++){
  await check('boss-draw-'+round,(lib,w)=>lib.drawBossLoot(lib.draftContext(w),'receipt-'+round,round%3===0?'orange':round%3===1?'purple':undefined));
  await check('equipment-draw-'+round,(lib,w)=>lib.drawEquipmentUnitLoot(lib.draftContext(w),'equipment-'+round));
 }
 await check('actual-boss-death',(_lib,w)=>{const e=w.addUnit('roach','zerg',8,8);e.enemyTier='boss';w.hit(e,1e9,[],1,'terran',0,1);return w.rewardDrops.at(-1);});
 await check('actual-boss-collect',(lib,w)=>lib.collectBossLoot(w,w.rewardDrops.find(d=>d.bossLootReceipt)));
 await check('repeat-collect',(lib,w)=>{const drop=w.rewardDrops.find(d=>d.bossLootReceipt);return drop?lib.collectBossLoot(w,drop):false;});
 await check('hero-acquire-and-promote',(lib,w)=>{
  for(const id of lib.ALL_HERO_IDS.filter(id=>lib.HEROES[id].race===race).slice(0,3))for(let n=0;n<5;n++)w.acquireHero(id);
  return lib.draftContext(w);
 });
 await check('saturated-unit-pool',(lib,w)=>[lib.drawBossLoot(lib.draftContext(w),'saturated'),lib.drawEquipmentUnitLoot(lib.draftContext(w),'saturated-gear')]);
 await check('hero-death-current-eligibility',(lib,w)=>{const id=[...w.heroes.keys()][0],u=w.heroEntity(id);if(u)w.hit(u,1e9,[],1,'zerg',0,1);return lib.draftContext(w);});
 await check('post-death-pool',(lib,w)=>[lib.drawBossLoot(lib.draftContext(w),'post-death'),lib.drawEquipmentUnitLoot(lib.draftContext(w),'post-death-gear')]);
 await check('end-stage',(_lib,w)=>{w.endStage();return w.rewards;});
 await check('open-shop',(_lib,w)=>{if(w.rewardRound==='building')w.skipReward();return w.rewards;});
 await check('eligibility',(_lib,w)=>w.rewards.map(r=>w.canChooseReward(r)));
 await check('purchase',(_lib,w)=>{const r=w.rewards.find(r=>w.canChooseReward(r)&&r.expeditionEffect?.kind==='teamCard');return r?w.choose(r.offerId):null;});
 await check('refresh',(_lib,w)=>w.reroll());
 await check('post-purchase-context',(lib,w)=>lib.draftContext(w));
 await check('next-stage',(_lib,w)=>w.skipReward());
}
await fs.writeFile(`${root}/reward-equivalence-${revision}.json`,JSON.stringify({pass:true,rows:rows.length,cases:18,scope:'Production World/real boss collection and shop operations; same RNG, full selected run/status/special/account state. Direct draws and forced deaths are bounded fixtures, not natural campaign.',comparisons:rows},null,2)+'\n');
console.log(JSON.stringify({pass:true,cases:18,comparisons:rows.length}));
