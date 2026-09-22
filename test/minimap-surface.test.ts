import test from 'node:test';
import assert from 'node:assert/strict';
import {minimapFrame,mapProject,mapUnproject} from '../src/ui/hud/minimap';
import {originalGroundGeometry,splitTerrainLayers} from '../src/render/terrain/map-surface';
import type {MapDefinition} from '../src/data/map-definition';
const fixture=()=>({width:3,height:3,walkWidth:4,walkHeight:4,cellSize:.5,origin:[0,2],heights:[0,0,3,0,0,3,0,0,3],opening:[1,1,2,2,1,1,2,2,1,1,2,2,1,1,2,2]} as MapDefinition);
test('minimap projects north-up without stretching and round trips mouse world coordinates',()=>{
 const d=fixture(),a=minimapFrame(d,1),b=minimapFrame(d,2);assert.ok(b.size>=a.size);assert.ok(b.left+b.size>a.left+a.size);
 for(const p of [{x:0,z:0},{x:1.25,z:.5},{x:-2,z:10}]){const q=mapUnproject(a,mapProject(a,p));assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<1e-10);}
 assert.ok(mapProject(a,{x:0,z:-1}).z<mapProject(a,{x:0,z:1}).z);
});
test('original terrain keeps ramp-foot triangles when a neighbouring corner is a cliff',()=>{
 const g=originalGroundGeometry(fixture());assert.equal(g.index!.count,24);assert.equal(g.attributes.position.count,9);
 for(const n of g.attributes.normal.array)assert.ok(Number.isFinite(n));
 const ids=new Set(g.index!.array);assert.equal(ids.size,9);
});
test('terrain array preserves every pixel while separating eight layers and their mip boundaries',()=>{
 const width=4,height=8,pixels=Uint8Array.from({length:width*height*4},(_,i)=>i);const result=splitTerrainLayers(pixels,width,height);assert.equal(result.side,2);
 for(let layer=0;layer<8;layer++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){const a=((Math.floor(layer/2)*2+y)*width+layer%2*2+x)*4,b=(layer*4+y*2+x)*4;assert.deepEqual(result.pixels.slice(b,b+4),pixels.slice(a,a+4));}
 assert.throws(()=>splitTerrainLayers(pixels,4,4));
});
