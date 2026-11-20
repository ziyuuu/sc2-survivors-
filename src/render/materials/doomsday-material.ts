import {doomsdayRefitStyle} from '../../simulation/combat/doomsday-presentation';
import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';

export function doomsdayMaterial(w:World,u:Entity):{refit:readonly [number,number,number,number]}|undefined{
 const refit=doomsdayRefitStyle(w,u);return refit?{refit}:undefined;
}

/** Bone ownership is stable across poses and avoids colour bands sliding over a moving arm. */
export function doomsdayPaintRegion(name:string):readonly [number,number,number]{
 // The original waist joint is mostly hidden. The front missile-pod armour is
 // exposed at the normal game camera and provides the visible red chest accent.
 if(/Pelvis|Unit_Terran_Thor_MissilePod07/i.test(name))return [0,1,0];
 if(/Foot|CannonBarrel|^Cannon/i.test(name))return [1,0,0];
 if(/Torso/i.test(name))return [0,0,1];
 if(/head/i.test(name))return [0,0,-1];
 if(/Root|Socket|Joint/i.test(name))return [0,0,1];
 return [0,0,0];
}
