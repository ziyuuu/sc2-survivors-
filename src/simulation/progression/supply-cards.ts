import type {World} from '../world';
import type {Point} from '../types';
import {FAMILIES_BY_RACE,type FamilyId} from '../../data/races';
import {familyLine,familyResearchLevel,seatRecipe} from '../../data/expedition-buildings';
import {SC2_UNITS} from '../../data/sc2-units';
import {TUNING} from '../../data/game';
import {pendingBodies,joinPair} from '../zerg-brood';
import {retireFamily} from '../expedition-production';
export type SupplyMode='pod'|'direct';
const BASE:FamilyId[]=['marine','hellion','medivac','zergling','roach','queen','zealot','adept','phoenix'];
const END:FamilyId[]=['thor','lurker','ultralisk','colossus','carrier'];
export const supplyTier=(f:FamilyId)=>BASE.includes(f)?0:END.includes(f)?2:1;
export function supplyUnlocked(w:World,f:FamilyId,maxTier:number){const s=w.expedition,line=familyLine(f),level=familyResearchLevel(s.tech,f,'weapon')+familyResearchLevel(s.tech,f,'defense');return FAMILIES_BY_RACE[s.race].includes(f as never)&&s.facilities.some(x=>x.line===line)&&supplyTier(f)<=Math.min(maxTier,Math.floor(level/2));}
export function supplyCapacity(w:World,f:FamilyId,count:number,mode:SupplyMode){return Number.isInteger(count)&&count>=1&&count<=3&&w.rosterCap-w.familyUnits(f).length-pendingBodies(w,f)>=count&&w.availableCapacity(f)>=count;}
export function directPositions(w:World,f:FamilyId,count:number){const points:Point[]=[],radius=SC2_UNITS[f].unitRadius*TUNING.unitScale,width=f==='zergling'?2:1;
 for(let i=0;i<96&&points.length<count*width;i++){const a=i*2.399963,r=1+Math.floor(i/12)*1.1,origin={x:w.anchor.x+Math.sin(a)*r,z:w.anchor.z+Math.cos(a)*r},p=w.freePosition(f,origin,0,.15);if(p&&(!w.terrain?.isOpen||w.terrain.isOpen(p))&&(!w.terrain||SC2_UNITS[f].flying||w.terrain.canOccupy(p,radius))&&points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=radius*2+.05))points.push(p);}return points.length===count*width?points:null;
}
export function supplyEligibility(w:World,f:FamilyId,count:number,mode:SupplyMode){
 const s=w.expedition,line=familyLine(f),alive=w.familyUnits(f).length,pending=pendingBodies(w,f),capacity=w.availableCapacity(f);
 const reasons:string[]=[];
 if(!FAMILIES_BY_RACE[s.race].includes(f as never))reasons.push('race');
 if(!s.facilities.some(x=>x.line===line))reasons.push('facility');
 if(!Number.isInteger(count)||count<1||count>3)reasons.push('count');
 const level=familyResearchLevel(s.tech,f,'weapon')+familyResearchLevel(s.tech,f,'defense');
 if(supplyTier(f)>Math.min(count-1,Math.floor(level/2)))reasons.push('research');
 if(w.rosterCap-alive-pending<count||capacity<count)reasons.push('capacity');
 if(mode==='direct'&&!reasons.length&&!directPositions(w,f,count))reasons.push('placement');
 return {legal:!reasons.length,reasons,alive,pending,capacity,line,research:level};
}
export function canSupply(w:World,f:FamilyId,count:number,mode:SupplyMode){return supplyEligibility(w,f,count,mode).legal;}
export function applySupply(w:World,f:FamilyId,count:number,mode:SupplyMode,paid:{minerals:number;gas:number},old?:FamilyId){
 if(!canSupply(w,f,count,mode))return false;const s=w.expedition,needsReplacement=mode==='direct'&&!s.familySlots.includes(f)&&s.familySlots.length===5;
 if(needsReplacement&&(!old||old===f||!s.familySlots.includes(old)))return false;
 const positions=mode==='direct'?directPositions(w,f,count):null;if(mode==='direct'&&!positions)return false;
 if(needsReplacement)retireFamily(w,old!,f);
 if(mode==='direct'){if(!s.familySlots.includes(f))s.familySlots.push(f);let offset=0;for(let seat=0;seat<count;seat++){const rank=(s.credits[f]??[]).shift()?.rank??1,p=positions![offset++],u=w.addUnit(f,'terran',p.x,p.z,rank);if(f==='zergling'){const pair=joinPair(w,u),q=positions![offset++],other=w.addUnit(f,'terran',q.x,q.z,rank);joinPair(w,other,pair.id);}}return true;}
 const id=w.nextJob++,width=f==='zergling'?2:1,n=count*width;
 const share=(total:number,i:number)=>Math.floor(total/n)+(i<total%n?1:0);
 s.ledger.push({id,family:f,line:familyLine(f),facilityIds:[],remaining:0,state:'awaiting',podId:null,passengers:Array.from({length:n},(_,i)=>({source:'shop-supply' as const,paid:{minerals:share(paid.minerals,i),gas:share(paid.gas,i)},status:'waiting' as const,entityId:null,purpose:'body' as const,...(width===2?{pairId:`paid:${id}:${Math.floor(i/2)}`,pairHalf:i%2 as 0|1}:{})}))});return true;
}
export function supplyPrice(f:FamilyId,count:number,mode:SupplyMode){const r=seatRecipe(f),factor=count*(mode==='direct'?1.5:1);return {minerals:Math.ceil(r.minerals*factor),gas:Math.ceil(r.gas*factor)};}
