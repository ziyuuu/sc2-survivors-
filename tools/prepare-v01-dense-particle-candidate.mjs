import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const base='reports/local/v01-20261024',dir=base+'/dense-particle-candidate',sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(dir,{recursive:false});
const files=['src/render/effects/source/particles.ts','src/render/effects/source/timeline.ts'],original=new Map(),changes=new Map();for(const file of files)original.set(file,await fs.readFile(file,'utf8'));
let code=original.get(files[0]);
function replace(a,b){assert.equal(code.split(a).length,2,a);code=code.replace(a,b);}
replace('sourceRandom,sourcePhase,sourceSample','sourceRandom,sourcePhase,sourcePhases,sourceSample');
replace('type BirthEntry={seen:number;value:ParticleBirth};',"type BirthEntry={seen:number;index:number;clip:string;seconds:number;value:ParticleBirth};");
replace('births:Map<string,BirthEntry>','births:Map<number,BirthEntry[]>');
replace('private count=0;hits=0;misses=0;',"private count=0;private last:{definition:SourceEffectDefinition;key:string;seed:number;state:CachedRequest}|undefined;hits=0;misses=0;");
replace('this.time=time;this.frame++;','this.time=time;this.frame++;this.last=undefined;');
replace('let state=this.requests.get(request.key);',"let state=this.last?.definition===def&&this.last.key===request.key&&this.last.seed===request.seed?this.last.state:this.requests.get(request.key);");
replace('this.count-=state.births.size;this.requests.delete(request.key);state=undefined;',"for(const entries of state.births.values())this.count-=entries.length;this.requests.delete(request.key);state=undefined;");
replace('state.seen=this.frame;\n  const key=index', 'state.seen=this.frame;this.last={definition:def,key:request.key,seed:request.seed,state};\n  const key=index');
replace("const key=index+':'+birth.phase.clip.name+':'+birth.phase.seconds+':'+birth.ordinal,entry=state.births.get(key);if(entry){entry.seen=this.frame;this.hits++;return entry.value;}\n  this.misses++;const value=create();if(this.count<this.limit){state.births.set(key,{seen:this.frame,value});this.count++;}return value;",`// Ordinals are numeric and stable for a clip/cycle. Keep the other exact key
  // fields in a short collision bucket, avoiding one formatted string per particle.
  const key=birth.ordinal,entries=state.births.get(key),clip=birth.phase.clip.name,seconds=birth.phase.seconds;
  if(entries)for(const entry of entries)if(entry.index===index&&entry.clip===clip&&entry.seconds===seconds){entry.seen=this.frame;this.hits++;return entry.value;}
  this.misses++;const value=create();if(this.count<this.limit){const entry={seen:this.frame,index,clip,seconds,value};if(entries)entries.push(entry);else state.births.set(key,[entry]);this.count++;}return value;`);
