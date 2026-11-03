import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {SpecialTerrain} from '../src/simulation/special-stages/terrain';
import {beginSpecialStage,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {createFlatMap} from '../src/render/terrain/flat-map';
import {ManagedTextureLoader,trackTexture,applyPendingTextureTier,textureReport} from '../src/render/loaders/managed-textures';
import {configurePlatformAssetUrl} from '../src/assets/manifest';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {loadHttpAssets,httpStore} from '../src/assets/http-store';
import {saveGraphics} from '../src/platform/graphics-profile';
import {gltfImageIdentities} from '../src/render/loaders/gltf-image-identities';

const global=globalThis as any;
const sha=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
const flush=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
function browser(t:any){
 const originals=new Map<string,PropertyDescriptor|undefined>();
 const set=(key:string,value:unknown)=>{if(!originals.has(key))originals.set(key,Object.getOwnPropertyDescriptor(global,key));Object.defineProperty(global,key,{configurable:true,writable:true,value});};
 t.after(()=>{configurePlatformAssetUrl(null);for(const [key,descriptor]of originals)if(descriptor)Object.defineProperty(global,key,descriptor);else delete global[key];});
 return set;
}
function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion']});w.start();w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}

test('failed special-map creation is retried by the existing preparation gate and stale errors clear',async t=>{
 const set=browser(t);set('__SC2_PACKED_GRAPHICS__',false);
 configurePlatformAssetUrl(id=>'https://runtime-audit.invalid/'+id);
 let healthy=false,loads=0;
 t.mock.method(ManagedTextureLoader.prototype,'loadAsync',async()=>{
  loads++;if(!healthy)throw Error('injected one-time image decoding failure');
  return new THREE.Texture({width:4,height:4});
 });
 const world=fixture(),normalTerrain=world.terrain;
 const oldMap={setVisible:()=>{},update:()=>{}},view:any=Object.assign(Object.create(BattleRenderer.prototype),{
  world,mapViews:new Map([[normalTerrain,oldMap]]),mapTerrain:normalTerrain,mapView:oldMap,
  mapSwitching:false,assetsPending:0,modelErrors:[],scene:new THREE.Scene(),cameraTarget:new THREE.Vector3(),filterTextures:()=>{},
  initialAssetsLoaded:true,contextEpoch:0,gpu:new Map(),preparedCommon:new Set(),fortTemplates:new Map(),fortDeathTemplates:new Map(),variantQueue:Promise.resolve(),
  prepareEquipmentFortAssets:async()=>{},prepareRescueAssets:async()=>{},prepareMissionAssets:async()=>{},currentModels:()=>new Map(),retainRequiredUnits:()=>{},prepareCommonAssets:async()=>{},
  compilePresentation:async()=>{},warmPresentationBatches:async()=>0
 });
 assert.equal(beginSpecialStage(world,'resources','fixture'),true);assert.ok(world.terrain instanceof SpecialTerrain);
 const challengeTerrain=world.terrain;view.syncMap();await flush();
 assert.equal(loads,1);assert.equal(view.mapSwitching,false);assert.equal(view.assetsPending,0);
 assert.equal(view.mapViews.has(challengeTerrain),false);assert.equal(view.modelErrors.length,1);assert.equal(world.paused,true);
 healthy=true;
 for(let i=0;i<3;i++){view.syncMap();await flush();}
 assert.equal(loads,1,'No uncontrolled retry loop while the same terrain remains failed');
 const gate=new AssetReadinessCoordinator(world,view);assert.equal(await gate.prepare('reinforcement'),true);
 assert.ok(loads>1);assert.equal(view.mapTerrain,challengeTerrain);assert.equal(view.mapViews.has(challengeTerrain),true);assert.deepEqual(view.modelErrors,[]);
 assert.equal(finishSpecialStage(world,'quit'),true);await view.syncMap();assert.equal(world.terrain,normalTerrain);assert.equal(await gate.retry(),true);assert.deepEqual(view.modelErrors,[]);

});

test('CONTROL: normal reset and special returns reuse bounded terrain identities',()=>{
 const world=fixture(),endless=world.endlessField;
 const seen=new Map<string,Set<object>>();
 for(let run=0;run<3;run++){
  if(run){world.resetRun();world.start();}
  assert.equal(world.endlessField,endless);
  for(const [index,kind]of ['resources','arena','dodge'].entries()){
   world.stage=4+index*3;world.prepareStage();world.pods=[];world.missions.enabled=false;world.encounters.enabled=false;
   assert.equal(beginSpecialStage(world,kind as any,'fixture'),true);const entries=seen.get(kind)??new Set();entries.add(world.terrain!);seen.set(kind,entries);
   assert.equal(finishSpecialStage(world,'quit'),true);
  }
 }
 assert.deepEqual([...seen].map(([kind,set])=>[kind,set.size]),[['resources',1],['arena',1],['dodge',1]]);
 console.log(JSON.stringify({case:'terrain-retention-control',runs:3,endlessIdentities:1,specialIdentities:Object.fromEntries([...seen].map(([kind,set])=>[kind,set.size]))}));
});

test('actual death texture tier changes replace compressed upload state, clones and rollback coherently',async t=>{
 const set=browser(t);set('__SC2_PACKED_GRAPHICS__',true);set('matchMedia',()=>({matches:false}));
 const pub='sites/size-optimized-site/public/',release=JSON.parse(await fs.readFile(pub+'web-release.json','utf8'));
 const manifest=JSON.parse(await fs.readFile(pub+release.manifest,'utf8'));
 const id='model.science_vessel.death',row=manifest.assets[id],image=0;
 assert.ok(manifest.gpuTextures[row.imageSources[image].hash]);
 assert.equal(gltfImageIdentities(manifest,row.sha256)?.[image]?.split(':')[1],row.imageSources[image].hash);
 assert.notEqual(row.imageSources[image].hash,row.variants.medium.imageSources[image].hash);
 const index=JSON.parse((await fs.readFile(pub+'sites-pack-index.js','utf8')).trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
 const payload=async(record:any)=>{
  const [file,offset,length,,compressed]=index[record.url],pack=await fs.readFile(pub+'assets/'+file),part=pack.subarray(offset,offset+length),bytes=compressed?gunzipSync(part):part;
  assert.equal(sha(bytes),record.sha256);assert.equal(bytes.length,record.bytes);return bytes;
 };
 const high=await payload(row),medium=await payload(row.variants.medium);
 const glb=(bytes:Uint8Array)=>{const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=v.getUint32(12,true);return {json:JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n))),binStart:28+n};};
 const highData=glb(high),mediumData=glb(medium);
 const highBuffer=highData.json.bufferViews[highData.json.images[image].bufferView];
 const highImage=high.subarray(highData.binStart+(highBuffer.byteOffset??0),highData.binStart+(highBuffer.byteOffset??0)+highBuffer.byteLength);
 // Both sources are extended WebP. Verify real canvas dimensions from VP8X.
 const dimensions=(data:Buffer)=>{assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,16).toString(),'WEBPVP8X');return {width:data.readUIntLE(24,3)+1,height:data.readUIntLE(27,3)+1};};
 const {width:highWidth,height:highHeight}=dimensions(highImage);
 const mediumBuffer=mediumData.json.bufferViews[mediumData.json.images[image].bufferView];
 const mediumImage=medium.subarray(mediumData.binStart+(mediumBuffer.byteOffset??0),mediumData.binStart+(mediumBuffer.byteOffset??0)+mediumBuffer.byteLength);
 const {width:mediumWidth,height:mediumHeight}=dimensions(mediumImage);
 assert.equal(sha(highImage),row.imageSources[image].hash);assert.equal(sha(mediumImage),row.variants.medium.imageSources[image].hash);
 saveGraphics({texture:'high'});
 const root={innerHTML:'',querySelector:()=>null};set('location',new URL('https://runtime-audit.invalid/'));
 set('document',{baseURI:'https://runtime-audit.invalid/',dispatchEvent:()=>true,querySelector:(s:string)=>s.includes('sc2-asset-manifest')?{content:'asset-manifest.json'}:null,getElementById:()=>root});
 const mediumURL=URL.createObjectURL(new Blob([medium])),highURL=URL.createObjectURL(new Blob([high]));t.after(()=>{URL.revokeObjectURL(mediumURL);URL.revokeObjectURL(highURL);});
 const originalFetch=global.fetch;
 set('fetch',async(input:any,init?:any)=>{
  const url=String(input?.url??input);
  if(url.endsWith('/asset-manifest.json'))return new Response(JSON.stringify({version:1,release:'runtime-audit',assets:{[id]:row}}));
  if(url.endsWith('/runtime-config.json'))return new Response('{}');
  return originalFetch(input,init);
 });
 await loadHttpAssets();const store=httpStore()!;assert.equal(store.activeTier,'high');
 // The verified medium GLB is supplied directly to skip network/cache testing.
 t.mock.method(store,'urlForTier',async(_id:string,tier:string)=>tier==='high'?highURL:mediumURL);
 let bitmapBytes=0,failAt=0,reads=0;
 set('createImageBitmap',async(blob:Blob)=>{if(++reads===failAt)throw Error('injected second image failure');bitmapBytes=blob.size;const hash=sha(new Uint8Array(await blob.arrayBuffer()));assert.ok([row.imageSources[image].hash,row.variants.medium.imageSources[image].hash].includes(hash));return {...(hash===row.imageSources[image].hash?{width:highWidth,height:highHeight}:{width:mediumWidth,height:mediumHeight}),close(){}};});
 const oldMip=new Uint8Array([1,2,3,4]),compressed=new THREE.CompressedTexture([{data:oldMip,width:highWidth,height:highHeight}],highWidth,highHeight,THREE.RGBA_BPTC_Format);
 const ordinary=new THREE.Texture({width:highWidth,height:highHeight});
 trackTexture(compressed,id,image);trackTexture(ordinary,id,image);saveGraphics({texture:'medium'});await applyPendingTextureTier();
 assert.equal(bitmapBytes,mediumImage.length);assert.equal(store.activeTier,'medium');assert.equal(compressed.image.width,mediumWidth);
 assert.equal((compressed as any).isCompressedTexture,undefined);assert.equal(compressed.format,THREE.RGBAFormat);assert.equal(compressed.mipmaps.length,0);assert.equal(compressed.generateMipmaps,true);
 assert.equal(ordinary.image.width,mediumWidth);assert.equal(ordinary.image.height,mediumHeight);assert.equal(ordinary.format,THREE.RGBAFormat);assert.equal(ordinary.mipmaps.length,0);
 const clone=compressed.clone();assert.equal((clone as any).isCompressedTexture,undefined);assert.equal(clone.image.width,mediumWidth);assert.equal(clone.mipmaps.length,0);
 saveGraphics({texture:'high'});await applyPendingTextureTier();assert.equal(compressed.image.width,highWidth);assert.equal(ordinary.image.width,highWidth);
 saveGraphics({texture:'medium'});reads=0;failAt=2;await assert.rejects(applyPendingTextureTier(),/second image failure/);
 assert.equal(store.activeTier,'high');assert.equal(compressed.image.width,highWidth);assert.equal(ordinary.image.width,highWidth);assert.equal(compressed.mipmaps.length,0);assert.ok(textureReport().rollbacks>0);
 failAt=0;await applyPendingTextureTier();assert.equal(store.activeTier,'medium');assert.equal(compressed.image.width,mediumWidth);assert.equal(ordinary.image.width,mediumWidth);compressed.dispose();ordinary.dispose();clone.dispose();

});
