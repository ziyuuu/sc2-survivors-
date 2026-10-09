import type {Obstacle} from '../../src/data/game';
import type {World} from '../../src/simulation/world';
import {blocked} from '../../src/simulation/movement/steering';

/** Physical bounds of this diagnostic deck, supplied through the existing obstacle API. */
export const DECK_BLOCKERS:Obstacle[]=[
 {x:-12,z:0,w:6.3,h:112},{x:12,z:0,w:6.3,h:112},
 {x:0,z:-22,w:24,h:4.8},{x:0,z:22,w:24,h:4.2},
];
export function inspectDeck(world:World){
 const units=[...world.entities.values()].filter(u=>u.hp>0);
 return {anchor:{...world.anchor},order:world.order,blockers:DECK_BLOCKERS,
  blocked:units.filter(u=>!u.flying&&blocked(u,u.unitRadius,world.obstacles)).map(u=>u.id),
  units:units.map(u=>({id:u.id,type:u.unitType,owner:u.owner,x:u.x,z:u.z,radius:u.unitRadius,action:u.action,hp:u.hp,barrier:u.barrier??0,barrierReady:u.barrierReady??0}))};
}
