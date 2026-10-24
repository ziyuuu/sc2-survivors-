import {newStarshipRuntime,type StarshipRuntime} from '../starship/runtime';
import {newEquipmentAccount,validateItem,equipmentRecipeKey,WAREHOUSE_CAPACITIES,BACKPACK_CAPACITY} from '../starship/inventory';
import {EQUIPMENT_SLOTS,type EquipmentAccount} from '../starship/types';
import {equipmentTemplate} from '../starship/catalog';
import {validBinding} from '../starship/eligibility';
import {RACES} from '../../data/races';
import type {RunData} from './run-fields';
import type {TerrainQuery} from '../../data/map-definition';
import type {EquipmentLootRuntime,EquipmentLootEvent,EquipmentGroundMark} from '../starship/loot-presentation';

const weakNames=['native','nativeTargets','attacks','attackSources','packetOwners'] as const;
const heroWeakNames=['casts','derived','spread'] as const;
type SavedTerrain='current'|'other'|'none';
type LootSnapshot=Omit<EquipmentLootRuntime,'landing'|'events'|'ground'> & {events:(Omit<EquipmentLootEvent,'terrain'>&{terrain:SavedTerrain})[];ground:Map<string,Omit<EquipmentGroundMark,'terrain'>&{terrain:SavedTerrain}>};
type RuntimeData=Omit<StarshipRuntime,typeof weakNames[number]|'battleView'|'hero'|'loot'> & {hero:Omit<StarshipRuntime['hero'],typeof heroWeakNames[number]>;loot:LootSnapshot};
export interface StarshipSnapshot {version:1;runtime:RuntimeData;weak:{name:string;set:boolean;entries:[object,unknown][]}[]}
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&!(value instanceof Map)&&!(value instanceof Set);
const natural=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
/** Loot uses terrain references only for visibility identity. Navigation caches
 * are rebuilt; serials, item receipts, positions and presentation ages persist. */
