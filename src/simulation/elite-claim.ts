import type {World} from './world';
import {ELITES,type EliteId} from '../data/elites';
/** Confirm replacement first so a canceled selection cannot consume a payment or reward. */
export function acquireEliteImmediately(w:World,id:EliteId,targetId?:number){
 if(!w.canAcquireElite(id))return false;
 const needsTarget=!w.eliteOwned(id)&&w.familySeatCount(ELITES[id].family)>=w.rosterCap;
 if(needsTarget&&(targetId===undefined||!w.eliteCandidates(id).some(u=>u.id===targetId)))return false;
 if(!w.acquireElite(id))return false;
 if(needsTarget&&!w.replaceWithElite(id,targetId!))throw Error('精英替换目标失效');
 return true;
}

