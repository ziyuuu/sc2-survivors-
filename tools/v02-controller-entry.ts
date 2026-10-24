import {consumptionController} from './lib/g03-consumption-controller-r4.mts';
import * as inventory from '../src/simulation/starship/inventory';
import * as attributes from '../src/simulation/starship/attributes';
import * as equipment from '../src/simulation/starship/runtime';
import * as catalog from '../src/simulation/starship/catalog';
import * as special from '../src/simulation/special-stages/runtime';
import * as rewards from '../src/simulation/special-stages/rewards';
import * as building from '../src/simulation/building/rules';
import * as expedition from '../src/simulation/building/expedition';
import * as economy from '../src/simulation/starship/economy';
// The offline policy calls this after decisions. Browser readiness belongs to bootstrap.
// Acknowledge the policy request without changing the special-stage phase.
const api={...inventory,...attributes,...equipment,...catalog,...special,...rewards,...building,...expedition,...economy,markSpecialReady:()=>{(globalThis as any).V02SuppressedReady=((globalThis as any).V02SuppressedReady??0)+1;return true;}};
(globalThis as any).V02Policy={create:(w:any)=>consumptionController(w,api,'terran',{advance:false})};
