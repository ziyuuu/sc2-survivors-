import type {World} from '../../simulation/world';
import type {EnemyMissileVisual,Point,VisualEvent} from '../../simulation/types';
import {SourceEffectPlayer,SOURCE_EFFECTS} from './source/player';
import {sourceLife,sourceSeed} from './source/timeline';
import type {SourcePlacement} from './source/types';

const rate=1.4;
const models={bile:['RavagerCorrosiveBileImpact'],spikes:['LurkerMPAttackSpike','LurkerAttackSpikeEx2'],cone:['RoachMissileImpact']} as const;
/** Presentation follows the frozen targeting plane. Collision stays in EnemySpecials. */
export function enemyMissileHeight(m:Point&{visualFlight?:EnemyMissileVisual},ground:(p:Point)=>number){
 const v=m.visualFlight;if(!v)return ground(m)+.7;
 const length=Math.hypot(v.point.x-v.origin.x,v.point.z-v.origin.z),t=Math.min(1,Math.hypot(m.x-v.origin.x,m.z-v.origin.z)/Math.max(.001,length));
 const start=(v.sourceFlying?5.6:ground(v.origin))+.7,end=(v.targetFlying?5.6:ground(v.point))+.7;
 return start+(end-start)*t;
}

/** Only committed native receipts may start impact effects. Pending trajectories
 * are reconstructed from saved casts; this class never mutates simulation data. */
export class EnemySpecialSource {
 private serial=0;private echoes:VisualEvent[]=[];
 reset(){this.serial=0;this.echoes=[];}
 // The owner resets caches when time advanced in low detail. A paused round
 // trip only advances the receipt cursor and must retain its frozen tails.
 resumeAt(w:World){this.serial=w.visualEvents.at(-1)?.serial??0;}
 render(w:World,player:SourceEffectPlayer,ground:(p:Point)=>number,owned:Set<number>){
  const request=(model:string,key:string,age:number,placement:SourcePlacement,loop=false)=>player.add({key,model,age:Math.max(0,age*rate),clockRate:rate,seed:sourceSeed(key),placement,loop},ground);
  const at=(p:Point,h=0,flying=false)=>({x:p.x,y:(flying?5.6:ground(p))+h,z:p.z});
  for(const c of w.enemySpecials.casts){
   const source=w.entities.get(c.source),remaining=c.at-w.time;if(remaining<=0||c.kind!=='bile'&&(!source||source.hp<=0))continue;
   const duration=c.visual?.duration??(c.kind==='bile'?(c.tier==='elite'?2.5:1.5):1),age=Math.max(0,duration-remaining),from=at(c.origin,1.3,c.visual?.sourceFlying??!!source?.flying);
   if(c.kind==='bile')for(const [i,p] of c.points.entries()){
    const end=at(p,.15),t=Math.min(1,age/duration),head={x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t+Math.sin(t*Math.PI)*7,z:from.z+(end.z-from.z)*t};
    request('RavagerCorrosiveBileMissile',`enemy-special:flight:${c.id}:${i}`,age,{...head,facing:Math.atan2(end.x-from.x,end.z-from.z),from,age:age*rate},true);
   }
   if(c.kind==='cone'&&remaining<=.2){
    const travel=.2-remaining,t=travel/.2;
    for(let i=0;i<5;i++){const angle=c.angle+(i-2)*.3,end=at({x:c.origin.x+Math.sin(angle)*c.range,z:c.origin.z+Math.cos(angle)*c.range},.6),head={x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t,z:from.z+(end.z-from.z)*t};
     request('AcidSalivaWeapon',`enemy-special:cone:${c.id}:${i}`,travel,{...head,facing:angle,from,age:travel*rate,direction:{x:end.x-from.x,y:end.y-from.y,z:end.z-from.z}},true);
    }
   }
  }
  for(const e of w.visualEvents)if(e.kind==='enemy-special-impact'){
   owned.add(e.serial);if(e.serial>this.serial&&e.enemySpecial)this.echoes.push(structuredClone(e));
  }
  this.serial=w.visualEvents.at(-1)?.serial??this.serial;
  this.echoes=this.echoes.filter(e=>w.time-e.time<Math.max(...models[e.enemySpecial!.kind].map(m=>sourceLife(SOURCE_EFFECTS[m])/rate)));
  for(const e of this.echoes){
   const c=e.enemySpecial!,age=w.time-e.time,key=`enemy-special:impact:${e.serial}`;
   if(c.kind==='spikes'){
    for(const [i,angle] of [c.angle-.2,c.angle,c.angle+.2].entries())for(let d=1;d<=c.range;d++)for(const model of models.spikes){
     if(age>=sourceLife(SOURCE_EFFECTS[model])/rate)continue;
     request(model,`${key}:${i}:${d}:${model}`,age,{...at({x:c.origin.x+Math.sin(angle)*d,z:c.origin.z+Math.cos(angle)*d}),facing:angle});
    }
   }else for(const [i,p] of c.points.entries())for(const model of models[c.kind])request(model,`${key}:${i}:${model}`,age,{...at(p,c.kind==='cone'?.6:0),facing:c.angle});
  }
 }
}
