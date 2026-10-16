import raw from './catalog-data.json';
import {HEROES,type HeroId} from '../../data/heroes';
import {ELITES} from '../../data/elites';
import type {Race} from '../../data/races';
import type {EquipmentItem,EquipmentSlot,EquipmentBinding,Quality,EquipmentTotals} from '../../simulation/starship/types';
import {equipmentTemplate} from '../../simulation/starship/catalog';
export interface CatalogRow {id:string;template:string;race:Race;quality:Quality;slot:EquipmentSlot;binding:EquipmentBinding;polluted:boolean;name:string;names:{normal?:string;unpurified?:string;purified?:string};setName:string|null;art:string}
export const catalogRows=raw.rows as CatalogRow[];
export const artAssets=raw.assets;
export const raceNames={terran:'人族',zerg:'虫族',protoss:'神族'};
export const qualityNames=['','白色','绿色','蓝色','紫色','橙色'];
export const slotNames:Record<EquipmentSlot,string>={gathering:'采集运营',logistics:'投放运营',control:'微操控制',support:'火力支援',offense1:'武器研发',offense2:'武器生产',offense3:'弹药研发',offense4:'弹药生产',defense1:'装甲研发',defense2:'装甲生产',defense3:'动力一',defense4:'动力二'};
export const statNames:Record<keyof EquipmentTotals,string>={dps:'白字秒伤',attackSpeed:'攻击速度',hp:'白字生命',armor:'白字护甲',attack:'攻击加成',trueDps:'真实秒伤',range:'射程',crit:'暴击率',critDamage:'暴击伤害',defense:'防御系数',dodge:'闪避',move:'移动速度',health:'生命加成',reduction:'减伤'};
export const statValue=(key:string,n:number)=>['dps','hp','armor','trueDps','defense'].includes(key)?Number(n.toFixed(2)).toLocaleString('zh-CN'):Number((n*100).toFixed(2))+'%';
export const heroPose=(slot:EquipmentSlot)=>slot.startsWith('offense')?'attack':slot==='defense1'||slot==='defense2'?'defense':'move';
const bindingKey=(b:EquipmentBinding)=>b.hero??b.elite??b.direction??b.family??'';
const key=(i:Pick<EquipmentItem,'template'|'race'|'slot'|'binding'>,polluted:boolean)=>[i.template,i.race,i.slot,bindingKey(i.binding),polluted?'1':'0'].join('|');
const byIdentity=new Map(catalogRows.map(r=>[key(r,r.polluted),r]));
export function presentation(item:EquipmentItem){const r=byIdentity.get(key(item,item.pollution!=='none')),t=equipmentTemplate(item.template);return {row:r,name:r?.names[item.pollution==='none'?'normal':item.pollution==='cleansed'?'purified':'unpurified']??((item.pollution==='uncleansed'?'污染的':item.pollution==='cleansed'?'净化的':'')+t.name),art:r?.art??'',setName:r?.setName?.replace(/^(污染的|净化的)/,'')??t.name};}
export function bindingName(b:EquipmentBinding){return b.hero?HEROES[b.hero].name:b.elite?ELITES[b.elite].name:b.direction?({barracks:'兵营',factory:'工厂',starport:'星港','zerg.basic':'基础虫群','zerg.evolution':'进化虫群','zerg.air':'空中虫群',gateway:'折跃门',robotics:'机械台',stargate:'星门'}[b.direction]??b.direction):'全军';}
export function catalogItem(r:CatalogRow):EquipmentItem {const t=equipmentTemplate(r.template);return {id:r.id,template:r.template,race:r.race,slot:r.slot,quality:r.quality,binding:r.binding,pollution:r.polluted?'uncleansed':'none',allocation:(r.slot.startsWith('offense')?t.allocation:t.defenseAllocation)??2,affixes:[],inherited:[]};}
export const heroName=(id:string)=>HEROES[id as HeroId]?.name??id;
export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
