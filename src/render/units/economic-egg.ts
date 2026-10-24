import type {UnitMaterialContext} from '../materials/source-tracks';

/** Ordinary rescue eggs share one green team colour, without a purple tint.
 * Shared egg models used by mines and strategic drops keep their native colour. */
export function rescueEggMaterial(entityId:number,runId:string|null,time:number):UnitMaterialContext{
 return {entityId,runId:runId??'preview',time,teamColor:[.35,.7,.25]};
}

/** Reserved for nightmare task eggs; never select this by hidden payload. */
export function nightmareEggMaterial(entityId:number,runId:string|null,time:number):UnitMaterialContext{
 return {entityId,runId:runId??'preview',time,teamColor:[.55,.12,1],apparition:{tint:[.65,.32,6],opacity:1}};
}
