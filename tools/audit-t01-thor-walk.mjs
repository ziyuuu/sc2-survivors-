import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {AnimationClip,VectorKeyframeTrack,QuaternionKeyframeTrack} from 'three';
import {mapAnimations} from '../src/render/loaders/animations.ts';
const base='reports/local/t01-20261024',build=JSON.parse(await fs.readFile(base+'/build.json','utf8'));
const assets=JSON.parse(await fs.readFile(build.out+'/asset-manifest.json','utf8')).assets,rows=[];
for(const key of ['thor','elite.thor.1']){
 const a=assets['model.'+key],r=build.resources.find(r=>r.url===a.url),b=await fs.readFile(r.source);
 assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);
 const d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),binary=28+b.readUInt32LE(12);
 function accessor(id){const a=d.accessors[id],v=d.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);assert.ok(!v.byteStride&&!a.sparse);return Float32Array.from(new Float32Array(b.buffer,b.byteOffset+binary+(v.byteOffset??0)+(a.byteOffset??0),a.count*size));}
 const clips=d.animations.filter(a=>['Stand','Walk','Morph Stand'].includes(a.name)).map(a=>new AnimationClip(a.name,-1,a.channels.map(c=>{
  const s=a.samplers[c.sampler];assert.ok(!s.interpolation||s.interpolation==='LINEAR');
  const Type=c.target.path==='rotation'?QuaternionKeyframeTrack:VectorKeyframeTrack,prop={rotation:'quaternion',translation:'position',scale:'scale'}[c.target.path];
  assert.ok(prop);return new Type(d.nodes[c.target.node].name.replace(/\s/g,'_')+'.'+prop,accessor(s.input),accessor(s.output));
 })));
 const before=JSON.stringify(clips.map(c=>c.toJSON())),actions=mapAnimations(clips,key),move=actions.highImpactMove;
 assert.ok(move);const cannons=actions.highImpactIdle.tracks.filter(t=>/^Cannon/.test(t.name));assert.ok(cannons.length>40);
 for(const track of cannons){const size=track.getValueSize();assert.ok(track.values.every((v,i)=>v===track.values[i%size]),'Cannon deployed source track must be constant: '+track.name);assert.equal(move.tracks.find(t=>t.name===track.name),track);}
 const bindings=new Set(cannons.map(t=>t.name));
 const body=actions.move.tracks.filter(t=>!bindings.has(t.name));for(const t of body)assert.equal(move.tracks.find(n=>n.name===t.name),t);
 const legs=body.filter(t=>/Bone_Leg/.test(t.name));assert.ok(legs.some(t=>t.values.some((v,i)=>v!==t.values[i%t.getValueSize()])),'Source walk needs articulated legs');
 assert.equal(new Set(move.tracks.map(t=>t.name)).size,move.tracks.length);assert.equal(before,JSON.stringify(clips.map(c=>c.toJSON())));
 rows.push({key,source:r.source,sha256:r.sha256,bodyTracks:body.length,legTracks:legs.length,cannonTracks:cannons.length,allCannonTracksConstant:true,sourceClipsUnchanged:true,walkDuration:actions.move.duration,composedDuration:move.duration});
}
const output={scope:'Actual source skeletal-track equality. Browser rendered-cycle and material checks are separate.',rows};
await fs.writeFile(base+'/thor-move-fix-r1/source-track-audit.json',JSON.stringify(output,null,2),{flag:'wx'});console.log(JSON.stringify(output));
