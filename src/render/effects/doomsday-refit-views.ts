import * as T from 'three';
import {AIR_HEIGHT} from '../../data/terrain';
import {DOOMSDAY_CARD_BY_ID} from '../../data/terran-doomsday';
import {DoomsdayPrimitives,type V3} from './doomsday-primitives';
import type {SmokeAtlas} from './doomsday-atmosphere';
import {armMagazine,concussion,jitter as random,phaseArmorLife,phaseArmorWell,phaseCollapse,repairMist,resonance,shifted as add} from './doomsday-node-views';
import {combatMuzzleSides} from './source-combat-effects';
import {combatFxProfile} from './combat-fx-profile';
import {activeDoomsdaySword} from '../../simulation/combat/doomsday-melee';
import {drawMuzzleEvent,refitMuzzle,refitProjectile,refitContact} from './doomsday-weapon-views';
import {doomsdayGrowthTier,doomsdayProjectileBody,doomsdayShotStyle,DOOMSDAY_STYLE as S} from '../../simulation/combat/doomsday-presentation';
import {mechanicalRanks,mechanicalMember} from '../../simulation/combat/doomsday-roster';
import type {World} from '../../simulation/world';
import type {Entity,VisualEvent} from '../../simulation/types';
import type {mapAnimations} from '../loaders/animations';

export type DoomsdaySocket=(u:Entity,action:keyof ReturnType<typeof mapAnimations>,seconds:number,side:string,facing:number)=>V3|undefined;
const mix=(a:V3,b:V3,t:number):V3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const horizontal=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));
const nano=0x72e4cc,silver=0xd1fff1,pink=0xff5fba;

