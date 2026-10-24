import {Matrix4,Quaternion,Vector3} from 'three';
import {sampleMaterialTrack,type MaterialRef,type MaterialTrack} from '../../materials/source-tracks';
import type {SourceClip,SourceEffectDefinition,SourceEmitter,SourcePhase,SourceValue} from './types';

const tracks=new WeakMap<SourceClip,Map<number,MaterialTrack>>();
const trackMap=(clip:SourceClip)=>{let m=tracks.get(clip);if(!m){m=new Map(clip.tracks.map(t=>[t.id,t]));tracks.set(clip,m);}return m;};
export function sourceSample(clip:SourceClip,seconds:number,ref:MaterialRef):SourceValue {
 const track=trackMap(clip).get(ref.id);
 if(track?.values.some(v=>v&&typeof v==='object'&&'w'in v)&&track.frames.length>1&&ref.interpolation!==0){
  if(seconds<=track.frames[0])return track.values[0];
  for(let i=1;i<track.frames.length;i++)if(seconds<=track.frames[i]){const a=track.values[i-1] as Record<string,number>,b=track.values[i] as Record<string,number>,q=new Quaternion(a.x,a.y,a.z,a.w).slerp(new Quaternion(b.x,b.y,b.z,b.w),(seconds-track.frames[i-1])/Math.max(1e-9,track.frames[i]-track.frames[i-1]));return {x:q.x,y:q.y,z:q.z,w:q.w};}
 }
 return sampleMaterialTrack(track,seconds,ref);
}
export function sourceValue(emitter:SourceEmitter,key:string,phase:SourcePhase,fallback:number|Record<string,number>=0):SourceValue {
 const v=emitter[key];if(v===null||v===undefined)return fallback;
 if(typeof v==='number')return v;
 if(typeof v==='object'&&!Array.isArray(v)&&'id'in v&&'default'in v)return sourceSample(phase.clip,phase.seconds,v as unknown as MaterialRef);
 return v as Record<string,number>;
}
export const sourceNumber=(p:SourceEmitter,key:string,phase:SourcePhase,fallback=0)=>Number(sourceValue(p,key,phase,fallback));
export const sourceVector=(p:SourceEmitter,key:string,phase:SourcePhase,fallback:Record<string,number>={x:0,y:0,z:0})=>sourceValue(p,key,phase,fallback) as Record<string,number>;
/** Cosmetic random stream is a pure function; it never sees World.random. */
export function sourceRandom(seed:number,index:number){let n=(Math.imul(seed|0,0x45d9f3b)^Math.imul(index|0,0x27d4eb2d))>>>0;n=Math.imul(n^(n>>>16),0x85ebca6b);n=Math.imul(n^(n>>>13),0xc2b2ae35);return ((n^(n>>>16))>>>0)/4294967296;}
export function sourceSeed(key:string){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return h>>>0;}
/** Match the authored field's reference-pose footprint to the existing native
 * radius. This changes presentation only; it never supplies collision geometry. */
export function sourceFieldScale(def:SourceEffectDefinition,radius:number){
 if(!def.referenceBounds?.radius)throw Error('Missing source field bounds: '+def.id);
 return radius/(def.referenceBounds.radius*Math.max(def.scale[0],def.scale[1])*1.4);
}

const variant=(clips:SourceClip[],test:RegExp,seed:number)=>{const eligible=clips.filter(c=>test.test(c.name));return eligible[Math.floor(sourceRandom(seed,83)*eligible.length)];};
export function sourcePhases(def:SourceEffectDefinition,age:number,loop=false,seed=0,preferred?:string):SourcePhase[] {
 const clips=def.materialProfile.clips as SourceClip[];
 const exact=preferred?clips.find(c=>c.name===preferred):undefined;
 if(exact)return [{clip:exact,seconds:loop?Math.max(0,age)%Math.max(.001,exact.duration):Math.max(0,Math.min(age,exact.duration)),offset:loop?Math.floor(Math.max(0,age)/Math.max(.001,exact.duration))*exact.duration:0,cycle:loop?Math.floor(Math.max(0,age)/Math.max(.001,exact.duration)):0}];
 const birth=exact??variant(clips,/^birth(?:\s|$)/i,seed),stand=variant(clips,/^stand(?:\s|$)/i,seed)??variant(clips,/^attack(?:\s|$)/i,seed),death=variant(clips,/^death(?:\s|$)/i,seed);
 const result:SourcePhase[]=[];let offset=0;
 if(birth){result.push({clip:birth,seconds:Math.max(0,Math.min(age,birth.duration)),offset:0,cycle:0});offset=birth.duration;}
 const content=stand??(!birth?death??clips[0]:undefined);
 if(content){const cycle=loop?Math.max(0,Math.floor((age-offset)/Math.max(.001,content.duration))):0;result.push({clip:content,seconds:Math.max(0,Math.min(content.duration,age-offset-cycle*content.duration)),offset:offset+cycle*content.duration,cycle});offset+=content.duration;}
 if(!loop&&death&&death!==content&&death!==birth)result.push({clip:death,seconds:Math.max(0,Math.min(death.duration,age-offset)),offset,cycle:0});
 return result;
}
export function sourcePhase(def:SourceEffectDefinition,age:number,loop=false,seed=0,preferred?:string,phases=sourcePhases(def,age,loop,seed,preferred)):SourcePhase {
 const phase=phases.filter(p=>p.offset<=age).at(-1)??phases[0];
 if(!phase)throw Error('No original effect animation: '+def.id);return phase;
}
const lives=new WeakMap<SourceEffectDefinition,number>();
export function sourceLife(def:SourceEffectDefinition){
 const existing=lives.get(def);if(existing!==undefined)return existing;
 const life=(p:SourceEmitter)=>Math.max(0,...['lifespan','lifespan_random','lifespan2'].flatMap(key=>{const ref=p[key] as MaterialRef|undefined;return [Number(ref?.default??0),...def.materialProfile.clips.flatMap(c=>c.tracks.filter(t=>t.id===ref?.id).flatMap(t=>t.values.map(Number)))];}));
 const duration=sourcePhases(def,0).reduce((n,p)=>Math.max(n,p.offset+p.clip.duration),.01),projection=Math.max(0,...def.projections.map(p=>Number(p.lifetime_attack??0)+Number(p.lifetime_hold??0)+Number(p.lifetime_decay??0)));
 const result=Math.max(duration+Math.max(0,...def.particles.map(life),...def.ribbons.map(life)),projection);lives.set(def,result);return result;
}

