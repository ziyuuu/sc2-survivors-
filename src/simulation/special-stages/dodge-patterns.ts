import type {Barrage,BarrageCue,DodgePattern} from './state';
import type {Point} from '../types';

export const DODGE_PATTERNS:readonly DodgePattern[]=['ribbon','fan','aim','cross','squeeze'];
export const DODGE_HIT_RADIUS=.18;
export const DODGE_BULLET_RADIUS=.42;
/** Broad lanes, rotating fans and snapshot aimed volleys, adapted for full-size bodies. */
export function dodgePhrase(clock:number,serial:number):DodgePattern {
 const section=Math.floor(Math.max(0,clock-180)/600);
 return section<5?DODGE_PATTERNS[section]:DODGE_PATTERNS[Math.floor(serial/2)%DODGE_PATTERNS.length];
}
export function dodgeCue(clock:number,serial:number,anchor:Point,_footprint:number,squadSpeed:number):BarrageCue {
 return {at:clock+18,axis:'z',side:-1,pattern:dodgePhrase(clock,serial),serial,
  gap:Math.sin(clock/60*.27)*9,width:5.6,aim:{...anchor},speed:(7.2+Math.min(.8,clock/3600))*Math.min(1,Math.max(.82,squadSpeed/3.6))};
}
/** The final phrase changes motifs, not density; every fourth volley leaves a breath. */
export function dodgeInterval(clock:number,_footprint=2.25,_squadSpeed=3.6){
 const section=Math.floor(Math.max(0,clock-180)/600);
 return (section===2?72:60)+(Math.floor(clock/60)%4===3?24:0);
}
type Shot=Point&{vx:number;vz:number;curve?:number;phase?:number};
export function dodgeShots(c:BarrageCue):Shot[]{
 const out:Shot[]=[],pattern=c.pattern??'ribbon',serial=c.serial??0,speed=c.speed??7.2;
 const shot=(x:number,z:number,angle:number,factor=1)=>out.push({x,z,vx:Math.sin(angle)*speed*factor,vz:Math.cos(angle)*speed*factor});
 if(pattern==='ribbon'){
  // Wide curtain with a slowly moving opening. Curvature stays inside its lane.
  for(let i=0;i<8;i++){const x=-22.75+i*6.5;if(Math.abs(x-c.gap)>(c.width??5.6)/2)out.push({x,z:-21,vx:0,vz:speed,curve:.65,phase:serial*.3});}
 }else if(pattern==='fan'){
  const x=serial%2?-9:9,turn=Math.sin(serial*.6)*.22;
  for(let i=-3;i<=3;i++)shot(x,-21,i*.24+turn-Math.atan2(x,30));
 }else if(pattern==='aim'){
  // A single three-way aimed volley teaches baiting followed by a lateral step.
  const x=serial%2?-12:12,target=c.aim??{x:0,z:8},aim=Math.atan2(target.x-x,Math.max(8,target.z+21));
  for(const offset of [-.24,0,.24])shot(x,-21,aim+offset);
 }else if(pattern==='cross'){
  for(let i=0;i<3;i++){shot(-21+i*7,-21,.34);shot(7+i*7,-21,-.34,serial%2?.88:1.12);}
 }else{
  const turn=Math.sin(serial*.45)*.16;
  for(const side of [-1,1])for(let i=0;i<3;i++)shot(side*15,-21,side*(-.42+i*.24)+side*turn);
 }
 return out;
}
export function barragePosition(b:Barrage,clock:number):Point {
 const age=(clock-b.born)/60;
 return {x:(b.originX??b.x)+b.vx*age+(b.curve??0)*(Math.sin(age*1.35+(b.phase??0))-Math.sin(b.phase??0)),z:(b.originZ??b.z)+b.vz*age};
}
