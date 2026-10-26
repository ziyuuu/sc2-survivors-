import type {MaterialClip,MaterialRef,MaterialLayer,UnitMaterialProfile} from '../../materials/source-tracks';

export type SourceValue=number|Record<string,number>|null;
export type SourceParameter=number|MaterialRef|Record<string,unknown>|unknown[]|null;
export type SourceEmitter=Record<string,SourceParameter>&{bone:number;material_reference_index:number};
export interface SourceBone {name:string;parent:number;flags:number;location:MaterialRef;rotation:MaterialRef;scale:MaterialRef;rest?:{position:number[];rotation:number[];scale:number[]}}
export interface SourceEffectDefinition {
 id:string;source:string;sourceSha256:string;scale:number[];glbId?:string;
 referenceBounds?:{clip:string;seconds:number;min:number[];max:number[];radius:number};
 materialProfile:UnitMaterialProfile;bones:SourceBone[];
 materialReferences:{type:number;material_index:number}[];
 displacementMaterials:SourceDisplacementMaterial[];
 displacementGlb?:{id:string;sha256:string};
 particles:SourceEmitter[];copies:SourceEmitter[];ribbons:SourceEmitter[];
 projections:SourceEmitter[];forces:SourceEmitter[];billboards?:{bone:number;billboard_type:number}[];
 attachments:{name:string;boneIndex:number}[];
}
export interface SourceDisplacementMaterial {name:string;strength:MaterialRef;flags:number;priority:number;layers:{normal:MaterialLayer|null;strength:MaterialLayer|null}}
export type SourceClip=MaterialClip&{flags?:number};
export interface SourcePhase {clip:SourceClip;seconds:number;offset:number;cycle:number}
export interface SourcePlacement {x:number;y:number;z:number;facing:number;scale?:number;matrix?:number[];end?:{x:number;y:number;z:number};from?:{x:number;y:number;z:number};direction?:{x:number;y:number;z:number};age?:number}
export interface SourceEffectRequest {key:string;model:string;age:number;seed:number;placement:SourcePlacement;loop?:boolean;clip?:string;stopAt?:number;stopTime?:number;stopAfter?:number;meshUntil?:number;mesh?:boolean;hostedBeam?:boolean;clockRate?:number;particles?:boolean;projections?:boolean;ribbonIndices?:readonly number[];ribbonAge?:number}
