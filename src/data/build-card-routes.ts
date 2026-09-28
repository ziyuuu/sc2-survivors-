import type {FamilyId,Race} from './races';
export type RouteEffect='weapon'|'vitality'|'armor'|'recovery'|'energy'|'production'|'cultivation'|'elite';
export interface BuildCardRoute {id:string;race:Race;name:string;families:FamilyId[];phases:readonly (readonly [FamilyId,RouteEffect[]][])[]}
const route=(id:string,race:Race,name:string,families:FamilyId[],phases:BuildCardRoute['phases']):BuildCardRoute=>({id,race,name,families,phases});
/** Approved feedback routes: recommendation changes with stage; legal cards are never locked out. */
export const BUILD_CARD_ROUTES:readonly BuildCardRoute[]=[
 route('bio','terran','生化机动',['marine','marauder','reaper','viking','medivac'],[
  [['marine',['weapon','cultivation']],['marauder',['vitality']]],
  [['reaper',['weapon']],['medivac',['recovery','energy']],['viking',['weapon']]],
  [['marine',['elite','production']],['marauder',['elite','production']],['reaper',['elite']],['viking',['cultivation']]]]),
 route('tank','terran','步坦推进',['marine','marauder','tank','viking','medivac'],[
  [['marine',['weapon']],['marauder',['vitality']],['tank',['production']]],
  [['tank',['weapon','cultivation']],['medivac',['recovery']],['viking',['weapon']]],
  [['tank',['elite','vitality','production']],['viking',['cultivation']],['marine',['production']]]]),
 route('mech','terran','机械重装',['hellion','tank','thor','viking','science_vessel'],[
  [['hellion',['weapon','vitality']],['tank',['production']]],
  [['tank',['weapon']],['science_vessel',['recovery','energy']],['viking',['weapon']]],
  [['thor',['weapon','vitality','elite','production']],['tank',['production']]]]),
 route('swarm','zerg','虫群冲击',['zergling','baneling','roach','hydralisk','queen'],[
  [['zergling',['weapon','cultivation']],['roach',['vitality']]],
  [['baneling',['vitality','weapon']],['hydralisk',['weapon']],['queen',['recovery','energy']]],
  [['roach',['vitality','armor']],['zergling',['elite','cultivation','production']],['baneling',['elite','production']],['hydralisk',['elite','cultivation']]]]),
 route('burrow','zerg','地面阵地',['roach','ravager','hydralisk','lurker','queen'],[
  [['roach',['vitality','weapon']],['ravager',['production']]],
  [['hydralisk',['weapon']],['lurker',['weapon','cultivation']],['queen',['recovery','energy']]],
  [['lurker',['elite','vitality','production']],['ravager',['elite','vitality','production']],['roach',['vitality','armor']]]]),
 route('beasts','zerg','空地重型',['roach','ultralisk','mutalisk','corruptor','queen'],[
  [['roach',['vitality','armor']],['queen',['recovery','energy']]],
  [['mutalisk',['weapon']],['corruptor',['weapon']],['ultralisk',['production']]],
  [['ultralisk',['vitality','armor','elite']],['mutalisk',['cultivation','production']],['corruptor',['cultivation','production']]]]),
 route('robotics','protoss','护盾机械',['zealot','stalker','sentry','immortal','colossus'],[
  [['zealot',['vitality','armor']],['stalker',['weapon']]],
  [['sentry',['energy']],['immortal',['weapon']],['colossus',['production']]],
  [['colossus',['weapon','elite']],['immortal',['vitality','armor','cultivation']]]]),
 route('psionic','protoss','灵能范围',['zealot','stalker','sentry','high_templar','immortal'],[
  [['zealot',['vitality','armor']],['stalker',['weapon']]],
  [['sentry',['energy']],['high_templar',['energy']],['immortal',['weapon']]],
  [['high_templar',['elite','cultivation','production']],['immortal',['cultivation','vitality']],['zealot',['vitality']]]]),
 route('fleet','protoss','舰队护航',['zealot','sentry','phoenix','void_ray','carrier'],[
  [['zealot',['vitality','armor']],['sentry',['energy']]],
  [['phoenix',['weapon']],['void_ray',['weapon']],['carrier',['production']]],
  [['carrier',['weapon','cultivation','elite','production']],['phoenix',['production']],['void_ray',['production']]]]),
];
export function buildRouteMatches(race:Race,stage:number,standing:ReadonlySet<FamilyId>,alive:(f:FamilyId)=>boolean,selected:ReadonlySet<FamilyId>){
 const phase=stage<=5?0:stage<=11?1:2;
 return BUILD_CARD_ROUTES.filter(r=>r.race===race).map(route=>({route,score:route.families.reduce((n,f)=>n+(alive(f)?4:standing.has(f)?2:selected.has(f)?1:0),0),cards:route.phases.slice(0,phase+1).flat()}));
}
