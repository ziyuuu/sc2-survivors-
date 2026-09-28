import type {World} from '../simulation/world';
import type {Entity} from '../simulation/types';
import {angleDelta,distance} from '../simulation/movement/steering';

/** Installed only by DEV's F1 panel. Never a saved field or simulation event source. */
export function installShotDiagnostics(w:World){
 const original=w.updateUnit;
 let enabled=false,lastTime=-Infinity,lastRunId=w.runId;
 type Row=ReturnType<typeof sample>&{reason:string;damage:number;shotSequence:number};
 const rows:Row[]=[],units=new Map<number,{id:number;family:string;shots:number;damage:number}>();
 const clear=()=>{rows.length=0;units.clear();lastTime=-Infinity;};
 function sample(u:Entity){
  const target=w.body(u.pendingTarget??u.attackTarget),heading=target?Math.atan2(target.x-u.x,target.z-u.z):u.attackFacing;
  return {time:w.time,tick:w.tick,id:u.id,family:u.unitType,elite:u.eliteId??null,rank:u.rank,x:u.x,z:u.z,action:u.action,
   target:target?.id??null,targetHp:target?.hp??0,targetShield:target&&'shield' in target?Number(target.shield??0):0,
   edge:target?w.edgeDistance(u,target):null,range:u.attackRange,period:u.attackPeriod,shotInterval:u.shotInterval,weaponDamage:u.weaponDamage,aimError:Math.abs(angleDelta(u.attackFacing,heading)),
   targetValid:!!target&&w.targetAllowed(u,target),lineClear:!!target&&w.hasAttackLine(u,target),cooldown:u.weaponCooldown,
   nextShotIn:Math.max(0,u.nextShotAt-w.time),windup:u.windup,aimAge:u.aimStartedAt===null?0:w.time-u.aimStartedAt,
   repositionIn:Math.max(0,u.repositionUntil-w.time),marching:Math.hypot(w.marchDirection.x,w.marchDirection.z)>.01,
   anchorDistance:distance(u,w.anchor),cliffTransit:!!u.cliffTransit};
 }
 const wrapped:World['updateUnit']=function(u,dt){
  if(!enabled||u.owner!=='terran'||u.heroId||!['marine','reaper'].includes(u.unitType))return original.call(w,u,dt);
  if(w.time<lastTime||w.runId!==lastRunId)clear();lastTime=w.time;lastRunId=w.runId;
  if(!units.has(u.id)){if(units.size>=16)return original.call(w,u,dt);units.set(u.id,{id:u.id,family:u.unitType,shots:0,damage:0});}
  const before=sample(u),sequence=u.shotSequence??0,target=w.body(before.target);
  original.call(w,u,dt);
  const fired=(u.shotSequence??0)-sequence,damage=fired&&target?Math.max(0,before.targetHp+before.targetShield-target.hp-('shield' in target?Number(target.shield??0):0)):0;
  const reason=fired?'shot':before.cliffTransit?'cliff-transit':!before.target?'no-target':!before.targetValid?'invalid-target':!before.lineClear?'blocked-line':before.edge!>before.range?'out-of-range':before.windup>0?'windup':before.cooldown>0||before.nextShotIn>dt?'cooldown':before.marching&&before.repositionIn>0?'reposition':before.aimError>=.3?'turning':'formation';
  rows.push({...before,reason,damage,shotSequence:u.shotSequence??0});if(rows.length>600)rows.shift();
  const total=units.get(u.id)!;total.shots+=fired;total.damage+=damage;
 };
 w.updateUnit=wrapped;
 return {setEnabled(value:boolean){enabled=value;if(value)clear();},clear,
  report:()=>({enabled,rows:rows.map(row=>({...row})),units:[...units.values()].map(unit=>({...unit}))}),
  dispose(){enabled=false;if(w.updateUnit===wrapped)w.updateUnit=original;clear();}};
}
