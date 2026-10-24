import type {World} from '../world';
import {hordeAllowed} from '../progression/fun-availability';
import type {UnitType} from '../../data/sc2-units';
import {SC2_UNITS} from '../../data/sc2-units';
import {TUNING} from '../../data/game';
import {campaignProgress} from '../../data/enemy-tuning';
import {HORDE_KINDS,HORDE_NAMES,HORDE_RULES,type HordeKind} from './state';
import {distance,blocked} from '../movement/steering';
const TYPES:Record<HordeKind,readonly UnitType[]>={zerglings:['zergling'],roachHydra:['roach','hydralisk'],mutalisks:['mutalisk'],ultralisks:['ultralisk']};
export const replacementType=(kind:HordeKind,serial:number)=>TYPES[kind][serial%TYPES[kind].length];
export const replacementDensity=(serial:number):.3|.5|1=>serial%9<4?.3:serial%9<8?.5:1;
export const legalHordeKinds=(stage:number)=>HORDE_KINDS.filter(k=>stage>=HORDE_RULES[k].stage&&stage<=18);
export const hordeCandidates=(w:World)=>hordeAllowed(w.difficulty)?legalHordeKinds(w.stage):[];
export function startReplacementHorde(w:World,kind:HordeKind,bait=false){
 if(!hordeCandidates(w).includes(kind)||w.fieldEvents.horde||!w.replacementWindowSafe())return false;
 // Admission must actually succeed before the 20-second replacement window starts.
 const s={kind,started:w.time,until:w.time+20,next:w.time,spawned:0,replaced:0};w.fieldEvents.horde=s;
 release(w);
 if(!s.spawned){w.fieldEvents.horde=null;return false;}
 if(!bait)w.fieldEvents.hordeTried=true;w.announce(HORDE_NAMES[kind]+' · 20秒内替代其他敌人刷新');return true;
}
function release(w:World){
 const s=w.fieldEvents.horde;if(!s||w.time>=s.until-1e-8||w.time<s.next-1e-8)return;
 // No backlog: a blocked pulse expires rather than bursting after the window.
 s.next=s.started+(Math.floor((w.time-s.started+1e-8)/2)+1)*2;
 const rule=HORDE_RULES[s.kind];
 const guards=w.releaseReplacementGuards(Math.min(rule.pulse,rule.total-s.spawned));
 for(let i=guards;i<rule.pulse&&s.spawned<rule.total&&w.enemyCount()<w.missionEnemyCapacity();i++){
  const type=replacementType(s.kind,s.spawned),radius=SC2_UNITS[type].unitRadius*TUNING.unitScale;
  const cells=w.spawnLocations.filter(p=>distance(p,w.anchor)>=12&&distance(p,w.anchor)<=32&&!blocked(p,radius,w.obstacles)&&(!w.terrain||w.terrain.canOccupy(p,radius))&&[...w.entities.values()].every(u=>u.hp<=0||u.flying!==SC2_UNITS[type].flying||distance(u,p)>=u.unitRadius+radius+.1));
  if(!cells.length)break;
  const p=cells[Math.floor(w.random()*cells.length)],density=replacementDensity(s.spawned),stamp={stage:w.stage,progress:campaignProgress(w.stage,w.stageElapsed,w.duration),density} as const;
  const u=w.addUnit(type,'zerg',p.x,p.z,1,'regular',w.stage,stamp);u.enemyResources={minerals:density,gas:density};s.spawned++;w.stats.ambientSpawned++;
 }
}
export function tickReplacementHorde(w:World){
 const s=w.fieldEvents;
 if(s.horde){
  if(w.time>=s.horde.until-1e-8){s.lastHorde={...s.horde};s.horde=null;w.announce('虫群刷新结束 · 恢复原刷新');}
  else release(w);
  return;
 }
}