type Birth={time:number;ordinal:number};
const schedules=new WeakMap<SourceEmitter,WeakMap<SourceClip,Birth[]>>();
/** Integrate each original linear rate segment, and invert its integral exactly. */
export function emissionSchedule(p:SourceEmitter,clip:SourceClip):readonly Birth[]{
 let byClip=schedules.get(p);if(!byClip){byClip=new WeakMap();schedules.set(p,byClip);}const cached=byClip.get(clip);if(cached)return cached;
 const result:Birth[]=[],rate=p.emit_rate as MaterialRef,count=p.emit_count as MaterialRef,map=trackMap(clip),rateTrack=map.get(rate?.id),countTrack=map.get(count?.id),duration=clip.duration;
 const times=[...new Set([0,duration,...(rateTrack?.frames??[]).filter(t=>t>0&&t<duration)])].sort((a,b)=>a-b);let cumulative=0,next=1;
 for(let i=1;i<times.length;i++){
  const a=times[i-1],b=times[i],r0=Math.max(0,Number(rate?sourceSample(clip,a,rate):0)),r1=rate?.interpolation===0?r0:Math.max(0,Number(sourceSample(clip,b,rate))),slope=(r1-r0)/(b-a),total=(r0+r1)*.5*(b-a);
  while(next<=cumulative+total+1e-8){const amount=next-cumulative,dt=Math.abs(slope)<1e-9?amount/Math.max(1e-9,r0):2*amount/(r0+Math.sqrt(Math.max(0,r0*r0+2*slope*amount)));result.push({time:a+dt,ordinal:next-1});next++;}cumulative+=total;
 }
 let previous=0;const bursts=countTrack?.frames.length?countTrack.frames.map((time,i)=>({time,value:Number(countTrack.values[i])})):[{time:0,value:Number(count?.default??0)}];
 for(const b of bursts){if(b.time<0){previous=b.value;continue;}if(b.time>duration)break;const n=Math.max(0,Math.round(b.value));if(n>0&&(b.time===0||n!==previous))for(let i=0;i<n;i++)result.push({time:b.time,ordinal:next++});previous=n;}
 result.sort((a,b)=>a.time-b.time||a.ordinal-b.ordinal);byClip.set(clip,result);return result;
}
// This upper bound only removes births already dead under every authored
// numeric lifespan. Unknown values retain the original wider search window.
const particleLifeBounds=new WeakMap<SourceEffectDefinition,WeakMap<SourceEmitter,number>>();
export function particleLifetimeBound(def:SourceEffectDefinition,p:SourceEmitter){
 let emitters=particleLifeBounds.get(def);if(!emitters){emitters=new WeakMap();particleLifeBounds.set(def,emitters);}const hit=emitters.get(p);if(hit!==undefined)return hit;
 let bound=0,known=true;
 for(const key of ['lifespan','lifespan_random']){
  const value=p[key];if(value===undefined||value===null)continue;
  if(typeof value==='number'){if(!Number.isFinite(value))known=false;else bound=Math.max(bound,Math.abs(value));continue;}
  if(typeof value!=='object'||Array.isArray(value)||!('id'in value)||!('default'in value)){known=false;continue;}
  const ref=value as unknown as MaterialRef;if(ref.interpolation!==0&&ref.interpolation!==1){known=false;continue;}
  const values=[ref.default,...def.materialProfile.clips.flatMap(c=>c.tracks.filter(t=>t.id===ref.id).flatMap(t=>t.values))];
  for(const v of values){if(typeof v!=='number'||!Number.isFinite(v))known=false;else bound=Math.max(bound,Math.abs(v));}
 }
 // Keep rounding slack for linear interpolation and the randomized endpoint mix.
 // Extreme numbers or nonstandard clip durations fall back to the old algorithm.
 const result=known&&bound<Number.MAX_VALUE/4&&def.materialProfile.clips.every(c=>c.duration>=.001)?bound+Math.max(1e-9,bound*Number.EPSILON*32):Infinity;emitters.set(p,result);return result;
}
export function activeBirths(def:SourceEffectDefinition,p:SourceEmitter,age:number,loop:boolean,seed:number,preferred?:string,phases=sourcePhases(def,age,loop,seed,preferred),particleBound=Infinity):{born:number;ordinal:number;phase:SourcePhase}[]{
 const maxLife=Math.max(.01,Math.min(sourceLife(def),particleBound)),active:{born:number;ordinal:number;phase:SourcePhase}[]=[];
 for(const phase of phases){const previousCycles=loop&&phase.cycle>0?Math.min(phase.cycle,Math.ceil(maxLife/Math.max(.001,phase.clip.duration))):0;
  for(let cycle=phase.cycle-previousCycles;cycle<=phase.cycle;cycle++){const offset=phase.offset-(phase.cycle-cycle)*phase.clip.duration;
   for(const birth of emissionSchedule(p,phase.clip)){const born=offset+birth.time;if(born>age+1e-8||age-born>maxLife)continue;active.push({born,ordinal:birth.ordinal+cycle*104729,phase:{clip:phase.clip,seconds:birth.time,offset,cycle}});}
  }
 }
 return active;
}
/** Scalar lifetime envelopes retain each channel's own midpoint and smoothing. */
export function lifeCurve(a:number,b:number,c:number,t:number,mid=.5,smoothing=0,hold=0){
 t=Math.max(0,Math.min(1,t));mid=Math.max(.000001,Math.min(.999999,mid));const left=Math.max(0,mid-hold*.5),right=Math.min(1,mid+hold*.5);
 let f=t<left?t/Math.max(.000001,left):t<=right?1:(t-right)/Math.max(.000001,1-right);if(smoothing===1)f=f*f*(3-2*f);if(smoothing===2||smoothing===4)f=f*f*f*(f*(f*6-15)+10);
 return t<=right?a+(b-a)*f:b+(c-b)*f;
}
type PoseCache={entries:Map<string,Matrix4[]>;hits:number;misses:number;evictions:number};
const poseCache=new WeakMap<SourceEffectDefinition,PoseCache>();
const clipIds=new WeakMap<SourceClip,number>();let nextClipId=0;
/** Exact authored times and clip identity; the limit bounds reuse, never animation. */
export function sourcePoseCacheReport(def:SourceEffectDefinition){const c=poseCache.get(def);return {entries:c?.entries.size??0,hits:c?.hits??0,misses:c?.misses??0,evictions:c?.evictions??0,limit:512,matrixElements:(c?.entries.size??0)*def.bones.length*16};}
export function boneMatrices(def:SourceEffectDefinition,phase:SourcePhase):Matrix4[]{
 let state=poseCache.get(def);if(!state){state={entries:new Map(),hits:0,misses:0,evictions:0};poseCache.set(def,state);}const cache=state.entries;
 let clipId=clipIds.get(phase.clip);if(clipId===undefined){clipId=nextClipId++;clipIds.set(phase.clip,clipId);}const key=clipId+':'+phase.seconds,hit=cache.get(key);
 if(hit){state.hits++;cache.delete(key);cache.set(key,hit);return hit;}state.misses++;
 const matrices:Matrix4[]=[],pending=new Set<number>();
 const calculate=(i:number):Matrix4=>{if(matrices[i])return matrices[i];if(pending.has(i))throw Error('Cyclic original effect skeleton');pending.add(i);const b=def.bones[i],r=b.rest;
  const read=(key:'location'|'rotation'|'scale')=>{const ref=b[key],track=trackMap(phase.clip).get(ref.id);if(!track&&r){const v=key==='location'?r.position:key==='rotation'?r.rotation:r.scale;return {x:v[0],y:v[1],z:v[2],w:v[3]};}return sourceSample(phase.clip,phase.seconds,ref) as Record<string,number>;};
  const p=read('location'),q=read('rotation'),s=read('scale'),m=new Matrix4().compose(new Vector3(p.x,p.y,p.z),new Quaternion(q.x,q.y,q.z,q.w).normalize(),new Vector3(s.x,s.y,s.z));if(b.parent>=0)m.premultiply(calculate(b.parent));pending.delete(i);return matrices[i]=m;};
 def.bones.forEach((_,i)=>calculate(i));if(cache.size>=512){cache.delete(cache.keys().next().value!);state.evictions++;}cache.set(key,matrices);return matrices;
}
