import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {sc2BodyBounds} from '../src/render/loaders/sc2-materials';
import {prepareFortMaterials,updateFortMaterials,disposeFortMaterials} from '../src/render/scene/fort-materials';
const catalog=JSON.parse(fs.readFileSync('deploy/runtime/mission-assets.json','utf8'));
function model(id:string){const r=catalog.records.find((r:any)=>r.id===id),b=fs.readFileSync(r.gitPath);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
test('all task structure native layers are packed, including gateway reflection coordinates',()=>{
 for(const r of catalog.records){const j=model(r.id),p=j.nodes.map((n:any)=>n.extras?.sc2FortMaterials).find(Boolean);assert.ok(p.clips.some((c:any)=>r.id.endsWith('.death')||r.id.endsWith('.timeout')?/^Death(?: \d+)?$/.test(c.name):c.name==='Stand'),r.id);
 for(const m of j.materials){const s=p.materials.find((s:any)=>s.name+'#'+s.index===m.name);assert.ok(s);for(const [role,l]of Object.entries(s.layers) as [string,any][]){if(!l.filename)continue;const info=role==='diffuse'?m.pbrMetallicRoughness?.baseColorTexture:role==='normal'?m.normalTexture:role==='specular'?m.extensions?.KHR_materials_specular?.specularColorTexture:role==='emissive'?m.emissiveTexture:m.extras?.sc2?.layers?.find((x:any)=>x.role===role);assert.ok(info?.index!==undefined,r.id+'/'+m.name+'/'+role);assert.ok(j.images[j.textures[info.index].source].bufferView!==undefined);}}
 }
 const j=model('model.gateway'),p=j.nodes.map((n:any)=>n.extras?.sc2FortMaterials).find(Boolean);assert.equal(p.materials.find((m:any)=>m.name==='pylon_crystal_te').layers.environment.uv,3);
});
test('structure bounds ignore large source effect helpers',()=>{const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(4,3,2)),effect=new THREE.Mesh(new THREE.BoxGeometry(100,100,100));body.userData.sc2Role='body';effect.userData.sc2Role='effect';g.add(body,effect);assert.deepEqual(sc2BodyBounds(g).getSize(new THREE.Vector3()).toArray(),[4,3,2]);});
test('native task material instances keep frozen pose data and release their own resources',async()=>{
 const j=model('model.robotics'),p=j.nodes.map((n:any)=>n.extras?.sc2FortMaterials).find(Boolean),scene=new THREE.Group();scene.userData.sc2FortMaterials=p;
 const originals:THREE.Material[]=[];for(const raw of j.materials){const m=new THREE.MeshStandardMaterial();m.name=raw.name;originals.push(m);scene.add(new THREE.Mesh(new THREE.BoxGeometry(),m));}
 await prepareFortMaterials({scene,parser:{json:j,getDependency:async()=>new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1)}} as any);updateFortMaterials(scene,'Stand',1);const own=scene.children.map((n:any)=>n.material);assert.ok(own.every((m,i)=>m!==originals[i]));let disposed=0;own.forEach(m=>m.addEventListener('dispose',()=>disposed++));updateFortMaterials(scene,'Stand',1);assert.ok(scene.children.every((n:any,i)=>n.material===own[i]));disposeFortMaterials(scene);assert.equal(disposed,own.length);disposeFortMaterials(scene);assert.equal(disposed,own.length);
});
