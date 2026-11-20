/** Native damage over time, with legal equipment and equal quoted card budgets. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,validateItem} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,isOffensiveSlot,type Quality,type Affix} from '../src/simulation/starship/types';
import {equipmentCardTotals,equipmentCardDamage} from '../src/simulation/starship/card-effects';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {observeWorld} from '../src/simulation/observation';
import {TERRAN_PATHS,terranShelf} from './qa-terran-budget.mts';
import type {BuildBranch} from '../src/simulation/progression/build-progress';

const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-rules-dps-20261119';
const seconds=Number(process.env.SC2_DPS_SECONDS??120),seed=Number(process.env.SC2_DPS_SEED??191145);
await fs.mkdir(out,{recursive:true});
const rows:any[]=process.env.SC2_DPS_RESUME?JSON.parse(await fs.readFile(out+'/dps.json','utf8')).rows:[];
const sixRoster=process.env.SC2_DPS_ROSTER;
const mixedRosters={ground:['marine','reaper','ghost','widow_mine','cyclone'],air:['marine','reaper','raven','liberator','battlecruiser']} as const;
if(sixRoster&&!(sixRoster in mixedRosters))throw Error('Unknown roster '+sixRoster);
for(const field of ['boss','crowd','air'] as const)for(const quality of [0,1,2,3,4,5] as const)for(const variant of (sixRoster?[0]:[0,1,2]))for(const branch of ['armed','doomsday','bio'] as BuildBranch[]){
 const key=(sixRoster?sixRoster+':':'')+`${branch}:${quality}:${field}:${variant}`;if(rows.some(r=>r.key===key&&r.seconds>=seconds-.01&&r.seed===seed))continue;
 if(process.env.SC2_DPS_CASE&&!new RegExp(process.env.SC2_DPS_CASE).test(key))continue;
 const w=new World({race:'terran',seed,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 for(const [i,slot] of ATTRIBUTE_SLOTS.entries())if(quality){
  const template=quality===5?(i<6?'set.orange.survivor.5':'set.orange.army.5'):'attribute.'+quality;
  const result=grantEquipment(w.starship.account,{template,race:'terran',slot,...(quality===5&&i>=6?{binding:{direction:'barracks' as const}}:{})},`dps:${slot}`,{kind:'warehouse'});
  assert.ok(result.ok,result.ok?'':result.error);const item=result.value;item.allocation=2;
  const keys:Affix[]=isOffensiveSlot(slot)?['attack','trueDps','crit','critDamage']:['health','defense','reduction','dodge'];
  item.affixes=item.affixes.map((_,i)=>({key:keys[i],score:150}));assert.ok(validateItem(item));assert.ok(w.equipItem(item.id,slot).ok);
 }
 assert.ok(w.start());w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 w.expedition.familySlots=sixRoster?[...mixedRosters[sixRoster as keyof typeof mixedRosters]]:['marine','reaper','marauder','tank','viking'];w.stage=16;
 const initialIds:number[]=[];
 for(const [i,type] of w.expedition.familySlots.entries())for(let j=0;j<2;j++){
  const u=w.addUnit(type,'terran',(i-2)*2.4, j*1.8-2,5);if(type==='tank'){u.mode=u.desiredMode='siege';w.refreshStats(u);}initialIds.push(u.id);
 }
 assert.ok(w.acquireHero('raynor'));const hero=w.heroEntity('raynor')!;hero.rank=3;hero.x=0;hero.z=-4;w.refreshStats(hero,true);
 w.wallet={minerals:100000,gas:100000};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
 const budget={minerals:0,gas:0},nodes:string[]=[];
 for(const id of TERRAN_PATHS[branch]){
  const offer=terranShelf(w,id);offer.discount=0;offer.minerals=offer.baseMinerals;offer.gas=offer.baseGas;
  const before={...w.wallet};assert.ok(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),id);budget.minerals+=before.minerals-w.wallet.minerals;budget.gas+=before.gas-w.wallet.gas;
  const node=pendingBuildChoice(w);if(node){const id=node.offers[node.at===12?variant:0];assert.ok(w.claimBuildChoice(node.id,w.expedition.shopRevision,id));nodes.push(id);}
 }
 assert.deepEqual(budget,{minerals:1235,gas:320});
 w.phase='battle';w.paused=false;w.tick=0;w.time=w.stageElapsed=0;w.anchor.x=w.anchor.z=0;
 for(const u of w.allies()){u.hp=u.maxHp;u.weaponCooldown=0;u.lastShotAt=-100;u.shotSequence=0;u.attackTarget=u.pendingTarget=null;}
 const count=field==='boss'?1:12,targets:number[]=[],spawns:number[]=[];
 const spawn=(i:number)=>{
  const u=w.addUnit(field==='boss'?'ultralisk':field==='air'?'mutalisk':i%3===0?'hydralisk':i%3===1?'roach':'zergling','zerg',field==='boss'?0:(i%4-1.5)*2.2,field==='boss'?8:6+Math.floor(i/4)*2.2);
  u.hp=u.maxHp=field==='boss'?50000:1000;u.armor=field==='boss'?10:3;u.moveSpeed=u.weaponDamage=0;u.stoppedUntil=seconds+1;
  if(field==='boss')u.enemyTier='boss';targets[i]=u.id;spawns.push(u.id);
 };
 for(let i=0;i<count;i++)spawn(i);w.hash.rebuild(w.entities.values());
 let damage=0,burst=0,steady=0,healed=0,kills=0;const sources:Record<string,number>={},effects:Record<string,number>={};
 observeWorld(w,(source,kind,n)=>{if(kind==='damage'){damage+=n;if(w.time<=10+1e-8)burst+=n;if(w.time>seconds/2)steady+=n;sources[source]=(sources[source]??0)+n;}if(kind==='healed')healed+=n;});
 const incoming:any[]=[];
 if(process.env.SC2_DPS_DIAG){const hit=w.hit.bind(w);w.hit=((...args:Parameters<World['hit']>)=>{const target=args[0],hp=target.hp;hit(...args);if(target.owner==='terran'&&target.hp<hp&&incoming.length<40)incoming.push({time:w.time,target:target.id,type:(target as any).unitType,hp,after:target.hp,owner:args[4],source:args[7],sourceType:w.entities.get(args[7] as number)?.unitType,stopped:w.entities.get(args[7] as number)?.stoppedUntil});}) as World['hit'];}
 let lastEvent=0;const start=performance.now();
 for(let n=0;n<Math.round(seconds*60);n++){
  if(n%600===0)console.log(JSON.stringify({progress:key,tick:n,entities:w.entities.size,time:w.time}));assert.equal(w.phase,'battle',key+' left native battle');w.step();
  for(const e of w.visualEvents)if(e.serial>lastEvent){const name=e.bioResponse??e.bioEffect??e.doomsdayEffect??e.kind;effects[name]=(effects[name]??0)+1;lastEvent=Math.max(lastEvent,e.serial);}
  for(let i=0;i<count;i++)if((w.entities.get(targets[i])?.hp??0)<=0){kills++;spawn(i);}
 }
 for(const u of w.entities.values())assert.ok([u.hp,u.maxHp,u.weaponDamage,u.attackPeriod,u.unitRadius].every(Number.isFinite),key+' non-finite actor');
 const row={key,roster:[...w.expedition.familySlots],branch,quality:quality as 0|Quality,field,variant,seed,seconds:w.time,budget,nodes,orange:w.expedition.build!.orange,dps:damage/seconds,burstDps:burst/Math.min(seconds,10),steadyDps:steady/(seconds/2),damage,healed,kills,initialBodiesAbsent:initialIds.filter(id=>(w.entities.get(id)?.hp??0)<=0).length,incoming,remainingInitial:process.env.SC2_DPS_DIAG?initialIds.map(id=>({id,unit:w.entities.get(id)})):undefined,cardMultiplier:equipmentCardDamage(w,1),gear:equipmentCardTotals(w),sources,effects,wallSeconds:(performance.now()-start)/1000};
 rows.push(row);console.log(JSON.stringify({key,dps:Math.round(row.dps),steady:Math.round(row.steadyDps),kills,initialBodiesAbsent:row.initialBodiesAbsent,wallSeconds:row.wallSeconds}));
 await fs.writeFile(out+'/dps.json',JSON.stringify({scope:sixRoster?'Same-budget five-family six-unit matrix, '+sixRoster:'162 fixed-seed 120-second target-dummy runs, all three ultimates per branch, five identical V-rank families (two members each) plus III Raynor. Twelve actual paid cards, equal undiscounted mineral/gas budgets, real free nodes. Targets are stopped; native friendly splash, targeting, movement, deaths and on-kill procs remain active. Initial bodies absent includes O03 consolidation as well as actual loss; each dead target replaced with a fresh finite-health entity. No modules; eight actual attribute-slot items, allocation 2 and score 150. Orange uses six survivor plus two army items; no attack set or opening troop grant. Not an optimal build, survival, campaign win-rate or physical-device benchmark.',seconds,seed,rows},null,2));
}
