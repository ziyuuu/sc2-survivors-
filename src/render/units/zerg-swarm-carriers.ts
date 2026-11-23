import {AIR_HEIGHT} from '../../data/terrain';
import type {World} from '../../simulation/world';
import type {Point,Entity} from '../../simulation/types';
import type {AnimatedBatch} from './animated-batch';
import {swarmDropPoint,swarmEggSource} from '../../simulation/combat/zerg-swarm-spawn';
import {rescueEggMaterial} from './economic-egg';

export const SWARM_CARRIER_MODELS=['overlord','egg','fun-nydus'] as const;
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});

/** Sample the actual pending drops and confirmed releases. Actors never advance the batch. */
export function drawSwarmCarriers(w:World,models:ReadonlyMap<string,AnimatedBatch>,ground:(p:Point)=>number,visible:(p:Point)=>boolean,height:(u:Entity)=>number){
 const s=w.expedition.zergSwarm;if(!s)return;
 const now=w.time,egg=models.get('egg'),carrier=models.get('swarm.overlord'),nydus=models.get('swarm.fun-nydus');
 const home={x:w.anchor.x-3,z:w.anchor.z-2};
 const fly=(target:Point,start:number,drop:number,landed:boolean,index:number,resident=false)=>{
  const side=index%2?1:-1;
  const entry=resident?home:{x:target.x+side*10,z:target.z-6};
  const exit=resident?home:{x:target.x+side*12,z:target.z+9};
  const inbound=smooth((now-start)/Math.max(.01,drop-start));
  const outbound=landed?smooth((now-drop-.6)/1.4):0;
  const p=outbound?mix(target,exit,outbound):mix(entry,target,inbound);
  if(!visible(p))return;
  const scale=resident?1:Math.min(1,.1+inbound*4,Math.max(.015,(1-outbound)*4));
  const facing=outbound?Math.atan2(exit.x-target.x,exit.z-target.z):Math.atan2(target.x-entry.x,target.z-entry.z);
  carrier?.add(p.x,ground(p)+3.6+.35*(1-inbound+outbound),p.z,facing,inbound<1||outbound?'move':'idle',now,false,0,scale);
 };
 const shell=(source:string,p:Point,start:number,at:number,opened:boolean,index:number)=>{
  if(!egg||!visible(p))return;
  const age=now-(opened?at:start),air=source.endsWith('P02')?AIR_HEIGHT-ground(p):0;
  if(age<0||opened&&age>=.85)return;
  const t=clamp((now-start)/Math.max(.01,at-start));
  const action=opened?'dead':t<.7?'spawn':'idle';
  const seconds=opened?age/.85*(egg.pose('dead')?.duration??1):action==='spawn'?t/.7*(egg.pose('spawn')?.duration??1):now;
  const y=ground(p)+air+(opened?0:2.2*(1-smooth(t*1.6)));
  egg.add(p.x,y,p.z,index*2.4,action,seconds,action!=='idle',0,(opened?.56:.63)*(opened?clamp((.85-age)*6):1+.04*Math.sin(now*9+index)),true,-1,0,0,'attack',false,rescueEggMaterial(index,w.runId,now));
 };
 let residentDrop:{point:Point;start:number;at:number;landed:boolean}|undefined;
 const landed=s.landings??[];
 for(const b of s.batches){
  if(swarmEggSource(b.source)){
   const count=b.recipe.reduce((n,p)=>n+p.count,0);
   for(let j=b.released;j<b.released+count;j++)shell(b.source,swarmDropPoint(b,j),b.createdAt,b.at,false,j);
  }else if(b.root&&b.source==='G03'){
   if(visible(b.point))nydus?.add(b.point.x,ground(b.point),b.point.z,0,'spawn',now-b.createdAt,true);
  }else if(b.root&&b.source==='overflow'&&s.ranks['ZSW-G01']){
   residentDrop={point:b.point,start:b.createdAt,at:b.at,landed:false};
  }else if(b.root&&b.first===undefined){
   for(let i=0;i<(b.source==='P01'?3:1);i++)fly(swarmDropPoint(b,i),b.createdAt,b.at,false,i);
  }
 }
 if(s.exitNydus&&s.exitNydus.until>now){const p=s.exitNydus.point;if(visible(p))nydus?.add(p.x,ground(p),p.z,0,'idle',now);}
 for(const l of landed){
  if(now-l.at>=2)continue;
  if(swarmEggSource(l.source))shell(l.source,l.point,l.createdAt,l.at,true,l.index);
  else if((l.source==='delivery'||l.source==='overflow')&&s.ranks['ZSW-G01']){
   residentDrop??={point:l.point,start:l.createdAt,at:l.at,landed:true};
  }else if(l.source!=='G03')fly(l.point,l.createdAt,l.at,true,l.index);
 }
 if(s.ranks['ZSW-G01']){
  if(s.delivery)residentDrop={point:{x:w.anchor.x-1.4,z:w.anchor.z+1},start:s.delivery.at-1,at:s.delivery.at,landed:false};
  if(residentDrop){const d=residentDrop;fly(d.point,d.start,d.at,d.landed,0,true);}
  else if(visible(home))carrier?.add(home.x,ground(home)+3.6,home.z,w.anchor.facing,'idle',now);
 }
 for(const [id,m] of Object.entries(s.spores)){
  const u=w.entities.get(+id);if(!egg||!u||u.hp<=0||u.bornAt!==m.generation||m.until<=now||!visible(u))continue;
  const age=now-(m.applied??now-1),p=m.from&&age<.32?mix(m.from,u,clamp(age/.32)):u;
  const scale=(.24+.035*Math.sin(now*6))*clamp((m.until-now)*4);
  egg.add(p.x,(u.flying?AIR_HEIGHT:ground(p))+height(u)*.78,p.z,u.facing,'idle',now,false,0,scale,true,-1,0,0,'attack',false,rescueEggMaterial(u.id,w.runId,now));
 }
}
