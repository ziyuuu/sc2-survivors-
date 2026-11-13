import type {World} from '../world';
import type {Body,Entity} from '../types';
/** Read-only targeting identity for virtual support; never inserted as a unit. */
export function armedTargetAllowed(w:World,target:Body){const source={id:0,x:w.anchor.x,z:w.anchor.z,hp:1,maxHp:1,armor:0,unitRadius:0,owner:'terran',race:'terran',team:'player',flying:false,attributes:[],unitType:'marine',rank:1} as unknown as Entity;return target.owner==='zerg'&&target.hp>0&&w.targetAllowed(source,target);}
