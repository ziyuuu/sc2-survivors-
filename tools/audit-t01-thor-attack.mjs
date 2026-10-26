import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {AnimationClip,VectorKeyframeTrack,QuaternionKeyframeTrack} from 'three';
import {mapAnimations,sourceAnimationName} from '../src/render/loaders/animations.ts';
const base='reports/local/t01-20261024',build=JSON.parse(await fs.readFile(base+'/build.json','utf8'));
const assets=JSON.parse(await fs.readFile(build.out+'/asset-manifest.json','utf8')).assets,rows=[];
for(const key of ['thor','elite.thor.1']){
 const a=assets['model.'+key],r=build.resources.find(r=>r.url===a.url),b=await fs.readFile(r.source);
 assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);
 const d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),binary=28+b.readUInt32LE(12);
 function accessor(id){const a=d.accessors[id],v=d.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);assert.ok(!v.byteStride&&!a.sparse);return Float32Array.from(new Float32Array(b.buffer,b.byteOffset+binary+(v.byteOffset??0)+(a.byteOffset??0),a.count*size));}
 const clips=d.animations.filter(a=>['Stand','Stand Ready','Attack','Spell D','Walk','Morph Stand'].includes(a.name)).map(a=>new AnimationClip(a.name,-1,a.channels.map(c=>{
  const s=a.samplers[c.sampler];assert.ok(!s.interpolation||s.interpolation==='LINEAR');
  const Type=c.target.path==='rotation'?QuaternionKeyframeTrack:VectorKeyframeTrack,prop={rotation:'quaternion',translation:'position',scale:'scale'}[c.target.path];
  assert.ok(prop);return new Type(d.nodes[c.target.node].name.replace(/\s/g,'_')+'.'+prop,accessor(s.input),accessor(s.output));
 })));
 const before=JSON.stringify(clips.map(c=>c.toJSON())),actions=mapAnimations(clips,key);
 const cannons=actions.highImpactIdle.tracks.filter(t=>/^Cannon/.test(t.name));assert.ok(cannons.length>40);
 for(const track of cannons){const size=track.getValueSize();assert.ok(track.values.every((v,i)=>v===track.values[i%size]),'Cannon deployed source track must be constant: '+track.name);}
 const bindings=new Set(cannons.map(t=>t.name)),compositions=[];
 for(const [action,name] of [['highImpactMove','Walk'],['highImpactReady','Stand Ready'],['highImpactGroundAttack','Attack'],['highImpactAttack','Spell D']]){
  const composed=actions[action],source=clips.find(c=>c.name===name);assert.ok(composed&&source);
  const body=source.tracks.filter(t=>!bindings.has(t.name));
  for(const t of [...body,...cannons])assert.equal(composed.tracks.find(n=>n.name===t.name),t);
  assert.equal(composed.tracks.length,body.length+cannons.length);assert.equal(new Set(composed.tracks.map(t=>t.name)).size,composed.tracks.length);
  assert.equal(composed.duration,source.duration);assert.equal(sourceAnimationName(composed),name);
  assert.ok(!clips.some(c=>c.name===composed.name),'Sampled-pose atlas key must be distinct from original source');
  compositions.push({action,name:composed.name,sourceName:name,duration:composed.duration,bodyTracks:body.length,cannonTracks:cannons.length,sourceTrackIdentity:true,sourceMaterialTimeline:true});
 }
 assert.equal(new Set(compositions.map(c=>c.name)).size,compositions.length);assert.equal(before,JSON.stringify(clips.map(c=>c.toJSON())));
 rows.push({key,source:r.source,sha256:r.sha256,allCannonTracksConstant:true,sourceClipsUnchanged:true,compositions});
}
const output={scope:'Actual source skeletal-track equality, unique atlas keys and original material names. Browser rendered cycles are separate.',rows};
await fs.mkdir(base+'/thor-attack-fix-r1',{recursive:true});await fs.writeFile(base+'/thor-attack-fix-r1/source-track-audit.json',JSON.stringify(output,null,2),{flag:'wx'});console.log(JSON.stringify(output));
