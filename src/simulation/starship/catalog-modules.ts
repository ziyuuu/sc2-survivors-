import type {EquipmentTemplate,EquipmentEffect} from './catalog';
import {ATTRIBUTE_SLOTS,type ModuleSlot,type Quality} from './types';
const e=(key:string,...values:number[]):EquipmentEffect=>({key,values});
type Row=[ModuleSlot,string,EquipmentEffect[]];
export const BLUE_MODULES:Record<string,Row>={
 workers:['gathering','农民协作',[e('opening_workers',1),e('worker_efficiency',.2),e('periodic_worker',180)]],pickup:['gathering','战地拾取',[e('pickup_yield',.2),e('pickup_radius',.25),e('equipment_drop_chance',.15)]],rescue:['gathering','救援增员',[e('worker_rescue',2),e('rescue_double',.2)]],double_pickup:['gathering','暴击拾取',[e('pickup_double',.35),e('equipment_drop',.1)]],loan:['gathering','借贷发展',[e('loan',1500,1000,3,2,4,1)]],
 supply:['logistics','稳定补给',[e('periodic_resources',60,15,5),e('stage_reward_percent',.3),e('resource_drop',.2)]],shop:['logistics','商店机会',[e('shop_refresh',1),e('free_product',.1),e('free_refresh_quality',.2)]],purchase:['logistics','采购减价',[e('purchase_discount',10,5),e('purchase_identity_discount',50,25,100,50)]],refresh:['logistics','刷新减价',[e('refresh_discount',20),e('stable_refresh',2)]],unreasonable:['logistics','无理用户',[e('free_product',1),e('refresh_multiplier',2)]],contract:['logistics','建造承包',[e('build_free',.4),e('build_double',.3)]],academy:['logistics','精英学院',[e('paid_elite',.2)]],
 formation:['control','编队与技能',[e('catch_up',4,.45),e('manual_cooldown',.2)]],moving_fire:['control','移动射击',[e('moving_fire',2.5,1)]],split:['control','分裂攻击',[e('split',.15,1),e('bounce',.2,.5,1,4)]],blade:['control','长刀',[e('melee_range',.5),e('cleave',.2,.5,90)]],telescope:['control','望远镜',[e('weapon_range',.1),e('distance_damage',.02,.2)]],adrenaline:['control','肾上腺素',[e('adrenaline',.5,.5,2)]],rapid:['control','快速部署',[e('prepare_reduction',.66)]],
 suppression:['support','范围压制',[e('bombardment',30,.6,3,180,.3,3)]],reinforcement:['support','临时援兵',[e('reinforcement',60,3,60,.08)]],egg:['support','虫卵救援',[e('egg_reinforcement',.4,2,60)]],incendiary:['support','燃烧弹',[e('incendiary',60,.6,3,30,10,3,50,1,3)]],elephant:['support','训象人',[e('opening_ultralisk',1)]],drop_pod:['support','空投士兵',[e('drop_pod',90,.8,2.5,150,3,1,45)]],reactor:['support','核能反应堆',[e('reactor',360,2)]]
};
const purpleExtra:Record<string,EquipmentEffect[]>={workers:[e('worker_building',3)],pickup:[e('card_copy',3)],rescue:[e('rescue_elite',2)],double_pickup:[e('harvest',5)],supply:[e('supply_interest',3,.1,300,200)],shop:[e('purchase_copy',1)],purchase:[e('purchase_rank',1)],refresh:[e('refresh_credit',1)],contract:[e('build_research',1)],academy:[e('elite_training',120,5)],formation:[e('manual_reset',20)],moving_fire:[e('moving_extra',2,.5,2)],telescope:[e('pierce',.5,2,.6)],adrenaline:[e('last_stand',.25,5,.2)],reinforcement:[e('reinforcement_elite',3,60)],egg:[e('egg_conversion',1)],elephant:[e('ultralisk_elite',1,12)],drop_pod:[e('drop_elite',2,2,5)]};
const purpleReplace:Record<string,EquipmentEffect[]>={
 double_pickup:[e('pickup_double',.35),e('boss_quality',.1),e('harvest',5)],loan:[e('loan',4500,3000,6,3,7,2)],unreasonable:[e('first_purchase_free',1),e('refresh_multiplier',2)],split:[e('split',.15,1),e('bounce',.2,.5,3,4)],blade:[e('melee_range',.5),e('cleave',.2,1,360)],suppression:[e('bombardment',30,.6,3,180,.3,3,0,0,3,1)],incendiary:[e('incendiary',60,.6,3,30,10,3,50,5,3)],reactor:[e('reactor',270,3)]
};
export function moduleTemplates():EquipmentTemplate[]{const out:EquipmentTemplate[]=[];
 const add=(id:string,quality:Quality,slot:ModuleSlot,name:string,effects:EquipmentEffect[],required=false,rare=false)=>out.push({id:`module.${id}.${quality}`,name,kind:'module',quality,slots:[slot],affixCount:0,pollution:quality===3?'never':required?'required':'allowed',effects,rare,source:quality===5?'STARSHIP_ORANGE_USER_REVISION_R3_20261014.md':quality===4?'STARSHIP_PURPLE_ITEMS_20261014.md':'STARSHIP_BLUE_ITEMS_20261014.md'});
 for(const [id,[slot,name,effects]] of Object.entries(BLUE_MODULES)){add(id,3,slot,name,effects);if(id!=='rapid')add(id,4,slot,name,purpleReplace[id]??[...effects,...purpleExtra[id]??[]]);}
 add('joint',4,'support','联合支援',[e('joint_support',35,8,3)]);
 add('swarm',3,'support','虫群',[e('swarm',5,.2,60,15,1,24,3,.5,2)],false,true);
 add('konstant',3,'control','康斯坦威',[e('konstant',.35,30,90,3,.2,.4,.2,.25,.6,40)],false,true);
 add('plague',4,'support','虫灾',[e('plague',5,.25,60,20,3,6,2,1.5,4.5)],true,true);
 add('konstant',4,'control','康斯坦威强化班',[e('konstant',.7,30,90,5,.35,.65,.35,.4,1.2,100)],true,true);
 add('rewind',4,'control','时光回溯装置',[e('rewind',1)],true,true);
 add('bounty_order',5,'gathering','星际悬赏令',[e('bounty_order',60,3,300,150,1000,500)]);add('plunder',5,'gathering','战争掠夺协议',[e('plunder',1)]);
 add('armory',5,'logistics','满编军备库',[e('capacity_baseline',7,0,0),e('recruit_rank_all',4)]);add('singularity',5,'logistics','科技奇点',[e('research_cap',4),e('hero_cap',9)]);
 add('weakness',5,'control','弱点接管',[e('weakness',2,3)]);add('dominance',5,'control','战场主导权',[e('dominance',3,5,3,12)]);
 add('yamato',5,'support','大和扫射信标',[e('yamato_support',5,.2,30,6,3,5)]);add('behemoth',5,'support','巨兽突入信标',[e('behemoth',5,.2,60,30,5,2,6)]);
 add('devour',5,'gathering','吞星引擎',[e('devour',100,500,.01)],true);add('unlimited',5,'logistics','无限编制',[e('capacity_baseline',7,7,9)],true);add('phase',5,'control','相位继生',[e('phase',2,30,2,2.5,.3)],true);add('ark',5,'support','终焉方舟',[e('ark',5,2,.01,.0002,.15,.15)],true);
 const specials:readonly [string,string,EquipmentTemplate['slots'],EquipmentEffect[],EquipmentEffect[]][]=[
 ['doom','末日火炮',ATTRIBUTE_SLOTS.slice(0,4),[e('weapon_area',.3,.25)],[e('cluster',3,.5,.4)]],['unstable','不稳定膛线',ATTRIBUTE_SLOTS.slice(0,4),[e('execute',.02,15)],[e('execute_chain',3,.3,1)]],['shield','护盾反应装置',ATTRIBUTE_SLOTS.slice(4,6),[e('out_of_combat_shield',5,.1,.01)],[e('shield_rebuild',8)]],['recall','战场调控装置',ATTRIBUTE_SLOTS.slice(6),[e('auto_recall',16,2,4,30)],[e('recall_phantom',8,.5)]],['counter','克制武器',ATTRIBUTE_SLOTS.slice(0,4),[e('weapon_bonus',1)],[]]
 ];
 for(const [id,name,slots,base,extra] of specials)for(const quality of [3,4] as const)out.push({id:`special.${id}.${quality}`,name,kind:'special',quality,slots,affixCount:id==='counter'?quality-1:0,pollution:id==='counter'?'allowed':'never',unique:true,replacementFamily:'special.'+id,effects:id==='counter'?[e('weapon_bonus',quality===3?1:2)]:quality===3?base:[...base,...extra],source:'STARSHIP_PURPLE_ITEMS_20261014.md'});
 out.push({id:'special.double.4',name:'双重打击',kind:'special',quality:4,slots:ATTRIBUTE_SLOTS.slice(0,4),affixCount:0,pollution:'never',unique:true,replacementFamily:'special.double',effects:[e('double_attack',1)],source:'STARSHIP_PURPLE_ITEMS_20261014.md'});return out;
}
