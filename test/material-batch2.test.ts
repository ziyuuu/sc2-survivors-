import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {ELITES,type EliteId} from '../src/data/elites';
import {HEROES} from '../src/data/heroes';
import {ELITE_VISUAL_PROFILES} from '../src/data/elite-visual-profiles';
import {modelPresentationScale} from '../src/data/combat-presentation';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog';
import {legalMaterialGlb} from '../src/render/materials/unit-material-loader';
import {UnitMaterialSurface} from '../src/render/materials/unit-material-batch';
import {displayModelKey,displayActiveModelKey,displayDeathModelKey,displayAssetModelKey,displayLoadModelKey,unitMaterialIdentity} from '../src/render/materials/elite-visual';
import {sc2BodyBounds} from '../src/render/loaders/sc2-materials';
import {decodeMaterialDds} from '../tools/material-dds.mjs';
import {protossFixture,protossElite} from './helpers/protoss-elites';
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const records=new Map<string,{packedFile:string}>(JSON.parse(fs.readFileSync('deploy/runtime/build-assets.json','utf8')).records.map((r:{id:string;packedFile:string})=>[r.id,r]));

test('all 204 available M3 profiles match immutable runtime GLBs and unique source surface bindings',()=>{
 assert.equal(Object.keys(UNIT_MATERIAL_CATALOG).length,204);let count=0;
 for(const [key,profile]of Object.entries(UNIT_MATERIAL_CATALOG)){
  const bytes=fs.readFileSync(records.get('model.'+key)!.packedFile);assert.equal(sha(bytes),profile.glbSha256,key);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert.equal(new Set(json.materials.map((m:any)=>m.name)).size,profile.materials.length,key);
  for(const clip of json.animations??[])assert.ok(profile.clips.some(c=>c.name===clip.name),key+'/'+clip.name+' missing original material clock');
  for(const material of json.materials)assert.equal(profile.materials.filter(m=>m.name+'#'+m.index===material.name).length,1,key+'/'+material.name);
  for(const clip of profile.clips)for(const track of clip.tracks){assert.equal(track.frames.length,track.values.length);assert.ok(track.frames.every((t,i)=>i===0||t>=track.frames[i-1]),key);}
  count+=profile.materials.length;
 }assert.equal(count,475);
});
test('external original animation provenance covers the Ultralisk runtime and retains all source hashes',()=>{
 const p=UNIT_MATERIAL_CATALOG.ultralisk;assert.ok(p.clips.some(c=>c.name==='Attack'));assert.ok(p.animationSources?.some(s=>s.source==='ultraliskex1_requiredanims.m3a'));
 for(const profile of Object.values(UNIT_MATERIAL_CATALOG))for(const source of profile.animationSources??[])assert.equal(sha(fs.readFileSync('assets/private/m3/'+source.source)),source.sha256);
});
test('nine invalid unlit/specular pairs are repaired in memory without changing any binary payload',()=>{
 let changed=0;
 for(const [key,profile]of Object.entries(UNIT_MATERIAL_CATALOG)){
  const bytes=fs.readFileSync(records.get('model.'+key)!.packedFile),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),after=Buffer.from(legalMaterialGlb(buffer));
  const json=JSON.parse(after.toString('utf8',20,20+after.readUInt32LE(12)));
  assert.ok(!json.materials.some((m:any)=>m.extensions?.KHR_materials_unlit&&m.extensions?.KHR_materials_specular));
  assert.deepEqual(after.subarray(20+after.readUInt32LE(12)),bytes.subarray(20+bytes.readUInt32LE(12)),key);
  if(!after.equals(bytes))changed++;assert.equal(sha(bytes),profile.glbSha256);
 }assert.equal(changed,9);
});
test('source visibility removes only the authored hidden belly, while old material versions stay visible',()=>{
 const source=UNIT_MATERIAL_CATALOG['elite.baneling.1'].materials.find(m=>m.name==='02 - Default')!;
 assert.equal(source.version,20);assert.equal(source.geometryVisible,false);assert.equal(UNIT_MATERIAL_CATALOG.marine.materials[0].geometryVisible,true);
 const root=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()),hidden=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshStandardMaterial());
 body.userData.sc2Role=hidden.userData.sc2Role='body';hidden.material.visible=false;root.add(body,hidden);assert.equal(sc2BodyBounds(root).getSize(new THREE.Vector3()).y,1);
 const surface=new UnitMaterialSurface({profile:UNIT_MATERIAL_CATALOG['elite.baneling.1'],source,textures:{}},hidden.material,1024);assert.equal(surface.material.visible,false);
});
test('all 90 elite identities use the approved size categories, one model resolver and read-only material state',()=>{
 assert.deepEqual(Object.keys(ELITE_VISUAL_PROFILES).sort(),Object.keys(ELITES).sort());
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 for(const [id,definition]of Object.entries(ELITES)){
  const u=w.addUnit(definition.family,'terran',0,0);u.eliteId=id as EliteId;u.modelKey=definition.model;
  const before=w.captureRun(),profile=ELITE_VISUAL_PROFILES[id as EliteId];
  assert.equal(displayModelKey(u),profile.model);assert.equal(profile.model,definition.model);
  assert.equal(modelPresentationScale({...u,flying:true}),1.15);
  assert.equal(modelPresentationScale({...u,flying:false}),['thor','ultralisk','colossus','carrier'].includes(definition.family)?1.12:1.25);
  assert.equal(unitMaterialIdentity(u,w.time).activity,0);assert.deepEqual(w.captureRun(),before);
  assert.ok(UNIT_MATERIAL_CATALOG[profile.model]);
 }
 for(const [id,h]of Object.entries(HEROES)){const u=w.addUnit(h.baseFamily,'terran',0,0);u.heroId=id as typeof u.heroId;u.modelKey=h.model;u.eliteId='marine.1';assert.equal(displayAssetModelKey(displayModelKey(u)),h.model);assert.equal(modelPresentationScale(u),modelPresentationScale({...u,eliteId:undefined}));}
});
test('mechanism light starts, holds and ends from native saved state without initializing missing state',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const u=w.addUnit('marine','terran',0,0);u.eliteId='marine.1';
 const before=w.captureRun();assert.equal(unitMaterialIdentity(u,10).activity,0);assert.deepEqual(w.captureRun(),before);assert.equal(u.eliteCombat,undefined);
 u.eliteCombat={cycles:1,groundCycles:1,airCycles:0,lastFire:10,started:8,coolUntil:0,target:2,lockAt:8,stacks:0,boosted:0,mode:'mobile',modeReady:0,ready:0,charge:0,barrier:0,barrierUntil:0,absorbed:0};
 assert.equal(unitMaterialIdentity(u,10).activity,.4);u.eliteCombat.started=5;assert.equal(unitMaterialIdentity(u,10).activity,1);u.eliteCombat.coolUntil=12;assert.equal(unitMaterialIdentity(u,10).activity,0);u.eliteCombat.coolUntil=0;assert.equal(unitMaterialIdentity(u,14).activity,0);
 u.eliteId='baneling.3';u.zergEliteCombat={stored:u.maxHp} as never;assert.equal(unitMaterialIdentity(u,10).activity,.5);u.hp=0;assert.equal(unitMaterialIdentity(u,10).activity,0);
});

