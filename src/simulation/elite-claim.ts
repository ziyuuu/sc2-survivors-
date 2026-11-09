import type {World} from './world';
import {ELITES,type EliteId} from '../data/elites';
/** Confirm replacement first; apply a quoted rank before immediate absorption can retire the body. */
export function acquireEliteImmediately(w:World,id:EliteId,targetId?:number,targetRank?:5){
 if(!w.canAcquireElite(id))return false;
 const needsTarget=!w.eliteOwned(id)&&w.familySeatCount(ELITES[id].family)>=w.familyMemberCap(ELITES[id].family);
 if(needsTarget&&(targetId===undefined||!w.eliteCandidates(id).some(u=>u.id===targetId)))return false;
 if(!w.acquireElite(id,targetRank))return false;
 if(needsTarget&&!w.replaceWithElite(id,targetId!,targetRank))throw Error('精英替换目标失效');
 return true;
}

