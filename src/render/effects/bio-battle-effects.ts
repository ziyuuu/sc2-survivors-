import {BioOrgans} from './bio-organs';
import type {Scene} from 'three';
import type {BioMounts} from '../materials/bio-armor';
import type {World} from '../../simulation/world';
import type {Entity,Point,BioResponse} from '../../simulation/types';
import {bioEligible,fleshMachine} from '../../simulation/combat/bio-runtime';
import type {ZergEliteMaterials} from './zerg-elite-materials';

type Position=Point&{y:number};
type Locate=(p:Point&{flying?:boolean},height:number)=>Position;
const cueColor:Record<BioResponse,number>={
 reflect:0xffb77c, absorb:0xd2ff93, spread:0xaaff3f, grow:0xff5744, feed:0xff4362, predator:0xff8a6c,
 relay:0xff9c42, metabolism:0x58ffca, share:0xff4860, stim:0xff6835,
 promote:0xffc65b, snare:0xc2ef4b, hatch:0x7dff9e, recover:0x59ffb8
};

export class BioBattleEffects{
 private organs:BioOrgans;
 private counts:Record<string,number>={};
 constructor(scene:Scene,private organic:ZergEliteMaterials){this.organs=new BioOrgans(scene);}
 private mark(name:string){this.counts[name]=(this.counts[name]??0)+1;}
 report(){return {...this.counts,organs:this.organs.report()};}
 reset(){this.counts={};this.organs.begin(0);this.organs.end();}
 private spores(center:Position,radius:number,tint:number,frame:number,count:number,opacity=1){
  for(let i=0;i<count;i++){
   const angle=i*2.4+frame*.028;
   const p={x:center.x+radius*Math.sin(angle),y:center.y+radius*((frame*.018+i*.61)%1),z:center.z+radius*Math.cos(angle)};
   this.organic.sprite('venom',p,.68+radius*1.4,tint,opacity,frame+i*3,false,angle);
   this.organic.sprite('acid',p,.28+radius*.68,tint,opacity,frame+i);
  }
 }
 private veins(center:Position,r:number,tint:number,clock:number){
  for(let i=0;i<3;i++){
   const a=i*2.094+clock*.45,side=Math.sin(a)*r,depth=Math.cos(a)*r;
   const root={x:center.x+side,y:center.y-r*.72,z:center.z+depth};
   const bend={x:center.x+side*.7-depth*.5,y:center.y+r*.3,z:center.z+depth*.7+side*.5};
   const tip={x:center.x+side*.45,y:center.y+r*1.25,z:center.z+depth*.45};
   this.organic.ribbon('fluid',root,bend,.14+r*.18,tint,.9);
   this.organic.ribbon('fluid',bend,tip,.1+r*.12,tint,.9);
   this.organic.sprite('acid',bend,r+.3,tint,.85,Math.floor(clock*16)+i);
  }
 }
 render(w:World,visible:(u:Point)=>boolean,point:Locate,bodyHeight:(u:Entity)=>number,mounts?:ReadonlyMap<number,BioMounts>){
  this.counts={};this.organs.begin(w.time);
  const ranks=w.expedition.bio?.ranks,now=w.time,frame=Math.floor(now*18);
  if(ranks&&w.phase==='battle'){
   for(const field of w.expedition.bio?.fields??[]){
    if(field.kind!=='residue'||field.end<=now||!visible(field))continue;
    const at=point(field,.12);
    this.organic.sprite('tissue',at,1.15,0xa64f66,.95,frame,true);
    this.spores(at,.19,0x95d16c,frame,2,.78);
   }
   for(const u of w.entities.values()){
    if(u.owner==='zerg'&&!u.bio)continue;
    if(u.hp<=0||u.heldBy||!visible(u)||!w.visibleTo(u,'terran'))continue;
    const c=u.bio,h=Math.max(.5,bodyHeight(u)),r=Math.max(.31,Math.min(1.6,h*.43)),chest=point(u,h*.72);
    if(u.owner==='zerg'){
     if(!c)continue;
     let maturity=-1,spreading=false,weak=false;
     for(const poison of c.poisons??[]){
      if(poison.end<=now)continue;
      if(poison.kind==='strain')maturity=Math.max(maturity,Math.min(5,Math.floor((now-poison.start)/2)));
      if(poison.kind==='spread')spreading=true;
      if(poison.kind==='weak')weak=true;
     }
     if(maturity>=0||weak||spreading){
      this.spores(chest,r*.95,maturity>=0?0xe565ff:spreading?0xdbff43:0x78e740,frame,2+Math.max(0,Math.ceil(maturity/2)));
      this.mark(maturity>=0?'strain':'spores');
     }
     const armor=c.armorLayers?.filter(layer=>layer.end>now).length??0;
     if(armor){this.veins(chest,r,0xe6af45,now);this.organic.sprite('tissue',chest,r*2.6,0xd39544,.42+armor*.11,frame);this.mark('corrosion');}
     const plague=c.plague?.filter(mark=>mark.end>now).length??0;
     if(plague){
      const pulse=.5+.5*Math.sin(now*(3+plague));
      const core=point(u,h*1.12),tint=(c.strongPlague??0)>now?0xff7fbc:0xfe354f;
      this.organic.sprite('tissue',core,r*3.2,0xa43244,.72+.25*pulse,frame);
      this.organic.sprite('burst',core,r*(1.4+.8*pulse),tint,.85,frame);
      for(let lobe=0;lobe<plague;lobe++){
       const a=u.facing+lobe*2.4,edge=Math.max(r,u.unitRadius*.86)*(1+.18*pulse);
       const tip={x:core.x+Math.sin(a)*edge,y:core.y+r*.12,z:core.z+Math.cos(a)*edge};
       this.organic.ribbon('claw',core,tip,r*.36,tint,.9,frame);
       this.organic.sprite('venom',tip,r*1.65+.46,tint,.94,frame+lobe*3,false,a);
       this.organic.sprite('acid',tip,r*.76+.3,0xffc5c1,.95,frame+lobe);
      }
      this.mark('plague');
     }
     continue;
    }
    if(c?.role==='overlord'){this.mark('overlord');continue;}
    const mount=mounts?.get(u.id),head=mount?.head??point(u,h*.79);
    const shoulder=mount?.shoulder??chest,cos=Math.cos(u.facing),sin=Math.sin(u.facing);
    const side=mount?.shoulder&&((shoulder.x-u.x)*cos-(shoulder.z-u.z)*sin)<0?-1:1;
    const outer=mount?.shoulder ? .012 : .19;
    const root={x:shoulder.x+side*cos*h*outer,y:shoulder.y,z:shoulder.z-side*sin*h*outer};
    const queen=u.heroId==='kerrigan'&&!!ranks['BIO-O02'];
    const orange=queen||c?.seated||!!(u.heroId&&ranks['BIO-O01']&&bioEligible(w,u));
    if(orange){
     // Kerrigan's full model bounds include her raised wings.
     const torso=queen?h*.72:h;
     const temple=mount?.head??{x:head.x+side*cos*torso*.12,y:head.y,z:head.z-side*sin*torso*.12};
     this.organs.eyes(temple,u.facing,torso,side,queen);
     this.organs.tendril(root,u.facing-side*1.35,side*.25,torso*.26,0xb88790);
     this.organs.tendril({...root,y:root.y+torso*.022},u.facing-side*.85,side*.35,torso*.19,0xba818a);
     this.mark(queen?'queen':'ascended');
    }
    if(ranks['BIO-B04']&&fleshMachine(u))this.veins(chest,r*.9,0x9baa53,now);
    if(c?.barrier&&(c.barrierEnd??0)>now){
     this.organic.skin(chest,{x:r*1.9,y:h*.83,z:r*1.8},0xd3f08d,u.facing);
     this.veins(chest,r*1.3,0xd7ec9c,now);this.mark('barrier');
    }
    if(!bioEligible(w,u))continue;
    if(ranks['BIO-P01']||ranks['BIO-B02']){
     this.mark(ranks['BIO-P01']?'ultralisk':'shell');
     if(!orange)this.organs.tendril(root,u.facing-side*1.4,side*.18,h*.235,0xb58189);
    }
    if(c?.low||(c?.clotEnd??0)>now||c?.rushEnd!==undefined||(c?.shareEnd??0)>now||ranks['BIO-P03']){
     this.organs.tendril(root,u.facing-side*.66,-side*.21,h*.29,0xba686c,true);
     if(c?.rushEnd!==undefined){
      const tail={x:chest.x-Math.sin(u.facing)*1.25,y:chest.y-.2,z:chest.z-Math.cos(u.facing)*1.25};
      this.organic.ribbon('fluid',tail,chest,.52,0xff344f,.9,frame);
     }
     this.mark('blood');
    }
    if(ranks['BIO-B07']&&(w.statuses.value(u.id,'bleed',now)>0||w.statuses.value(u.id,'corruption',now)>0)){
     this.organs.tendril(root,u.facing-side*1.39,side*.24,h*.24,0x8db799,true);this.mark('resistance');
    }
    if(c?.moltEnd!==undefined&&c.moltEnd>now){
     const t=1-(c.moltEnd-now)/3;
     this.organs.peel(root,u.facing+(side<0?Math.PI:0),h,t);
     this.mark('molt');
    }
    const recovering=(c?.refund??0)>0&&(c?.refundEnd??0)>now||ranks['BIO-W03'];
    if(recovering&&u.hp<u.maxHp&&c?.rushEnd===undefined)this.spores(chest,r*.7,0x61e8b6,frame,2,.75);
   }
   for(let i=w.visualEvents.length-1;i>=0;i--){
    const e=w.visualEvents[i],age=now-e.time;
    if(age>.78)break;
    if(!e.bioResponse)continue;
    if(age<0||!visible(e)&&!visible(e.end))continue;
    const from=w.entities.get(e.entityId),to=e.targetId===undefined?undefined:w.entities.get(e.targetId);
    if(from&&!w.visibleTo(from,'terran')||to&&!w.visibleTo(to,'terran'))continue;
    const tint=cueColor[e.bioResponse],t=age/.78,fade=1-t*t;
    const start=from?point(from,bodyHeight(from)*.8):{x:e.x,z:e.z,y:e.y};
    const end=to?point(to,bodyHeight(to)*.86):{...e.end,y:e.endY};
    if(e.bioResponse==='predator'){
     for(const side of [-1,1]){
      const cut={x:end.x+side*(.34+.32*t),y:end.y+.45,z:end.z+.25};
      this.organic.ribbon('claw',cut,{x:end.x,y:end.y-.25,z:end.z-.18},.21,tint,fade,frame);
     }
    }else if(e.bioResponse==='snare'){
     const feet=point({...e.end,flying:e.targetFlying},.12);
     this.organic.sprite('tissue',feet,2.1,tint,fade,frame,true,e.facing);
     this.spores(feet,.55,tint,frame,3,fade);
    }else if(e.targetId!==e.entityId){
     const flight=Math.min(1,t*2.2),tail=Math.max(0,flight-.42);
     const arc=(s:number)=>({x:start.x+(end.x-start.x)*s,y:start.y+(end.y-start.y)*s+Math.sin(s*Math.PI)*.65,z:start.z+(end.z-start.z)*s});
     const tip=arc(flight);
     if(flight<1){
      this.organic.ribbon('fluid',arc(tail),arc((tail+flight)/2),.19,tint,fade);
      this.organic.ribbon('fluid',arc((tail+flight)/2),tip,.24,tint,fade);
     }
     this.organic.sprite('burst',tip,1.25+t*.5,tint,fade,frame);
    }else{
     this.spores(end,.25+.85*t,tint,frame,4,fade);
     this.organic.sprite('burst',end,1.6+1.8*t,tint,fade,frame);
    }
    this.mark(e.bioResponse);
   }
  }
  this.organs.end();
 }
}
