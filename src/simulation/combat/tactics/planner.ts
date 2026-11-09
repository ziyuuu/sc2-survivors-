import type {World} from '../../world';
import type {Entity,Body,Point} from '../../types';
import {squadActor,tacticalIntent} from './intent';
import {attackPosition} from './positions';
import {committedHits,scheduledHits} from './commitments';
import {applyPredictedHit,defenseSnapshot} from './estimates';
import {distance,clearLine,blocked} from '../../movement/steering';
import {unitData} from '../expedition-combat';

export interface Candidate {target:Body;role:number;score:number;}
export interface TacticalPlan {unit:Entity;target:Body;role:number;point:Point;until:number;arrival:number;created:number;command:number;firstHit:number;confidence:'windup'|'position';}
interface PlanningState {entities:World['entities'];stage:number;terrain:World['terrain'];scene:unknown;time:number;command:string;plans:Map<number,TacticalPlan>;held:Map<number,{target:Body;until:number}>;decisions:number;switches:number;}
const states=new WeakMap<World,PlanningState>();
function state(w:World){
 let s=states.get(w);
 if(!s||s.entities!==w.entities||s.stage!==w.stage||s.terrain!==w.terrain||s.scene!==w.specialStages.active||s.time>w.time){
  s={entities:w.entities,stage:w.stage,terrain:w.terrain,scene:w.specialStages.active,time:w.time,command:'',plans:new Map(),held:new Map(),decisions:0,switches:0};states.set(w,s);w.combatSlots.clear();
 }
 const direction=Math.hypot(w.input.x,w.input.z)>.01?Math.round(Math.atan2(w.input.x,w.input.z)*8/Math.PI):'stop';
 const command=`${w.order?.issuedAt??-1}:${direction}`;
 if(s.command!==command){s.command=command;s.plans.clear();s.held.clear();w.combatSlots.clear();}
 s.time=w.time;return s;
}
export function clearTactics(w:World){states.delete(w);w.combatSlots.clear();}
export function prepareTactics(w:World){const s=state(w);for(const [id,p]of s.plans)if(p.until<=w.time||p.unit.hp<=0||p.target.hp<=0||w.entities.get(id)!==p.unit||w.body(p.target.id)!==p.target||p.unit.attackTarget!==p.target.id){s.plans.delete(id);w.combatSlots.release(id);}for(const [id,h]of s.held)if(h.until<=w.time||h.target.hp<=0)s.held.delete(id);}
export function tacticsDiagnostics(w:World){const s=state(w);return {decisions:s.decisions,switches:s.switches,plans:[...s.plans.values()],held:s.held.size};}
function valid(w:World,p:TacticalPlan){return p.until>w.time&&w.entities.get(p.unit.id)===p.unit&&w.body(p.target.id)===p.target&&p.unit.hp>0&&p.unit.attackTarget===p.target.id&&w.targetAllowed(p.unit,p.target)&&!tacticalIntent(w,p.unit).moving;}
function covered(w:World,u:Entity,target:Body,s:PlanningState,hardOnly=false){
 const contributors:{unit:Entity;arrival:number}[]=[];
 let screeningBudget=0;
 if(!hardOnly)for(const other of w.combatAllies){
  if(other===u||other.hp<=0||other.attackTarget!==target.id||!squadActor(other)||tacticalIntent(w,other).moving)continue;
  const plan=s.plans.get(other.id),ready=w.canFireAt(other,target);
  if(!(other.pendingTarget===target.id&&other.windup>0)&&(!plan||!valid(w,plan)))continue;
  if(!ready&&!plan)continue;
  const arrival=ready?0:Math.max(0,plan!.arrival-(w.time-plan!.created));contributors.push({unit:other,arrival});
  screeningBudget+=other.weaponDamage*unitData(other).attacks*(1+Math.ceil(2/Math.max(1/60,other.attackPeriod)))*4;
 }
 // Expensive modifier/absorption evaluation is useful only near a plausible kill.
 // Declining to promise a kill is conservative; this screen never withholds a shot.
 for(const p of w.weaponFlights)if(p.target===target.id&&!p.lost)screeningBudget+=(p.damage+p.bonuses.reduce((n,b)=>n+b.amount,0))*p.hits*p.crit*4;
 for(const p of w.heroAttacks.packets)if(p.target===target.id&&!p.lost)screeningBudget+=(p.damage+p.bonuses.reduce((n,b)=>n+b.amount,0))*p.hits*p.crit*4;
 if(!w.expedition.weaponAreas.length&&target.hp>screeningBudget)return false;
 const defense=defenseSnapshot(w,target);if(!defense)return false;
 const hits=committedHits(w,target).filter(p=>p.at<=w.time+2&&(!hardOnly||p.confidence==='flight'));
 for(const c of contributors)hits.push(...scheduledHits(w,c.unit,target,c.arrival));
 hits.sort((a,b)=>a.at-b.at||a.source.id-b.source.id||a.key.localeCompare(b.key));
 for(const hit of hits){applyPredictedHit(defense,hit);if(defense.hp<=0)return true;}return false;
}
/** Shared soft allocations never stop the final available attacker. Real flight credit expires. */
export function planTarget(w:World,u:Entity,candidates:Candidate[]):Body|undefined{
 if(!squadActor(u))return candidates[0]?.target;
 const s=state(w);s.decisions++;s.held.delete(u.id);s.plans.delete(u.id);
 const ranked=candidates.slice().sort((a,b)=>a.role-b.role||a.score-b.score||a.target.id-b.target.id).slice(0,8);
 let fallback:Candidate|undefined,paths=0;
 for(const candidate of ranked){
  const b=candidate.target;if(!w.targetAllowed(u,b))continue;
  const ready=w.canFireAt(u,b);
  if(!ready&&u.attackRange<1.5&&paths++>=2)continue;
  const position=attackPosition(w,u,b);if(!position)continue;
  fallback??=candidate;
  if(covered(w,u,b,s))continue;
  const first=scheduledHits(w,u,b,position.arrival)[0];
  s.plans.set(u.id,{unit:u,target:b,role:candidate.role,point:position.point,until:w.time+.4,arrival:position.arrival,created:w.time,command:w.order?.issuedAt??-1,firstHit:first?.at??Infinity,confidence:first?.confidence==='windup'?'windup':'position'});
  if(u.attackTarget!==null&&u.attackTarget!==b.id)s.switches++;
  return b;
 }
 const b=fallback?.target;
 if(b&&covered(w,u,b,s,true))s.held.set(u.id,{target:b,until:w.time+.24});
 // Moving actors keep legal opportunistic fire. They cannot acquire pursuit slots.
 return b??(tacticalIntent(w,u).moving?ranked.find(c=>w.canFireAt(u,c.target))?.target:undefined);
}
export function holdForFlight(w:World,u:Entity,b:Body){
 const existing=states.get(w);if(!existing?.held.has(u.id))return false;
 const s=state(w),held=s.held.get(u.id);
 if(!held||held.target!==b||held.until<=w.time||!covered(w,u,b,s,true)){s.held.delete(u.id);return false;}
 return true;
}
export function plannedPosition(w:World,u:Entity,target:Body){const p=state(w).plans.get(u.id);return p&&valid(w,p)&&p.target===target&&distance(p.point,target)<=u.attackRange+u.unitRadius+target.unitRadius+.1?p.point:undefined;}
/** Only a currently unproductive, uncommanded ally yields a short traversable shoulder. */
export function yieldingPosition(w:World,u:Entity):Point|undefined{
 if(!squadActor(u)||u.flying||!tacticalIntent(w,u).mayPursue||u.windup>0||u.action==='heal'||u.action==='skill')return;
 const target=w.body(u.attackTarget);if(target&&w.canFireAt(u,target))return;
 for(const p of state(w).plans.values()){
  const a=p.unit;if(a===u||a.flying||a.attackRange>=1.5||!valid(w,p)||distance(a,u)>3||w.canFireAt(a,p.target))continue;
  const dx=p.point.x-a.x,dz=p.point.z-a.z,length=Math.hypot(dx,dz);if(length<.01)continue;
  const along=((u.x-a.x)*dx+(u.z-a.z)*dz)/length,across=Math.abs((u.x-a.x)*dz-(u.z-a.z)*dx)/length;
  if(along<=0||along>=length||across>=u.unitRadius+a.unitRadius+.18)continue;
  for(const sign of [u.id%2?1:-1,u.id%2?-1:1]){
   const travel=Math.min(1.2,u.unitRadius+a.unitRadius+.25),point={x:u.x+dz/length*travel*sign,z:u.z-dx/length*travel*sign};
   if(Math.abs(point.x)+u.unitRadius>=w.mapHalf||Math.abs(point.z)+u.unitRadius>=w.mapHalf||blocked(point,u.unitRadius,w.obstacles)||!clearLine(u,point,u.unitRadius,w.obstacles,w.terrain)||!w.combatSlots.available(u,point,w.time))continue;
   if([...w.entities.values()].some(b=>b!==u&&b.hp>0&&!b.flying&&distance(point,b)<u.unitRadius+b.unitRadius+.04))continue;
   return point;
  }
 }return;
}
