import {armedTargetAllowed} from './armed-targets';
import {ARMED_CARD_BY_ID as C} from '../../data/terran-armed-support';
import {SC2_UNITS} from '../../data/sc2-units';
import {TUNING} from '../../data/game';
import type {CombatUnitType} from '../../data/races';
import {armedRank} from '../progression/build-progress';
import {armedTemporaryUsed} from './armed-reinforcements';
import type {EliteId} from '../../data/elites';
import type {ArmedDeployment,ArmedShot} from './armed-support-state';
import type {World} from '../world';
import type {Point} from '../types';
import {equipmentCardDamage} from '../starship/card-effects';

export function prepareArmedFleet(w:World,id:'B06'|'O02',stageKey:string,find:(origin:Point,ignore?:number,radius?:number,reserved?:readonly Point[])=>Point|null){
 const a=w.expedition.support.armed!,foes=[...w.entities.values()].filter(u=>u.hp>0&&u.owner==='zerg'&&w.visibleTo(u,'terran')&&(id==='O02'||u.flying)).sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id);if(!foes.length||w.allies().some(u=>u.armed?.cardId===id))return null;
 const boost=id==='B06'&&armedRank(w.expedition.support,'N02')?1:0,extra=boost&&(a.nodeReserves.N02??0)>0?1:0,rows:{family:CombatUnitType;rank:number;arrival:number;life:number;elite?:EliteId}[]=[];
 if(id==='B06'){
  const p=C.B06.params;for(let i=0;i<p.vikings+boost+extra;i++)rows.push({family:'viking',rank:Math.min(5,p.vikingRank+boost),arrival:Math.ceil(p.vikingArrival[Math.min(i,1)]*60)+(i>=2?(i-1)*6:0),life:i===p.vikings+boost&&extra?16:p.lifetime});rows.push({family:'battlecruiser',rank:Math.min(5,p.cruiserRank+boost),arrival:Math.ceil(p.cruiserArrival*60),life:p.lifetime});
  if(armedTemporaryUsed(w)+rows.length>(armedRank(w.expedition.support,'N03')?24:18))return null;
 }else{const p=C.O02.params;for(const elite of ['thor.1','thor.2','thor.3'] as const)rows.push({family:'thor',rank:5,arrival:p.thorTick,life:p.thorLife,elite});for(const elite of ['tank.1','tank.2'] as const)rows.push({family:'tank',rank:5,arrival:p.tankTime*60,life:p.tankLife,elite});rows.push({family:'battlecruiser',rank:5,arrival:p.cruiserTime*60,life:p.cruiserLife});}
 const dx=foes[0].x-w.anchor.x,dz=foes[0].z-w.anchor.z,length=Math.hypot(dx,dz)||1,f={x:dx/length,z:dz/length};
 const points:Point[]=[],deployments:ArmedDeployment[]=[];
 for(const [index,r]of rows.entries()){const radius=SC2_UNITS[r.family].unitRadius*TUNING.unitScale,side=(index%2?1:-1)*(3+Math.floor(index/2)),along=SC2_UNITS[r.family].flying?4.5:id==='O02'?1:-1,origin={x:w.anchor.x+f.z*side+f.x*along,z:w.anchor.z-f.x*side+f.z*along},point=SC2_UNITS[r.family].flying?airPoint(w,r.family,origin,deployments):find(origin,undefined,radius,points);if(!point)return null;points.push(point);const tick=w.tick+r.arrival;
  deployments.push({id:w.nextId+index,castId:a.nextCast,cardId:id,slot:index,stageKey,point,createdTick:w.tick,landTick:tick,openTick:tick,doorOpened:false,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers:[{family:r.family,rank:r.rank,formal:false,exitTick:tick,lifeTicks:r.life*60,entityId:null,cancelled:false,eliteId:r.elite}],impactDone:false,hp:1,maxHp:1,armor:0,radius,rank:1});
 }
 const shots:ArmedShot[]=id==='O02'?C.O02.params.shots.map((tick,index)=>({tick:w.tick+tick,point:{x:foes[0].x+f.x*index*.7,z:foes[0].z+f.z*index*.7},damage:equipmentCardDamage(w,C.O02.params.damage),radius:C.O02.params.radius,kind:'siege'})):[];
 return {deployments,shots,seconds:id==='B06'?C.B06.params.cd*(boost?C.N02.params.cdFactor:1):C.O02.params.cd,reserveExtra:extra};
}

function airPoint(w:World,family:CombatUnitType,origin:Point,planned:ArmedDeployment[]){const radius=SC2_UNITS[family].unitRadius*TUNING.unitScale,waiting=[...(w.expedition.support.armed?.deployments??[]),...planned].filter(d=>d.phase!=='ended'&&d.passengers.some(p=>p.entityId===null&&!p.cancelled&&SC2_UNITS[p.family].flying));for(let offset=0;offset<=8;offset+=.5)for(let i=0;i<16;i++){const p={x:origin.x+Math.sin(i*Math.PI/8)*offset,z:origin.z+Math.cos(i*Math.PI/8)*offset};if(Math.abs(p.x)+radius>=w.mapHalf||Math.abs(p.z)+radius>=w.mapHalf||waiting.some(d=>Math.hypot(p.x-d.point.x,p.z-d.point.z)<radius+d.radius+.12)||[...w.entities.values()].some(u=>u.hp>0&&u.flying&&Math.hypot(u.x-p.x,u.z-p.z)<radius+u.unitRadius+.12))continue;return p;}return null;}
