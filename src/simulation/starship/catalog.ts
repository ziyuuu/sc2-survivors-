import {ATTRIBUTE_SLOTS,MODULE_SLOTS,type EquipmentSlot,type Quality,type WhiteAllocation} from './types';
import {tierTemplates} from './catalog-tiers';
import {moduleTemplates} from './catalog-modules';

export interface EquipmentEffect {key:string;values:readonly number[]}
export interface EquipmentTemplate {
 id:string;name:string;kind:'attribute'|'module'|'set'|'special';quality:Quality;slots:readonly EquipmentSlot[];
 affixCount:number;pollution:'never'|'allowed'|'required';setFamily?:string;binding?:'hero'|'elite'|'direction';
 allocation?:WhiteAllocation;defenseAllocation?:WhiteAllocation;replacementFamily?:string;repeat?:boolean;unique?:boolean;
 tiers?:Readonly<Record<number,readonly {pieces:number;effects:readonly EquipmentEffect[]}[]>>;tierGate?:number;rare?:boolean;
 effects:readonly EquipmentEffect[];source:string;
}
const ordinarySource='STARSHIP_EQUIPMENT_REDESIGN_20261013.md';
const definitions:EquipmentTemplate[]=[];
for(const quality of [1,2,3,4] as const)definitions.push({id:'attribute.'+quality,name:['','白色散件','绿色散件','蓝色散件','紫色散件'][quality],kind:'attribute',quality,slots:ATTRIBUTE_SLOTS,affixCount:[0,0,1,3,4][quality],pollution:quality<3?'never':'allowed',effects:[],source:ordinarySource});
const whiteModules=[['随行劳工','opening_workers',[1]],['定时补给','periodic_resources',[60,10,3]],['队伍整齐','catch_up',[8,.15]],['轻型轰击','bombardment',[30,.6,2.5,60]]] as const;
for(const [i,[name,key,values]] of whiteModules.entries())definitions.push({id:'module.'+MODULE_SLOTS[i]+'.1',name,kind:'module',quality:1,slots:[MODULE_SLOTS[i]],affixCount:0,pollution:'never',effects:[{key,values}],source:'STARSHIP_WHITE_ITEMS_20261013.md'});
const effect=(key:string,...values:number[]):EquipmentEffect=>({key,values});
const greenModules:readonly [string,typeof MODULE_SLOTS[number],string,readonly EquipmentEffect[]][]=[
 ['workers','gathering','农民协作',[effect('opening_workers',1),effect('worker_efficiency',.2)]],
 ['pickup','gathering','战地拾取',[effect('pickup_yield',.2),effect('pickup_radius',.25)]],
 ['rescue','gathering','救援增员',[effect('worker_rescue',2)]],
 ['double_pickup','gathering','暴击拾取',[effect('pickup_double',.35)]],
 ['supply','logistics','稳定补给',[effect('periodic_resources',60,15,5),effect('stage_resources',10,3)]],
 ['shop','logistics','商店机会',[effect('shop_refresh',1),effect('free_product',.1)]],
 ['purchase','logistics','采购减价',[effect('purchase_discount',10,5)]],
 ['refresh','logistics','刷新减价',[effect('refresh_discount',20)]],
 ['formation','control','编队与技能',[effect('catch_up',6,.3),effect('manual_cooldown',.1)]],
 ['moving_fire','control','移动射击',[effect('moving_fire',1.75,.5)]],
 ['split','control','分裂攻击',[effect('split',.15,1)]],
 ['blade','control','长刀',[effect('melee_range',.5)]],
 ['telescope','control','望远镜',[effect('weapon_range',.1)]],
 ['suppression','support','范围压制',[effect('bombardment',30,.6,2.5,90,.2,2)]],
 ['reinforcement','support','临时援兵',[effect('reinforcement',90,2,45,.05)]],
 ['egg','support','虫卵救援',[effect('egg_reinforcement',.25,1,60)]],
 ['golden_egg','support','金币蛋',[effect('bombardment',30,.6,3,30,0,0,50,0)]],
 ['wind_serpent','support','美味风蛇',[effect('opening_hydralisk',1)]]
];
for(const [key,slot,name,effects] of greenModules)definitions.push({id:'module.'+key+'.2',name,kind:'module',quality:2,slots:[slot],affixCount:0,pollution:'never',effects,source:'STARSHIP_GREEN_ITEMS_20261014.md'});
const firstSets:readonly [string,string,readonly EquipmentEffect[],WhiteAllocation,WhiteAllocation,boolean][]=[
 ['training','训练有素',[effect('opening_rank',2)],2,2,false],
 ['team','团队协作',[effect('opening_count',2)],3,3,false],
 ['dogs','狗哨',[effect('opening_zerglings',2)],4,3,true],
 ['traps','有陷阱',[effect('periodic_trap',30)],2,1,true],
 ['choice','最佳选择',[effect('development_refresh',1)],2,2,true],
 ['call','特殊来电',[effect('opening_elite',1)],2,3,false]
];
for(const [family,name,effects,allocation,defenseAllocation,repeat] of firstSets)definitions.push({id:'set.'+family+'.2',name,kind:'set',quality:2,slots:ATTRIBUTE_SLOTS,affixCount:0,pollution:'never',setFamily:family,replacementFamily:family,repeat,rare:family==='call',allocation,defenseAllocation,effects,source:'STARSHIP_GREEN_ITEMS_20261014.md'});
export const EQUIPMENT_TEMPLATES:Readonly<Record<string,EquipmentTemplate>>=Object.freeze(Object.fromEntries([...definitions,...tierTemplates(),...moduleTemplates()].map(d=>[d.id,Object.freeze(d)])));
export const equipmentTemplate=(id:string)=>EQUIPMENT_TEMPLATES[id];
