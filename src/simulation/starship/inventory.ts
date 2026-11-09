import {RACES,type Race} from '../../data/races';
import {EQUIPMENT_SLOTS,isAttributeSlot,isOffensiveSlot,success,failure,type EquipmentAccount,type EquipmentItem,type EquipmentSlot,type Quality,type ItemLocation,type EquipmentBinding,type EquipmentResult,type WhiteAllocation} from './types';
import {equipmentTemplate,EQUIPMENT_TEMPLATES} from './catalog';
import {rollAffixes,validAffixes} from './attributes';
import {validBinding,randomBinding} from './eligibility';
import {rollInheritance,validInheritance} from './inheritance';
import {OFFENSIVE_AFFIXES,DEFENSIVE_AFFIXES,type Affix} from './types';
import {ELITES} from '../../data/elites';
import {familyRace} from '../../data/races';

export const BACKPACK_CAPACITY=64;
export const WAREHOUSE_CAPACITIES=[500,700,900,1000] as const;
export const WAREHOUSE_PRICES=[1000,2000,4000] as const;
export const CRAFT_PRICES:Record<Quality,number>={1:10,2:40,3:100,4:400,5:1600};
export const DISMANTLE_VALUES:Record<Quality,number>={1:5,2:10,3:20,4:100,5:400};
/** One authoritative account; persistence stores it atomically with the run checkpoint. */
export function newEquipmentAccount(seed=529):EquipmentAccount{return {revision:0,serial:0,rng:seed>>>0||1,dust:0,warehouseLevel:0,items:{},locations:{},acquired:{},equipped:{terran:{},zerg:{},protoss:{}},pity:{1:0,2:0,3:0,4:0,5:0},receipts:{},run:null};}
export function equipmentRecipeKey(item:Pick<EquipmentItem,'template'|'race'|'slot'|'binding'>){return [item.template,item.race,item.slot,item.binding.hero??'',item.binding.elite??'',item.binding.direction??'',item.binding.family??''].join('|');}
function rememberEquipment(a:EquipmentAccount,item:EquipmentItem){a.acquired[equipmentRecipeKey(item)]={template:item.template,race:item.race,slot:item.slot,binding:{...item.binding}};}
export function acquiredCraftRecipes(a:EquipmentAccount,race:Race,quality?:Quality){return Object.values(a.acquired).filter(r=>{const t=equipmentTemplate(r.template);return r.race===race&&!!t&&(!quality||t.quality===quality)&&t.pollution!=='required'&&t.slots.includes(r.slot)&&validBinding(t,race,r.binding);});}
export function equipmentRandom(account:EquipmentAccount){let x=account.rng;x^=x<<13;x^=x>>>17;x^=x<<5;account.rng=x>>>0;return account.rng/4294967296;}
export function itemsAt(a:EquipmentAccount,kind:ItemLocation['kind']){return Object.values(a.items).filter(item=>a.locations[item.id]?.kind===kind);}
export function equippedItems(a:EquipmentAccount,race:Race){return EQUIPMENT_SLOTS.flatMap(slot=>{const id=a.equipped[race][slot];return id&&a.items[id]?[a.items[id]]:[];});}
export function validateItem(item:EquipmentItem){const t=equipmentTemplate(item.template);return !!t&&RACES.includes(item.race)&&t.quality===item.quality&&t.slots.includes(item.slot)&&validBinding(t,item.race,item.binding)&&validInheritance(t,item.pollution!=='none',item.inherited)&&Number.isInteger(item.allocation)&&item.allocation>=0&&item.allocation<=4&&['none','uncleansed','cleansed'].includes(item.pollution)&&!(t.pollution==='never'&&item.pollution!=='none')&&!(t.pollution==='required'&&item.pollution==='none')&&validAffixes(item,t.affixCount);}
export function createEquipmentItem(a:EquipmentAccount,input:{template:string;race:Race;slot:EquipmentSlot;polluted?:boolean;binding?:EquipmentBinding}):EquipmentResult<EquipmentItem>{
 const t=equipmentTemplate(input.template);if(!t||!RACES.includes(input.race)||!t.slots.includes(input.slot))return failure('装备模板或槽位不合法');
 if(input.polluted&&t.pollution==='never'||!input.polluted&&t.pollution==='required')return failure('装备不具备此污染资格');
 if(input.binding&&!validBinding(t,input.race,input.binding))return failure('装备绑定身份不合法');
 const random=()=>equipmentRandom(a),binding=input.binding??randomBinding(t,input.race,random),rolled=rollAffixes(t.quality,input.slot,t.affixCount,!!input.polluted,a.pity[t.quality],random);
 a.pity[t.quality]=rolled.misses;const allocation=(!isOffensiveSlot(input.slot)?t.defenseAllocation:undefined)??t.allocation??(isAttributeSlot(input.slot)?Math.floor(random()*5) as WhiteAllocation:2);
 return success({id:'ship-item-'+(++a.serial),template:t.id,race:input.race,slot:input.slot,quality:t.quality,allocation,affixes:rolled.affixes,binding:{...binding},pollution:input.polluted?'uncleansed':'none',inherited:rollInheritance(t,!!input.polluted,random)});
}
/** Deliver an already rolled task plan without consuming RNG or exposing it early. */
export function grantPlannedEquipment(a:EquipmentAccount,item:EquipmentItem,receipt:string,location:ItemLocation):EquipmentResult<EquipmentItem>{
 const prior=a.receipts[receipt];if(prior)return a.items[prior[0]]?success(a.items[prior[0]]):failure('该来源已经结算');
 if(!receipt||!validateItem(item)||a.items[item.id]||location.kind!=='ground'||!a.run||a.run.ended||location.run!==a.run.id)return failure('任务装备计划无效');
 a.items[item.id]=structuredClone(item);a.locations[item.id]={...location};a.receipts[receipt]=[item.id];a.revision++;return success(a.items[item.id]);
}
/** Trusted reward/crafting port. The same receipt cannot mint a second item. */
export function grantEquipment(a:EquipmentAccount,input:Parameters<typeof createEquipmentItem>[1],receipt:string,location:ItemLocation):EquipmentResult<EquipmentItem>{
 if(!receipt)return failure('缺少装备来源');const prior=a.receipts[receipt];if(prior)return prior[0]&&a.items[prior[0]]?success(a.items[prior[0]]):failure('该来源已经结算');
 if(location.kind==='equipped')return failure('新装备先进入库存');if(location.kind==='warehouse'&&itemsAt(a,'warehouse').length>=WAREHOUSE_CAPACITIES[a.warehouseLevel])return failure('仓库已满');
 if(location.kind==='backpack'&&itemsAt(a,'backpack').length>=BACKPACK_CAPACITY)return failure('背包已满');
 const result=createEquipmentItem(a,input);if(!result.ok)return result;const item=result.value;a.items[item.id]=item;a.locations[item.id]={...location};if(location.kind!=='ground')rememberEquipment(a,item);a.receipts[receipt]=[item.id];a.revision++;return success(item);
}
export function canEquip(a:EquipmentAccount,race:Race,itemId:string,slot:EquipmentSlot,expectedRevision=a.revision):EquipmentResult<EquipmentItem>{
 if(expectedRevision!==a.revision)return failure('装备状态已变化');const item=a.items[itemId],location=a.locations[itemId];
 if(!item||!location||!validateItem(item))return failure('装备不存在或数据无效');if(item.race!==race)return failure('不能跨种族装备');if(item.slot!==slot)return failure('装备与槽位不匹配');if(item.pollution==='uncleansed')return failure('污染装备须撤离后清洗');
 const oldId=a.equipped[race][slot],old=oldId?a.items[oldId]:undefined,run=a.run;
 if(run&&!run.ended){if(run.race!==race)return failure('出征中不能更换其他种族装备');if(equipmentTemplate(item.template)?.kind!=='attribute'&&equipmentTemplate(item.template)?.kind!=='special'||old&&equipmentTemplate(old.template)?.kind!=='attribute'&&equipmentTemplate(old.template)?.kind!=='special')return failure('模块与套装只能局外更换');if(run.locked.has(itemId)||oldId&&run.locked.has(oldId))return failure('本次出征已使用该装备发放奖励');if(location.kind!=='backpack'||location.run!==run.id)return failure('只能使用本次出征背包中的装备');}
 else if(location.kind!=='warehouse')return failure('装备尚未入仓');return success(item);
}
export function equip(a:EquipmentAccount,race:Race,itemId:string,slot:EquipmentSlot,expectedRevision=a.revision):EquipmentResult<string|null>{
 const check=canEquip(a,race,itemId,slot,expectedRevision);if(!check.ok)return check;const old=a.equipped[race][slot]??null,location=a.locations[itemId];
 if(old)a.locations[old]={...location};a.locations[itemId]={kind:'equipped'};a.equipped[race][slot]=itemId;a.revision++;return success(old);
}
export function unequip(a:EquipmentAccount,race:Race,slot:EquipmentSlot,expectedRevision=a.revision):EquipmentResult<string>{
 if(expectedRevision!==a.revision)return failure('装备状态已变化');const id=a.equipped[race][slot],item=id?a.items[id]:undefined;if(!id||!item)return failure('槽位为空');const run=a.run;
 if(run&&!run.ended){if(run.race!==race||!['attribute','special'].includes(equipmentTemplate(item.template)!.kind)||run.locked.has(id))return failure('本次出征不能卸下该装备');if(itemsAt(a,'backpack').length>=BACKPACK_CAPACITY)return failure('背包已满');a.locations[id]={kind:'backpack',run:run.id};}
 else {if(itemsAt(a,'warehouse').length>=WAREHOUSE_CAPACITIES[a.warehouseLevel])return failure('仓库已满');a.locations[id]={kind:'warehouse'};}
 delete a.equipped[race][slot];a.revision++;return success(id);
}
export function canBeginEquipmentRun(a:EquipmentAccount,race:Race,replaceActive=false):EquipmentResult<undefined>{
 if(a.modification)return failure('请先处理装备洗练结果');
 if(!replaceActive&&a.run&&!a.run.ended)return failure('已有出征正在进行');
 if(equippedItems(a,race).some(item=>!validateItem(item)||item.pollution==='uncleansed'))return failure('配装无效');return success(undefined);
}
/** Explicit new-game replacement: no defeat roll, dust, reward or settlement.
 * Warehouse and equipped ownership survive; unextracted run loot is abandoned. */
