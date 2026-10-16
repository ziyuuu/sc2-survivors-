import type {UnitMaterialContext} from '../materials/source-tracks';

/** Rescue eggs only: reuse the source body/animation with an opaque purple tint.
 * Shared egg models used by mines and strategic drops keep their native colour. */
export function rescueEggMaterial(entityId:number,runId:string|null,time:number):UnitMaterialContext{
 return {entityId,runId:runId??'preview',time,teamColor:[.55,.12,1],apparition:{tint:[.65,.32,6],opacity:1}};
}
