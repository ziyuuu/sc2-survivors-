import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
import {SC2_UNITS} from '../../data/sc2-units';
import {TUNING} from '../../data/game';
import {armedRank,type ArmedId} from '../progression/build-progress';
import {armedTemporaryUsed} from './armed-reinforcements';
import type {ArmedDeployment,ArmedPassenger} from './armed-support-state';
import type {World} from '../world';
import type {Point} from '../types';
type MemberCard='G05'|'G06'|'B03'|'B08'|'P02';
export const armedMemberCard=(id:string):id is MemberCard=>['G05','G06','B03','B08','P02'].includes(id);
export const armedIndividualCard=(id:string)=>armedMemberCard(id)||id==='B06'||id==='O02';
export function prepareArmedMemberBatch(w:World,id:MemberCard,find:(origin:Point,ignoreId?:number,radius?:number,reserved?:readonly Point[])=>Point|null,stageKey:string){
 const a=w.expedition.support.armed!,config=ARMED_CARD_BY_ID[id].params,reinforcement=id==='G05'||id==='G06'||id==='B03',boost=reinforcement&&armedRank(w.expedition.support,'N02')?1:0,reserveExtra=boost&&(a.nodeReserves.N02??0)>0?1:0,count=config.count+boost+reserveExtra,exclusive=id==='P02';
 if(!exclusive&&armedTemporaryUsed(w)+count>(armedRank(w.expedition.support,'N03')?24:18))return null;
 if(exclusive&&w.allies().some(u=>u.armed?.cardId===id))return null;
 const targets=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&(id==='P02'||!e.flying)&&w.visibleTo(e,'terran')).sort((a,b)=>(id==='B03'?Number(b.attackRange>1)-Number(a.attackRange>1):0)||Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id),target=targets[0];if(!target)return null;
 const family=id==='G05'?'hellion':id==='G06'?'zergling':id==='B03'?'reaper':id==='B08'?'tank':'thor',radius=SC2_UNITS[family].unitRadius*TUNING.unitScale,points:Point[]=[],deployments:ArmedDeployment[]=[],castId=a.nextCast;
 const dx=target.x-w.anchor.x,dz=target.z-w.anchor.z,length=Math.hypot(dx,dz)||1,f={x:dx/length,z:dz/length};
 for(let i=0;i<count;i++){
  const along=id==='G05'?-6:id==='B08'?-3:id==='P02'?3:1;
  const side=(i%2?1:-1)*(id==='B03'?5:id==='G05'?7:3);
  const origin={x:w.anchor.x+f.x*along+f.z*side,z:w.anchor.z+f.z*along-f.x*side};
  const point=find(origin,undefined,radius,points);
  if(!point)return null;
  points.push(point);
  const slot=id==='G05'?Math.min(2,i):id==='B03'?Math.min(1,Math.floor(i/2)):0,baseTick=id==='G06'?Math.ceil(ARMED_CARD_BY_ID.G06.params.exit*60):id==='G05'?Math.ceil(ARMED_CARD_BY_ID.G05.params.arrival[slot]*60):id==='B03'?Math.ceil(ARMED_CARD_BY_ID.B03.params.arrival[slot]*60):id==='B08'?Math.ceil(ARMED_CARD_BY_ID.B08.params.land*60):ARMED_CARD_BY_ID.P02.params.land,extraTick=i>=config.count?(i-config.count+1)*6:0,arrival=w.tick+baseTick+extraTick;
  const passenger:ArmedPassenger={family,rank:Math.min(5,config.rank+boost),formal:false,exitTick:arrival,lifeTicks:(i>=config.count&&reserveExtra&&i===count-1?16:config.lifetime)*60,entityId:null,cancelled:false,eliteId:id==='P02'?(['thor.1','thor.2','thor.3'] as const)[i]:undefined};
  deployments.push({id:w.nextId+i,castId,cardId:id,slot:i,stageKey,point,createdTick:w.tick,landTick:id==='G06'?w.tick+Math.ceil(ARMED_CARD_BY_ID.G06.params.land*60):arrival,openTick:arrival,doorOpened:false,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers:[passenger],impactDone:false,hp:1,maxHp:1,armor:0,radius,rank:1});
 }
 if(id==='G06'){const first=deployments[0];first.passengers=deployments.flatMap(d=>d.passengers);first.impactDamage=0;deployments.splice(1);}
 return {deployments,seconds:config.cd*(boost?ARMED_CARD_BY_ID.N02.params.cdFactor:1),reserveExtra};
}
