import type {World} from '../../src/simulation/world';
import {tickWeaponFlights} from '../../src/simulation/combat/weapon-flight';
import {tickHeroAttacks} from '../../src/simulation/combat/hero-attack-upgrades';
/** Isolated weapon assertion: no unrelated AI, regeneration, income or new shots. */
export function settleWeaponFlights(w:World){
 w.hash.rebuild(w.entities.values());let steps=0;
 while((w.weaponFlights.length||w.heroAttacks.packets.length||w.heroAttacks.lines.length)&&steps++<600){w.time+=1/60;tickWeaponFlights(w,1/60);tickHeroAttacks(w);}
 if(w.weaponFlights.length||w.heroAttacks.packets.length)throw Error('Weapon fixture did not finish');
}
