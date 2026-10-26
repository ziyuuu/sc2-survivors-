import names from './equipment-effect-names.generated.json';
import type {Case} from './catalogue';
import type {ActiveEquipmentEffect} from '../../src/simulation/starship/selection';
import {effectText} from '../../src/ui/starship/effect-text';
import type {EquipmentFixture} from './equipment-fixture';

export type Recipe='attack'|'periodic'|'opening'|'move'|'damage'|'fatal'|'recall'|'rescue'|'growth'|'pickup'|'drone'|'hero'|'shield'|'advanced'|'fort'|'evolve'|'purchase'|'rewind';
const groups:Record<Recipe,string>={
 attack:'split bounce cleave pierce double_attack cluster overload overload_chain phantom capture true_burn burn_execute execute execute_chain crit_pursuit precision_crit weakness',
 periodic:'bombardment reinforcement reinforcement_elite periodic_trap direction_reinforcement fleet_reinforcement burn_area volley hold_volley sustain_heal incendiary drop_pod drop_elite joint_support elite_training',
 opening:'opening_count opening_zerglings opening_roaches opening_hydralisk opening_elite opening_pack opening_fleet foreign_elites foreign_elites_second opening_elite_bound opening_hero_proxy opening_hero opening_direction opening_direction_elites opening_ultralisk lost_templar lost_adept stage_yamato ark ultralisk_elite',
 move:'moving_fire moving_extra burn_trail light_assault',damage:'share_damage iron_counter wall_counter adrenaline konstant',fatal:'rescue insurance phase last_stand',recall:'auto_recall recall_phantom',
 rescue:'worker_rescue rescue_rank rescue_double rescue_elite egg_reinforcement',growth:'kill_training hero_growth pack_kill devour',pickup:'bounty bounty_hero',drone:'drone_hunter drone_mentor',hero:'hero_orange manual_reset',shield:'out_of_combat_shield shield_rebuild',advanced:'swarm plague behemoth yamato_support dominance',fort:'stage_bunker fortification',evolve:'training_evolution ravager_evolution',purchase:'paid_elite',rewind:'rewind',
};
export const equipmentRecipes=new Map(Object.entries(groups).flatMap(([recipe,keys])=>keys.split(' ').map(key=>[key,recipe as Recipe] as const)));
// These modify an already exposed parent process or a numeric rule; they have
// no separate emitter. Their exact parameter text remains searchable.
export const equipmentRuleKeys=new Set(`periodic_worker reactor worker_building purchase_copy opening_workers periodic_resources catch_up worker_efficiency pickup_yield pickup_radius pickup_double stage_resources shop_refresh free_product purchase_discount refresh_discount manual_cooldown melee_range weapon_range opening_rank development_refresh hold pack_rank fleet_elite recruit_discount capacity_members rank_discount capacity_rank opening_elite_rank replace_hero_proxy armor_percent development_double recruit_rank white_dps white_hp white_armor capacity_members_all capacity_rank_all capacity_squads adventurer adventurer_replace equipment_drop_chance boss_quality loan card_copy equipment_drop harvest stage_reward_percent resource_drop supply_interest free_refresh_quality purchase_identity_discount purchase_rank stable_refresh refresh_multiplier refresh_credit first_purchase_free build_free build_double build_research turn_factor moving_chance distance_damage prepare_reduction bounty_order plunder capacity_baseline recruit_rank_all research_cap hero_cap weapon_area weapon_bonus`.split(' '));
export function equipmentRecipe(key:string){
 if(key==='egg_conversion')return null; // Native ordinary economic eggs pass an empty child list.
 const recipe=equipmentRecipes.get(key);if(recipe)return recipe;
 if(equipmentRuleKeys.has(key)||/^(stat|bound|direction|elite|ordinary)\./.test(key))return null;
 throw Error('舰装效果未分类：'+key);
}
export type PreviewPhase='cycle'|'expiry'|'death';
export type EquipmentPreviewData=EquipmentFixture&{effects:ActiveEquipmentEffect[];focusEffect:string;previewPhase:PreviewPhase;description:string;recipe:Recipe};
const lifecycle=new Set('phantom recall_phantom phase reinforcement reinforcement_elite fleet_reinforcement egg_reinforcement drop_pod drop_elite swarm plague behemoth'.split(' '));
export function equipmentPreviewCases(cases:Case[]):Case[]{return cases.flatMap(c=>{
 const d=c.data as EquipmentFixture&{effects:ActiveEquipmentEffect[]},effects=d.effects.filter(e=>equipmentRecipe(e.key)&&!(e.key==='opening_hero_proxy'&&d.effects.some(x=>x.key==='replace_hero_proxy'&&x.source===e.source)));
 if(!effects.length)return [c];
 // Repeatable set groups contribute multiple active entries with the same
 // key. Preview the complete equipped combination once, keeping every native
 // parameter entry in data.effects and describing the number of active groups.
 const unique=effects.filter((effect,index)=>effects.findIndex(e=>e.key===effect.key)===index);
 return unique.flatMap((effect,i)=>{
  const matching=effects.filter(e=>e.key===effect.key),texts=[...new Set(matching.map(effectText))],description=matching.length===1?texts[0]:texts.length===1?texts[0]+'（'+matching.length+'组同时生效）':matching.map((e,n)=>'第'+(n+1)+'组：'+effectText(e)).join('；');
  const recipe=equipmentRecipe(effect.key)!,phases:PreviewPhase[]=lifecycle.has(effect.key)?['cycle','expiry','death']:effect.key==='konstant'?['cycle','expiry']:['cycle'];
  return phases.map((phase,j)=>({...c,id:i===0&&j===0?c.id:c.id+':effect:'+effect.key+':'+phase,action:effect.key+':'+phase,seconds:recipe==='hero'?18:recipe==='recall'?14:recipe==='fatal'?15:recipe==='advanced'?12:12,data:{...d,focusEffect:effect.key,previewPhase:phase,description,recipe},name:c.name+' · '+description+(phase==='expiry'?' · 到期退场':phase==='death'?' · 中途阵亡':'')}));
 });
});}
export function equipmentActionName(c:Case){const d=c.data as EquipmentPreviewData;return ((names as Record<string,string>)[d.focusEffect]??d.description)+(d.previewPhase==='expiry'?' · 到期退场':d.previewPhase==='death'?' · 中途阵亡':'');}
