import type {World} from '../../src/simulation/world';
import {tickWeaponFlights} from '../../src/simulation/combat/weapon-flight';
/** Isolated weapon assertion: no unrelated AI, regeneration, income or new shots. */
export function settleWeaponFlights(w:World){
 w.hash.rebuild(w.entities.values());let steps=0;
 while(w.weaponFlights.length&&steps++<600){w.time+=1/60;tickWeaponFlights(w,1/60);}
 if(w.weaponFlights.length)throw Error('Weapon fixture did not finish');
}
