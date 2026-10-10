/** Original M3 material values. Times are seconds relative to the skeletal clip. */
export type MaterialValue=number|Record<string,number>|null;
export interface MaterialRef {id:number;interpolation:number;default:MaterialValue}
export interface MaterialTrack {id:number;frames:number[];values:MaterialValue[]}
export interface MaterialClip {name:string;duration:number;tracks:MaterialTrack[]}
export interface MaterialLayer {
 filename:string;flags:number;channel:number;uv:number;
 color:MaterialRef;multiply:MaterialRef;add:MaterialRef;uvOffset:MaterialRef;uvAngle:MaterialRef;uvTiling:MaterialRef;
 fresnel:{type:number;exponent:number;min:number;maxOffset:number};
 brightness?:MaterialRef;flipbook?:{rows:number;cols:number;frame:MaterialRef};
 texture?:string;cubeTextures?:string[];rawChannels?:boolean;
}
export interface SourceMaterial {index:number;name:string;flags:number;blend:number;hdrEmission:number;layers:Record<string,MaterialLayer>;alphaTest?:number;hdrSpecular?:number;specularity?:number;role?:string;teamColor?:boolean;teamTexture?:string;version?:number;geometryVisible?:boolean;emissionModes?:number[];layerBlend?:number}
export interface UnitMaterialProfile {
 source:string;sourceSha256:string;glbSha256:string;materials:SourceMaterial[];
 composites:{name:string;parts:{material:{type:number;index:number};alpha:MaterialRef}[]}[];
 compositeTracks:(MaterialTrack&{name:string})[];clips:MaterialClip[];
 animationSources?:{source:string;sha256:string;clips?:{name:string;tracks:number}[];alias?:{from:string;to:string;reason:string}}[];
}
export function sampleMaterialTrack(track:MaterialTrack|undefined,time:number,ref:MaterialRef):MaterialValue {
 if(!track?.frames.length)return ref.default;
 if(time<=track.frames[0])return track.values[0];
 for(let i=1;i<track.frames.length;i++)if(time<=track.frames[i]){
  const a=track.values[i-1],b=track.values[i];
  if(ref.interpolation===0)return time===track.frames[i]?b:a;
  if(ref.interpolation!==1)throw Error('Unsupported animated M3 interpolation: '+ref.interpolation);
  const t=(time-track.frames[i-1])/Math.max(1e-9,track.frames[i]-track.frames[i-1]);
  if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
  if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
  return a;
 }
 return track.values.at(-1)!;
}
export type BarrierPhase={phase:'inactive'|'start'|'hold'|'end';seconds:number};
export function sampleBarrierAlpha(profile:UnitMaterialProfile,materialIndex:number,state?:BarrierPhase){
 const part=profile.composites.flatMap(c=>c.parts).find(p=>p.material.type===1&&p.material.index===materialIndex);
 if(!part)return 1;
 if(!state||state.phase==='inactive')return Number(part.alpha.default);
 const name={start:'Cover Start_Immortal_Shield',hold:'Cover_Immortal_Shield',end:'Cover End_Immortal_Shield'}[state.phase];
 const track=profile.compositeTracks.find(t=>t.name===name&&t.id===part.alpha.id);
 if(!track)throw Error('Missing original shield curve: '+name);
 return Number(sampleMaterialTrack(track,state.seconds,part.alpha));
}
/** Read-only render context. Never persisted and never used to change combat. */
export interface UnitMaterialContext {
 entityId:number;runId:string;time:number;deathAt?:number;barrier?:BarrierPhase;
 teamColor?:readonly [number,number,number];activity?:number;
}
export interface UnitMaterialPose {clip:string;seconds:number;attackClip?:string;attackSeconds?:number}

/** Observe all native Immortals before culling; draw slots and positions are not identities. */
export class BarrierMaterialTimeline {
 private generation='';private time=-Infinity;
 private states=new Map<number,{active:boolean;startedAt:number;endedAt:number;seenAt:number}>();
 reset(){this.states.clear();this.generation='';this.time=-Infinity;}
 begin(runId:string,time:number){if(runId!==this.generation||time<this.time)this.reset();this.generation=runId;this.time=time;}
 observe(id:number,active:boolean,startedAt:number,lastDamagedAt?:number){
  const previous=this.states.get(id);
  const endedAt=previous?.active&&!active?Math.max(previous.seenAt,Math.min(this.time,lastDamagedAt??this.time)):previous?.endedAt??-Infinity;
  this.states.set(id,{active,startedAt,endedAt,seenAt:this.time});
 }
 get(id:number):BarrierPhase {
  const state=this.states.get(id);if(!state)return {phase:'inactive',seconds:0};
  if(state.active){const age=Math.max(0,this.time-state.startedAt);return age<1.333?{phase:'start',seconds:age}:{phase:'hold',seconds:(age-1.333)%1.333};}
  const age=this.time-state.endedAt;return age<=1.333?{phase:'end',seconds:Math.max(0,age)}:{phase:'inactive',seconds:0};
 }
 finish(){for(const [id,state] of this.states)if(state.seenAt!==this.time)this.states.delete(id);}
}
