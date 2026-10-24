import type {World} from '../world';
import type {Body,Entity} from '../types';
import type {FunFaction} from './expanded-state';

export function funFaction(w:World,b:Body):FunFaction|'player'|'enemy'{
 return w.entities.get(b.id)?.fun?.faction??(b.owner==='terran'?'player':'enemy');
}
/** Undefined preserves native friendly-fire rules for unrelated units. */
export function funRelation(w:World,a:Body|undefined,b:Body,sourceOwner:Body['owner']=a?.owner??'zerg',sourceId=a?.id):boolean|undefined{
 if(b.heldBy||a?.heldBy)return false;
 const pit=w.entities.get(b.id)?.fun,short=w.encounters.expanded.short;
 if(pit?.kind==='devourer'&&pit.role==='actor'&&short?.id===pit.id&&short.phase!=='rescue')return false;
 const actor=a&&('fun' in a?a as Entity:w.entities.get(a.id)),target=w.entities.get(b.id);
 const origin=sourceId===undefined?undefined:w.encounters.expanded.origins.get(sourceId);
 if(!actor?.fun&&!target?.fun&&!origin)return undefined;
 if(a?.id===b.id)return false;
 const af=actor?.fun?.faction??origin?.faction??(sourceOwner==='terran'?'player':'enemy'),bf=funFaction(w,b);
 if(af==='queen')return bf==='enemy'&&!!target&&target.enemyOrigin==='regular'&&!target.enemyTier&&(target.enemySpawn?.density??1)===1&&!target.mission&&!target.temporary&&!target.summonKind&&!w.starship.derivedEnemies.has(target.id);
 if(bf==='queen')return af==='player'&&(w.encounters.expanded.queen?.kills??0)>=300;
 if(af==='neutral')return false;
 if(bf==='neutral')return af==='player';
 if(af==='rogue')return bf==='enemy'||bf==='player'||bf==='friend';
 if(bf==='rogue')return af==='enemy'||af==='player'||af==='friend';
 if(af==='hostile')return bf==='player'||bf==='friend';
 if(bf==='hostile')return af==='player'||af==='friend';
 if(af==='friend')return bf==='enemy';
 if(bf==='friend')return af==='enemy';
 return undefined;
}
export function funCanAct(u:Entity){return !u.heldBy&&(!u.fun||u.fun.mode==='active'||u.fun.mode==='friend'||u.fun.mode==='charging');}
export function funAutoTargetAllowed(w:World,u:Entity,b:Body){
 if(u.owner!=='terran'||u.fun)return true;
 const target=w.entities.get(b.id),f=target?.fun,m=f&&[w.encounters.expanded.short,w.encounters.expanded.queen].find(m=>m?.id===f.id);
 if(!f||!m)return true;
 if(f.kind==='cruelQueen'||f.kind==='infectedTerrans'&&f.mode==='passive'&&w.expedition.race==='terran')return !!m.attackRequested;
 return true;
}
export function funMedicalPatient(w:World,healer:Entity,patient:Entity){
 if(patient.heldBy)return false;
 if(patient.fun?.kind==='infectedTerrans'&&patient.fun.mode==='passive')return w.expedition.race==='terran'&&healer.owner==='terran'&&['medivac','science_vessel'].includes(healer.unitType);
 return undefined;
}
export function hasWings(w:World,u:Entity){return u.owner==='terran'&&!u.heroId&&!u.temporary&&!u.summonKind&&w.encounters.expanded.wingFamilies.has(u.unitType);}
