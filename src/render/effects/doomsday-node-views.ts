import type {DoomsdayPrimitives,V3} from './doomsday-primitives';
import {between} from './doomsday-weapon-views';

export const jitter=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export const shifted=(p:V3,x:number,y:number,z:number):V3=>({x:p.x+x,y:p.y+y,z:p.z+z});
const cyan=0x83e8e4;

export const phaseArmorLife=.38;
/** A small accretion disc on the struck flank, with sparks drawn back toward the plate. */
export function phaseArmorWell(draw:DoomsdayPrimitives,contact:V3,toward:{x:number;z:number},size:number,age:number,seed:number){
 const t=age/phaseArmorLife;
 if(t<0||t>=1)return;
 const opening=Math.min(1,.36+t*4.5),closing=1-Math.pow(t,1.7);
 const width=size*opening*(.35+.65*closing),fade=Math.min(1,(1-t)*3.5);
 draw.sprite('well',contact,width,width*.83,0xb2a0c5,fade*.91,t,jitter(seed));
 draw.sprite('lens',contact,width*1.17,width,0xffffff,fade*.58,t);
 for(let i=0;i<3;i++){
  const side=(i-1)*size*.21,reach=size*(.28+jitter(seed+i)*.27);
  const point=(travel:number)=>shifted(contact,
   travel*(toward.x*reach+toward.z*side),travel*size*(.14+i*.055),
   travel*(toward.z*reach-toward.x*side));
  draw.beam(point(closing),point(closing*.67),.023, i===1?0xe2cabe:0xbca6d0,fade*closing);
 }
}

/** All streaks curl into the recorded contact after the original weapon has struck. */
export function phaseCollapse(draw:DoomsdayPrimitives,at:V3,age:number,heavy:boolean,enhanced:boolean,seed:number){
 const life=heavy?.50:.34,t=(age-.045)/(life-.045);
 if(t<0||t>=1)return;
 const size=(heavy?2.9:1.48)*(enhanced?1.20:1),opening=Math.min(1,t/.21);
 const collapse=1-Math.pow(Math.max(0,(t-.32)/.68),1.45),radius=size*(.30+.70*opening)*collapse;
 const intensity=Math.min(1,(1-t)*5);
 draw.sprite('vortex',at,radius,radius*.88,0xd6b6e2,intensity,t,jitter(seed));
 draw.sprite('lens',at,radius*1.38,radius*1.23,0xffffff,intensity,t);
 // A diagonal disc retreats into the original impact. A reserved shot adds a second torn rim.
 draw.sprite('well',at,radius*(enhanced?1.52:1.28),radius*.72,0xc6afce,intensity*.88,t,jitter(seed+2));
 if(enhanced){
  const edge=shifted(at,radius*.08,radius*.06,0);
  draw.sprite('vortex',edge,radius*.69,radius*.49,0xa59bc7,intensity*.69,t,jitter(seed+4));
 }
 const count=heavy?8:5;
 for(let i=0;i<count;i++){
  const angle=2*Math.PI*(i+jitter(seed+i)*.5)/count+t*(1.5+jitter(seed+i*2));
  const r=size*(.32+.13*jitter(seed+i))*collapse;
  const p=shifted(at,Math.cos(angle)*r,Math.sin(angle+.4)*r*.31,Math.sin(angle)*r*.76);
  draw.sprite('mist',p,size*(.26+.16*t),size*.29,i%2?0x938697:0xd5baab,intensity*.66,t,jitter(seed+i));
  if(i%2===0)draw.sprite('glow',p,.20*collapse+.06,.16*collapse+.05,0xffdcc6,intensity*.85);
 }
}

