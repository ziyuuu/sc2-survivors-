import fs from 'node:fs/promises';
import path from 'node:path';
const root='reports/local/equipment-fx-performance-20261016/prototypes';
const snapshot='reports/local/equipment-fx-performance-20261016/source-r6';
async function variant(name,changes){const map={};for(const [file,edit]of Object.entries(changes)){const source=await fs.readFile(path.join(snapshot,file),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;}),out=edit(source);if(out===source)throw Error('Unchanged prototype '+file);const target=path.join(root,name,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,out);map[file]=target;}await fs.writeFile(path.join(root,name,'overrides.json'),JSON.stringify(map,null,2));}
await variant('query',{'src/simulation/starship/modules.ts':s=>s.replace("export function equipmentValue(w:World,key:string,index=0){return activeEquipmentEffects(w).filter(e=>e.key===key).reduce((n,e)=>n+(e.values[index]??0),0);}",`// Selections are rebuilt on account revision/race changes. Preserve per-key addition order.
const effectTotals=new WeakMap<ActiveEquipmentEffect[],Map<string,number[]>>();
export function equipmentValue(w:World,key:string,index=0){const effects=activeEquipmentEffects(w);let totals=effectTotals.get(effects);if(!totals){totals=new Map();for(const e of effects){let values=totals.get(e.key);if(!values){values=[];totals.set(e.key,values);}for(let i=0;i<e.values.length;i++)values[i]=(values[i]??0)+(e.values[i]??0);}effectTotals.set(effects,totals);}return totals.get(key)?.[index]??0;}`)
.replace("export function equipmentEngagementTarget(w:World){return", "export function equipmentEngagementTarget(w:World){const allies=w.allies();return")
.replace("&&w.allies().some(a=>a.hp>0", "&&allies.some(a=>a.hp>0")});
await variant('palette',{
 'src/render/effects/source/materials.ts':s=>s.replace('surface.compile(shader,geometry,particles);',`surface.compile(shader,geometry,particles);
  if(particles)shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\nattribute float sourceMaterialSlot;').replace('umInstance=gl_InstanceID;','umInstance=int(sourceMaterialSlot);');`).replace("+':combat:'","+':palette-v1:combat:'"),
 'src/render/effects/source/displacement.ts':s=>s.replace('attribute vec4 sourceColor;','attribute float sourceMaterialSlot;attribute vec4 sourceColor;').replace("particles?'gl_InstanceID':'0'","particles?'int(sourceMaterialSlot)':'0'"),
 'src/render/effects/source/draw-batch.ts':s=>s.replace('private colors!', 'private slots!:THREE.InstancedBufferAttribute;private paletteCapacity=0;private colors!')
 .replace('private grow(size:number){','private grow(size:number,paletteSize=64){\n  this.paletteCapacity=Math.max(64,2**Math.ceil(Math.log2(paletteSize)));')
 .replace("this.surface='source'in this.material?new DisplacementSurface(this.material,this.capacity,true):sourceSurface(this.material,geometry,this.capacity,true);", "this.slots=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceMaterialSlot',this.slots);\n  this.surface='source'in this.material?new DisplacementSurface(this.material,this.paletteCapacity,true):sourceSurface(this.material,geometry,this.paletteCapacity,true);")
 .replace('if(this.quads.length>this.capacity)this.grow(this.quads.length);',`const phases:SourcePhase[]=[],indices:number[]=[],clips=new Map<string,Map<number,number>>();
  for(const q of this.quads){let times=clips.get(q.phase.clip.name);if(!times){times=new Map();clips.set(q.phase.clip.name,times);}let slot=times.get(q.phase.seconds);if(slot===undefined){slot=phases.length;phases.push(q.phase);times.set(q.phase.seconds,slot);}indices.push(slot);}
  if(this.quads.length>this.capacity||phases.length>this.paletteCapacity)this.grow(Math.max(this.capacity,this.quads.length),Math.max(this.paletteCapacity,phases.length));
  phases.forEach((phase,i)=>this.surface.write(i,{clip:phase.clip.name,seconds:phase.seconds}));`)
 .replace('this.surface.write(i,{clip:q.phase.clip.name,seconds:q.phase.seconds});','this.slots.setX(i,indices[i]);')
 .replace('this.surface.flush();','uploadActive(this.slots,this.quads.length);this.surface.flush();')
 .replace('growths:this.growths','growths:this.growths,paletteCapacity:this.paletteCapacity')
});
await variant('culling',{'src/render/effects/source/draw-batch.ts':s=>s.replace('this.mesh.frustumCulled=false','this.mesh.frustumCulled=true').replace('commitInstances(this.mesh,this.quads.length);','commitInstances(this.mesh,this.quads.length);if(this.quads.length)this.mesh.computeBoundingSphere();')});
await variant('particle-storage',{'src/render/effects/source/particles.ts':s=>s
 .replace('private frame=0;', 'private matrices:THREE.Matrix4[]=[];private matrixCursor=0;\n matrix(){const i=this.matrixCursor++;return i>=this.limit?new THREE.Matrix4():this.matrices[i]??(this.matrices[i]=new THREE.Matrix4());}\n private frame=0;')
 .replace('begin(time:number){','begin(time:number){this.matrixCursor=0;')
 .replace('reset(){this.requests.clear();','reset(){this.matrixCursor=0;this.matrices.length=0;this.requests.clear();')
 .replace("const births=activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip);", "const births=activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip);\n  const currentParent=worldSpace?undefined:nowPlacement.clone().multiply(nowBones[emitter.bone]??new THREE.Matrix4()),currentScale=currentParent?new THREE.Vector3().setFromMatrixScale(currentParent):undefined;")
 .replace('nowPlacement.clone().multiply(nowBones[p.bone]??new THREE.Matrix4());','currentParent!;')
 .replace('const parentScale=new THREE.Vector3().setFromMatrixScale(parent),','const parentScale=currentScale??new THREE.Vector3().setFromMatrixScale(parent),')
 .replace('const matrix=new THREE.Matrix4().compose(at,orient(', 'const matrix=(cache?.matrix()??new THREE.Matrix4()).compose(at,orient(')
});
await variant('multipass',{'src/render/scene/battle-renderer.ts':s=>s.replace('try{this.sceneShadows.prepare();this.preparePresentationSize();const ratio=this.renderer.getPixelRatio();this.contact.render(this.scene,this.camera,this.viewportWidth*ratio,this.viewportHeight*ratio);this.heroComposer.render();}finally{if(adapt)this.adaptiveTimer?.end();}', 'const matrixAuto=this.scene.matrixWorldAutoUpdate;this.scene.updateMatrixWorld();this.scene.matrixWorldAutoUpdate=false;\n  try{this.sceneShadows.prepare();this.preparePresentationSize();const ratio=this.renderer.getPixelRatio();this.contact.render(this.scene,this.camera,this.viewportWidth*ratio,this.viewportHeight*ratio);this.heroComposer.render();}finally{this.scene.matrixWorldAutoUpdate=matrixAuto;if(adapt)this.adaptiveTimer?.end();}')});
const rigidSource=await fs.readFile('tools/source-rigid-batch-prototype.ts','utf8');
await variant('rigid',{
 'src/render/effects/source/rigid-batch.ts':()=>rigidSource,
 'src/render/effects/source/materials.ts':s=>s.replace('capacity:number,particles=false){','capacity:number,particles=false,instances=false){').replace("if(particles)shader.vertexShader=shader.vertexShader.replace('void main() {'", "if(particles||instances)shader.vertexShader=shader.vertexShader.replace('void main() {'").replace('surface.compile(shader,geometry,particles);','surface.compile(shader,geometry,particles||instances);').replace("+':combat:'", "+':rigid:'+Number(instances)+':combat:'"),
 'src/render/effects/source/player.ts':s=>"import {RigidSourceBatch} from './rigid-batch';\n"+s
 .replace('private particleCache=', 'private rigid=new Map<string,RigidSourceBatch>();\n private particleCache=')
 .replace('if(resource.gltf){instance=this.makeMesh(resource);instance.root.visible=false;}', 'if(resource.gltf){const rigid=RigidSourceBatch.create(resource,this.scene);if(rigid)this.rigid.set(definition.id,rigid);else{instance=this.makeMesh(resource);instance.root.visible=false;}}')
 .replace('}catch(error){for(const batch of pending.values())', '}catch(error){this.rigid.get(definition.id)?.dispose();this.rigid.delete(definition.id);for(const batch of pending.values())')
 .replace('for(const pool of this.meshPools.values()){\n   const root=', 'for(const rigid of this.rigid.values())await rigid.prepare(compile);\n  for(const pool of this.meshPools.values()){\n   const root=')
 .replace('begin(time:number){this.particleCache.begin(time);', 'begin(time:number){for(const rigid of this.rigid.values())rigid.begin();this.particleCache.begin(time);')
 .replace('if(hasMesh)this.mesh(resource,request,phase);', 'if(hasMesh){const rigid=this.rigid.get(def.id);if(rigid){rigid.add(request,phase);this.counts.meshes++;}else this.mesh(resource,request,phase);}')
 .replace('this.particleCache.end();for(const b', 'for(const rigid of this.rigid.values())rigid.end();this.particleCache.end();for(const b')
 .replace('report(){return {particleCache:', 'report(){return {rigid:[...this.rigid.values()].map(r=>r.report()),particleCache:')
});
await variant('material-static',{'src/render/materials/unit-material-batch.ts':s=>s
 .replace('private samples=new Map', 'private staticClips=new Set<string>();private staticSamples=new Map<string,readonly number[][]>();\n private samples=new Map')
 .replace("this.immortal=prepared.profile.source.toLowerCase().includes('immortal');", `this.immortal=prepared.profile.source.toLowerCase().includes('immortal');
  const refs=new Set<number>();const collect=(v:unknown)=>{if(!v||typeof v!=='object')return;if('id'in v&&'default'in v)refs.add(Number(v.id));for(const child of Object.values(v))collect(child);};collect(source.layers);if(this.composite)refs.add(this.composite.id);
  if(!this.immortal)for(const clip of prepared.profile.clips)if(!clip.tracks.some(t=>refs.has(t.id)))this.staticClips.add(clip.name);`)
 .replace('const key=JSON.stringify([pose.clip,pose.seconds,pose.attackClip,pose.attackSeconds,', `const staticPose=this.staticClips.has(pose.clip)&&(!pose.attackClip||this.staticClips.has(pose.attackClip));
  const key=JSON.stringify([pose.clip,staticPose?0:pose.seconds,pose.attackClip,staticPose?0:pose.attackSeconds,`)
 .replace('this.samples.get(key);', '(staticPose?this.staticSamples:this.samples).get(key);')
 .replace('if(this.samples.size<2048)this.samples.set(key,rows);', 'const cache=staticPose?this.staticSamples:this.samples;if(cache.size<(staticPose?64:2048))cache.set(key,rows);')
});
await variant('zero-variation',{'src/render/effects/source/particles.ts':s=>s.replace("const shape=number(p,key+'_var_shape',phase),amplitude=number(p,key+'_var_amplitude',phase),f=", "const amplitude=number(p,key+'_var_amplitude',phase);if(amplitude===0)return 0;const shape=number(p,key+'_var_shape',phase),f=")});
console.log('Prepared eight isolated performance prototypes from source-r6');
