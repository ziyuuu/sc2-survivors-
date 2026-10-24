import type {World} from '../world';
import {isDensityCompanion} from '../../data/enemy-tuning';
import type {Entity} from '../types';
import type {Difficulty} from '../../data/stages';
import {ATTRIBUTE_SLOTS,EQUIPMENT_SLOTS,MODULE_SLOTS,failure,type EquipmentAccount,type EquipmentSlot,type Quality} from './types';
import {EQUIPMENT_TEMPLATES,type EquipmentTemplate} from './catalog';
import {equipmentRandom,createEquipmentItem,grantPlannedEquipment,grantEquipment,collectEquipment,dropEquipment,itemsAt} from './inventory';
import {activeEquipmentEffects,equipmentValue} from './modules';
import {BACKPACK_CAPACITY} from './inventory';
import {EQUIPMENT_PICKUP_RADIUS,equipmentGroundDrops,equipmentPickupPathClear,registerEquipmentDrop,recordEquipmentPickup,recordEquipmentBackpackFull,pruneEquipmentLoot} from './loot-presentation';

export type EquipmentDropCategory='ordinary'|'greenSet'|'blueSet'|'lowerPurple'|'purpleSet'|'lowerOrange'|'orangeSet'|'orangeModule'|'special';
export interface EquipmentPoolRow {category:EquipmentDropCategory;quality:Quality;weight:number}
export interface EquipmentDropContext {difficulty:Difficulty;stage:number;endlessRound?:number;tier:'regular'|'elite'|'boss'}
const row=(category:EquipmentDropCategory,quality:Quality,weight:number):EquipmentPoolRow=>({category,quality,weight});
const stages=(c:EquipmentDropContext)=>c.endlessRound?3:Math.min(2,Math.max(0,Math.floor((c.stage-1)/6)));
const ordinary=(qualities:Quality[],weights:readonly number[])=>qualities.map((q,i)=>row('ordinary',q,weights[i])).filter(r=>r.weight>0);
const bases:Record<Difficulty,{rate:number[];qualities:Quality[];weights:number[][]}>={
 easy:{rate:[.001,.0015,.002,.002],qualities:[1,2],weights:[[85,15],[60,40],[35,65],[20,80]]},
 normal:{rate:[.0015,.002,.0025,.0025],qualities:[1,2,3],weights:[[50,45,5],[30,60,10],[15,65,20],[5,65,30]]},
 hard:{rate:[.002,.0025,.003,.003],qualities:[1,2,3],weights:[[20,60,20],[10,55,35],[0,50,50],[0,40,60]]},
 hell:{rate:[.0025,.003,.0035,.0035],qualities:[2,3,4],weights:[[50,45,5],[35,55,10],[20,65,15],[10,70,20]]}
};
// Calibrated against a complete easy campaign + 6–12 endless rounds.
// Only regular-enemy trials change; elite/boss bonus layers retain their approved rates.
export const EASY_REGULAR_EQUIPMENT_RATES=[.027,.027,.023,.015] as const;
const normalElite=[[80,20],[60,40],[40,60],[30,70]],normalBoss=[[80,15,5],[70,20,10],[60,25,15],[50,30,20]],hardElite=[[60,25,15],[50,25,25],[40,25,35],[30,25,45]],hardBoss=[[60,25,15],[50,30,20],[40,40,20],[30,45,25]],hellElite=[[78,20,2],[71,25,4],[64,30,6],[57,35,8]],hellBoss=[[57,25,15,3],[45,25,25,5],[32,25,35,8],[25,25,40,10]];
function orange(weight:number){return [row('orangeSet',5,weight*.7),row('orangeModule',5,weight*.3)];}
export function equipmentDropPolicy(c:EquipmentDropContext){const stage=stages(c),b=bases[c.difficulty],base=ordinary(b.qualities,b.weights[stage]),baseChance=c.difficulty==='easy'&&c.tier==='regular'?EASY_REGULAR_EQUIPMENT_RATES[stage]:b.rate[stage]*(c.tier==='boss'?40:c.tier==='elite'?20:1);let guaranteed:EquipmentPoolRow[]=[];
 if(c.tier!=='regular'){
  const boss=c.tier==='boss';if(c.difficulty==='easy')guaranteed=[row(boss?'greenSet':'ordinary',2,100)];
  if(c.difficulty==='normal'){const p=(boss?normalBoss:normalElite)[stage];guaranteed=boss?[row('blueSet',3,p[0]),row('special',3,p[1]),row('ordinary',4,p[2])]:[row('greenSet',2,p[0]),row('ordinary',3,p[1])];}
  if(c.difficulty==='hard'){const p=(boss?hardBoss:hardElite)[stage];guaranteed=boss?[row('lowerPurple',3,p[0]),row('purpleSet',4,p[1]),row('special',4,p[2])]:[row('blueSet',3,p[0]),row('special',3,p[1]),row('lowerPurple',3,p[2])];}
  if(c.difficulty==='hell'){const p=(boss?hellBoss:hellElite)[stage];guaranteed=boss?[row('purpleSet',4,p[0]),row('special',4,p[1]),row('lowerOrange',4,p[2]),...orange(p[3])]:[row('purpleSet',4,p[0]),row('special',4,p[1]),...orange(p[2])];}
 }
 const additional:EquipmentPoolRow[]=c.difficulty==='easy'?[row('ordinary',3,100)]:c.difficulty==='normal'?[row('lowerPurple',3,100)]:c.difficulty==='hard'?[row('lowerOrange',4,40),row('purpleSet',4,60)]:[row('lowerOrange',4,60),...orange(40)];
 return {baseChance,base,guaranteed,additional,additionalChance:c.tier==='boss'&&c.endlessRound?Math.min(.5,.2+.05*Math.floor((c.endlessRound-1)/6)):0,pollutionChance:c.endlessRound&&c.difficulty==='hell'?.15:c.endlessRound&&c.difficulty==='hard'?.1:.05};
}
function weighted<T>(pool:readonly T[],weight:(t:T)=>number,random:()=>number):T {const sum=pool.reduce((s,t)=>s+weight(t),0);if(!pool.length||sum<=0)throw Error('舰装掉落池缺少合法模板');let n=random()*sum;for(const t of pool){n-=weight(t);if(n<0)return t;}return pool.at(-1)!;}
export function categoryTemplates(category:EquipmentDropCategory,quality:Quality){return Object.values(EQUIPMENT_TEMPLATES).filter(t=>t.quality===quality&&(category==='ordinary'?t.kind==='attribute'||t.kind==='module':category==='special'?t.kind==='special':category==='orangeModule'?t.kind==='module':category==='greenSet'?t.kind==='set'&&t.quality===2:category==='blueSet'?t.setFamily?.startsWith('blue.'):category==='lowerPurple'?t.setFamily?.startsWith('advanced.'):category==='purpleSet'?t.setFamily?.startsWith('advanced.')||t.setFamily?.startsWith('special.'):t.setFamily?.startsWith('orange.')));}
export function categorySlots(category:EquipmentDropCategory,quality:Quality):readonly EquipmentSlot[]{if(category==='ordinary')return EQUIPMENT_SLOTS;if(category==='orangeModule')return MODULE_SLOTS;if(category==='special')return ATTRIBUTE_SLOTS.filter(slot=>categoryTemplates(category,quality).some(t=>t.slots.includes(slot)));return ATTRIBUTE_SLOTS;}
/** Exempt templates get their ordinary share before the single pollution trial. */
export function rollEquipmentTemplate(a:EquipmentAccount,chosen:EquipmentPoolRow,pollutionChance:number){const random=()=>equipmentRandom(a),slots=categorySlots(chosen.category,chosen.quality),slot=weighted(slots,()=>1,random),legal=categoryTemplates(chosen.category,chosen.quality).filter(t=>t.slots.includes(slot)),normal=legal.filter(t=>t.pollution!=='required');
 const weight=(t:EquipmentTemplate)=>t.rare?1:3,ordinary=weighted(normal,weight,random);let template=ordinary,polluted=false;
 if(ordinary.pollution!=='never'&&random()<pollutionChance){polluted=true;template=weighted(legal.filter(t=>t.pollution!=='never'),weight,random);}return {template:template.id,slot,polluted};
}
export function qualityWeightedPool(w:World,pool:readonly EquipmentPoolRow[],boss:boolean){if(!pool.length)return [];const highest=Math.max(...pool.map(r=>r.quality)),effects=activeEquipmentEffects(w).filter(e=>['adventurer','adventurer_replace'].includes(e.key)||boss&&['boss_quality','equipment_drop'].includes(e.key));if(!effects.length)return pool.map(r=>({...r}));
 const quality=Math.max(...effects.map(e=>e.quality??0)),candidates=effects.filter(e=>e.quality===quality).map(e=>{const adventure=e.key.startsWith('adventurer');const rows=pool.map(r=>({...r,weight:r.weight*(adventure?r.quality>=4?e.values[1]:1:r.quality===highest?1+e.values[0]:1)})),sum=rows.reduce((n,r)=>n+r.weight,0);return {rows,qualityMass:[5,4,3,2,1].map(q=>rows.filter(r=>r.quality===q).reduce((n,r)=>n+r.weight,0)/sum)};});
 candidates.sort((a,b)=>{for(let i=0;i<a.qualityMass.length;i++){const diff=b.qualityMass[i]-a.qualityMass[i];if(Math.abs(diff)>1e-12)return diff;}return 0;});return candidates[0].rows;
}
export function markDerivedEquipmentEnemy(w:World,u:Entity){w.starship.derivedEnemies.add(u.id);}
/** Relative rate bonus on the optional base layer only; guaranteed quantities and quality weights are separate. */
export function equipmentBaseDropChance(w:World,chance:number){return Math.min(1,chance*(1+equipmentValue(w,'equipment_drop_chance')));}
export function dropEnemyEquipment(w:World,u:Entity){if(u.fun||u.encounter||u.mission?.noLoot)return [];if(isDensityCompanion(u))return [];const a=w.starship.account,run=a.run;if(!w.starship.enabled||!run||run.ended||u.owner!=='zerg'||u.summonKind||u.temporary||u.attributes.includes('Structure')||w.starship.derivedEnemies.has(u.id))return [];
 const receipt='equipment-enemy:'+u.id+':'+u.bornAt;if(run.receipts.has(receipt))return [];run.receipts.add(receipt);
 const tier=u.enemyTier==='boss'||u.enemyTier==='lord'?'boss':u.enemyTier==='elite'?'elite':'regular',context={difficulty:w.difficulty,stage:w.stage,endlessRound:w.endless?.round,tier} as const,policy=equipmentDropPolicy(context),random=()=>equipmentRandom(a),layers:readonly [string,number,EquipmentPoolRow[]][]=[['base',equipmentBaseDropChance(w,policy.baseChance),policy.base],['guaranteed',tier==='regular'?0:1,policy.guaranteed],['endless',policy.additionalChance,policy.additional]],created:string[]=[];
 for(const [layer,chance,pool] of layers){if(!chance||chance<1&&random()>=chance)continue;const chosen=weighted(qualityWeightedPool(w,pool,tier==='boss'),r=>r.weight,random),input=rollEquipmentTemplate(a,chosen,policy.pollutionChance),result=grantEquipment(a,{...input,race:run.race},run.id+':'+receipt+':'+layer,{kind:'ground',run:run.id,x:u.x,z:u.z});if(!result.ok)throw Error(result.error);registerEquipmentDrop(w,result.value);created.push(result.value.id);}
 if(created.length)w.changed();return created;
}
export function collectNearbyEquipment(w:World){
 if(!w.starship.enabled||w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 pruneEquipmentLoot(w);if(itemsAt(w.starship.account,'backpack').length<BACKPACK_CAPACITY)w.starship.loot.fullNotified=false;
 const serial=w.starship.loot.serial;for(const drop of equipmentGroundDrops(w)){
  if(Math.hypot(drop.x-w.anchor.x,drop.z-w.anchor.z)>EQUIPMENT_PICKUP_RADIUS||!equipmentPickupPathClear(w,drop))continue;
  const got=collectReachableEquipment(w,drop);if(!got.ok&&got.error==='背包已满')break;
 }if(serial!==w.starship.loot.serial)w.changed();
}
/** The UI host and automatic pickup share this port. An explicit UI action may run under its pause lease. */
export function collectWorldEquipment(w:World,id:string){
 const serial=w.starship.loot.serial,result=collectEquipmentAt(w,id);if(serial!==w.starship.loot.serial)w.changed();return result;
}
export function dropWorldEquipment(w:World,id:string,revision=w.starship.account.revision){
 if(!w.starship.enabled||!['battle','reward','won','endless-ready'].includes(w.phase))return failure('当前不能丢弃装备');
 const result=dropEquipment(w.starship.account,id,{x:w.anchor.x+3.5,z:w.anchor.z},revision);
 if(result.ok){w.starship.loot.ground.delete(id);registerEquipmentDrop(w,result.value);w.changed();}return result;
}
function collectEquipmentAt(w:World,id:string){
 if(!['battle','reward','won','endless-ready'].includes(w.phase))return failure('当前不能拾取');
 const drop=equipmentGroundDrops(w).find(d=>d.item.id===id);if(!drop)return failure('装备不在当前战场');
 if(Math.hypot(drop.x-w.anchor.x,drop.z-w.anchor.z)>EQUIPMENT_PICKUP_RADIUS||!equipmentPickupPathClear(w,drop))return failure('请先靠近可达的战利品');
 return collectReachableEquipment(w,drop);
}
/** Consume the just-validated synchronous candidate; inventory still validates location and capacity. */
function collectReachableEquipment(w:World,drop:ReturnType<typeof equipmentGroundDrops>[number]){
 const result=collectEquipment(w.starship.account,drop.item.id);
 if(result.ok){w.starship.loot.fullNotified=false;recordEquipmentPickup(w,result.value,drop);}
 else if(result.error==='背包已满')recordEquipmentBackpackFull(w,drop);
 return result;
}
/** Explicit equipment reward is separate from the three natural drop layers. */
export function dropPlunderEquipment(w:World,u:Entity){if(u.mission?.noLoot)return;const a=w.starship.account,run=a.run;if(!run||!w.starship.enabled||run.ended)return;const receipt=run.id+':plunder-gear:'+u.id+':'+u.bornAt;if(run.receipts.has(receipt))return;
 const policy=equipmentDropPolicy({difficulty:w.difficulty,stage:w.stage,endlessRound:w.endless?.round,tier:'boss'}),legal=[...policy.guaranteed,...(policy.additionalChance?policy.additional:[])],high=legal.filter(r=>r.quality>=4),pool=high.length?high:legal.filter(r=>r.quality===Math.max(...legal.map(r=>r.quality))),chosen=weighted(qualityWeightedPool(w,pool,true),r=>r.weight,()=>equipmentRandom(a)),input=rollEquipmentTemplate(a,chosen,policy.pollutionChance);const result=grantEquipment(a,{...input,race:run.race},receipt,{kind:'ground',run:run.id,x:u.x,z:u.z});if(!result.ok)throw Error(result.error);run.receipts.add(receipt);registerEquipmentDrop(w,result.value);w.changed();return result.value;
}

export interface TaskEquipmentPlan {receipt:string;context:EquipmentDropContext;items:{layer:string;item:import('./types').EquipmentItem}[]}
export function planTaskEquipment(w:World,context:EquipmentDropContext,receipt:string):TaskEquipmentPlan|null {
 const a=w.starship.account;if(!w.starship.enabled||!a.run||a.run.ended)return null;
 const policy=equipmentDropPolicy(context),random=()=>equipmentRandom(a),items:TaskEquipmentPlan['items']=[];
 for(const [layer,chance,pool] of [['base',equipmentBaseDropChance(w,policy.baseChance),policy.base],['guaranteed',1,policy.guaranteed],['endless',policy.additionalChance,policy.additional]] as const){
  if(!chance||chance<1&&random()>=chance)continue;
  const selected=weighted(qualityWeightedPool(w,pool,context.tier==='boss'),r=>r.weight,random),input=rollEquipmentTemplate(a,selected,policy.pollutionChance),result=createEquipmentItem(a,{...input,race:a.run.race});
  if(!result.ok)throw Error(result.error);items.push({layer,item:result.value});
 }
 return {receipt,context:{...context},items};
}
export function deliverTaskEquipment(w:World,plan:TaskEquipmentPlan,p:{x:number;z:number}){
 const a=w.starship.account,run=a.run;if(!run||run.ended)return false;if(run.receipts.has(plan.receipt))return true;
 for(const {layer,item} of plan.items){const key=plan.receipt+':'+layer;if(a.receipts[key])continue;const result=grantPlannedEquipment(a,item,key,{kind:'ground',run:run.id,...p});if(!result.ok)throw Error(result.error);registerEquipmentDrop(w,result.value);}
 run.receipts.add(plan.receipt);w.changed();return true;
}

/** Fixed-count ordinary loot: normal quality pool, no ordinary zero-drop trial.
 * Highest-quality guarantee is restricted to this same campaign ordinary pool. */
export function planOrdinaryEncounterEquipment(w:World,context:EquipmentDropContext,receipt:string,count:number,highest=false,allHighest=false):TaskEquipmentPlan|null {
 const a=w.starship.account;if(!w.starship.enabled||!a.run||a.run.ended)return null;
 const c:EquipmentDropContext={difficulty:context.difficulty,stage:context.stage,tier:'regular'};
 const policy=equipmentDropPolicy(c),pool=policy.base.filter(r=>r.weight>0),max=Math.max(...pool.map(r=>r.quality)),random=()=>equipmentRandom(a),items:TaskEquipmentPlan['items']=[];
 for(let i=0;i<count;i++){
  const legal=highest&&(allHighest||i===count-1)?pool.filter(r=>r.quality===max):pool;
  const chosen=weighted(qualityWeightedPool(w,legal,false),r=>r.weight,random),input=rollEquipmentTemplate(a,chosen,policy.pollutionChance),result=createEquipmentItem(a,{...input,race:a.run.race});
  if(!result.ok)throw Error(result.error);items.push({layer:'item:'+i,item:result.value});
 }
 return {receipt,context:c,items};
}

/** A guaranteed single item. Pool weights select content; no zero-drop trial. */
export function planOffensiveEncounterEquipment(w:World,context:EquipmentDropContext,receipt:string):TaskEquipmentPlan|null {
 const a=w.starship.account;if(!w.starship.enabled||!a.run||a.run.ended)return null;
 const c:EquipmentDropContext={difficulty:context.difficulty,stage:context.stage,tier:'regular'},policy=equipmentDropPolicy(c),random=()=>equipmentRandom(a);
 const chosen=weighted(qualityWeightedPool(w,policy.base,false),r=>r.weight,random),slot=ATTRIBUTE_SLOTS.filter(s=>s.startsWith('offense'))[Math.floor(random()*4)];
 const legal=categoryTemplates(chosen.category,chosen.quality).filter(t=>t.slots.includes(slot)),normal=legal.filter(t=>t.pollution!=='required'),weight=(t:EquipmentTemplate)=>t.rare?1:3;
 let template=weighted(normal,weight,random),polluted=false;if(template.pollution!=='never'&&random()<policy.pollutionChance){polluted=true;template=weighted(legal.filter(t=>t.pollution!=='never'),weight,random);}
 const result=createEquipmentItem(a,{template:template.id,slot,polluted,race:a.run.race});if(!result.ok)throw Error(result.error);
 return {receipt,context:c,items:[{layer:'guaranteed',item:result.value}]};
}
export function planSingleBossEncounterEquipment(w:World,context:EquipmentDropContext,receipt:string):TaskEquipmentPlan|null {
 const a=w.starship.account;if(!w.starship.enabled||!a.run||a.run.ended)return null;
 const policy=equipmentDropPolicy(context),random=()=>equipmentRandom(a),pool=policy.additionalChance&&random()<policy.additionalChance?policy.additional:policy.guaranteed;
 const chosen=weighted(qualityWeightedPool(w,pool,true),r=>r.weight,random),input=rollEquipmentTemplate(a,chosen,policy.pollutionChance),result=createEquipmentItem(a,{...input,race:a.run.race});if(!result.ok)throw Error(result.error);
 return {receipt,context:{...context},items:[{layer:'guaranteed',item:result.value}]};
}
