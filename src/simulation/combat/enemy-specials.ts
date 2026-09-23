import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {bossFor,type SpecialType} from '../../data/enemies';
import {BILE,SC2_UNITS} from '../../data/sc2-units';
import {distance,translate,clearLine} from '../movement/steering';
export interface EnemyCast {id:number;source:number;tier:'elite'|'boss'|'lord';kind:'charge'|'cone'|'fan'|'bile';origin:Point;point:Point;points:Point[];angle:number;at:number;damage:number;count:number;range:number;radius:number;level:number;percent:number}
interface Missile extends Point {cast:number;source:number;angle:number;remaining:number;damage:number;hits:Set<number>;level:number;percent:number}
interface Charge {angle:number;remaining:number;damage:number;hits:Set<number>;level:number;percent:number}
/** Fixed-step, locked warning locations. Rendering cannot apply damage. */
export class EnemySpecials {
 casts:EnemyCast[]=[];missiles:Missile[]=[];charges=new Map<number,Charge>();private serial=0;
 constructor(private w:World){}
 private clear(a:Point,b:Point){return clearLine(a,b,0,this.w.obstacles,this.w.terrain);}
 private damage(b:Body,amount:number,percent=0){if(b.owner!=='terran'||b.hp<=0)return;this.w.hit(b,amount,[],1,'zerg',0,1);if(percent&&b.hp>0&&!b.attributes.includes('Structure'))this.w.hit(b,b.maxHp*percent,[],1,'zerg',0,1);}
 act(u:Entity,dt:number){if(!u.enemyTier)return false;const w=this.w,charge=this.charges.get(u.id);
  if(charge){const before={x:u.x,z:u.z},step=Math.min(charge.remaining,12*dt);translate(u,{x:Math.sin(charge.angle)*step,z:Math.cos(charge.angle)*step},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);const moved=distance(before,u);charge.remaining-=moved;u.facing=charge.angle;u.action='move';u.velocity={x:(u.x-before.x)/dt,z:(u.z-before.z)/dt};u.distanceWalked+=moved;
   w.hash.query(u,u.unitRadius+2,b=>{if(b.owner==='terran'&&b.hp>0&&!b.flying&&!charge.hits.has(b.id)&&distance(u,b)<=u.unitRadius+b.unitRadius+.15&&this.clear(u,b)){charge.hits.add(b.id);this.damage(b,charge.damage,charge.percent);const target=w.entities.get(b.id);if(target&&target.hp>0&&charge.level>=2)w.applyStatus(target,u,'bleed',[0,.2,.25,.3,.4][charge.level-1],3);if(charge.level>=3)w.applyStatus(u,u,'bloodlust',.25,3);}},'terran');
   if(moved<step*.5||charge.remaining<=.01)this.charges.delete(u.id);return true;}
  if(this.casts.some(c=>c.source===u.id&&c.kind!=='bile')){u.action='skill';u.velocity={x:0,z:0};return true;}
  if(u.unitType==='roach'&&u.enemyTier==='elite'||u.windup>0||w.time<(u.specialReady??0))return false;
  const range=u.unitType==='zergling'?9:u.unitType==='roach'?7:10,target=w.findTarget(u,range);
  if(!target||w.edgeDistance(u,target)>range||!this.clear(u,target))return false;
  const boss=u.enemyTier==='boss'||u.enemyTier==='lord',data=boss?bossFor(u.unitType as SpecialType):null,kind=u.unitType==='zergling'?'charge':u.unitType==='roach'?'cone':u.unitType==='hydralisk'?'fan':'bile',level=u.enemyTier==='lord'?u.enemyLevel??5:u.enemyTier==='boss'?u.unitType==='roach'?2:u.unitType==='hydralisk'?3:u.unitType==='ravager'?5:1:u.enemyLevel??1;
  const delay=kind==='bile'?(boss?1.5:2.5):boss?1:kind==='charge'&&level>=2?.8:kind==='fan'&&level>=2?.9:kind==='charge'?.6:.8,angle=Math.atan2(target.x-u.x,target.z-u.z),count=kind==='fan'?(boss?5:3):kind==='bile'?(boss?5:3):1,point={x:target.x,z:target.z};
  const points=Array.from({length:kind==='bile'?count:1},(_,i)=>i===0?point:{x:point.x+Math.sin(angle+(i-1)*Math.PI*2/(count-1))*2.2,z:point.z+Math.cos(angle+(i-1)*Math.PI*2/(count-1))*2.2}).filter(p=>this.clear(u,p)&&(!w.terrain||w.terrain.canOccupy(p,0)));
  this.casts.push({id:++this.serial,source:u.id,tier:u.enemyTier,kind,origin:{x:u.x,z:u.z},point,points,angle,at:w.time+delay,damage:(data?data.damage*(u.specialDamageMultiplier??1):kind==='bile'?BILE.damage*(u.weaponDamage/SC2_UNITS.ravager.attackDamage):u.weaponDamage)*w.enemyDamageFactor(u),count,range,radius:1,level,percent:u.enemyTier==='lord'&&kind!=='cone'?(level===3?.06:level===4?.08:.1)*(w.difficulty==='easy'?.5:1):0});u.specialReady=w.time+(data?.cooldown??(kind==='bile'?10:8));u.lastSkillAt=w.time;
  if(kind!=='bile'){u.facing=angle;u.action='skill';u.velocity={x:0,z:0};return true;}return false;
 }
 update(dt:number){const w=this.w,pending:EnemyCast[]=[];
  for(const c of this.casts){const source=w.entities.get(c.source);if(c.kind!=='bile'&&(!source||source.hp<=0))continue;if(c.at>w.time+1e-8){pending.push(c);continue;}
   if(c.kind==='charge'){this.charges.set(c.source,{angle:c.angle,remaining:10,damage:c.damage,hits:new Set(),level:c.level,percent:c.percent});continue;}
   if(c.kind==='fan'){const hits=new Set<number>();for(let i=0;i<c.count;i++)this.missiles.push({...c.origin,cast:c.id,source:c.source,angle:c.angle+(i-(c.count-1)/2)*.20,remaining:c.range,damage:c.damage,hits,level:c.level,percent:c.percent});continue;}
   if(c.kind==='cone'){w.hash.query(c.origin,c.range+2,b=>{const d=distance(c.origin,b),angle=Math.atan2(b.x-c.origin.x,b.z-c.origin.z),delta=Math.atan2(Math.sin(angle-c.angle),Math.cos(angle-c.angle));if(b.owner==='terran'&&!b.flying&&d<=c.range+b.unitRadius&&Math.abs(delta)<=.6&&this.clear(c.origin,b)){this.damage(b,c.damage);const target=w.entities.get(b.id);if(target&&target.hp>0&&c.level>=2)w.applyStatus(target,c.source,'acidArmor',[0,1,1.5,2,3][c.level-1],4);}},'terran');}
   else {const hits=new Set<number>();for(const p of c.points){w.hash.query(p,c.radius+2,b=>{if(b.owner!=='terran'||b.flying||hits.has(b.id)||distance(p,b)>c.radius+b.unitRadius||!this.clear(p,b))return;hits.add(b.id);this.damage(b,c.damage,c.percent);const target=w.entities.get(b.id);if(target&&target.hp>0&&c.level>=2)w.applyStatus(target,c.source,'corruption',[0,.2,.3,.35,.4][c.level-1],4);},'terran');if(source)w.effect('explosion',source,p,c.radius,.5);}if(c.tier==='elite'&&c.level>=3)w.addCorrosionZone(c.source,c.points,c.damage);}
  }this.casts=pending;
  this.missiles=this.missiles.filter(m=>{const before={x:m.x,z:m.z},step=Math.min(m.remaining,16*dt);m.x+=Math.sin(m.angle)*step;m.z+=Math.cos(m.angle)*step;m.remaining-=step;if(!this.clear(before,m))return false;w.hash.query(m,2,b=>{if(b.owner==='terran'&&b.hp>0&&!m.hits.has(b.id)&&distance(m,b)<b.unitRadius+.2&&this.clear(before,b)){m.hits.add(b.id);this.damage(b,m.damage,m.percent);const target=w.entities.get(b.id);if(target&&target.hp>0&&m.level>=2)w.applyStatus(target,m.source,'neural',[0,.1,.15,.2,.3][m.level-1],3);}},'terran');return m.remaining>.01;});
  for(const id of this.charges.keys())if((w.entities.get(id)?.hp??0)<=0)this.charges.delete(id);
 }
}
