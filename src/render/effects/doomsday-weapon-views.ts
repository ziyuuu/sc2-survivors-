import {DOOMSDAY_STYLE as S} from '../../simulation/combat/doomsday-presentation';
import type {DoomsdaySegment,Entity,VisualEvent} from '../../simulation/types';
import type {DoomsdayPrimitives,V3} from './doomsday-primitives';

export const between=(a:V3,b:V3,t:number):V3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const offset=(p:V3,d:V3,length:number,side=0):V3=>({x:p.x+d.x*length+d.z*side,y:p.y+d.y*length,z:p.z+d.z*length-d.x*side});
function direction(a:V3,b:V3):V3{
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,length=Math.hypot(dx,dy,dz)||1;
 return {x:dx/length,y:dy/length,z:dz/length};
}
export function refitMuzzle(draw:DoomsdayPrimitives,body:V3,muzzle:V3,end:V3,age:number,style:number,weak=false){
 if(age<0||age>.26||style&S.sword)return;
 const d=direction(muzzle,end),fade=Math.max(0,1-age/.14),size=weak?.65:1;
 if(fade&&(weak||style&(S.armor|S.preheated|S.bore|S.heavy|S.penetrating|S.giant))){
  const flash=offset(muzzle,d,.16*size);
  draw.sprite('glow',flash,.94*size,.78*size,0xffb455,fade*.85);
  draw.sprite('mist',offset(muzzle,d,.12+age*1.6),.64+age*2,.38+age*2,0xba9f89,fade*.48,age*3);
 }
 if(style&S.breakthrough&&fade)draw.sprite('glow',offset(muzzle,d,-.18),.49,.42,0xffad69,fade*.8);
 if(style&S.polarized){
  const t=age/.26,tail=between(body,muzzle,Math.max(.34,t-.20)),tip=between(body,muzzle,.42+.58*t);
  draw.beam(tail,tip,.034,0xffc57c,Math.sin(Math.PI*t)*.8);
  draw.sprite('glow',tip,.62,.53,0xffad51,Math.sin(Math.PI*t));
 }
}

/** Derived rounds have a real flight but no native SC2 missile actor. */
export function refitProjectile(draw:DoomsdayPrimitives,source:Pick<Entity,'unitType'>,tip:V3,start:V3,end:V3,style:number,kind:DoomsdaySegment|undefined,seed:number,air:boolean,opacity=1){
 const d=direction(start,end),barrage=kind==='barrage',small=kind==='split'||kind==='turret'||kind==='repeat';
 const missile=barrage||kind==='split'||source.unitType==='banshee'||air&&['thor','viking'].includes(source.unitType);
 const width=barrage ? .22 : style&S.giant ? .15 : kind==='split' ? .073 : small ? .07 : missile ? .13 : .097;
 const length=barrage ? 1.04 : style&S.giant ? .72 : kind==='split' ? .43 : small ? .45 : .67;
 const base=offset(tip,d,-length),jacket=offset(base,d,length*.16);
 const tint=kind==='node'?0x99c8ff:missile?0xc7d8df:0xe6bc8c,flame=barrage?0x71baff:kind==='node'?0x9adaff:0xffb057;
 draw.beam(base,tip,width,tint,opacity,'shell');
 draw.beam(base,jacket,width*.99,missile?0x718da1:0xba8052,opacity);
 draw.beam(offset(base,d,-width*2),base,width*.61,0xffe3aa,opacity,'shell');
 draw.sprite('glow',base,width*4.4,width*3.5,flame,opacity);
 if(missile){
  for(let i=0;i<3;i++){
   const p=offset(base,d,-(.16+i*.22),Math.sin(seed+i)*width*.18);
   draw.sprite('mist',p,width*(3.5+i),width*(2.5+i),barrage?0xb2cde0:0xc8bdad,opacity*(.53-i*.12),i*.25,seed*.371);
  }
 }
}

export function refitContact(draw:DoomsdayPrimitives,end:V3,from:V3,age:number,style:number,segment?:DoomsdaySegment){
 const t=age/.24;if(t<0||t>=1)return;
 const d=direction(from,end),fade=1-t,pen=!!(style&(S.penetrating|S.bore));
 const small=segment==='repeat'||segment==='split'||segment==='turret',size=small?.52:pen?.96:.70;
 draw.sprite('glow',end,size,size,segment==='node'?0xa5ddff:pen?0xffe6c1:0xffbc7d,fade);
 for(let i=0;i<(pen?6:3);i++){
  const side=(i%2===0?-1:1)*(.2+i*.12),travel=(pen?1.05:.58)*t;
  const p=offset(end,d,travel,side*travel);p.y+=Math.sin(t*Math.PI*.74)*(.12+i*.09);
  draw.beam(offset(p,d,-.13*fade,-side*.10),p,small?.019:.029,i%2?0xd1dade:0xf9c28a,fade,'shell');
 }
}

export function drawMuzzleEvent(draw:DoomsdayPrimitives,e:VisualEvent,body:V3,muzzle:V3,end:V3,age:number){
 const style=e.doomsdayStyle??0;
 refitMuzzle(draw,body,muzzle,end,age,style,e.doomsdaySegment==='repeat');
 if(e.projectileSpeed||e.doomsdaySegment||style&S.sword||e.unitType==='hellion'||age<0||age>.095)return;
 // The brief incandescent tip follows the native hitscan path and leaves both mounts visible.
 if(!(style&(S.heavy|S.penetrating)))return;
 const d=direction(muzzle,end),tip=between(muzzle,end,.32+.68*age/.095);
 draw.beam(offset(tip,d,-.48),tip,style&S.heavy?.074:.053,0xfbd5a3,1-age/.11,'shell');
}
