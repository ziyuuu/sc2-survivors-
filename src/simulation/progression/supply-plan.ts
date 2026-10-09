import type {World} from '../world';
import type {FamilyId} from '../../data/races';
import {pendingBodies} from '../zerg-brood';

/** Shared read-only projection. Count is the face value; full-card prices stay native. */
export function supplyPlan(w:World,f:FamilyId,count:number,mode:'pod'|'direct'){
 const alive=w.familySeatCount(f),pending=pendingBodies(w,f),room=Math.max(0,w.rosterCap-alive-pending);
 const rankRoom=w.ordinaryUnits(f).reduce((n,u)=>n+Math.max(0,w.soldierCap()-u.rank),0);
 const capacity=Math.max(0,Math.min(w.availableCapacity(f),mode==='direct'?room+rankRoom:Infinity));
 const amount=Number.isInteger(count)&&count>=1&&count<=3?Math.min(count,capacity):0;
 const added=Math.min(amount,room),promoted=amount-added;
 return {alive,pending,capacity,amount,added,promoted,full:alive>=w.rosterCap};
}
