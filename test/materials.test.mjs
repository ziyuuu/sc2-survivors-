import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertMaterialPixels,applyTeamColor,applyOpacity} from '../tools/m3-materials.mjs';
test('SC2 packed normals use alpha and inverted green, retain size and reconstruct unit length',()=>{
 const original={width:2,height:1,rgba:Buffer.from([0,128,0,128,255,32,0,230])},before=Buffer.from(original.rgba),out=convertMaterialPixels(original,{normal:true});
 assert.equal(out.width,2);assert.equal(out.height,1);assert.deepEqual([...out.rgba.subarray(0,4)],[128,127,255,255]);
 for(let i=0;i<8;i+=4){const n=[...out.rgba.subarray(i,i+3)].map(v=>v/127.5-1);assert.ok(Math.abs(Math.hypot(...n)-1)<.015);assert.equal(out.rgba[i+3],255);}
 assert.deepEqual(original.rgba,before);
});
test('alpha-only emissive layers use the mask rather than the unrelated RGB specular image',()=>{
 const image={width:1,height:1,rgba:Buffer.from([180,100,40,12])};
 assert.deepEqual([...convertMaterialPixels(image,{channel:2}).rgba],[12,12,12,255]);assert.deepEqual([...convertMaterialPixels(image,{channel:0}).rgba],[180,100,40,12]);
});

test('diffuse alpha is the SC2 team-color mask, not body transparency',()=>{
 const image={width:3,height:1,rgba:Buffer.from([255,255,255,0,120,60,30,255,120,60,30,128])},out=applyTeamColor(image,[20,80,200]);
 assert.deepEqual([...out.rgba.subarray(0,4)],[20,80,200,255]);assert.deepEqual([...out.rgba.subarray(4,8)],[120,60,30,255]);assert.ok(out.rgba[8]>20&&out.rgba[8]<120);assert.equal(image.rgba[3],0);
});