/** State and receipts only; every temporary primitive is retired in the same frame it stops being valid. */
export class DoomsdayRefitViews {
 private draw:DoomsdayPrimitives;
 private trails=new Map<number,{x:number;z:number;at:number}[]>();
 private footState=new Map<string,{y:number;slope:number;at:number}>();
 private revealed=new Map<number,number>();
 private steps:{p:V3;at:number;id:number}[]=[];
 private grades=new Map<number,{bornAt:number;tier:number;since:number}>();
 private lastTime=-1;private run='';
 constructor(parent:T.Object3D,smoke?:SmokeAtlas){this.draw=new DoomsdayPrimitives(parent,smoke);}
 reset(){this.draw.reset();this.grades.clear();this.trails.clear();this.footState.clear();this.revealed.clear();this.steps=[];this.lastTime=-1;}
 dispose(){this.grades.clear();this.draw.dispose();this.trails.clear();this.footState.clear();this.revealed.clear();}
 count(){return this.draw.count();}
 private chips(p:V3,age:number,count:number,color:number,radius:number,inward=false,seed=0,life=.35){
  const t=Math.max(0,Math.min(1,age/life)),fade=1-t;
  for(let i=0;i<count;i++){const angle=random(seed+i*3)*Math.PI*2,d=radius*(.2+.8*random(seed+i*7))*(inward?1-t:t),y=(random(seed+i*11)-.25)*radius*(inward?1-t:t);
   this.draw.add('chip',add(p,Math.cos(angle)*d,y,Math.sin(angle)*d),.045+.06*random(seed+i),color,fade,new T.Quaternion().setFromEuler(new T.Euler(i+t*5,i*2,t*3)));
  }
 }
 private shield(w:World,e:VisualEvent,age:number,height:(u:Entity)=>number){
  const u=w.entities.get(e.entityId);if(!u?.hp)return;
  const attacker=e.doomsdayOrigin??(e.hitSourceId===undefined?undefined:w.body(e.hitSourceId)),facing=attacker?Math.atan2(attacker.x-e.x,attacker.z-e.z):u.facing,h=height(u),radius=Math.max(u.unitRadius,h*(['tank','hellion'].includes(u.unitType)?.85:.4)),center={x:u.x+Math.sin(facing)*radius,y:(u.flying?AIR_HEIGHT:(w.terrain?.height(u)??0))+h*.59,z:u.z+Math.cos(facing)*radius};
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),facing),side={x:Math.cos(facing),z:-Math.sin(facing)},size=Math.max(.32,h*.22),fade=Math.max(0,1-age/.32);
  if(e.doomsdayEffect==='hero-armor'){this.draw.add('chip',center,{x:size*2,y:size,z:.08},0x7a9bad,fade*.5,q);for(let i=0;i<3;i++)this.draw.beam(add(center,side.x*size*(i-1),-.15,side.z*size*(i-1)),add(center,side.x*size*(i-.6),.18,side.z*size*(i-.6)),.022,0xa7d9ff,fade);return;}
  this.draw.sprite('shield',center,size*4.9,size*4.0,nano,fade,age/.32);
  if(e.doomsdayEffect==='nano-break')this.chips(center,age,18,nano,size*3,false,e.serial,.32);
 }
 private sword(w:World,u:Entity,socket?:DoomsdaySocket){
  const slash=activeDoomsdaySword(w,u);
  // The emitter retracts into the native cannon between swings. An idle socket
  // belongs to a different pose while the cannon is firing or walking.
  if(!slash||!socket)return;
  const action=slash.variant?'swordReturn':'swordHorizontal';
  const phase=Math.min(1,(w.tick-slash.startTick)/(slash.endTick-slash.startTick)),facing=slash.facing;
  const sample=(t:number)=>{const grip=socket(u,action,t,'SwordGrip',facing),guide=socket(u,action,t,'SwordGuide',facing);if(!grip||!guide)return;const d=new T.Vector3(guide.x-grip.x,guide.y-grip.y,guide.z-grip.z).normalize();return {grip,d};};
  const current=sample(phase);if(!current)return;const {grip,d}=current,base=add(grip,-d.x*.36,-d.y*.36,-d.z*.36),guard=add(grip,-d.x*.08,-d.y*.08,-d.z*.08);
  this.draw.beam(base,grip,.10,0x334454);this.draw.beam(base,add(base,d.x*.12,d.y*.12,d.z*.12),.115,0x9ca9b3);
  this.draw.beam(add(guard,-Math.cos(facing)*.24,0,Math.sin(facing)*.24),add(guard,Math.cos(facing)*.24,0,-Math.sin(facing)*.24),.075,0x1c4a9e);
  const impact=sample(DOOMSDAY_CARD_BY_ID['M-O02'].params.swordHitPhase);if(!impact)return;
  const g={x:impact.grip.x-u.x,z:impact.grip.z-u.z},dot=g.x*impact.d.x+g.z*impact.d.z,planar=impact.d.x**2+impact.d.z**2,radius=u.unitRadius+DOOMSDAY_CARD_BY_ID['M-O02'].params.swordRange;
  const length=1.16*Math.max(1.2,(-dot+Math.sqrt(Math.max(0,dot*dot-planar*(g.x*g.x+g.z*g.z-radius*radius))))/Math.max(.1,planar));
  const extension=Math.min(1,phase/.14,(1-phase)/.1),tip=add(grip,d.x*length*extension,d.y*length*extension,d.z*length*extension);
  this.draw.beam(grip,tip,.22,pink,.18);this.draw.beam(grip,tip,.11,pink,.95);this.draw.beam(grip,tip,.048,0xfff6ff,1);
  // Trail samples the same bone attachment used for the body pose, never a synthetic circle.
  if(phase>.27&&phase<.75){let previous:V3|undefined;
   for(let i=5;i>=0;i--){const t=Math.max(.14,phase-i*.018),p=sample(t)!;const end=add(p.grip,p.d.x*length,p.d.y*length,p.d.z*length);if(previous)this.draw.beam(previous,end,.065,pink,.55*(1-i/6));this.draw.beam(mix(p.grip,end,.35),end,.028,pink,.1*(1-i/6));previous=end;}
  }
 }
 update(w:World,height:(u:Entity)=>number,visible:(u:Entity)=>boolean,socket?:DoomsdaySocket){
  if(w.time<this.lastTime||this.run!==(w.runId??''))this.reset();this.run=w.runId??'';this.lastTime=w.time;this.draw.begin();
  if(w.phase!=='battle'){this.reset();this.draw.end();return;}
  const ground=(p:{x:number;z:number})=>w.terrain?.height(p)??0,body=(u:Entity,k=.5):V3=>({x:u.x,y:(u.flying?AIR_HEIGHT:ground(u))+height(u)*k,z:u.z}),used=new Set<number>(),feet=new Set<string>();
  let start=w.visualEvents.length;
  while(start>0&&w.time-w.visualEvents[start-1].time<=.5)start--;
  const recent=w.visualEvents.slice(start),graded=new Set<number>();
  const repairScans=new Map<number,number>();for(const e of recent)if(e.doomsdayEffect==='nano-repair'&&e.targetId!==undefined)repairScans.set(e.targetId,e.serial);
  const attacks=new Map(recent.filter(e=>e.kind==='attack').map(e=>[`${e.entityId}:${e.time}`,e]));
  for(const u of w.entities.values()){
   if(u.hp<=0||u.heldBy||!visible(u))continue;const s=u.doomsday,c=mechanicalRanks(w,u),h=height(u),center=body(u),moving=Math.hypot(u.velocity.x,u.velocity.z)>.1;
   const grade=doomsdayGrowthTier(w,u,c);
   if(grade){
    graded.add(u.id);
    const old=this.grades.get(u.id);
    if(!old||old.bornAt!==u.bornAt||old.tier!==grade)this.grades.set(u.id,{bornAt:u.bornAt,tier:grade,since:old?.bornAt===u.bornAt?w.time:-1});
    const since=this.grades.get(u.id)!.since,age=w.time-since;
    if(since>=0&&age<.42)this.draw.sprite('scan',body(u,.77),Math.max(h,1),h*.73,grade===3?0xffcc85:0xc5d3db,1-age/.42,age/.42);
   }
   if(c?.['M-W07']&&u.unitType==='tank'&&u.modeTimer>0){
    const clamp=body(u,.18);for(const side of [-1,1]){
     const p=add(clamp,side*Math.cos(u.facing)*h*.34,0,-side*Math.sin(u.facing)*h*.34);
     this.draw.sprite('mist',p,.76,.38,0xbfab92,.64,1-u.modeTimer%1,side*.31);
    }
   }
   if(c?.['M-G03']&&moving&&mechanicalMember(w,u)){
    for(let j=0;j<3;j++){const t=(w.time*2.5+j/3)%1,r=u.unitRadius+.48*t;
     const p=add(body(u,u.flying?.45:.06),-Math.sin(u.facing)*r,0,-Math.cos(u.facing)*r);
     this.draw.sprite('mist',p,.38+t*.56,.23+t*.36,u.flying?0xabc6cf:0xb19f8c,(1-t)*.63,t,j/3);}
   }
   if(s?.special==='M-O02')this.sword(w,u,socket);
   if(c?.['M-B04']&&mechanicalMember(w,u)&&moving){
    used.add(u.id);const history=this.trails.get(u.id)??[];if(!history.length||w.time-history.at(-1)!.at>.065)history.push({x:u.x,z:u.z,at:w.time});while(history.length>4)history.shift();this.trails.set(u.id,history);
    for(const p of history.slice(0,-1))if(w.time-p.at<.22){const t=(w.time-p.at)/.22;for(const side of [-1,1]){
     const edge={x:p.x+Math.cos(u.facing)*u.unitRadius*.82*side,y:center.y,z:p.z-Math.sin(u.facing)*u.unitRadius*.82*side};
     this.draw.sprite('mist',edge,.42+h*.27,h*.60,0x9d89ae,(1-t)*.46,t,u.id*.21+side*.19);
    }}
   }
   if(s?.nano&&s.nano.remaining<s.nano.max-1e-5&&(w.tick>s.nano.regenTick||(s.nanoArmorUntilTick??0)>w.tick)){
    this.draw.sprite('scan',body(u,.79),Math.max(.75,h*.70),h*.56,nano,.66,(w.time*1.7)%1);
   }
   if(s?.nanoAmmo){const muzzle=socket?.(u,'idle',0,'',u.attackFacing)??body(u,.82);
    this.draw.sprite('glow',mix(body(u,.78),muzzle,.58),.38,.28,nano,.81);
   }
   if(s?.capacitor){const n=Math.ceil(s.capacitor/.05);for(let i=0;i<n;i++){
    const a=i*Math.PI/2+u.facing,p=add(body(u,.78),Math.sin(a)*h*.22,.08,Math.cos(a)*h*.22);
    this.draw.sprite('glow',p,.39,.28,0x85bdff,.85);
   }}
   if(s?.ready){
    const muzzle=socket?.(u,'idle',0,'',u.attackFacing)??body(u,.76),scale=c?.['M-N04'] ? .77 : .45;
    this.draw.sprite('glow',muzzle,scale,scale*.76,0xffb265,.84+.14*Math.sin(w.time*8));
    if(c?.['M-N04']){
     const t=(w.time*1.7+u.id*.14)%1,hot=mix(body(u,.70),muzzle,.52+t*.46);
     this.draw.beam(mix(body(u,.70),muzzle,.42+t*.46),hot,.039,0xffad59,.70);
    }
   }
   if(s?.station?.rounds)for(const side of [-1,1])for(let i=0;i<s.station.rounds;i++){
    const p=add(body(u,.71),side*Math.cos(u.facing)*h*.32+Math.sin(u.facing)*i*.18,0,-side*Math.sin(u.facing)*h*.32+Math.cos(u.facing)*i*.18);
    this.draw.sprite('glow',p,.38,.28,0xffb86b,.86);
    this.draw.beam(add(p,-Math.sin(u.facing)*.12,0,-Math.cos(u.facing)*.12),add(p,Math.sin(u.facing)*.12,0,Math.cos(u.facing)*.12),.048,0xd99953,.88);
   }
   if(Object.values(s?.blueFlame??{}).some(v=>v.untilTick>w.tick)){
    for(let i=0;i<3;i++){const t=(w.time*1.7+i/3)%1,a=i*2.1+t*1.35+u.id,r=u.unitRadius*.85;
     const p=add(body(u,.16),Math.cos(a)*r,.09+t*h*.22,Math.sin(a)*r);
     this.draw.sprite('mist',p,.70+h*.22,.66+h*.30,0x5ba5fa,Math.sin(t*Math.PI)*.85,t,i*.32);
    }
   }
   if(s?.special==='M-O02'&&moving&&socket){
    for(const side of ['FootLeft','FootRight']){const p=socket(u,'move',u.distanceWalked/1.875,side,u.facing);if(!p)continue;const key=u.id+side,old=this.footState.get(key);feet.add(key);if(old&&w.time>old.at){const slope=p.y-old.y;if(old.slope<-.002&&slope>=0&&p.y<ground(p)+.3)this.steps.push({p:{...p,y:ground(p)+.03},at:w.time,id:u.id});this.footState.set(key,{y:p.y,slope,at:w.time});}else if(!old)this.footState.set(key,{y:p.y,slope:0,at:w.time});}
   }
  }
  for(const id of this.grades.keys())if(!graded.has(id))this.grades.delete(id);
  for(const area of w.expedition.doomsday?.areas??[]){
   if(area.kind==='resonance'&&area.line){
    const t=1-Math.min(1,(area.dueTick-w.tick)/DOOMSDAY_CARD_BY_ID['M-N09'].params.delay);
    for(const point of [area.line.from,area.line.to]){
     const p={...point,y:ground(point)+.56},strength=.55+.45*Math.cos(t*Math.PI*4);
     this.draw.sprite('glow',p,.95+.45*t,.82+.38*t,0xb5e1ff,.52+.45*strength);
     this.draw.sprite('scan',p,.76,.70,0xd9eafe,.89,t);
    }
    const a={...area.line.from,y:ground(area.line.from)+.49},b={...area.line.to,y:ground(area.line.to)+.49};
    for(const lead of [t*.5,1-t*.5]){
     const spark=mix(a,b,lead);
     this.draw.sprite('glow',spark,.34,.27,0x8ddcff,.45+t*.48);
    }
   }
   if(area.kind==='nuke'&&area.points[0]){const a=body(area.source,.78),dst={...area.points[0],y:ground(area.points[0])+.2},t=1-Math.min(1,(area.dueTick-w.tick)/24),p=mix(a,dst,t);p.y+=Math.sin(t*Math.PI)*2;this.draw.add('core',p,{x:.22,y:.42,z:.22},0xffdfb4);this.draw.beam(p,add(p,0,.44,0),.075,0xffa85f,.8);}
  }
  for(const id of this.trails.keys())if(!used.has(id))this.trails.delete(id);
  for(const key of this.footState.keys())if(!feet.has(key))this.footState.delete(key);
  const lampRef=w.expedition.doomsday?.blueprints?.['M-G07']?.host,lamp=lampRef&&w.entities.get(lampRef.entityId),detected=new Set<number>();
  if(lamp?.hp&&lamp.bornAt===lampRef!.bornAt&&!lamp.flying&&visible(lamp)){
   const a=body(lamp,.8),angle=lamp.facing+Math.sin(w.time*1.6)*.32,b=add(a,Math.sin(angle)*1.8,-a.y+ground(lamp)+.06,Math.cos(angle)*1.8);
   this.draw.sprite('glow',a,.43,.32,0xffedc4,.76);
   this.draw.sprite('mist',b,1.15,.50,0xbdbbac,.44,(w.time*.3)%1);
   for(const enemy of w.entities.values())if(enemy.hp>0&&enemy.owner!==lamp.owner&&enemy.cloaked&&visible(enemy)&&Math.hypot(enemy.x-lamp.x,enemy.z-lamp.z)<=4+enemy.unitRadius){
    detected.add(enemy.id);if(!this.revealed.has(enemy.id))this.revealed.set(enemy.id,w.time);const age=w.time-this.revealed.get(enemy.id)!;
    if(age<.4){const p=body(enemy,.78),h=height(enemy);this.draw.sprite('scan',p,h*1.18,h,0xe2e7d0,1-age/.4,age/.4);}
   }
  }
  for(const id of this.revealed.keys())if(!detected.has(id))this.revealed.delete(id);
  this.steps=this.steps.filter(s=>w.time-s.at<.35&&w.entities.get(s.id)?.hp);for(const s of this.steps){const age=w.time-s.at;this.draw.add('ring',s.p,.3+age*2,0xa38b6d,(1-age/.35)*.25,horizontal);}
  for(const dot of w.expedition.doomsday?.dots??[]){
   const u=w.entities.get(dot.target.entityId);if(!u?.hp||u.bornAt!==dot.target.bornAt||!visible(u))continue;
   const p=body(u,.88);
   for(let i=0;i<dot.remaining;i++)this.draw.sprite('glow',add(p,(i-1)*.13,i%2*.07,0),.22,.17,nano,.81);
  }
  for(const [id,mark] of Object.entries(w.expedition.doomsday?.crossfire??{})){
   const u=w.entities.get(Number(id)),t=(w.tick-mark.tick)/DOOMSDAY_CARD_BY_ID['M-N05'].params.window;
   if(!u?.hp||!visible(u)||mark.ready||t<0||t>=1)continue;
   this.draw.sprite('glow',body(u,.84),.64,.44,0xff9860,1-t*.75);
  }
  for(const [id,mark] of Object.entries(w.expedition.doomsday?.pincer??{})){
   const u=w.entities.get(Number(id));if(!u?.hp||!visible(u)||w.tick>=mark.untilTick)continue;
   const p=body(u,.85);this.draw.sprite('scan',p,1.10,.67,0x9edaff,.9,(w.time*2)%1);
  }
  const activeWells=new Set<number>();
  for(const e of recent){const age=w.time-e.time;if(age<0||age>.5)continue;const live=w.entities.get(e.entityId),target=e.targetId===undefined?undefined:w.entities.get(e.targetId),style=e.doomsdayStyle??0;
   if(live&&!visible(live)&&(!target||!visible(target)))continue;
   const from={x:e.x,y:live?body(live,.65).y:e.y,z:e.z},end={x:e.end.x,y:target?body(target,.5).y:e.endY,z:e.end.z},fade=Math.max(0,1-age/.3),kind=e.doomsdayEffect;
   // Split HP/shield receipts and multi-hit volleys share one small fold per living body.
   if(e.doomsdayOrigin&&(e.kind==='hit'||e.kind==='shield-hit'||e.kind==='shield-break')&&
      live&&live.hp>0&&!live.heldBy&&live.bornAt<=e.time&&age<phaseArmorLife&&!activeWells.has(live.id)){
    const dx=e.doomsdayOrigin.x-e.x,dz=e.doomsdayOrigin.z-e.z,length=Math.hypot(dx,dz);
    const dir=length>.001?{x:dx/length,z:dz/length}:{x:Math.sin(e.facing),z:Math.cos(e.facing)};
    const h=height(live),lowHull=live.unitType==='tank'||live.unitType==='hellion';
    const reach=Math.max(live.unitRadius*.86,h*(lowHull?.92:.50));
    const flank=add(body(live,.93),dir.x*reach,0,dir.z*reach);
    phaseArmorWell(this.draw,flank,dir,Math.max(1.35,Math.min(2.8,h*1.16)),age,e.serial);
    activeWells.add(live.id);
   }
   if(kind==='nano-shield'||kind==='nano-break'||kind==='hero-armor'){this.shield(w,e,age,height);continue;}
   if(kind==='nano-arm'){
    if(target?.hp&&target.bornAt<=e.time&&visible(target)){
     const receiver=body(target,.80),muzzle=socket?.(target,'idle',0,'',target.attackFacing)??receiver;
     armMagazine(this.draw,receiver,muzzle,age);
    }
    continue;
   }
   if(kind==='repair-link'||kind==='nano-repair'||kind==='nano-scrap'){
    if(target?.hp&&target.bornAt<=e.time&&visible(target)){
     const type=kind==='nano-scrap'?'scrap':e.unitType==='science_vessel'||e.unitType==='medivac'?'vessel':'engineer';
     const shell=Math.max(target.unitRadius,height(target)*.40);
     repairMist(this.draw,from,body(target,.67),shell,age,type,kind==='nano-repair',e.serial,repairScans.get(target.id)===e.serial);
    }
    continue;
   }
   if(e.kind==='support-impact'&&(kind==='bore-hit'||kind==='crossfire')&&e.doomsdayOrigin){
    const origin={...e.doomsdayOrigin,y:e.endY},t=Math.min(1,age/.095);
    this.draw.beam(mix(origin,end,Math.max(0,t-.45)),mix(origin,end,Math.min(1,t+.28)),kind==='bore-hit'?.065:.049,0xffe5bb,fade,'shell');
    this.draw.sprite('glow',origin,.73,.54,0xffab6b,fade);
    if(kind==='crossfire'){
     this.draw.sprite('scan',origin,1.03,.73,0xffd695,fade,age/.3);
     this.draw.beam(mix(from,origin,.60),origin,.034,0xffc183,Math.max(0,1-age/.15));
    }
    refitContact(this.draw,end,origin,age,S.penetrating|S.breakthrough);continue;
   }
   if(kind==='split-release'){this.draw.sprite('glow',end,1.02,.83,0xffca89,fade);this.draw.sprite('mist',end,.72+age*1.9,.67,0xb6a797,fade*.8,age*2,random(e.serial));this.chips(end,age,4,0xffc789,.42,false,e.serial,.25);continue;}
   if(kind==='pincer-mark'||kind==='pincer-spent'){
    const p=target?.hp?body(target,.80):end,t=Math.min(1,age/.26);
    const closing=kind==='pincer-mark'?1-t:t;
    for(const side of [-1,1]){
     const wing=add(p,side*(.15+.48*closing),.18*(1-closing),0);
     this.draw.beam(add(wing,side*.13,.19,0),wing,.035,0x9bdfff,fade);
     this.draw.beam(wing,add(wing,side*.13,-.14,0),.035,0x9bdfff,fade);
    }
    this.draw.sprite('scan',p,kind==='pincer-mark'?1.38:1.08,.89,0xb8e6ff,fade,t);
    if(kind==='pincer-spent')this.draw.sprite('glow',p,1.36,.91,0xffddb8,fade);
    continue;
   }
   if(kind==='nano-dot'){
    const p=target?.hp?body(target,.86):end;
    this.draw.sprite('scan',p,1.28,.95,nano,fade,Math.min(1,age/.26));
    this.draw.sprite('glow',p,.60,.45,silver,fade);continue;
   }
   if(kind==='sword-hit'){const a=e.facing+.5;this.draw.beam(add(end,-Math.cos(a)*.35,-.25,Math.sin(a)*.35),add(end,Math.cos(a)*.35,.25,-Math.sin(a)*.35),.035,0xffe1f3,fade);this.chips(end,age,8,0xffa2dc,.7,false,e.serial,.3);continue;}
   if(kind==='intercept'){this.draw.beam(from,end,.018,0xffd58c,Math.max(0,1-age/.12));this.chips(end,age,10,0xcbe1e8,.6,false,e.serial,.25);continue;}
   if(kind==='brace'){concussion(this.draw,{x:e.x,y:ground(e)+.05,z:e.z},age,e.supportRadius??2,e.serial);continue;}
   if(kind==='armor-deflect'||kind==='cover'||kind==='fragment'){
    const dx=end.x-from.x,dz=end.z-from.z,heading=Math.hypot(dx,dz)>.01?Math.atan2(dx,dz):e.facing;
    const nx=Math.sin(heading),nz=Math.cos(heading),shell=live?Math.max(live.unitRadius,height(live)*.42):.5;
    const contact=add(from,nx*shell,.09,nz*shell),t=Math.min(1,age/.29);
    this.chips(contact,age,5,0xb3c3cc,.54,false,e.serial,.24);
    if(kind==='fragment'){
     // Spall liner catches the outer blast around the hull, even without a direct shooter.
     for(let i=0;i<5;i++){
      const a=e.facing+i*1.256,r=shell*(.69+.37*t),p=add(from,Math.sin(a)*r,.13,Math.cos(a)*r);
      this.draw.beam(p,add(p,Math.cos(a)*.19,-.06-t*.12,-Math.sin(a)*.19),.04,0xe3bf92,fade);
     }
    }else{
     for(const side of [-1,1]){
      const trail=add(contact,nz*side*shell*t,.08+t*.12,-nx*side*shell*t);
      this.draw.beam(mix(contact,trail,.35),trail,.038,0xffd7a1,fade);
     }
     if(kind==='cover'&&e.doomsdayOrigin)this.chips({...e.doomsdayOrigin,y:ground(e.doomsdayOrigin)+.5},age,3,0x9eafbb,.3,false,e.serial,.2);
    }
    continue;
   }
   if(kind==='battery'){this.draw.sprite('scan',live?body(live,.82):from,1.05,.87,0x9fe4ff,fade,Math.min(1,age/.27));continue;}
   if(kind==='promotion'||kind==='refit-sweep'){
    const h=live?height(live):1.5,t=age/.42,p=live?body(live,.78):from;
    const tint=live&&doomsdayGrowthTier(w,live)===3?0xffcc85:0xb9cdd5;
    this.draw.sprite('scan',p,h*1.25,h*.86,tint,Math.max(0,1-t),t);
    if(kind==='promotion'&&live&&t<1){
     const muzzle=socket?.(live,'idle',0,'',live.facing)??p;
     this.draw.sprite('glow',mix(body(live,.38),muzzle,t),h*.47,h*.37,0xffcc8d,Math.sin(Math.PI*t));
    }
    continue;
   }
   if(kind==='knock'){
    const a={...from,y:ground(e)+.12},b={...end,y:ground(e.end)+.12},angle=Math.atan2(b.x-a.x,b.z-a.z);
    concussion(this.draw,mix(a,b,Math.min(1,age/.2)),age,.75,e.serial,false,angle);continue;}
   if(kind==='resonance'){resonance(this.draw,{...from,y:ground(e)+.36},{...end,y:ground(e.end)+.36},e.supportRadius??.8,age,e.serial);continue;}
   if(kind==='crossfire'){
    const muzzle=live?socket?.(live,'attack',.05,'',e.facing)??from:from;
    refitMuzzle(this.draw,from,muzzle,end,age,S.preheated);
    this.draw.sprite('glow',muzzle,1.02,.75,0xffb25d,fade);continue;
   }
   if(kind==='fortress'){
    const size=Math.min(2.5,e.supportRadius??1);
    this.draw.add('core',end,{x:.28+age*2,y:.35+age*1.5,z:.28+age*2},0xffdcb0,Math.max(0,1-age/.14));
    this.chips(end,age,6,0xa58a67,size,false,e.serial,.32);this.draw.add('ring',{...end,y:ground(e.end)+.04},size*Math.min(1,age/.16),0xb7a08b,fade*.4,horizontal);continue;
   }
   if(kind==='cold'||kind==='station'||kind==='cannon'){
    const blue=kind==='cold',side=(end.x-from.x)*Math.cos(e.facing)-(end.z-from.z)*Math.sin(e.facing)>0?1:-1;
    if(!blue){
     const angle=Math.atan2(end.x-from.x,end.z-from.z),muzzle=live?socket?.(live,'attack',.05,kind==='cannon'?'05':'',angle)??from:from;
     const flank=kind==='station'?side*Math.max(.36,(live?.unitRadius??1)*.52):0;
     const start=add(muzzle,Math.cos(e.facing)*flank,0,-Math.sin(e.facing)*flank);
     refitMuzzle(this.draw,from,start,end,age,S.bore);
     const t=age/.135;
     if(t<1){
      const head=mix(start,end,.18+.82*t),tail=mix(start,end,Math.max(0,.18+.82*t-(kind==='cannon'?.25:.14)));
      this.draw.beam(tail,head,kind==='cannon'?.30:.12,0xf4ccb0,1-t*.56,'shell');
      this.draw.sprite('glow',tail,kind==='cannon'?1.18:.65,kind==='cannon'?.91:.46,0xffb366,1-t);
     }
    }
    if(kind==='cannon'){
     const radius=Math.min(2.5,e.supportRadius??1);
     this.draw.add('core',end,{x:.28+age*2,y:.35+age*1.5,z:.28+age*2},0xffdcb0,Math.max(0,1-age/.14));
     this.chips(end,age,10,0xa58a67,radius,false,e.serial,.32);this.draw.add('ring',{...end,y:ground(end)+.04},radius*Math.min(1,age/.16),0xb7a08b,fade*.4,horizontal);continue;
    }
    const origin={...end,y:e.targetFlying?e.endY:ground(end)+.15};
    this.draw.sprite('glow',end,blue?1.50:1.22,blue?1.27:.93,blue?0xc3ecff:0xffcd99,Math.max(0,1-age/.20));
    concussion(this.draw,origin,age,e.supportRadius??1,e.serial,blue,blue?e.facing:e.facing+side*Math.PI/2);continue;
   }
   if(kind==='blast-ring'){
    concussion(this.draw,{...end,y:e.targetFlying?e.endY:ground(e.end)+.06},age,e.supportRadius??0,e.serial);
    continue;
   }
   if(kind==='phase-hit'){
    const heavy=e.unitType==='thor'||e.unitType==='tank'||e.unitType==='banshee'||e.unitType==='marauder';
    const impact={...end,y:target?body(target,.86).y:e.endY};
    phaseCollapse(this.draw,impact,age,heavy,!!(style&S.enhanced),e.serial);continue;
   }
   if((e.kind==='attack'&&style||e.kind==='support-flight'&&(e.doomsdaySegment||kind==='redirect'))&&live){
    const facing=Math.atan2(end.x-from.x,end.z-from.z);
    const profile=combatFxProfile(e),sides=profile&&!e.doomsdaySegment?combatMuzzleSides(profile,e.shotSequence):[''];
    for(const side of sides){
     const mount=socket?.(live,'attack',e.weaponPoseSeconds??.05,side??'',facing);
     const muzzle=mount?add(mount,e.x-live.x,0,e.z-live.z):from;
     drawMuzzleEvent(this.draw,e,from,muzzle,end,age);
     if(kind==='redirect'&&age<.17)this.draw.sprite('glow',muzzle,.84,.54,0xffcc83,1-age/.17);
     if(style&S.reload&&age<.2){
      const t=age/.2,breech=mix(muzzle,from,.25-.10*t);
      this.draw.beam(breech,mix(muzzle,from,.35-.10*t),.055,0x9ca9ac,1-t,'shell');
      this.draw.sprite('glow',breech,.43,.24,0xffba78,1-t);
     }
    }
   }
   if(e.kind==='projectile-impact'&&(e.doomsdaySegment||style&(S.armor|S.heavy|S.penetrating))){
    const origin=e.doomsdayOrigin?{...e.doomsdayOrigin,y:from.y}:from;
    refitContact(this.draw,end,origin,age,style,e.doomsdaySegment);
    if(e.doomsdaySegment==='node'&&e.doomsdayOrigin&&Math.hypot(e.x-origin.x,e.z-origin.z)>.1&&age<.17){
     const start={...origin,y:e.endY},mid=mix(start,end,.55);mid.y+=.20;
     this.draw.beam(start,mid,.033,0x8fbafa,fade);this.draw.beam(mid,end,.024,0xd8efff,fade);
     this.draw.sprite('glow',end,.64,.46,0xaddfff,fade);
    }
    if(e.doomsdaySegment&&(e.supportDuration??1)<=1/60+.0001&&age<.105){
     const t=Math.min(1,.43+age/.105*.57);
     refitProjectile(this.draw,{unitType:e.unitType!},mix(origin,end,t),origin,end,style,e.doomsdaySegment,e.serial,!!e.targetFlying,1-age/.12);
    }
   }
   if(e.kind==='hit'&&e.weaponHit&&e.hitSourceId!==undefined){
    const attack=attacks.get(`${e.hitSourceId}:${e.time}`),shot=attack?.doomsdayStyle??0;
    if(attack&&!attack.projectileSpeed&&attack.targetId===e.entityId&&!(shot&(S.phase|S.sword))&&shot&(S.armor|S.heavy|S.penetrating))refitContact(this.draw,from,{x:attack.x,y:attack.y,z:attack.z},age,shot);
   }
  }
  for(const f of w.weaponFlights){
   if(f.pendingLaunch||w.time<f.start)continue;
   const style=doomsdayShotStyle(w,f.source),segment=f.doomsdayDerived?(f.doomsdayDerived.kind??'salvo'):undefined;
   if(!segment&&!doomsdayProjectileBody(style)&&!(style&S.nano))continue;
   const target=w.entities.get(f.target);if(target&&!visible(target)&&!visible(f.source))continue;
   const air=f.targetFlying??w.body(f.target)?.flying??false;
   const end={...f.lastSeen,y:air?6.2:ground(f.lastSeen)+(target?height(target)*.48:.65)};
   const fromContact=segment==='split'||segment==='node'&&Math.hypot(f.from.x-f.source.x,f.from.z-f.source.z)>.1;
   const facing=Math.atan2(end.x-f.from.x,end.z-f.from.z);
   const side=style&S.dual?(air?'Left':'Right'):style&S.giant?(f.id%2?'05':'07'):'';
   const mount=fromContact?undefined:socket?.(f.source,'attack',.05,side,facing);
   let start=fromContact?{...f.from,y:(air?AIR_HEIGHT:ground(f.from))+.65}:mount??{...f.from,y:body(f.source,.65).y};
   if(segment==='turret')start={...f.from,y:body(f.source,.78).y+.12};
   const distance=Math.hypot(f.lastSeen.x-f.from.x,f.lastSeen.z-f.from.z);
   const t=distance>0?Math.min(1,Math.hypot(f.point.x-f.from.x,f.point.z-f.from.z)/distance):1;
   const p=mix(start,end,t);
   if((style&S.nano)&&(!segment||segment==='barrage')){
    this.draw.sprite('glow',p,.32,.23,nano,.8);
    this.draw.sprite('glow',mix(start,end,Math.max(0,t-.028)),.21,.15,silver,.68);
   }
   if(segment||doomsdayProjectileBody(style))refitProjectile(this.draw,f.source,p,start,end,style,segment,f.id,air);
  }
  // The native flame owns its full width. Wisps follow the recorded edges; phase curls at contact.
  for(const f of w.effects){
   if(f.kind!=='flame'||f.until<=w.time)continue;
   const unit=w.entities.get(f.source);if(!unit||!visible(unit))continue;
   const style=f.doomsdayFlame?.style??doomsdayShotStyle(w,unit),width=f.doomsdayFlame?.width??1;
   if(!(style&S.phase)&&width<=1)continue;
   const a=socket?.(unit,'attack',.05,'',unit.attackFacing)??body(unit,.55),b={...f.end,y:ground(f.end)+.5};
   const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,clock=(w.time*8)%1;
   for(let i=0;i<5;i++){const t=(i+clock)/5,p=mix(a,b,t);
    if(style&S.phase&&t>.63){const angle=t*8.+clock*3.,r=(1-t)*.87;
     this.draw.sprite('mist',add(p,Math.cos(angle)*r,.1+Math.sin(angle)*r,0),.74,.61,0xad8bb7,.70,t,i*.27);}
    if(width>1){for(const side of [-1,1]){
     const edgeWidth=.15*width*(.45+.55*t),tip=add(p,side*dz/length*edgeWidth,.06+Math.sin(t*Math.PI*4+clock*6)*.07,-side*dx/length*edgeWidth);
     this.draw.sprite('mist',tip,.41+t*.33,.32+t*.36,f.doomsdayFlame?.blue?0x84caff:0xffb079,.60,t,i*.23);
    }}
   }
  }
  this.draw.end();
 }
}

