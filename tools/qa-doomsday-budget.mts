/** Finite controlled comparison using production purchases, fixed-step combat and real losses. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';
import {draftContext} from '../src/simulation/expedition-economy';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {observeWorld} from '../src/simulation/observation';
import type {BuildCardId} from '../src/simulation/progression/build-progress';
import type {UnitType} from '../src/data/sc2-units';
const out='reports/local/doomsday-20261117';await fs.mkdir(out,{recursive:true});
const paths:{armed:BuildCardId[];doomsday:BuildCardId[]}={armed:['W01','W04','G01','W05','G02','B03','G04','B04','P01'],doomsday:['M-W01','M-W05','M-G01','M-W03','M-G02','M-B03','M-G03','M-B01','M-P01']};
const rows:any[]=[];
for(const points of [3,6,9] as const)for(const field of ['crowd','boss'] as const)for(const branch of ['armed','doomsday'] as const){
 const seed=171145,w=new World({race:'terran',seed,waves:false,terrain:new FlatTerrain(),obstacles:[]});w.start();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];for(const g of w.expedition.building!.groups)g.enabled=false;
 w.stage=points===3?4:points===6?8:12;const rank=points===3?1:points===6?3:5;
 const types:UnitType[]=['marine','marine','hellion','tank','science_vessel'];const troops=types.map((type,i)=>w.addUnit(type,'terran',(i-2)*2,0,rank));troops[3].mode=troops[3].desiredMode='siege';w.refreshStats(troops[3]);w.wallet={minerals:10000,gas:10000};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
 const purchases:{id:string;minerals:number;gas:number}[]=[],nodes:string[]=[];
 for(const id of paths[branch].slice(0,points)){
  let offer;for(let i=0;i<7000;i++){const shelf=drawExpeditionReinforcements({...draftContext(w),currentOffers:[]},true);offer=shelf.find(r=>'cardId'in r.expeditionEffect&&r.expeditionEffect.cardId===id);if(offer){w.rewards=shelf;break;}}
  assert.ok(offer,id); // Normalize only the fixture's quoted discount to compare the approved common budget.
  offer.discount=0;offer.minerals=offer.baseMinerals;offer.gas=offer.baseGas;const before={...w.wallet};assert.ok(w.choose(offer.offerId),id);purchases.push({id,minerals:before.minerals-w.wallet.minerals,gas:before.gas-w.wallet.gas});
  const choice=pendingBuildChoice(w);if(choice){assert.ok(w.claimBuildChoice(choice.id,w.expedition.shopRevision,choice.offers[0]));nodes.push(choice.offers[0]);}
 }
 const budget=purchases.reduce((n,p)=>({minerals:n.minerals+p.minerals,gas:n.gas+p.gas}),{minerals:0,gas:0});assert.deepEqual(budget,points===3?{minerals:190,gas:20}:points===6?{minerals:480,gas:90}:{minerals:945,gas:250});assert.equal(w.expedition.build!.main,branch);
 // Snapshot prepares one common terrain, roster, seed and trigger-before state; combat remains unchanged afterwards.
 w.phase='battle';w.paused=false;w.time=w.tick=w.stageElapsed=0;w.anchor.x=0;w.anchor.z=0;
 for(const u of troops){u.hp=u.maxHp;u.weaponCooldown=0;u.lastShotAt=-100;u.shotSequence=0;u.attackTarget=null;u.pendingTarget=null;}
 const victims=Array.from({length:field==='crowd'?24:1},(_,i)=>{const type:UnitType=field==='boss'?'ultralisk':i%3===0?'hydralisk':i%3===1?'roach':'zergling',u=w.addUnit(type,'zerg',field==='boss'?0:(i%6-2.5)*1.1,field==='boss'?8:6+Math.floor(i/6)*1.1);if(field==='boss'){u.enemyTier='boss';u.hp=u.maxHp=1000000;}return u.id;});
 w.hash.rebuild(w.entities.values());const snap=w.captureRun();snap.state.rngState=seed;w.restoreRun(snap);w.paused=false;
 let damage=0,healed=0,activeTicks=0,cleared:number|null=null;observeWorld(w,(_s,k,n)=>{if(k==='damage')damage+=n;if(k==='healed')healed+=n;});
 for(let tick=0;tick<1800&&w.phase==='battle';tick++){w.step();if(w.allies().some(u=>u.hp>0&&u.weaponDamage>0&&u.lastShotAt>=w.time-1))activeTicks++;if(victims.every(id=>(w.entities.get(id)?.hp??0)<=0)){cleared=w.time;break;}}
 const row={branch,points,field,seed,stage:w.stage,rank,eliteCount:0,budget,cards:paths[branch].slice(0,points),nodes,seconds:w.time,activeSeconds:activeTicks/60,clearSeconds:cleared,damage,healed,formalLosses:troops.filter(u=>(w.entities.get(u.id)?.hp??0)<=0).length,targetsAlive:victims.filter(id=>(w.entities.get(id)?.hp??0)>0).length,damagePerActiveSecond:damage/Math.max(1,activeTicks/60)};rows.push(row);console.log(JSON.stringify(row));
}
await fs.writeFile(out+'/budget.json',JSON.stringify({scope:'One seed; fixed no-elite roster; actual ordinary purchases at normalized undiscounted quotes; real enemy AI and World steps. Comparison is not campaign balance acceptance.',rows},null,2));
