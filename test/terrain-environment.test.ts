import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import * as THREE from 'three';
import {campaignTerrain,type CampaignMapRecipe} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {MAP_VISUAL_PROFILES,environmentAssetIds} from '../src/render/terrain/map-visual-profile';
import {visualGroundField} from '../src/render/terrain/visual-fields';
import {environmentParticle,createEnvironmentAtmosphere,MAX_ENVIRONMENT_PARTICLES} from '../src/render/terrain/environment-atmosphere';
import {createVisualGround,type LandscapeResources} from '../src/render/terrain/campaign-ground';
import {sceneMaterialTextures} from '../src/render/materials/scene-textures';
import {prepareEnvironmentMaterials} from '../src/render/terrain/environment-materials';
import {rockBaseGeometry} from '../src/render/terrain/environment-bases';
import {ASSETS} from '../src/assets/manifest';
import {inflateSync} from 'node:zlib';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const themes=Object.keys(MAP_VISUAL_PROFILES) as (keyof typeof MAP_VISUAL_PROFILES)[];
const resources=():LandscapeResources=>({textures:[],materials:[],geometries:[]});

test('ash sprite retains transparent source coverage instead of an opaque rectangular RGB background',async()=>{
 const catalog=JSON.parse(await fs.readFile(new URL('../deploy/runtime/environment-textures.json',import.meta.url),'utf8')),row=catalog.records.find((r:{id:string})=>r.id==='terrain.visual.ash');
 const png=await fs.readFile(new URL('../'+row.gitPath,import.meta.url)),parts:Buffer[]=[];let offset=8;
 while(offset<png.length){const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')parts.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
 assert.equal(png[25],6);const pixels=inflateSync(Buffer.concat(parts)),stride=row.width*4+1;let empty=0,visible=0;
 for(let y=0;y<row.height;y++){assert.equal(pixels[y*stride],0);for(let x=0;x<row.width;x++){const a=pixels[y*stride+1+x*4+3];if(a===0)empty++;if(a>0)visible++;}}
 assert.ok(empty>row.width*row.height*.35,'Ash must have transparent cutout area, not the full RGB rectangle');assert.ok(visible>row.width*row.height*.25,'Source ash detail must remain');
});

test('rock grounding stays wholly inside unchanged blockers and follows the real terrain at its edge',()=>{
 for(const theme of themes){const t=campaignTerrain({version:3,theme,seed:89241}),before=hash(t.definition);for(const p of t.definition.placements.filter(p=>p.type==='landmark'&&p.blockerSize&&p.assetId?.includes('rock'))){const g=rockBaseGeometry(t,p,p.scale[0]),v=g.getAttribute('position'),uv=g.getAttribute('uv'),normals=g.getAttribute('normal');for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i);assert.ok(Math.hypot(x-(p.position[0]-80),z-(80-p.position[1]))<=p.blockerSize!+.00001);if(i>=33)assert.ok(Math.abs(v.getY(i)-(t.height({x,z})-.022))<.00001);assert.ok(normals.getY(i)>0);assert.ok(Math.abs(uv.getX(i)-(x+80)/160)<1e-6);assert.ok(Math.abs(uv.getY(i)-(80-z)/160)<1e-6);}g.dispose();}assert.equal(hash(t.definition),before);}
});

test('fifteen campaign definitions retain independently frozen pre-terrain geometry and placement hashes',async()=>{
 const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/terrain-batch4-geometries.json',import.meta.url),'utf8'));
 assert.equal(fixture.baseline,'41391803ced755ec26d5ac248263a7ca5aa118ef');assert.equal(fixture.geometries.length,15);
 for(const row of fixture.geometries){const terrain=campaignTerrain(row.recipe as CampaignMapRecipe),d=terrain.definition;assert.equal(d.source.sha256,row.mapHash);for(const [field,expected]of Object.entries(row.digests))assert.equal(hash(d[field as keyof typeof d]),expected,JSON.stringify(row.recipe)+'/'+field);}
});