export function repairMist(draw:DoomsdayPrimitives,source:V3,surface:V3,radius:number,age:number,kind:'vessel'|'engineer'|'scrap',nano:boolean,seed:number,scan=nano){
 const life=kind==='scrap'?.50:.38,t=age/life;
 if(t<0||t>=1)return;
 const side=kind==='engineer',dx=source.x-surface.x,dz=source.z-surface.z,length=Math.hypot(dx,dz)||1;
 const patch=shifted(surface,side?dx/length*radius*.68:0,side?-radius*.15:0,side?dz/length*radius*.68:0);
 const scale=Math.max(.76,radius*(side?1.05:1.45)),fade=Math.sin(Math.PI*Math.min(.99,.13+t*.87));
 const fog=nano?0x80ded5:kind==='scrap'?0xc7dac3:side?0xa6cbb2:0x82d597;
 for(let i=0;i<3;i++){
  const angle=6.28*jitter(seed+i)+t*(side?.28:.95),drift=scale*(side?.13:.28)*(1+t);
  const p=shifted(patch,Math.cos(angle)*drift,scale*(.10+i*.11+t*(side?.24:.66)),Math.sin(angle)*drift);
  draw.sprite('mist',p,scale*(1.18+t*.62),scale*(side?.52:.93)*(1+t*.55),fog,fade*(kind==='scrap'?.95:.80),t,jitter(seed+i));
 }
 if(scan){
  draw.sprite('scan',shifted(patch,0,scale*.18,0),scale*1.52,scale*1.07,cyan,fade,t,jitter(seed));
  draw.sprite('scan',shifted(patch,0,scale*.10,0),scale*1.31,scale*.86,0xbb80d0,fade*.57,Math.max(0,t-.18),jitter(seed));
 }
 if(side&&t<.55){
  const spark=shifted(patch,dx/length*.13,scale*.14,dz/length*.13);
  draw.sprite('glow',spark,.30,.27,0xffc494,1-t);
  draw.beam(spark,shifted(spark,.06,scale*.16*t,.10),.018,0xffda96,1-t);
 }
}

export function armMagazine(draw:DoomsdayPrimitives,receiver:V3,muzzle:V3,age:number){
 const t=age/.34;if(t<0||t>=1)return;
 const breech=between(receiver,muzzle,.57);
 draw.sprite('scan',breech,1.15,.72,cyan,1-t*.35,t);
 for(let i=0;i<3;i++){
  const k=t*2.5-i*.32;if(k<0||k>1)continue;
  const feed=between(receiver,muzzle,.36+.37*k);
  draw.sprite('glow',feed,.39,.28,i===1?0xcf8fe1:0xa4fff1,Math.sin(k*Math.PI));
 }
}

export function concussion(draw:DoomsdayPrimitives,at:V3,age:number,radius:number,seed:number,blue=false,facing?:number){
 const t=age/.48;if(t<0||t>=1||radius<=0)return;
 const spread=1-Math.pow(1-t,2.4),alpha=Math.min(1,t*12)*(1-t);
 for(let i=0;i<9;i++){
  const a=(facing??0)+(facing===undefined?Math.PI*2*i/9:(i/8-.5)*2.7);
  const drift=radius*spread*(.76+.22*jitter(seed+i));
  const p=shifted(at,Math.sin(a)*drift,.06+Math.sin(t*Math.PI)*radius*.18,Math.cos(a)*drift);
  const w=.38+radius*.36*(.4+t);
  draw.sprite('mist',p,w*1.52,w,blue?(i%2?0xa9cce2:0x6996b1):i%2?0xc3ab92:0x968675,alpha*.91,t,jitter(seed+i*2));
  if(blue&&t<.68&&i%2===0){
   const ice=shifted(p,0,w*.40,0);
   draw.beam(ice,shifted(ice,Math.sin(a)*w*.21,w*.36,Math.cos(a)*w*.21),.041,0xbdeaff,alpha);
  }
 }
}

export function resonance(draw:DoomsdayPrimitives,a:V3,b:V3,width:number,age:number,seed:number){
 const t=age/.45;if(t<0||t>=1)return;
 const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
 // The wave tears across both marked endpoints together. Its lateral travel follows the purchased width.
 const spread=width*.5*(1-Math.pow(1-t,2)),count=Math.max(5,Math.ceil(length/.38)),fade=1-t;
 if(t<.52){
  const previous=between(a,b,0);
  for(let i=1;i<=count;i++){
   const point=between(a,b,i/count);
   point.y+=Math.sin(i*Math.PI/count)*width*(.12+.24*jitter(seed+i));
   draw.beam(previous,point,.045+.025*(1-t),0xbadfff,1-t/.52);
   Object.assign(previous,point);
  }
 }
 for(let i=0;i<=count;i++){
  const p=between(a,b,i/count),grain=jitter(seed+i);
  for(const side of [-1,1]){
   const sideDist=side*spread*(.60+.35*grain);
   const flake=shifted(p,dz/length*sideDist,.07+Math.sin(t*Math.PI)*.29,-dx/length*sideDist);
   draw.sprite('mist',flake,.68+width*.35,.54+t*.58,grain>.5?0xdfcbb5:0xa4b6c6,fade,t,grain);
   if(i<count&&t<.65){
    const tip=shifted(flake,dx/length*.21+side*dz/length*.07,grain*.13,dz/length*.21-side*dx/length*.07);
    draw.beam(flake,tip,.026+grain*.018,i%2?0xe4eff2:0xffcc96,fade*.86);
   }
  }
 }
 for(const p of [a,b])draw.sprite('glow',p,.86*fade+.17,.78*fade+.18,0xdaf1ff,fade);
}