test('stalker feedback follows the actual finite blink barrier through hold, depletion, reload and expiry',()=>{
 const w=protossFixture(),u=protossElite(w,'stalker.2');w.expedition.tech.blink=1;
 assert.equal(unitMaterialIdentity(u,w.time).activity,0);assert.ok(w.castFamilyAbility('stalker',{x:2,z:0}));
 assert.equal(unitMaterialIdentity(u,w.time).activity,1);const saved=w.captureRun();unitMaterialIdentity(u,w.time);assert.deepEqual(w.captureRun(),saved);
 w.time=2;assert.equal(unitMaterialIdentity(u,w.time).activity,1);const barrier=u.protossEliteCombat!.barrier;
 w.hit(u,barrier/2,[],1,'zerg');assert.ok(unitMaterialIdentity(u,w.time).activity>0&&unitMaterialIdentity(u,w.time).activity<1);
 const copy=protossFixture();copy.restoreRun(w.captureRun());assert.equal(unitMaterialIdentity(copy.entities.get(u.id)!,copy.time).activity,unitMaterialIdentity(u,w.time).activity);
 w.hit(u,u.protossEliteCombat!.barrier+1,[],1,'zerg');assert.ok(u.hp>0);assert.equal(unitMaterialIdentity(u,w.time).activity,0);
 copy.time=5;assert.equal(unitMaterialIdentity(copy.entities.get(u.id)!,copy.time).activity,0);
 const other=protossElite(copy,'stalker.1');other.protossEliteCombat=structuredClone(copy.entities.get(u.id)!.protossEliteCombat);assert.equal(unitMaterialIdentity(other,2).activity,0);
});
test('all six native elite transformation identities resolve matching original bodies and death models',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 for(const family of ['hellion','viking']as const)for(const variant of [1,2,3]as const){const u=w.addUnit(family,'terran',0,0);u.eliteId=`${family}.${variant}`;u.modelKey=ELITES[u.eliteId].model;u.nativeMode=family==='hellion'?'hellbat':'viking_assault';const before=w.captureRun(),key=displayActiveModelKey(u);assert.equal(key,ELITE_VISUAL_PROFILES[u.eliteId].forms[u.nativeMode]);assert.equal(displayDeathModelKey(u),key);assert.ok(UNIT_MATERIAL_CATALOG[key+'.death']);assert.deepEqual(w.captureRun(),before);}
});
test('shared flagship art keeps a separate display body from calibrated elite carriers without new resource or saved model',()=>{
 const elite={unitType:'carrier',eliteId:'carrier.1' as EliteId,modelKey:'elite.carrier.1'},hero={unitType:'purifier_flagship',heroId:'purifier_flagship',modelKey:'elite.carrier.1'};
 assert.notEqual(displayModelKey(elite),displayModelKey(hero));assert.equal(displayAssetModelKey(displayModelKey(hero)),elite.modelKey);assert.equal(displayLoadModelKey(hero.modelKey,hero.unitType),displayModelKey(hero));assert.equal(hero.modelKey,'elite.carrier.1');
 assert.equal(displayModelKey({...hero,modelKey:'interceptor'}),'interceptor');
});
test('shared skins preserve separate team colors and source alpha through slot reordering and pause',()=>{
 const profile=UNIT_MATERIAL_CATALOG['elite.immortal.1'],source=profile.materials[0],surface=new UnitMaterialSurface({profile,source,textures:{}},new THREE.MeshStandardMaterial(),1024),pose={clip:'Stand',seconds:.3};
 const a={runId:'a',entityId:1,time:5,teamColor:[.2,.4,.6]as const,activity:0},b={...a,entityId:2,teamColor:[.6,.3,.1]as const,activity:1},row=(surface.texture.image.height-1)*1024*4;
 surface.write(0,pose,a);surface.write(1023,pose,b);assert.equal(surface.data[row],Math.fround(.2));assert.equal(surface.data[row+1023*4+3],1);
 surface.write(0,pose,b);surface.write(1023,pose,a);const saved=surface.data.slice();surface.write(0,pose,b);surface.write(1023,pose,a);assert.deepEqual(surface.data,saved);assert.equal(surface.data[row],Math.fround(.6));assert.equal(surface.data[row+1023*4+3],0);
});
test('new material PNGs have exact source DDS provenance and complete cubemap faces',()=>{
 const catalog=JSON.parse(fs.readFileSync('deploy/runtime/material-textures.json','utf8'));
 const sources=new Map<string,string>();for(const r of catalog.records){assert.equal(sha(fs.readFileSync(r.gitPath)),r.packedSha256);assert.equal(sha(fs.readFileSync(r.packedFile)),r.packedSha256);if(!sources.has(r.sourceFile))sources.set(r.sourceFile,sha(fs.readFileSync(r.sourceFile)));assert.equal(sources.get(r.sourceFile),r.sourceSha256);}
 for(const source of new Set<string>(catalog.records.filter((r:any)=>r.cubeFace!==undefined).map((r:any)=>r.sourceFile))){const rows=catalog.records.filter((r:any)=>r.sourceFile===source&&r.cubeFace!==undefined);assert.deepEqual(rows.map((r:any)=>r.cubeFace),[0,1,2,3,4,5]);const faces=decodeMaterialDds(fs.readFileSync(source));assert.equal(faces.length,6);assert.equal(faces[0].width,rows[0].width);assert.ok(new Set(faces.map((face:any)=>sha(face.rgba))).size>1);}
});