test('all visual ground fields remain normalized and deterministic across the terrain and footprint edges',()=>{
 for(const theme of themes){const t=campaignTerrain({version:3,theme,seed:10609}),solids=t.definition.placements.filter(p=>p.type==='landmark'),before=hash(t.definition);
  for(let x=-80;x<=80;x+=3.1)for(let z=-80;z<=80;z+=3.7){const a=visualGroundField(theme,x,z,10609,solids);assert.deepEqual(a,visualGroundField(theme,x,z,10609,solids));assert.ok(Math.abs(a.weights.reduce((n,v)=>n+v,0)-1)<1e-10);for(const v of a.weights)assert.ok(Number.isFinite(v)&&v>=0&&v<=1);assert.ok(a.base>=0&&a.base<=1);}
  assert.equal(hash(t.definition),before);
 }
});

test('selected maps declare exact original environment dependencies, including three actual ice-world layers',async()=>{
 const catalog=JSON.parse(await fs.readFile(new URL('../deploy/runtime/environment-textures.json',import.meta.url),'utf8'));
 for(const theme of themes){const ids=environmentAssetIds(theme);assert.equal(new Set(ids).size,ids.length);for(const id of ids){assert.equal(ASSETS.get(id)?.status,'available');const row=catalog.records.find((r:{id:string})=>r.id===id);assert.ok(row?.sourceSha256&&row?.packedSha256);assert.equal(row.sourceAlpha.used,row.role==='normal'||id==='terrain.visual.ash');}}
 assert.deepEqual(MAP_VISUAL_PROFILES.ice.layers.map(l=>l.source),['snow','ice','ice-rock','plates']);
 const names=['snow','ice','ice-rock'].map(id=>catalog.records.find((r:{id:string})=>r.id==='terrain.visual.'+id).sourceFile);assert.deepEqual(names,['assets/private/dds/iceworld_1.dds','assets/private/dds/iceworld_2.dds','assets/private/dds/iceworld_8.dds']);
});

test('environment particles reproduce at pause and restored native times without a mutable random stream',()=>{
 const before=Array.from({length:60},(_,i)=>environmentParticle(89241,i,19.75));for(let i=0;i<60;i++)environmentParticle(41,i,1200);
 assert.deepEqual(Array.from({length:60},(_,i)=>environmentParticle(89241,i,19.75)),before);assert.notDeepEqual(environmentParticle(89241,3,19.75),environmentParticle(89242,3,19.75));
 for(let i=0;i<60;i++)for(const time of [0,1,19.75,900,1e6]){const p=environmentParticle(1,i,time);assert.ok(p.alpha>=0&&p.alpha<=1&&p.phase>=0&&p.phase<1);}
});

test('layered material preserves real relief, independent color/normal samplers and fresh shader compilation',async()=>{
 const load=THREE.TextureLoader.prototype.loadAsync;THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture({width:1024,height:1024} as TexImageSource);
 try{for(const theme of themes){const t=campaignTerrain({version:3,theme,seed:10609}),r=resources(),ground=await createVisualGround(t,theme,10609,r),position=ground.ground.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++)assert.ok(Math.abs(position.getY(i)-(t.height({x:position.getX(i),z:position.getZ(i)})-.018))<1e-6);
  const textures=sceneMaterialTextures(ground.ground.material);assert.equal(textures.length,MAP_VISUAL_PROFILES[theme].layers.length*2+3);
  for(const texture of textures.filter(t=>t.name.startsWith('terrain.visual.'))){assert.equal(texture.generateMipmaps,true);assert.equal(texture.anisotropy,8);assert.equal(texture.colorSpace,texture.name.endsWith('-normal')?THREE.NoColorSpace:THREE.SRGBColorSpace);}
  const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});const a=shader(),b=shader();ground.ground.material.onBeforeCompile(a as never,{} as never);ground.ground.material.onBeforeCompile(b as never,{} as never);assert.equal(a.fragmentShader,b.fragmentShader);assert.equal((a.fragmentShader.match(/uniform sampler2D visualField;/g)??[]).length,1);assert.equal((a.uniforms as any).visualField.value,(b.uniforms as any).visualField.value);
  assert.ok(!a.fragmentShader.includes('groundLegacyShade'));for(const m of r.materials)m.dispose();for(const g of r.geometries)g.dispose();for(const t of r.textures)t.dispose();
 }}finally{THREE.TextureLoader.prototype.loadAsync=load;}
});

