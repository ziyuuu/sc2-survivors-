import type {Entity} from '../../simulation/types';
import {SC2_UNITS} from '../../data/sc2-units';
import {SOUND_DATA} from './audio-source-data';
import type {AudioChannel} from './combat-audio-router';

/** Browser adaptation of source Herd nodes. One sound per local group/level,
 * never per member. Only already-visible, living, moving bodies enter here. */
export function herdAudio(units:Entity[],anchor:{x:number;z:number}):AudioChannel[]{
 const channels:AudioChannel[]=[],remaining=new Map(units.filter(u=>!u.heroId&&SOUND_DATA.herdBindings[u.unitType]).sort((a,b)=>a.id-b.id).map(u=>[u.id,u]));
 for(const seed of remaining.values()){
  remaining.delete(seed.id);const binding=SOUND_DATA.herdBindings[seed.unitType],herd=SOUND_DATA.herds[binding.herd];
  const members=[seed];
  // Fixed source radius around the oldest live member avoids chain-merging
  // distant squads. This spatial grouping is an adaptation, not SC2 engine code.
  for(const u of remaining.values())if(u.owner===seed.owner&&u.team===seed.team&&SOUND_DATA.herdBindings[u.unitType]?.herd===binding.herd&&Math.hypot(u.x-seed.x,u.z-seed.z)<=herd.radius){members.push(u);remaining.delete(u.id);}
  const weight=members.reduce((n,u)=>n+SOUND_DATA.herdBindings[u.unitType].weight,0);
  const x=seed.x+(members.reduce((n,u)=>n+u.x,0)/members.length-seed.x)*herd.positionBias,z=seed.z+(members.reduce((n,u)=>n+u.z,0)/members.length-seed.z)*herd.positionBias;
  const speed=members.reduce((n,u)=>n+Math.hypot(u.velocity.x,u.velocity.z)/SC2_UNITS[u.unitType].movementSpeed,0)/members.length;
  const rate=herd.speedLimit?Math.max(herd.speedLimit[0],Math.min(herd.speedLimit[1],speed)):1;
  for(const [i,level]of herd.levels.entries())if(weight>=level.weight)channels.push({key:`herd:${binding.herd}:${seed.id}:${i}`,bank:level.bank,priority:0,volume:.22*Math.max(.15,1-Math.hypot(x-anchor.x,z-anchor.z)/40),rate});
 }
 return channels;
}
