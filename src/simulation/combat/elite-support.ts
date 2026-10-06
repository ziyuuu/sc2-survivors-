import {revisedElite} from './terran-elite-runtime';
import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import {advanceTrackingMine,minePlacementLegal,validSupportMine,type SupportMine} from './tracking-mines';

export type LargeMine=SupportMine&{source:number;rank:number;damage:number;fire:number};
export type EliteSupportState={deploy:Record<number,{next:number;retry:number;pending:number}>;mines:LargeMine[];fires:{id:number;source:number;point:Point;damage:number;next:number;until:number}[];fireGate:Record<string,number>;barriers:{source:number;target:number;amount:number;until:number;cap:number}[];};
export const newEliteSupportState=():EliteSupportState=>({deploy:{},mines:[],fires:[],fireGate:{},barriers:[]});
export const largeMineRules={discovery:6,emergeSeconds:.25,speed:6,trigger:1.2,damage:1200,blast:4.2,radius:.45};
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function placement(w:World,u:Entity){for(const r of [1.6,2.4,3.2])for(let i=0;i<16;i++){const a=u.facing+Math.PI+i*Math.PI/8,p={x:u.x+Math.sin(a)*r,z:u.z+Math.cos(a)*r};if(minePlacementLegal(w,p,.45)&&![...w.entities.values()].some(b=>b.hp>0&&!b.flying&&dist(p,b)<.45+b.unitRadius)&&!w.eliteSupport.mines.some(m=>dist(m.point,p)<.9)&&!w.expedition.support.mines.some(m=>dist(m.point,p)<.75))return p;}return null;}
function victims(w:World,p:Point){const bodies:Body[]=[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])];return bodies.filter(b=>b.hp>0&&b.owner==='zerg'&&!b.flying&&dist(p,b)<=4.2+b.unitRadius&&w.visibleTo(b,'terran')&&(!w.terrain||w.terrain.lineOfFire(p,b,false,false)));}
export function tickEliteSupport(w:World){
 const s=w.eliteSupport;if(![...w.entities.values()].some(u=>revisedElite(u)&&u.eliteId==='hellion.3')&&!s.mines.length&&!s.fires.length&&!s.barriers.length)return;if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 for(const u of w.entities.values())if(u.hp>0&&revisedElite(u)&&u.eliteId==='hellion.3'){
  const d=s.deploy[u.id]??(s.deploy[u.id]={next:u.bornAt+12,retry:0,pending:0});
  if(!d.pending&&w.time+1e-8>=d.next){d.pending=2;d.retry=w.time;}
  if(d.pending&&w.time+1e-8>=d.retry){d.retry=w.time+1;while(d.pending&&s.mines.filter(m=>m.source===u.id).length<8){const p=placement(w,u);if(!p)break;const g=1+.35*(u.rank-1);s.mines.push({id:w.nextId++,point:p,phase:'buried',targetId:null,emergeAt:0,facing:u.facing,source:u.id,rank:u.rank,damage:1200*g,fire:180*g});d.pending--;}
   if(!d.pending)d.next=w.time+12;
  }
 }
 for(const id of Object.keys(s.deploy))if(!w.entities.get(+id)?.hp||w.entities.get(+id)?.eliteId!=='hellion.3')delete s.deploy[+id];
 const targets=[...w.entities.values()].filter(e=>e.hp>0&&e.owner==='zerg'&&w.visibleTo(e,'terran'));
 for(const m of [...s.mines])if(advanceTrackingMine(w,m,targets,largeMineRules)){
  s.mines=s.mines.filter(n=>n.id!==m.id);for(const b of victims(w,m.point))w.hit(b,m.damage,[],1,'terran',0,0,m.source,false,false,0,true);
  s.fires.push({id:m.id,source:m.source,point:{...m.point},damage:m.fire,next:w.time+1,until:w.time+2});const emitter=w.entities.get(m.source)??{...m.point,id:m.source,hp:1,maxHp:1,armor:0,unitRadius:0,flying:false,attributes:[],owner:'terran' as const,unitType:'hellion' as const,eliteId:'hellion.3' as const,rank:m.rank,race:'terran' as const};w.visual('support-impact',emitter,m.point);
 }
 const due=new Map<string,{target:Body;source:number;damage:number}>();
 for(const f of s.fires)while(f.next<=w.time+1e-8&&f.next<=f.until+1e-8){for(const target of victims(w,f.point)){const key=f.source+':'+target.id;if((s.fireGate[key]??0)>w.time+1e-8)continue;const old=due.get(key);if(!old||old.damage<f.damage)due.set(key,{target,source:f.source,damage:f.damage});}f.next+=1;}
 for(const [key,p]of due){s.fireGate[key]=w.time+1;w.hit(p.target,p.damage,[],1,'terran',0,0,p.source,false,false,0,true);}
 s.fires=s.fires.filter(f=>f.until>=w.time-1e-8);for(const key of Object.keys(s.fireGate))if(s.fireGate[key]<w.time-1)delete s.fireGate[key];
 s.barriers=s.barriers.filter(b=>b.until>w.time&&b.amount>0&&!!w.entities.get(b.target)?.hp);
}
export function absorbEliteBarrier(w:World,u:Entity,amount:number){for(const b of w.eliteSupport.barriers.filter(b=>b.target===u.id&&b.until>w.time).sort((a,b)=>a.source-b.source)){b.amount=Math.min(b.amount,u.maxHp*b.cap);const paid=Math.min(amount,b.amount);b.amount-=paid;amount-=paid;if(!amount)break;}return amount;}
export function validateEliteSupport(s:EliteSupportState){
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0,id=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
 if(!s||Object.keys(s).length!==5||!s.deploy||!Array.isArray(s.mines)||!Array.isArray(s.fires)||!s.fireGate||!Array.isArray(s.barriers))throw Error('精英支援状态缺失');
 for(const [k,d] of Object.entries(s.deploy))if(!id(+k)||!finite(d.next)||!finite(d.retry)||!Number.isInteger(d.pending)||d.pending<0||d.pending>2)throw Error('精英布雷时钟无效');
 const seen=new Set<number>();for(const m of s.mines){if(!validSupportMine(m)||!id(m.source)||!Number.isInteger(m.rank)||m.rank<1||m.rank>5||!finite(m.damage)||!finite(m.fire)||seen.has(m.id))throw Error('大型地雷无效');seen.add(m.id);}
 for(const f of s.fires){if(!id(f.id)||!id(f.source)||!finite(f.damage)||!finite(f.next)||!finite(f.until)||!f.point||!Number.isFinite(f.point.x)||!Number.isFinite(f.point.z)||seen.has(f.id))throw Error('地雷火区无效');seen.add(f.id);}
 for(const [key,time] of Object.entries(s.fireGate))if(!/^[1-9]\d*:[1-9]\d*$/.test(key)||!finite(time))throw Error('地雷火区收据无效');
 const pairs=new Set<string>();for(const b of s.barriers){const key=b.source+':'+b.target;if(!id(b.source)||!id(b.target)||!finite(b.amount)||!finite(b.until)||(!finite(b.cap)||b.cap>1)||pairs.has(key))throw Error('医疗屏障无效');pairs.add(key);}
 
}
