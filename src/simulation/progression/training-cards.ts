import type {World} from '../world';
import type {FamilyId} from '../../data/races';
import {seatRecipe} from '../../data/expedition-buildings';
export interface TrainingTarget {id:number;bornAt:number;rank:number;family:FamilyId}
/** Preview is deterministic and has no RNG, payment or rank mutation. */
export function trainingTargets(w:World,rank:number){
 if(!Number.isInteger(rank)||rank<2||rank>5||rank>w.soldierCap())return null;
 const reserved=new Map<string,number>(),targets:TrainingTarget[]=[];let minerals=0,gas=0;
 const members=w.expedition.familySlots.flatMap(f=>w.ordinaryUnits(f)).filter(u=>!u.temporary&&!u.summonKind&&u.rank<rank).sort((a,b)=>a.rank-b.rank||a.id-b.id);
 for(const u of members){const delta=rank-u.rank,used=reserved.get(u.unitType)??0;if(w.availableCapacity(u.unitType as FamilyId)<used+delta)continue;
  reserved.set(u.unitType,used+delta);targets.push({id:u.id,bornAt:u.bornAt,rank:u.rank,family:u.unitType as FamilyId});const cost=seatRecipe(u.unitType as FamilyId);minerals+=cost.minerals*delta;gas+=cost.gas*delta;if(targets.length===2)return {targets,minerals,gas};
 }return null;
}
export function validTrainingTargets(w:World,rank:number,targets:TrainingTarget[]){const next=trainingTargets(w,rank);return !!next&&JSON.stringify(next.targets)===JSON.stringify(targets);}
export function applyTrainingTargets(w:World,rank:number,targets:TrainingTarget[]){if(!validTrainingTargets(w,rank,targets))return false;for(const t of targets){const u=w.entities.get(t.id)!;u.rank=rank;w.refreshStats(u);}return true;}
