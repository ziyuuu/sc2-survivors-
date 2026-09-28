import test from 'node:test';
import assert from 'node:assert/strict';
import {minimapFrame,mapProject,mapUnproject,paintMinimapTerrain} from '../src/ui/hud/minimap';
import {originalGroundGeometry,splitTerrainLayers} from '../src/render/terrain/map-surface';
import type {MapDefinition} from '../src/data/map-definition';
const fixture=()=>({width:3,height:3,walkWidth:4,walkHeight:4,cellSize:.5,origin:[0,2],heights:[0,0,3,0,0,3,0,0,3],opening:[1,1,2,2,1,1,2,2,1,1,2,2,1,1,2,2]} as MapDefinition);
test('minimap projects north-up without stretching and round trips mouse world coordinates',()=>{
 const d=fixture(),a=minimapFrame(d,1),b=minimapFrame(d,2);assert.ok(b.size>=a.size);assert.ok(b.left+b.size>a.left+a.size);
 for(const p of [{x:0,z:0},{x:1.25,z:.5},{x:-2,z:10}]){const q=mapUnproject(a,mapProject(a,p));assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<1e-10);}
 assert.ok(mapProject(a,{x:0,z:-1}).z<mapProject(a,{x:0,z:1}).z);
});

test('optimized minimap raster preserves every old pixel including edges, reveal and clamping',()=>{
 const d=fixture();d.walk=[1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1];d.reveal=[1,1,2,2,1,1,2,2,1,1,2,2,1,1,2,2];
 for(const stage of [1,2])for(const side of [128,168]){
  const f=minimapFrame(d,stage),terrain={height:(p:{x:number;z:number})=>p.x*50-p.z*30},expected=new Uint8ClampedArray(side*side*4),actual=new Uint8ClampedArray(expected.length);
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
   const p=mapUnproject(f,{x:(x+.5)/side,z:(y+.5)/side}),gx=Math.floor((p.x+d.origin[0])/d.cellSize),gy=Math.floor((d.origin[1]-p.z)/d.cellSize),i=gy*d.walkWidth+gx;let rgb=[6,14,20];
   if(gx>=0&&gy>=0&&gx<d.walkWidth&&gy<d.walkHeight){const opened=d.reveal[i]>0&&d.reveal[i]<=stage,h=terrain.height(p),walk=d.walk[i]&&d.opening[i]>0;
    rgb=opened?(walk?[51+h*8,65+h*8,65+h*7]:[26+h*4,32+h*4,35+h*4]):[12,22,29];
    if(opened&&walk&&[i-1,i+1,i-d.walkWidth,i+d.walkWidth].some(j=>!d.opening[j]||d.opening[j]>stage))rgb=[67,133,150];
   }expected.set([...rgb.map(v=>Math.max(0,Math.min(255,v))),255],(y*side+x)*4);
  }
  paintMinimapTerrain(d,terrain,f,stage,side,actual);assert.deepEqual(actual,expected,`stage ${stage} side ${side}`);
 }
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
