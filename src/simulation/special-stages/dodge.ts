import type {World} from '../world';
import type {Point} from '../types';
import type {SpecialActive} from './state';
import {barragePosition,dodgeCue,dodgeInterval,dodgeShots,DODGE_HIT_RADIUS,DODGE_BULLET_RADIUS} from './dodge-patterns';
import {diagnosticHealthLock} from '../../diagnostics/combat-lock';
import {TUNING} from '../../data/game';
import {distance} from '../movement/steering';
/** Relative swept segment distance includes both actor and projectile movement. */
export function barrageIntersection(b0:Point,b1:Point,u0:Point,u1:Point,r:number){
 const x=b0.x-u0.x,z=b0.z-u0.z,dx=b1.x-u1.x-x,dz=b1.z-u1.z-z,length=dx*dx+dz*dz,t=length>1e-12?Math.max(0,Math.min(1,-(x*dx+z*dz)/length)):0;
 return (x+dx*t)**2+(z+dz*t)**2<=r*r;
}
function emit(w:World,a:SpecialActive){
 for(const p of dodgeShots(a.cue!)){
  const {vx,vz}=p,u=w.addUnit('baneling','zerg',p.x,p.z);
  u.specialNoLoot=true;u.hp=u.maxHp=1;u.unitRadius=DODGE_BULLET_RADIUS;u.weaponDamage=0;u.attackTarget=null;u.action='move';u.facing=Math.atan2(vx,vz);
  a.barrage.push({id:u.id,...p,originX:p.x,originZ:p.z,radius:DODGE_BULLET_RADIUS,hit:false,born:a.clock});
 }a.cue=null;
}
export function stepDodge(w:World,onFinish:(result:'success'|'failed')=>void){
 const a=w.specialStages.active!;const dt=TUNING.step;a.clock++;w.tick++;w.time=w.tick*dt;
 const units=a.participants.map(id=>w.entities.get(id)!),speed=Math.min(...units.map(u=>u.moveSpeed)),input=w.input,order=w.order?.kind==='move'?w.order.point:null,raw=Math.hypot(input.x,input.z)>.01?input:order?{x:order.x-w.anchor.x,z:order.z-w.anchor.z}:{x:0,z:0},mag=Math.hypot(raw.x,raw.z);
 const delta=mag>.01?Math.min(speed*dt,order&&Math.hypot(input.x,input.z)<.01?mag:Infinity):0;
 const spacing=Math.max(1.2,...units.map(u=>u.unitRadius*2+.25)),radius=Math.max(...units.map(u=>u.unitRadius)),bound=18-spacing/2-radius;
 const next={x:Math.max(-bound,Math.min(bound,w.anchor.x+(mag?raw.x/mag*delta:0))),z:Math.max(-bound,Math.min(bound,w.anchor.z+(mag?raw.z/mag*delta:0)))};
 if(order&&distance(next,order)<.1)w.cancelOrder();
 const previousAnchor={x:w.anchor.x,z:w.anchor.z};Object.assign(w.anchor,next);
 units.forEach((u,i)=>{u.prev={x:u.x,z:u.z};const goal={x:next.x+(i%2-.5)*spacing,z:next.z+(Math.floor(i/2)-.5)*spacing},d=distance(u,goal),step=Math.min(d,u.moveSpeed*dt);if(d>.001){u.x+=(goal.x-u.x)/d*step;u.z+=(goal.z-u.z)/d*step;u.facing=Math.atan2(goal.x-u.prev.x,goal.z-u.prev.z);}u.distanceWalked+=step;u.velocity={x:(u.x-u.prev.x)/dt,z:(u.z-u.prev.z)/dt};u.action=step>.001?'move':'idle';u.pendingTarget=null;u.attackTarget=null;u.windup=0;});
 if(!a.cue&&a.clock>=a.nextPattern&&a.clock<3540){a.cue=dodgeCue(a.clock,a.patterns++,w.anchor,spacing+radius*2,speed);a.nextPattern=a.clock+dodgeInterval(a.clock,spacing+radius*2,speed);}
 if(a.cue&&a.clock>=a.cue.at)emit(w,a);
 let hit=false;
 for(const b of a.barrage){
  const old={x:b.x,z:b.z};if(b.originX===undefined){b.x+=b.vx*dt;b.z+=b.vz*dt;}else Object.assign(b,barragePosition(b,a.clock));
  const touched=!b.hit&&barrageIntersection(old,b,previousAnchor,next,b.radius+DODGE_HIT_RADIUS)?units[0]:undefined;
  if(touched){b.hit=true;const projectile=w.entities.get(b.id);if(projectile){projectile.x=b.x;projectile.z=b.z;w.visual('death',projectile);}if(a.clock>=a.graceUntil){hit=true;touched.lastDamagedAt=w.time;w.visual('hit',touched);}}
  const body=w.entities.get(b.id);if(body){body.prev=old;body.x=b.x;body.z=b.z;body.velocity={x:(b.x-old.x)/dt,z:(b.z-old.z)/dt};body.distanceWalked+=distance(old,b);body.facing=Math.atan2(body.velocity.x,body.velocity.z);}
 }
 if(hit){a.hits++;a.graceUntil=a.clock+60;w.announce('毒爆弹幕 · 剩余 '+Math.max(0,5-a.hits)+' 次机会');}
 a.barrage=a.barrage.filter(b=>{const keep=!b.hit&&Math.abs(b.x)<27&&Math.abs(b.z)<23;if(!keep)w.entities.delete(b.id);return keep;});
 w.effects=w.effects.filter(e=>e.until>w.time);w.visualEvents=w.visualEvents.filter(e=>e.time>w.time-4);
 // At exactly 60 seconds the fifth hit takes precedence.
 if(a.hits>=5&&!diagnosticHealthLock(w).enabled)onFinish('failed');else if(a.clock>=3600)onFinish('success');
 if(w.tick%6===0)w.changed();
}
