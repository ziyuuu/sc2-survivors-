import type {World} from '../world';
import type {SpecialResource} from './state';
import {planOrdinaryEncounterEquipment,deliverTaskEquipment,equipmentDropPolicy,qualityWeightedPool,categoryTemplates,type EquipmentPoolRow,type TaskEquipmentPlan} from '../starship/drops';
import {equipmentRandom,createEquipmentItem,collectEquipment} from '../starship/inventory';
import {recordEquipmentPickup,registerEquipmentDrop} from '../starship/loot-presentation';
function weighted<T>(w:World,pool:readonly T[],weight:(item:T)=>number):T{let roll=equipmentRandom(w.starship.account)*pool.reduce((n,p)=>n+weight(p),0);if(!pool.length)throw Error('特殊关奖励池为空');for(const p of pool){roll-=weight(p);if(roll<0)return p;}return pool.at(-1)!;}
export function initializeResources(w:World){
 const a=w.specialStages.active!,chapter=Math.floor((a.stage-1)/6),pressure={easy:1,normal:1.4,hard:2.5,hell:4}[w.difficulty]*(1+chapter*.8);
 const specs:readonly [SpecialResource['kind'],number,number,readonly [number,number]][]=[['mineral',12,120,[20,0]],['rich',6,350,[65,0]],['large',3,900,[180,0]],['gas',6,300,[0,24]],['chest',3,600,[0,0]],['highChest',2,1400,[0,0]]];
 const all=specs.flatMap(([kind,count,hp,amount])=>Array.from({length:count},()=>({kind,hp,amount})));
 for(let i=all.length-1;i>0;i--){const j=Math.floor(w.random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
 all.forEach((r,i)=>{const id=w.nextId++,x=(i%7-3)*7.2,z=(Math.floor(i/7)-2)*8,b:SpecialResource={id,x,z,hp:r.hp*pressure,maxHp:r.hp*pressure,armor:0,unitRadius:r.kind==='large'?1.2:.8,flying:false,attributes:['Structure'],owner:'zerg',kind:r.kind,paid:false,amount:r.amount};a.resources.set(id,b);});
}
export function resolveSpecialResource(w:World,id:number){
 const a=w.specialStages.active,b=a?.resources.get(id);if(!a||a.kind!=='resources'||a.phase!=='active'||!b||b.hp>0||b.paid)return false;
 b.paid=true;w.effect('explosion',b,b,1,.3);
 if(b.kind==='chest'||b.kind==='highChest'){const high=b.kind==='highChest',plan=planOrdinaryEncounterEquipment(w,{difficulty:w.difficulty,stage:a.stage,tier:'regular'},a.id+':resource:'+id,high?2:1,high);if(plan)deliverTaskEquipment(w,plan,{x:b.x,z:b.z});}
 else w.drop(b,b.amount);w.changed();return true;
}
/** Three exact power slots. Filter legal templates before renormalizing category weights. */
export function crossingRewards(w:World){
 const a=w.specialStages.active!;if(a.rewardIds.length)return;
 for(let i=0;i<3;i++){
  const context={difficulty:w.difficulty,stage:a.stage,tier:'boss' as const,...(i===2?{endlessRound:1}:{})},policy=equipmentDropPolicy(context);
  const source=i===2&&equipmentRandom(w.starship.account)<policy.additionalChance?policy.additional:policy.guaranteed;
  const legal=(r:EquipmentPoolRow)=>categoryTemplates(r.category,r.quality).filter(t=>t.slots.some(s=>s==='defense3'||s==='defense4'));
  const rows=qualityWeightedPool(w,source,true).filter(r=>legal(r).length),chosen=weighted(w,rows,r=>r.weight),templates=legal(chosen),slot=weighted(w,['defense3','defense4'] as const,s=>templates.some(t=>t.slots.includes(s))?1:0),normal=templates.filter(t=>t.slots.includes(slot)&&t.pollution!=='required');
  let template=weighted(w,normal,t=>t.rare?1:3),polluted=false;
  if(template.pollution!=='never'&&equipmentRandom(w.starship.account)<policy.pollutionChance){polluted=true;template=weighted(w,templates.filter(t=>t.slots.includes(slot)&&t.pollution!=='never'),t=>t.rare?1:3);}
  const result=createEquipmentItem(w.starship.account,{template:template.id,slot,race:w.expedition.race,polluted});if(!result.ok)throw Error(result.error);
  const plan:TaskEquipmentPlan={receipt:a.id+':power:'+i,context,items:[{layer:'power',item:result.value}]};deliverTaskEquipment(w,plan,w.anchor);a.rewardIds.push(result.value.id);
 }
}
export function collectSpecialRewards(w:World){
 const a=w.specialStages.active;if(!a||a.phase!=='loot')return false;let collected=false;
 for(const [id,loc] of Object.entries(w.starship.account.locations))if(loc.kind==='ground'&&loc.run===w.starship.account.run?.id){
  const result=collectEquipment(w.starship.account,id);if(result.ok){registerEquipmentDrop(w,result.value);recordEquipmentPickup(w,result.value,{x:loc.x??w.anchor.x,z:loc.z??w.anchor.z});collected=true;}
  else if(result.error==='背包已满'){w.announce('背包已满 · 打开战斗背包丢弃或销毁后继续领取');break;}
 }
 for(const drop of [...w.rewardDrops])w.collectRewardDrop(drop.id);w.changed();return collected;
}
