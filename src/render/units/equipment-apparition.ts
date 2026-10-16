import type {World} from '../../simulation/world';
import type {UnitMaterialContext} from '../materials/source-tracks';

// Liberty HighTemplarHallucination: RGB 108,108,255 and alpha .7.
// Phase/recall hues distinguish this game's equipment rules, not SC2 actors.
// Actor tint is a multiplier, not an sRGB texel to decode a second time.
const TINTS={phantom:[108/255,108/255,1],phase:[140/255,108/255,1],recall:[108/255,1,1]} as const;
export function equipmentApparition(w:World,id:number):UnitMaterialContext['apparition'] {
 const projection=w.starship.projections.get(id);
 return projection?{tint:TINTS[projection.kind],opacity:.7}:undefined;
}