function captureLoot(loot:EquipmentLootRuntime,terrain:TerrainQuery|undefined):LootSnapshot {
 const tag=(value:TerrainQuery|undefined):SavedTerrain=>value===undefined?'none':value===terrain?'current':'other';
 return {serial:loot.serial,fullNotified:loot.fullNotified,events:loot.events.map(event=>({...event,terrain:tag(event.terrain)})),ground:new Map([...loot.ground].map(([id,mark])=>[id,{...mark,terrain:tag(mark.terrain)}]))};
}
function restoreLoot(loot:LootSnapshot,terrain:TerrainQuery|undefined):EquipmentLootRuntime {
 if(!record(loot)||!natural(loot.serial)||typeof loot.fullNotified!=='boolean'||!Array.isArray(loot.events)||!(loot.ground instanceof Map))throw Error('战利品展示记录无效');
 // An off-map reference remains unequal to the active terrain. No terrain
 // methods are called on loot identity references.
 const other={} as TerrainQuery,resolve=(tag:SavedTerrain|undefined)=>{if(tag==='current')return terrain;if(tag==='none'||tag===undefined)return undefined;if(tag==='other')return other;throw Error('战利品地形记录无效');};
 return {serial:loot.serial,fullNotified:loot.fullNotified,events:loot.events.map(event=>({...event,terrain:resolve(event.terrain)})),ground:new Map([...loot.ground].map(([id,mark])=>[id,{...mark,terrain:resolve(mark.terrain)}]))};
}
export function validateEquipmentAccount(a:EquipmentAccount){
 if(!record(a)||!(['revision','serial','rng','dust','warehouseLevel'] as const).every(k=>natural(a[k]))||a.rng>0xffffffff||a.warehouseLevel>3)throw Error('装备账户数值无效');
 for(const key of ['items','locations','acquired','equipped','pity','receipts'] as const)if(!record(a[key]))throw Error('装备账户字段不完整');
 const ids=Object.keys(a.items);if(ids.length>16000||Object.keys(a.locations).length!==ids.length)throw Error('装备位置记录不完整');
 const equipped=new Set<string>();
 for(const race of RACES){if(!record(a.equipped[race]))throw Error('配装记录无效');for(const [slot,id] of Object.entries(a.equipped[race])){const item=a.items[id];if(!(EQUIPMENT_SLOTS as readonly string[]).includes(slot)||!item||item.race!==race||item.slot!==slot||item.pollution==='uncleansed'||equipped.has(id)||a.locations[id]?.kind!=='equipped')throw Error('配装与物品不一致');equipped.add(id);}}
 for(const id of ids){const item=a.items[id],loc=a.locations[id];if(!record(item)||item.id!==id||!/^ship-item-\d+$/.test(id)||Number(id.slice(10))>a.serial||!Array.isArray(item.affixes)||!Array.isArray(item.inherited)||!record(item.binding)||!validateItem(item))throw Error('装备物品无效');
  if(!record(loc)||!['warehouse','equipped','backpack','ground'].includes(loc.kind)||loc.kind==='equipped'&&!equipped.has(id))throw Error('装备位置无效');
  if((loc.kind==='backpack'||loc.kind==='ground')&&(!a.run||a.run.ended||loc.run!==a.run.id))throw Error('战利品所属战局无效');
  if(loc.kind==='ground'&&![loc.x,loc.z].every(Number.isFinite))throw Error('战利品坐标无效');
 }
 if(ids.filter(id=>a.locations[id].kind==='warehouse').length>WAREHOUSE_CAPACITIES[a.warehouseLevel]||ids.filter(id=>a.locations[id].kind==='backpack').length>BACKPACK_CAPACITY)throw Error('库存超过容量');
 for(const recipe of Object.values(a.acquired)){if(!record(recipe))throw Error('配方无效');const t=equipmentTemplate(recipe.template);if(!t||!RACES.includes(recipe.race)||!t.slots.includes(recipe.slot)||!record(recipe.binding)||!validBinding(t,recipe.race,recipe.binding)||!a.acquired[equipmentRecipeKey(recipe)])throw Error('配方记录无效');}
 for(const q of [1,2,3,4,5] as const)if(!natural(a.pity[q]))throw Error('装备保底记录无效');
 for(const [key,ids] of Object.entries(a.receipts))if(!key||!Array.isArray(ids)||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('装备回执无效');
 if(a.run){const r=a.run;if(!record(r)||!r.id||!RACES.includes(r.race)||!(r.locked instanceof Set)||!(r.receipts instanceof Set)||r.started!==true||typeof r.ended!=='boolean'||[...r.locked].some(id=>!a.items[id])||[...r.receipts].some(id=>typeof id!=='string')||r.ended&&!a.receipts['settlement:'+r.id])throw Error('装备出征记录无效');}
 if(a.modification){const m=a.modification;if(!record(m)||!m.id||!natural(m.revision)||m.revision>a.revision||!['affix','elite'].includes(m.kind)||!Array.isArray(m.items)||!m.items.length||m.items.some(id=>!a.items[id]||a.locations[id].kind!=='warehouse')||!Array.isArray(m.choices)||m.choices.length!==3)throw Error('洗练记录无效');
  for(const choice of m.choices){const item=structuredClone(a.items[m.items[0]]);if(m.kind==='affix'){if(!natural(m.index)||!item.affixes[m.index!])throw Error('洗练词条无效');item.affixes[m.index!]=choice as typeof item.affixes[number];}else item.binding=choice as typeof item.binding;if(!validateItem(item))throw Error('洗练候选无效');}
 }
 if(a.settlement){const s=a.settlement;if(!record(s)||typeof s.run!=='string'||!['success','failure'].includes(s.outcome)||!Array.isArray(s.retained)||!Array.isArray(s.lost)||!Array.isArray(s.salvaged)||!natural(s.dust)||s.retained.some(id=>typeof id!=='string')||[...s.lost,...s.salvaged].some(item=>!record(item)||!validateItem(item))||JSON.stringify(s.retained)!==JSON.stringify(a.receipts['settlement:'+s.run]))throw Error('结算明细无效');}
}
/** Weak keys are discovered through the selected simulation graph, never through renderer objects.
 * Clone the resulting snapshot together with RunData to retain shared packet/body identity. */
export function captureStarship(runtime:StarshipRuntime,state:RunData,terrain?:TerrainQuery):StarshipSnapshot {
 const {battleView:_,...rest}=runtime,plain={...rest,hero:{...runtime.hero},loot:captureLoot(runtime.loot,terrain)} as any;
 const weak:StarshipSnapshot['weak']=[],sources:{name:string;value:WeakMap<object,unknown>|WeakSet<object>;set:boolean}[]=[];
 for(const name of weakNames){sources.push({name,value:runtime[name] as WeakMap<object,unknown>,set:false});delete plain[name];}
 for(const name of heroWeakNames){sources.push({name:'hero.'+name,value:runtime.hero[name],set:name!=='casts'});delete plain.hero[name];}
 for(const source of sources)weak.push({name:source.name,set:source.set,entries:[]});
 const seen=new Set<object>(),queue:object[]=[];
 const visit=(value:unknown)=>{if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);queue.push(value);}};
 // Inventory rows are values, never combat weak keys. Avoid scanning a lifetime of reward receipts.
 const {account:inventory,...combat}=plain;void inventory;visit(state);visit(combat);
 for(let i=0;i<queue.length;i++){const value=queue[i];if(value instanceof Map)for(const [k,v] of value){visit(k);visit(v);}else if(value instanceof Set)for(const v of value)visit(v);else for(const v of Object.values(value))visit(v);
  sources.forEach((s,index)=>{if(s.value.has(value)){const entry=s.set?true:(s.value as WeakMap<object,unknown>).get(value);weak[index].entries.push([value,entry]);visit(entry);}});
 }
 return {version:1,runtime:plain,weak};
}
export function restoreStarship(snapshot:StarshipSnapshot,terrain?:TerrainQuery):StarshipRuntime {
 if(!snapshot||snapshot.version!==1||!record(snapshot.runtime)||!Array.isArray(snapshot.weak))throw Error('舰装检查点版本无效');
 validateEquipmentAccount(snapshot.runtime.account);
 const fresh=newStarshipRuntime(newEquipmentAccount()),template=captureStarship(fresh,{} as RunData).runtime;
 const shape=(data:Record<string,any>,base:Record<string,any>)=>{if(Object.keys(data).length!==Object.keys(base).length)throw Error('舰装检查点字段不完整');for(const key of Object.keys(base)){const a=base[key],b=data[key];if(!Object.hasOwn(data,key)||(a instanceof Map?!(b instanceof Map):a instanceof Set?!(b instanceof Set):Array.isArray(a)?!Array.isArray(b):a!==null&&a!==undefined&&typeof a!==typeof b))throw Error('舰装检查点字段无效：'+key);}};
 // Optional bounty is absent from a fresh runtime.
 const {bounty:_,...data}=snapshot.runtime;shape(data,template);shape(data.hero,template.hero);
 const runtime={...snapshot.runtime,hero:{...snapshot.runtime.hero},loot:restoreLoot(snapshot.runtime.loot,terrain)} as StarshipRuntime;
 const expected=[...weakNames,...heroWeakNames.map(n=>'hero.'+n)];if(snapshot.weak.length!==expected.length||new Set(snapshot.weak.map(w=>w.name)).size!==expected.length)throw Error('舰装关联记录不完整');
 for(const w of snapshot.weak){if(!expected.includes(w.name as any)||!Array.isArray(w.entries)||w.set!==(w.name==='hero.derived'||w.name==='hero.spread')||w.entries.some(e=>!Array.isArray(e)||!e[0]||typeof e[0]!=='object'))throw Error('舰装关联记录无效');const [root,key]=w.name.split('.');(key?runtime.hero:runtime as any)[key??root]=w.set?new WeakSet(w.entries.map(e=>e[0])):new WeakMap(w.entries);}
 return runtime;
}