export function abandonEquipmentRun(a:EquipmentAccount){
 const run=a.run;if(!run||run.ended)return;
 for(const [id,location]of Object.entries(a.locations))if((location.kind==='backpack'||location.kind==='ground')&&location.run===run.id){delete a.items[id];delete a.locations[id];}
 a.receipts['abandon:'+run.id]=[];a.run=null;delete a.settlement;a.revision++;
}
export function beginEquipmentRun(a:EquipmentAccount,race:Race,id:string):EquipmentResult<undefined>{
 const valid=canBeginEquipmentRun(a,race);if(!valid.ok)return valid;a.run={id,race,locked:new Set(),receipts:new Set(),started:true,ended:false};a.revision++;return success(undefined);
}
export function collectEquipment(a:EquipmentAccount,itemId:string):EquipmentResult<EquipmentItem>{
 const run=a.run,item=a.items[itemId],location=a.locations[itemId];if(!run||run.ended||!item||location?.kind!=='ground'||location.run!==run.id)return failure('装备不在当前战场');
 if(itemsAt(a,'backpack').length>=BACKPACK_CAPACITY)return failure('背包已满');a.locations[itemId]={kind:'backpack',run:run.id};rememberEquipment(a,item);a.revision++;return success(item);
}
/** Move an owned item back to the ground without minting it or paying dust. */
export function dropEquipment(a:EquipmentAccount,id:string,point:{x:number;z:number},revision=a.revision){
 const run=a.run,loc=a.locations[id];if(revision!==a.revision)return failure('库存已变化');
 if(!run||run.ended||!a.items[id]||loc?.kind!=='backpack'||loc.run!==run.id||run.locked.has(id))return failure('只能丢弃当前背包的未锁定装备');
 if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return failure('地面位置无效');
 a.locations[id]={kind:'ground',run:run.id,...point};a.revision++;return success(a.items[id]);
}
/** Only explicit retreat or actual defeat settles. Closing the program restores a checkpoint. */
export function settleEquipment(a:EquipmentAccount,outcome:'success'|'failure'){
 const run=a.run;if(!run)return success([] as string[]);const key='settlement:'+run.id,prior=a.receipts[key];if(prior)return success([...prior]);
 const retained:string[]=[],salvaged:string[]=[],lostItems:EquipmentItem[]=[],salvagedItems:EquipmentItem[]=[];let occupied=itemsAt(a,'warehouse').length,dust=0;
 for(const item of Object.values(a.items)){const location=a.locations[item.id];if((location.kind!=='backpack'&&location.kind!=='ground')||location.run!==run.id)continue;
  if(location.kind==='ground'||outcome==='failure'&&(item.pollution==='uncleansed'||equipmentRandom(a)<.5)){lostItems.push(structuredClone(item));delete a.items[item.id];delete a.locations[item.id];continue;}
  if(occupied>=WAREHOUSE_CAPACITIES[a.warehouseLevel]){a.dust+=DISMANTLE_VALUES[item.quality];dust+=DISMANTLE_VALUES[item.quality];salvaged.push(item.id);salvagedItems.push(structuredClone(item));delete a.items[item.id];delete a.locations[item.id];continue;}
  a.locations[item.id]={kind:'warehouse'};occupied++;retained.push(item.id);
 }
 a.receipts[key]=retained;a.receipts['settlement-salvage:'+run.id]=salvaged;a.settlement={run:run.id,outcome,retained:[...retained],lost:lostItems,salvaged:salvagedItems,dust};run.ended=true;run.locked.clear();a.revision++;return success(retained);
}
function economyItem(a:EquipmentAccount,id:string,revision:number){if(revision!==a.revision)return failure('库存或价格已变化');if(a.run&&!a.run.ended)return failure('只能在局外操作');const item=a.items[id],location=a.locations[id];if(!item||!location||location.kind!=='warehouse')return failure('装备不在仓库');return success(item);}
export function discardEquipment(a:EquipmentAccount,id:string,revision=a.revision){
 if(revision!==a.revision)return failure('库存已变化');const location=a.locations[id];if(!location||!a.items[id]||location.kind==='equipped')return failure('不能丢弃此装备');
 if(a.run&&!a.run.ended&&(!(location.kind==='backpack'||location.kind==='ground')||location.run!==a.run.id||a.run.locked.has(id)))return failure('只能丢弃本次出征的未锁定物品');
 delete a.items[id];delete a.locations[id];a.revision++;return success(id);
}
export function craftEquipment(a:EquipmentAccount,input:{quality:Quality;race:Race;setTemplate?:string;slot?:EquipmentSlot;binding?:EquipmentBinding;receipt:string},revision=a.revision){
 const receipt='craft:'+input.receipt,previous=a.receipts[receipt];if(previous)return previous[0]&&a.items[previous[0]]?success(a.items[previous[0]]):failure('该合成已经结算');
 if(!input.receipt||revision!==a.revision||a.modification)return failure('库存已变化或有待处理洗练');if(a.run&&!a.run.ended)return failure('只能局外合成');
 if(!RACES.includes(input.race)||!Object.hasOwn(CRAFT_PRICES,input.quality)||input.slot&&!input.setTemplate||input.binding&&!input.setTemplate)return failure('合成目标不合法');
 if(itemsAt(a,'warehouse').length>=WAREHOUSE_CAPACITIES[a.warehouseLevel])return failure('仓库已满');
 const recipes=acquiredCraftRecipes(a,input.race,input.quality).filter(r=>(!input.setTemplate||r.template===input.setTemplate&&equipmentTemplate(r.template).kind==='set')&&(!input.slot||r.slot===input.slot)&&(!input.binding||validBinding(equipmentTemplate(r.template),input.race,input.binding)&&equipmentRecipeKey({...r,binding:input.binding})===equipmentRecipeKey(r)));
 if(!recipes.length)return failure('尚未获得过此装备，无法合成');
 const price=CRAFT_PRICES[input.quality]*(input.setTemplate?(input.slot?2.5:1.5):1);if(a.dust<price)return failure('装备粉尘不足');
 const slots=EQUIPMENT_SLOTS.filter(slot=>recipes.some(r=>r.slot===slot)),slot=input.slot??slots[Math.floor(equipmentRandom(a)*slots.length)],templates=Object.values(EQUIPMENT_TEMPLATES).filter(t=>recipes.some(r=>r.slot===slot&&r.template===t.id));
 let ticket=equipmentRandom(a)*templates.reduce((n,t)=>n+(t.rare?1/3:1),0),template=templates.at(-1)!;for(const t of templates){ticket-=t.rare?1/3:1;if(ticket<0){template=t;break;}}
 const identities=recipes.filter(r=>r.slot===slot&&r.template===template.id),known=identities[Math.floor(equipmentRandom(a)*identities.length)];
 const result=grantEquipment(a,{template:template.id,race:input.race,slot,binding:known.binding},receipt,{kind:'warehouse'});if(!result.ok)return result;a.dust-=price;return result;
}
export function beginAffixReroll(a:EquipmentAccount,id:string,index:number,revision=a.revision){
 if(a.modification)return failure('请先处理当前洗练');const check=economyItem(a,id,revision);if(!check.ok)return check;const item=check.value;
 if(item.pollution==='uncleansed'||!Number.isInteger(index)||!item.affixes[index])return failure('此词条不能洗练');const price=CRAFT_PRICES[item.quality]/10;if(a.dust<price)return failure('装备粉尘不足');
 const occupied=item.affixes.filter((_,i)=>i!==index).map(a=>a.key),pool=(isOffensiveSlot(item.slot)?OFFENSIVE_AFFIXES:DEFENSIVE_AFFIXES).filter(key=>!occupied.includes(key));
 const choices=Array.from({length:3},()=>{const key=pool[Math.floor(equipmentRandom(a)*pool.length)] as Affix;const roll=rollAffixes(item.quality,item.slot,1,item.pollution!=='none',0,()=>equipmentRandom(a));return {key,score:roll.affixes[0].score};});
 a.dust-=price;a.revision++;a.modification={id:'affix:'+id+':'+a.revision,revision:a.revision,items:[id],kind:'affix',index,choices};return success(structuredClone(a.modification));
}
export function beginEliteReroll(a:EquipmentAccount,ids:readonly string[],revision=a.revision){
 if(a.modification||!ids.length||new Set(ids).size!==ids.length)return failure('请选择同系列合法装备');const selected:EquipmentItem[]=[];let price=0;
 for(const id of ids){const check=economyItem(a,id,revision);if(!check.ok)return check;const item=check.value,t=equipmentTemplate(item.template)!;if(item.pollution==='uncleansed'||t.binding!=='elite'||!item.binding.elite)return failure('此装备不能洗练精英绑定');selected.push(item);price+=CRAFT_PRICES[item.quality]/5;}
 if(selected.some(i=>i.race!==selected[0].race||equipmentTemplate(i.template)!.setFamily!==equipmentTemplate(selected[0].template)!.setFamily))return failure('批量洗练须同种族同系列');if(a.dust<price)return failure('装备粉尘不足');
 const pool=Object.values(ELITES).filter(e=>familyRace(e.family)===selected[0].race),choices=Array.from({length:3},()=>({elite:pool.splice(Math.floor(equipmentRandom(a)*pool.length),1)[0].id}));a.dust-=price;a.revision++;a.modification={id:'elite:'+a.revision,revision:a.revision,items:[...ids],kind:'elite',choices};return success(structuredClone(a.modification));
}
export function finishEquipmentReroll(a:EquipmentAccount,receipt:string,choice:number|null){
 const pending=a.modification;if(!pending||pending.id!==receipt)return failure('洗练结果不存在');if(choice===null){delete a.modification;a.revision++;return success(undefined);}
 if(a.revision!==pending.revision||!Number.isInteger(choice)||choice<0||choice>=pending.choices.length||pending.items.some(id=>!a.items[id]||a.locations[id]?.kind!=='warehouse'))return failure('装备状态已变化');
 for(const id of pending.items){const item=a.items[id];if(pending.kind==='elite')item.binding={...pending.choices[choice] as EquipmentBinding};else item.affixes[pending.index!]={...pending.choices[choice] as {key:Affix;score:number}};rememberEquipment(a,item);}
 delete a.modification;a.revision++;return success(undefined);
}
export function cleanseEquipment(a:EquipmentAccount,id:string,revision=a.revision){
 const check=economyItem(a,id,revision);if(!check.ok)return check;const item=check.value;if(item.pollution!=='uncleansed')return failure('装备无需清洗');const price=CRAFT_PRICES[item.quality]/4;if(a.dust<price)return failure('装备粉尘不足');a.dust-=price;item.pollution='cleansed';a.revision++;return success(price);
}
export function dismantleEquipment(a:EquipmentAccount,ids:readonly string[],revision=a.revision,context:'outside'|'intermission'='outside'){
 if(!ids.length||new Set(ids).size!==ids.length)return failure('请选择不重复的装备');let amount=0;
 for(const id of ids){const loc=a.locations[id],run=a.run,item=a.items[id];
  if(context==='intermission'){if(revision!==a.revision||!item||!run||run.ended||loc?.kind!=='backpack'||loc.run!==run.id||run.locked.has(id))return failure('只能分解当前背包的未锁定装备');}
  else {const check=economyItem(a,id,revision);if(!check.ok)return check;}
  if(item.pollution==='uncleansed')return failure('污染装备须先清洗');amount+=DISMANTLE_VALUES[item.quality];}
 for(const id of ids){delete a.items[id];delete a.locations[id];}a.dust+=amount;a.revision++;return success(amount);
}
export function expandWarehouse(a:EquipmentAccount,expectedLevel:number,revision=a.revision){
 if(revision!==a.revision||expectedLevel!==a.warehouseLevel)return failure('仓库容量已变化');if(a.run&&!a.run.ended)return failure('只能在局外扩容');if(a.warehouseLevel>=3)return failure('仓库已达最大容量');const price=WAREHOUSE_PRICES[a.warehouseLevel as 0|1|2];if(a.dust<price)return failure('装备粉尘不足');a.dust-=price;a.warehouseLevel=(a.warehouseLevel+1) as EquipmentAccount['warehouseLevel'];a.revision++;return success(WAREHOUSE_CAPACITIES[a.warehouseLevel]);
}