replace("end(){for(const [key,state] of this.requests){if(state.seen!==this.frame){this.count-=state.births.size;this.requests.delete(key);}else for(const [id,entry] of state.births)if(entry.seen!==this.frame){state.births.delete(id);this.count--;}}}",`end(){this.last=undefined;for(const [key,state] of this.requests){if(state.seen!==this.frame){for(const entries of state.births.values())this.count-=entries.length;this.requests.delete(key);}else for(const [id,entries] of state.births){let kept=0;for(const entry of entries)if(entry.seen===this.frame)entries[kept++]=entry;else this.count--;entries.length=kept;if(!kept)state.births.delete(id);}}}`);
replace('reset(){this.requests.clear();', 'reset(){this.last=undefined;this.requests.clear();');
replace('/** Replay all authored emitters analytically from native time, including after a render gap. */',`type BirthLife={normal:number;random:number;randomized:boolean};
const livesByEmitter=new WeakMap<SourceEmitter,WeakMap<SourcePhase['clip'],Map<number,BirthLife>>>();
function birthLife(emitter:SourceEmitter,phase:SourcePhase){
 let clips=livesByEmitter.get(emitter);if(!clips){clips=new WeakMap();livesByEmitter.set(emitter,clips);}let times=clips.get(phase.clip);if(!times){times=new Map();clips.set(phase.clip,times);}const hit=times.get(phase.seconds);if(hit)return hit;
 const normal=number(emitter,'lifespan',phase),value={normal,random:number(emitter,'lifespan_random',phase,normal),randomized:!!number(emitter,'lifespan_randomize',phase)};
 if(times.size>=512)times.clear();times.set(phase.seconds,value);return value;
}
/** Replay all authored emitters analytically from native time, including after a render gap. */`);
replace('const phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip),nowPlacement=', 'const phases=sourcePhases(def,request.age,request.loop,request.seed,request.clip),phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip,phases),nowPlacement=');
replace('let emitted=0,parentLocal:THREE.Matrix4|undefined,localScale:number|undefined;',"let emitted=0,parentLocal:THREE.Matrix4|undefined,localScale:number|undefined,lastParent:THREE.Matrix4|undefined,lastBorn:number|undefined,lastClip:SourcePhase['clip']|undefined,lastSeconds:number|undefined,scaleParent:THREE.Matrix4|undefined;");
replace('activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip)', 'activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip,phases)');
replace("const lifeA=number(emitter,'lifespan',phase),life=(additional&2)||number(emitter,'lifespan_randomize',phase)?randRange(lifeA,number(emitter,'lifespan_random',phase,lifeA),random(18)):lifeA;", "const lifespan=birthLife(emitter,phase),life=(additional&2)||lifespan.randomized?randRange(lifespan.normal,lifespan.random,random(18)):lifespan.normal;");
replace('const parent=worldSpace?sourcePlacement(def,request.placement,birth.born).multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4()):parentLocal??(parentLocal=nowPlacement.clone().multiply((nowBones??=boneMatrices(def,phaseNow))[p.bone]??new THREE.Matrix4()));',`let parent:THREE.Matrix4;
   if(worldSpace){if(lastParent&&lastBorn===birth.born&&lastClip===phase.clip&&lastSeconds===phase.seconds)parent=lastParent;
    else{parent=sourcePlacement(def,request.placement,birth.born).multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4());lastParent=parent;lastBorn=birth.born;lastClip=phase.clip;lastSeconds=phase.seconds;}}
   else parent=parentLocal??(parentLocal=nowPlacement.clone().multiply((nowBones??=boneMatrices(def,phaseNow))[p.bone]??new THREE.Matrix4()));`);
replace('if(worldSpace||nativeScale===undefined)', 'if(parent!==scaleParent||nativeScale===undefined)');
replace('if(!worldSpace)localScale=nativeScale;', 'localScale=nativeScale;scaleParent=parent;');
changes.set(files[0],code);
code=original.get(files[1]);
replace('preferred?:string):SourcePhase {', 'preferred?:string,phases=sourcePhases(def,age,loop,seed,preferred)):SourcePhase {');
replace('const phases=sourcePhases(def,age,loop,seed,preferred),phase=', 'const phase=');
replace('preferred?:string):{born:number;ordinal:number;phase:SourcePhase}[]{', 'preferred?:string,phases=sourcePhases(def,age,loop,seed,preferred)):{born:number;ordinal:number;phase:SourcePhase}[]{');
replace('maxLife=Math.max(.01,sourceLife(def)),phases=sourcePhases(def,age,loop,seed,preferred),active:', 'maxLife=Math.max(.01,sourceLife(def)),active:');
changes.set(files[1],code);
const manifest=[];for(const [file,contents]of changes){const name=path.basename(file);await fs.writeFile(dir+'/'+name,contents,{flag:'wx'});manifest.push({file,candidate:dir+'/'+name,beforeSha256:sha(original.get(file)),afterSha256:sha(contents)});}
await fs.writeFile(dir+'/manifest.json',JSON.stringify({scope:'Exact particle computation reuse, numeric birth keys with full collision fields, shared immutable phases and sampled lifespans; no emission/age/quality/gameplay change. Isolated candidate only.',files:manifest},null,2),{flag:'wx'});
for(const variant of ['baseline','candidate'])await build({stdin:{contents:"export {sourceParticleQuads,SourceParticleCache} from './src/render/effects/source/particles';export {SOURCE_EFFECTS} from './src/render/effects/source/player';",resolveDir:process.cwd(),loader:'ts'},outfile:dir+'/'+variant+'.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:variant==='candidate'?[{name:'exact-dense-particle-candidate',setup(b){b.onLoad({filter:/source[\\/](particles|timeline)\.ts$/},args=>({contents:changes.get(path.relative(process.cwd(),args.path).replaceAll('\\','/')),loader:'ts',resolveDir:path.dirname(args.path)}));}}]:[]});
console.log(JSON.stringify(manifest));
