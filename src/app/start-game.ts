import {boot} from './bootstrap';
import {newEquipmentAccount} from '../simulation/starship/inventory';
import {applyDisplayPreferences} from '../ui/display-preferences';
import {starshipImage} from '../ui/starship/runtime-art';

/** Normal campaign entry: empty account, ordinary waves and production rules. */
export function startGame(seed=crypto.getRandomValues(new Uint32Array(1))[0]){
 applyDisplayPreferences();
 return boot({seed,equipmentAccount:newEquipmentAccount(seed),starship:{resolveImage:starshipImage}});
}
