import {landscapeNoise,type CampaignTheme} from '../../data/campaign-landscape';
import type {MapPlacement} from '../../data/map-definition';
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};

/** Render-only paint: no height, walkability, source alpha or gameplay RNG access. */
export function visualGroundField(theme:CampaignTheme,x:number,z:number,seed:number,solids:readonly MapPlacement[]){
 const n=landscapeNoise(x*.29,z*.29,seed),macro=landscapeNoise(x*.054,z*.054,seed+17),fine=landscapeNoise(x*1.1,z*1.1,seed+31);
 let weights=[1,0,0,0],paint=0,base=0;
 if(theme==='industrial'){
  const edge=Math.min(Math.abs(x),Math.abs(z)),road=1-smooth(4.35+n*.35,6.4+n*.75,edge),pad=1-smooth(7.4+n*.6,9.9+n,Math.max(Math.abs(x),Math.abs(z)));
  const metal=Math.max(road*.96,pad),dirt=(1-metal)*smooth(.23,.78,macro)*.38;weights=[1-metal-dirt,metal,dirt,0];
  const stripe=Math.abs(edge-4.62),dash=smooth(.22,.6,Math.sin((Math.abs(x)<Math.abs(z)?z:x)*1.1));paint=(1-smooth(.035,.095,stripe))*dash*smooth(8,10,Math.max(Math.abs(x),Math.abs(z)))*smooth(.17,.67,n)*.34;
 }else if(theme==='mar-sara'){
  const track=Math.abs(z-Math.sin(x*.075)*3.8),route=1-smooth(2,7.2+n,track),rock=smooth(.53,.85,macro)*(1-route*.65)*.73,soil=(1-rock)*smooth(.28,.72,macro)*(1-route*.43)*.65;weights=[1-rock-soil,soil,rock,0];
  paint=(1-smooth(.13,.55,Math.abs(track-1.55)))*.055;
 }else if(theme==='char'){
  const crack=Math.abs(z-6-Math.sin(x*.13)*2.2-Math.sin(x*.37)*.48),rock=smooth(.26,.76,macro)*.62,cracked=(1-rock)*(1-smooth(1,5.7+n,crack))*.74;weights=[1-rock-cracked,rock,cracked,0];
 }else if(theme==='ice'){
  const track=Math.abs(x-Math.sin(z*.055)*2.4),ice=(1-smooth(1.6,6.2+n,track))*.65+smooth(.64,.91,macro)*.19;
  const pad=(1-smooth(5.7+n*.5,8.5+n,Math.max(Math.abs(x+16),Math.abs(z-15))))*.92,rock=smooth(.61,.87,macro)*.52*(1-pad);
  weights=[Math.max(0,1-ice-rock-pad),ice*(1-pad),rock,pad];
 }else{
  const haul=Math.abs(z-Math.sin(x*.045)*2),soil=Math.max((1-smooth(3.1,7.3+n,haul))*.9,smooth(.45,.84,macro)*.65),pad=(1-smooth(6.7+n*.5,10+n,Math.max(Math.abs(x+22),Math.abs(z-20))))*.86;weights=[(1-soil)*(1-pad),soil*(1-pad),pad,0];
  paint=(1-smooth(.065,.25,Math.abs(haul-.92)))*.08;
 }
 // Broken deposits follow each true footprint; these are material transitions, never shadow stamps.
 for(const p of solids){const r=p.blockerSize??1,dx=x-(p.position[0]-80),dz=z-(80-p.position[1]);if(Math.abs(dx)>r*2.8||Math.abs(dz)>r*2.8)continue;
  const c=Math.cos(p.rotation),s=Math.sin(p.rotation),a=(dx*c+dz*s)/(r*1.45),b=(-dx*s+dz*c)/(r*1.18),distance=Math.hypot(a,b);
  base=Math.max(base,(1-smooth(.48,1.38+n*.65,distance))*(.37+.63*n)*(.75+.25*fine));
 }
 const sum=weights.reduce((a,b)=>a+b,0);weights=weights.map(w=>w/Math.max(.001,sum));
 return {weights,paint,base,variation:.92+macro*.13+fine*.025,macro};
}
