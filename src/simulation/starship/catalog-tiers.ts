import type {EquipmentEffect,EquipmentTemplate} from './catalog';
import {ATTRIBUTE_SLOTS,type Quality,type WhiteAllocation} from './types';

const e=(key:string,...values:number[]):EquipmentEffect=>({key,values});
const tier=(pieces:number,...effects:EquipmentEffect[])=>({pieces,effects});
const allocation:Record<string,readonly [WhiteAllocation,WhiteAllocation]>={training:[2,2],team:[3,3],identity:[2,3],roaches:[1,1],bunker:[2,0],choice:[2,2],drone_hunter:[1,2],bounty:[2,3],overload:[0,4],hold:[1,0],pack:[3,3],phantom:[4,2],fleet:[1,3],scorched:[2,3],army:[3,3],soldier:[1,2],elite:[2,3],hero:[1,3],corrupted_hero:[0,4],survivor:[2,4],breakthrough:[0,3],iron:[2,0],light:[4,3],precision:[3,2],wall:[2,4],sustain:[3,3],enhancer_attack:[0,2],enhancer_defense:[2,3],enhancer_speed:[4,2],adventurer:[2,2],sky:[1,3],lost:[2,3],flame:[0,3]};
const names:Record<string,string>={training:'训练有素',team:'团队协作',identity:'我是谁',roaches:'蟑螂拍',bunker:'有地堡',choice:'最佳选择',drone_hunter:'猎蜂人',bounty:'赏金猎人',overload:'火炮过载',hold:'坚守阵地',pack:'训犬大师',phantom:'幻影部队',fleet:'呼叫舰队',scorched:'灼烧土地',army:'部队',soldier:'士兵',elite:'精英',hero:'普通英雄',corrupted_hero:'污染英雄',survivor:'生存者',breakthrough:'破阵',iron:'铁卫',light:'轻装',precision:'精准',wall:'坚壁',sustain:'持续作战',enhancer_attack:'强化者破军',enhancer_defense:'强化者壁垒',enhancer_speed:'强化者疾行',adventurer:'冒险者',sky:'净化天空',lost:'失落的神族',flame:'让火焰净化一切'};
type Tiers=NonNullable<EquipmentTemplate['tiers']>;
const base:Record<string,ReturnType<typeof tier>[]>={
 training:[tier(2,e('opening_rank',3))],team:[tier(2,e('opening_count',3),e('rescue_rank',.2))],identity:[tier(2,e('foreign_elites',3,1))],roaches:[tier(2,e('opening_roaches',2))],bunker:[tier(2,e('stage_bunker',1))],choice:[tier(2,e('development_refresh',2))],
 drone_hunter:[tier(2,e('drone_hunter',.2))],bounty:[tier(2,e('bounty',500,5))],overload:[tier(2,e('overload',.1,3,1.5,.05,8))],hold:[tier(2,e('hold',5,.2))],
 pack:[tier(2,e('opening_pack',2,1,5)),tier(4,e('pack_rank',3),e('pack_kill',.1,5,3))],phantom:[tier(2,e('stat.attackSpeed',.1)),tier(4,e('phantom',.05,5,.5,30,5,1))],fleet:[tier(2,e('opening_fleet',1)),tier(4,e('fleet_elite',1))],scorched:[tier(2,e('periodic_trap',30)),tier(4,e('burn_area',20,4,6,60))],
 army:[tier(2,e('direction.health',.08)),tier(4,e('recruit_discount',.08)),tier(6,e('capacity_members',1),e('direction_reinforcement',60,1,1))],
 soldier:[tier(2,e('direction.attack',.08)),tier(4,e('rank_discount',.12)),tier(6,e('capacity_rank',1),e('kill_training',80,1))],
 elite:[tier(2,e('bound.health',.08)),tier(4,e('opening_elite_bound',1),e('bound.attack',.05)),tier(6,e('opening_elite_rank',2),e('elite.health',.15),e('elite.attack',.15))],
 hero:[tier(2,e('direction.attack',.08),e('direction.health',.08)),tier(4,e('opening_hero_proxy',1,.05)),tier(6,e('opening_hero',1),e('replace_hero_proxy',1))],
 survivor:[tier(2,e('ordinary.health',.08)),tier(4,e('ordinary.reduction',.04)),tier(6,e('rescue',1,10,.5,0,0,0))],
 breakthrough:[tier(2,e('stat.attack',.08)),tier(4,e('stat.crit',.08))],iron:[tier(2,e('share_damage',.2,8)),tier(4,e('armor_percent',.2))],light:[tier(2,e('stat.move',.08)),tier(4,e('stat.attackSpeed',.12))],
 precision:[tier(2,e('stat.range',.05)),tier(4,e('stat.crit',.04)),tier(6,e('stat.critDamage',.55))],wall:[tier(2,e('stat.health',.08)),tier(4,e('stat.defense',60)),tier(6,e('stat.reduction',.06))],sustain:[tier(2,e('stat.attack',.05)),tier(4,e('stat.attackSpeed',.08)),tier(6,e('stat.attack',.1),e('stat.health',.15))]
};
const advanced:Record<string,ReturnType<typeof tier>[]>={
 ...base,
 army:[tier(2,e('capacity_members',1)),tier(4,e('opening_direction',2,1)),tier(6,e('direction_reinforcement',45,1,1))],
 soldier:[tier(2,e('recruit_rank',1)),tier(4,e('capacity_rank',1)),tier(6,e('kill_training',60,1))],
 elite:[tier(2,e('opening_elite_bound',1)),tier(4,e('opening_elite_rank',2)),tier(6,e('elite.health',.15),e('elite.attack',.15),e('bound.native',.2))],
 hero:[tier(2,e('direction.health',.12),e('direction.attack',.12)),tier(4,e('opening_direction_elites',2,1)),tier(6,e('opening_hero',1),e('bound.native',.2))],
 survivor:[tier(2,e('ordinary.health',.15)),tier(4,e('ordinary.reduction',.06)),tier(6,e('rescue',1,10,.5,1,0,0))],
 enhancer_attack:[tier(2,e('white_dps',.1)),tier(4,e('stat.critDamage',.2)),tier(6,e('stat.attack',.1))],
 enhancer_defense:[tier(2,e('white_hp',.12)),tier(4,e('white_armor',.1)),tier(6,e('stat.reduction',.04))],
 enhancer_speed:[tier(2,e('stat.move',.06)),tier(4,e('stat.dodge',.04)),tier(6,e('stat.attackSpeed',.12))]
};
const purple:Record<string,ReturnType<typeof tier>[]>={
 training:[...advanced.training,tier(4,e('training_evolution',5,6))],team:[...advanced.team,tier(4,e('volley',10,6))],identity:[...advanced.identity,tier(4,e('foreign_elites_second',5,1))],roaches:[...advanced.roaches,tier(4,e('ravager_evolution',12,2,1.5))],bunker:[...advanced.bunker,tier(4,e('fortification',2,2))],choice:[...advanced.choice,tier(4,e('development_double',1))],drone_hunter:[...advanced.drone_hunter,tier(4,e('drone_mentor',1))],bounty:[...advanced.bounty,tier(4,e('bounty_hero',1500,5))],overload:[...advanced.overload,tier(4,e('overload_chain',5,.5))],hold:[...advanced.hold,tier(4,e('hold_volley',8,6,1))],
 pack:[advanced.pack[0],tier(4,e('pack_rank',3),e('capture',.3,15,5,.1,.1,.075,.05))],phantom:[advanced.phantom[0],tier(4,e('phantom',.05,10,.5,30,5,2))],fleet:[...advanced.fleet,tier(4,e('fleet_reinforcement',20,2,1,15))],scorched:[...advanced.scorched,tier(4,e('burn_trail',2,1.5,4,60))],
 breakthrough:[...advanced.breakthrough,tier(4,e('crit_pursuit',1))],iron:[...advanced.iron,tier(4,e('iron_counter',.3,3,.2,.15,5,10))],light:[...advanced.light,tier(4,e('light_assault',3,2,3))],
 army:[tier(2,e('capacity_members',2)),tier(4,e('opening_direction',3,1)),tier(6,e('direction_reinforcement',30,1,1,2,20))],soldier:[advanced.soldier[0],advanced.soldier[1],tier(6,e('kill_training',35,2))],
 elite:[advanced.elite[0],tier(4,e('opening_elite_rank',3)),tier(6,e('elite.health',.15),e('elite.attack',.15),e('bound.native',.4))],
 hero:[advanced.hero[0],advanced.hero[1],tier(6,e('opening_hero',1),e('bound.native',.4))],survivor:[advanced.survivor[0],tier(4,e('insurance',2,1,.7,0,0)),tier(6,e('rescue',2,8,.5,1,.3,3))],
 precision:[...advanced.precision,tier(6,e('precision_crit',3,.5,8))],wall:[...advanced.wall,tier(6,e('wall_counter',.3,4,10))],sustain:[...advanced.sustain,tier(6,e('sustain_heal',12,6,.03,5))],
 enhancer_attack:[tier(2,e('white_dps',.18)),tier(4,e('stat.critDamage',.35)),tier(6,e('stat.attack',.2))],enhancer_defense:[tier(2,e('white_hp',.22)),tier(4,e('white_armor',.18)),tier(6,e('stat.reduction',.07))],enhancer_speed:[tier(2,e('stat.move',.1)),tier(4,e('stat.dodge',.07)),tier(6,e('stat.attackSpeed',.22))],
 corrupted_hero:[tier(2,e('capacity_members',1)),tier(4,e('capacity_rank',1),e('opening_direction_elites',2,1)),tier(6,e('opening_hero',1),e('bound.native',.6))]
};
const orange:Record<string,ReturnType<typeof tier>[]>={
 hero:[tier(2,e('direction.health',1),e('direction.attack',1),e('direction.attackSpeed',.3)),tier(4,e('opening_direction_elites',2,5),e('capacity_rank',2)),tier(6,e('opening_hero',3),e('bound.health',.5),e('bound.shield',.5),e('bound.native',1),e('hero_orange',1),e('hero_growth',200,50))],
 corrupted_hero:[tier(2,e('capacity_members',4),e('direction.health',1),e('direction.attack',1)),tier(4,e('capacity_rank',4),e('opening_direction_elites',3,5)),tier(6,e('opening_hero',5),e('bound.health',1),e('bound.shield',1),e('bound.native',2),e('hero_orange',2),e('hero_growth',150,30))],
 survivor:[tier(2,e('capacity_members_all',3),e('ordinary.health',1)),tier(4,e('capacity_rank_all',3),e('insurance',1,0,1,1,5)),tier(6,e('rescue',3,5,1,1,.5,5))],
 soldier:[tier(2,e('recruit_rank',4)),tier(4,e('capacity_rank',4),e('direction.attack',.5),e('direction.attackSpeed',.3)),tier(6,e('kill_training',12,2))],
 army:[tier(2,e('capacity_squads',1),e('capacity_members',5)),tier(4,e('opening_direction',7,5)),tier(6,e('capacity_squads',1),e('direction_reinforcement',10,5,1,2,20))],
 elite:[tier(2,e('opening_elite_bound',3),e('elite.health',.5),e('elite.attack',.5)),tier(4,e('opening_elite_rank',5),e('bound.health',1),e('bound.shield',1)),tier(6,e('bound.attackSpeed',.5))]
};
/** Exactly the approved 25 independent blue, 29 advanced, four special purple and six orange families. */
export function tierTemplates():EquipmentTemplate[]{const out:EquipmentTemplate[]=[];
 const add=(family:string,category:string,qualities:Quality[],tiers:Tiers,tierGate?:number)=>{for(const quality of qualities){const [a,d]=allocation[family],corrupt=family==='corrupted_hero'||['sky','lost','flame'].includes(family);out.push({id:`set.${category}.${family}.${quality}`,name:names[family],kind:'set',quality,slots:ATTRIBUTE_SLOTS,affixCount:family==='adventurer'?0:category==='blue'?2:quality===3?2:3,pollution:corrupt?'required':family==='adventurer'?'never':'allowed',setFamily:category+'.'+family,replacementFamily:['training','team','identity','roaches','bunker','choice'].includes(family)?({identity:'call',roaches:'dogs',bunker:'traps'}[family]??family):category+'.'+family,repeat:category==='blue'&&['roaches','bunker','choice'].includes(family),allocation:a,defenseAllocation:d,binding:family.includes('hero')?'hero':family==='elite'?'elite':['army','soldier'].includes(family)?'direction':undefined,tiers,tierGate,effects:[],source:category==='blue'?'STARSHIP_BLUE_EXPANSION_20261014.md':category==='orange'?'STARSHIP_ORANGE_SETS_20261014.md':'STARSHIP_PURPLE_ITEMS_20261014.md'});}};
 for(const family of Object.keys(base))add(family,'blue',[3],{3:base[family]});
 for(const family of Object.keys(advanced))add(family,'advanced',[3,4],{3:advanced[family],4:purple[family]},4);
 add('corrupted_hero','advanced',[4],{4:purple.corrupted_hero},4);
 for(const family of Object.keys(orange)){let high=orange[family];if(family==='elite')high=[high[0],{...high[1],effects:[...high[1].effects,e('bound.native_tier',1,2)]},high[2]];add(family,'orange',[4,5],{4:purple[family],5:high},4);}
 add('adventurer','special',[4],{4:[tier(2,e('adventurer',.1,2)),tier(4,e('adventurer_replace',.2,4))]});
 add('sky','special',[4],{4:[tier(2,e('stage_yamato',1,1))]});add('lost','special',[4],{4:[tier(2,e('lost_templar',3)),tier(4,e('lost_adept',5))]});add('flame','special',[4],{4:[tier(2,e('true_burn',.2,3)),tier(6,e('burn_execute',.4))]});return out;
}
