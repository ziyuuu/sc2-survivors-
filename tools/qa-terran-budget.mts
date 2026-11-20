/** Three branches, the same starting roster, quotes, enemies and fixed-step clock. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectShopWeights} from '../src/simulation/progression/expedition-drafts';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {RARITIES} from '../src/data/rewards';
import {observeWorld} from '../src/simulation/observation';
import type {BuildBranch,BuildCardId} from '../src/simulation/progression/build-progress';
import type {UnitType} from '../src/data/sc2-units';

export const TERRAN_PATHS:Record<BuildBranch,BuildCardId[]>={
 armed:['W01','W04','G01','W05','G02','B03','G04','B04','P01','W06','G03','B01'],
 doomsday:['M-W01','M-W05','M-G01','M-W03','M-G02','M-B03','M-G03','M-B01','M-P01','M-W06','M-G04','M-B04'],
 bio:['BIO-W01','BIO-W02','BIO-G03','BIO-W03','BIO-G02','BIO-B02','BIO-G05','BIO-B04','BIO-P05','BIO-W06','BIO-G06','BIO-B07']
};
export function terranShelf(w:World,id:BuildCardId){
 const ctx={...draftContext(w),currentOffers:[]},rarities=Object.keys(RARITIES),pool=inspectShopWeights(ctx,true).filter(c=>c.weight>0).sort((a,b)=>rarities.indexOf(a.rarity)-rarities.indexOf(b.rarity));
 const entry=(c:typeof pool[number])=>'cardId'in c.expeditionEffect&&c.expeditionEffect.cardId===id;
 const at=pool.findIndex(c=>c.id.endsWith('.'+id));assert.ok(at>=0,'No legal card '+id);const sum=(xs:typeof pool)=>xs.reduce((n,c)=>n+c.weight,0);let first=true;
 ctx.random=()=>{if(!first)return w.random();first=false;return (sum(pool.slice(0,at))+pool[at].weight/2)/sum(pool);};
 w.rewards=drawExpeditionReinforcements(ctx,true);const offer=w.rewards.find(entry as any);assert.ok(offer,id);return offer;
}
export async function runTerranBudget(){
 const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-integration-20261119';await fs.mkdir(out,{recursive:true});const rows:any[]=[];
 for(const points of [3,6,9,12])for(const field of ['crowd','boss','air'])for(const [variant,seed] of [191145,271,89241].entries())for(const branch of ['armed','doomsday','bio'] as const){
  if(process.env.SC2_BUDGET_CASE&&`${branch}:${points}:${field}:${seed}`!==process.env.SC2_BUDGET_CASE)continue;
  const w=new World({race:'terran',seed,waves:false,terrain:new FlatTerrain(),obstacles:[]});assert.ok(w.start());w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;
  w.entities.clear();w.pods=[];w.expedition.ledger=[];for(const group of w.expedition.building!.groups)group.enabled=false;
  w.stage=points===3?4:points===6?8:points===9?12:16;const rank=points===3?1:points===6?3:5;
  const types:UnitType[]=['marine','reaper','marauder','hellion','tank','medivac'];
  const troops=types.map((type,i)=>w.addUnit(type,'terran',(i-2.5)*1.6,0,rank));const tank=troops[4];tank.mode=tank.desiredMode='siege';w.refreshStats(tank);
  // All branches have the same existing hero so each ultimate has a legal beneficiary.
  if(points===12){w.acquireHero('raynor');const hero=w.heroEntity('raynor')!;hero.rank=3;hero.x=0;hero.z=-2;w.refreshStats(hero,true);}
  w.wallet={minerals:10000,gas:10000};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
  const budget={minerals:0,gas:0},nodes:string[]=[];
  for(const id of TERRAN_PATHS[branch].slice(0,points)){
   const offer=terranShelf(w,id);offer.discount=0;offer.minerals=offer.baseMinerals;offer.gas=offer.baseGas;const before={...w.wallet};
   assert.ok(w.purchaseShopOffer(w.draftWindowKey,offer.offerId));budget.minerals+=before.minerals-w.wallet.minerals;budget.gas+=before.gas-w.wallet.gas;
   const choice=pendingBuildChoice(w);if(choice){const card=choice.offers[choice.at===12?variant:0];assert.ok(w.claimBuildChoice(choice.id,w.expedition.shopRevision,card));nodes.push(card);}
  }
  assert.equal(w.expedition.build!.main,branch);const peer=rows.find(r=>r.points===points);if(peer)assert.deepEqual(budget,peer.budget);
  w.phase='battle';w.paused=false;w.time=w.tick=w.stageElapsed=0;w.anchor.x=w.anchor.z=0;
  for(const u of w.allies()){u.hp=u.maxHp;u.weaponCooldown=0;u.lastShotAt=-100;u.shotSequence=0;u.attackTarget=null;u.pendingTarget=null;}
  const victims=Array.from({length:field==='boss'?1:24},(_,i)=>{const type:UnitType=field==='boss'?'ultralisk':field==='air'?'mutalisk':i%3===0?'hydralisk':i%3===1?'roach':'zergling';const e=w.addUnit(type,'zerg',field==='boss'?0:(i%6-2.5)*1.1,field==='boss'?8:6+Math.floor(i/6)*1.1);if(field==='boss'){e.enemyTier='boss';e.hp=e.maxHp=1000000;}return e.id;});
  w.hash.rebuild(w.entities.values());const snapshot=w.captureRun();snapshot.state.rngState=seed;w.restoreRun(snapshot);w.paused=false;
  let damage=0,healed=0,clearSeconds:number|null=null,steps=0;observeWorld(w,(_source,kind,n)=>{if(kind==='damage')damage+=n;if(kind==='healed')healed+=n;});
  const began=performance.now();for(;steps<3600&&w.phase==='battle';steps++){if(process.env.SC2_BUDGET_TRACE&&steps%300===0)console.log(JSON.stringify({trace:true,branch,points,field,seed,steps,time:w.time,bodies:w.entities.size,fields:w.expedition.bio?.fields?.length}));w.step();if(victims.every(id=>(w.entities.get(id)?.hp??0)<=0)){clearSeconds=w.time;break;}if(steps===900){const snap=w.captureRun();w.restoreRun(snap);w.paused=false;}}
  for(const u of w.entities.values())assert.ok(Number.isFinite(u.hp)&&u.hp<=u.maxHp+1e-6&&Number.isFinite(u.weaponDamage),branch+' non-finite body');
  const row={branch,points,field,seed,budget,nodes,rank,seconds:w.time,phase:w.phase,clearSeconds,damage,healed,formalLosses:troops.filter(u=>(w.entities.get(u.id)?.hp??0)<=0).length,targetsAlive:victims.filter(id=>(w.entities.get(id)?.hp??0)>0).length,stepMs:(performance.now()-began)/Math.max(1,steps)};rows.push(row);console.log(JSON.stringify(row));
 }
 const report={scope:'108 controlled 60-second maximum battles; three seeds; real undiscounted purchases and free nodes; identical mixed I/III/V roster; actual AI, deaths and a 15-second save/restore. Not an optimal-build or human campaign win-rate comparison.',rows};
 await fs.writeFile(out+'/budget.json',JSON.stringify(report,null,2));return report;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/qa-terran-budget.mts'))await runTerranBudget();
