import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleTrack,coverAlpha,type SourceProfile} from '../preview/visual-restoration-20261006/source-materials';
const profile=JSON.parse(fs.readFileSync('preview/visual-restoration-20261006/source-semantics.json','utf8')) as SourceProfile;
test('original Immortal composite is dormant and contains an animated material part',()=>{
 const c=profile.composites.find(c=>c.name==='Mat_Immortal_Shield')!;
 assert.equal(c.parts.length,1);assert.equal(c.parts[0].material.type,1);assert.equal(c.parts[0].material.index,5);assert.equal(c.parts[0].alpha.default,0);assert.equal(c.parts[0].alpha.id,1095849030);
 assert.equal(coverAlpha(profile,'inactive',100),0);
});
test('source Cover fades in and out at the recorded 166ms boundary',()=>{
 assert.equal(coverAlpha(profile,'start',0),0);assert.equal(coverAlpha(profile,'start',.083),.5);assert.equal(coverAlpha(profile,'start',.166),1);assert.equal(coverAlpha(profile,'hold',10),1);
 assert.equal(coverAlpha(profile,'end',0),1);assert.equal(coverAlpha(profile,'end',.083),.5);assert.equal(coverAlpha(profile,'end',.166),0);assert.equal(coverAlpha(profile,'end',10),0);
});
test('missing diffuse and original emissive-only source are distinguished from the body',()=>{
 assert.ok(profile.materials[0].layers.diffuse.filename.endsWith('Immortal_Diffuse.dds'));
 for(const i of [1,4,5])assert.equal(profile.materials[i].layers.diffuse.filename,'');
 assert.equal(profile.materials[1].layers.emissive.multiply.default,0);assert.equal(profile.materials[4].layers.emissive.multiply.default,0);
 const grid=profile.materials[5].layers.emissive;assert.deepEqual(grid.uvTiling.default,{x:8,y:15});assert.equal(grid.fresnel.type,1);
});
test('source material UV animation is sampled as a vector without consuming a World clock',()=>{
 const c=profile.clips.find(c=>c.name==='Stand')!,id=profile.materials[5].layers.emissive.uvOffset.id,t=c.tracks.find(t=>t.id===id)!;
 const a=sampleTrack(t,0,null) as {x:number;y:number},b=sampleTrack(t,2,null) as {x:number;y:number},middle=sampleTrack(t,1,null) as {x:number;y:number};
 assert.equal(middle.x,(a.x+b.x)/2);assert.equal(middle.y,(a.y+b.y)/2);assert.deepEqual(sampleTrack(t,100,null),b);
});