test('endless ground keeps a single perfectly flat plane while sharing the Char material profile',async()=>{
 const load=THREE.TextureLoader.prototype.loadAsync;THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture({width:16,height:16} as TexImageSource);
 try{const t=new FlatTerrain(),r=resources(),ground=await createVisualGround(t,'char',89241,r);assert.equal(ground.ground.geometry.getAttribute('position').count,4);for(let i=0;i<4;i++)assert.ok(Math.abs(ground.ground.geometry.getAttribute('position').getY(i)+.018)<1e-8);assert.equal(ground.report().profile,'char');assert.equal(t.definition,undefined);}finally{THREE.TextureLoader.prototype.loadAsync=load;}
});

test('atmosphere is capped, nonphysical, hidden when inactive or reduced, and restored from native time',async()=>{
 const load=THREE.TextureLoader.prototype.loadAsync;THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture({width:16,height:16} as TexImageSource);
 try{const t=new FlatTerrain(),r=resources(),root=new THREE.Group(),a=await createEnvironmentAtmosphere(root,()=>t,'ice',41,r),camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,300);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();const frame={time:20,paused:true,quality:'native' as const,reducedMotion:false,camera,seed:89241};
  a.update(frame);assert.equal(a.report().visibleParticles,0);a.setVisible(true);a.update(frame);const mesh=root.children[0] as THREE.InstancedMesh;assert.ok(mesh.count>0&&mesh.count<=MAX_ENVIRONMENT_PARTICLES);assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);assert.equal((mesh.material as THREE.Material).depthWrite,false);const original=Array.from(mesh.instanceMatrix.array);
  a.update({...frame,time:25,paused:false});assert.notDeepEqual(Array.from(mesh.instanceMatrix.array),original);a.update(frame);assert.deepEqual(Array.from(mesh.instanceMatrix.array),original);
  a.update({...frame,quality:'performance'});assert.equal(mesh.count,0);a.update({...frame,reducedMotion:true});assert.equal(mesh.count,0);a.setVisible(false);a.update(frame);assert.equal(mesh.count,0);
 }finally{THREE.TextureLoader.prototype.loadAsync=load;}
});

test('source emission repair and snow coating preserve source materials and compile once per fresh clone',async()=>{
 const scene=new THREE.Group(),emission=new THREE.MeshBasicMaterial({name:'lamp'}),body=new THREE.MeshStandardMaterial({name:'rock'}),tex=new THREE.Texture();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),emission),new THREE.Mesh(new THREE.BoxGeometry(),body));const r=resources();
 const gltf={scene,parser:{json:{materials:[{name:'lamp',emissiveTexture:{index:0},emissiveFactor:[.4,.6,.8],extensions:{KHR_materials_emissive_strength:{emissiveStrength:2}}},{name:'rock'}]},getDependencies:async()=>[tex],getDependency:async()=>tex}};
 const adapted=await prepareEnvironmentMaterials(gltf as never,'ice',new THREE.Texture(),r),repaired=adapted.pairs.get(emission) as THREE.MeshBasicMaterial,rock=adapted.pairs.get(body)!;assert.equal(emission.map,null);assert.notEqual(repaired,emission);assert.ok(repaired.map);assert.deepEqual(repaired.color.toArray(),[.8,1.2,1.6]);assert.equal(adapted.emissionRepairs,1);
 const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader}),a=shader(),b=shader();rock.onBeforeCompile(a as never,{} as never);rock.onBeforeCompile(b as never,{} as never);assert.equal(a.fragmentShader,b.fragmentShader);assert.equal((a.fragmentShader.match(/uniform sampler2D environmentCoating;/g)??[]).length,1);assert.ok(a.vertexShader.includes('envAboveBase'));assert.equal(body.onBeforeCompile,THREE.Material.prototype.onBeforeCompile);
});
