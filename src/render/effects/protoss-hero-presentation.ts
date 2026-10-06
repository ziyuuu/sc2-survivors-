import {AIR_HEIGHT} from '../../data/terrain';
import type {Point3} from '../../simulation/combat/hero-attack-upgrades';
import type {Entity,HeroCast} from '../../simulation/types';

/** Presentation seconds and world widths only; never used by combat resolution. */
export const PROTOSS_PRESENTATION={basicBladeWidth:.48,basicTrail:.32,skillBladeWidth:1.15,skillTrail:.95,fleetGather:.48,fleetRelease:.7,fleetBeamWidth:2.6,fleetBeamHalo:4.1} as const;
export const mixPoint=(a:Point3,b:Point3,t:number):Point3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(n:number)=>{const t=clamp01(n);return t*t*(3-2*t);};
export function trailOpacity(now:number,at:number,life:number){const age=now-at;return age<0||age>=life?0:(1-age/life)**1.6;}
export function fleetPhase(now:number,begin:number,impact:number){
 const duration=Math.max(.01,impact-begin),progress=clamp01((now-begin)/duration),releaseAt=impact-Math.min(.4,duration*.28);
 return {progress,charge:smooth(progress/.72),gather:smooth((now-begin)/PROTOSS_PRESENTATION.fleetGather),beam:now>=releaseAt&&now<=impact+PROTOSS_PRESENTATION.fleetRelease,release:clamp01((now-impact)/PROTOSS_PRESENTATION.fleetRelease),expired:now<begin||now>=impact+PROTOSS_PRESENTATION.fleetRelease};
}
export function fleetFrame(c:Pick<HeroCast,'origin'|'point'|'at'|'beganAt'|'presentationLaunch'>){
 const origin=c.presentationLaunch??c.origin,angle=Math.atan2(c.point.x-origin.x,c.point.z-origin.z),dir={x:Math.sin(angle),z:Math.cos(angle)};
 const center={x:origin.x,y:AIR_HEIGHT+.38,z:origin.z},focus={x:origin.x+dir.x*4.1,y:AIR_HEIGHT+.65,z:origin.z+dir.z*4.1};
 return {center,focus,angle,dir};
}
/** Stable sparse formation: surviving child identity, never a synthetic ship or target. */
export function fleetChildPoint(c:Pick<HeroCast,'origin'|'point'|'at'|'beganAt'|'presentationLaunch'>,child:Entity,index:number,now:number){
 const frame=fleetFrame(c),phase=fleetPhase(now,c.beganAt??c.at-1.4,c.at),row=Math.floor(index/4),side=(index%4-1.5)*1.65,forward=.7+row*.92;
 const slot={x:frame.center.x+frame.dir.x*forward+Math.cos(frame.angle)*side,y:AIR_HEIGHT+.25+row*.16,z:frame.center.z+frame.dir.z*forward-Math.sin(frame.angle)*side};
 const actual={x:child.x,y:AIR_HEIGHT,z:child.z},returning=smooth((phase.release-.68)/.32),point=mixPoint(mixPoint(actual,slot,phase.gather),actual,returning);
 return {point,facing:Math.atan2(frame.focus.x-point.x,frame.focus.z-point.z),phase};
}
