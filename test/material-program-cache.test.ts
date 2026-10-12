import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UnitMaterialSurface} from '../src/render/materials/unit-material-batch';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog';
import {MATERIAL_ROLES,type PreparedUnitMaterial} from '../src/render/materials/unit-material-loader';

const geometry=(uv1=false)=>{const g=new THREE.BufferGeometry();if(uv1)g.setAttribute('uv1',new THREE.Float32BufferAttribute([0,0],2));return g;};
function prepared(profile=UNIT_MATERIAL_CATALOG.marine,source=profile.materials[0]):PreparedUnitMaterial{
 const textures:PreparedUnitMaterial['textures']={};for(const role of MATERIAL_ROLES){const layer=source.layers[role];if(layer?.filename)textures[role]=layer.cubeTextures?new THREE.CubeTexture():new THREE.Texture();}
 return {profile,source,textures,teamTexture:source.teamTexture?new THREE.Texture():undefined};
}
test('identical generated material programs share across source identities but keep per-surface uniforms',()=>{
 const p=prepared(),a=new UnitMaterialSurface(p,new THREE.MeshStandardMaterial(),2),q=structuredClone(p.profile);q.glbSha256='another-original-hash';
 const b=new UnitMaterialSurface({...prepared(q,q.materials[0])},new THREE.MeshStandardMaterial(),2),g=geometry();
 assert.equal(a.programKey(g),b.programKey(g));assert.notEqual(a.texture,b.texture);assert.notEqual(a.prepared.textures.diffuse,b.prepared.textures.diffuse);
 assert.notEqual(a.programKey(g),a.programKey(geometry(true)));assert.notEqual(a.programKey(g),a.programKey(g,false));
 const changed=structuredClone(q);changed.materials[0].hdrEmission+=.125;const c=new UnitMaterialSurface(prepared(changed,changed.materials[0]),new THREE.MeshStandardMaterial(),2);
 assert.notEqual(a.programKey(g),c.programKey(g));
 a.texture.dispose();b.texture.dispose();c.texture.dispose();
});

test('all 475 original surface variants only share keys when actual Three color and depth GLSL are identical',()=>{
 const seen=new Map<string,string>();let surfaces=0;
 for(const profile of Object.values(UNIT_MATERIAL_CATALOG))for(const source of profile.materials){surfaces++;
  for(const basic of [false,true]){const surface=new UnitMaterialSurface(prepared(profile,source),basic?new THREE.MeshBasicMaterial():new THREE.MeshPhysicalMaterial(),1);
   for(const uv1 of [false,true])for(const instanced of [false,true]){const g=geometry(uv1),colorBase=basic?THREE.ShaderLib.basic:THREE.ShaderLib.physical,color={vertexShader:colorBase.vertexShader,fragmentShader:colorBase.fragmentShader,uniforms:{}},depth={vertexShader:THREE.ShaderLib.depth.vertexShader,fragmentShader:THREE.ShaderLib.depth.fragmentShader,uniforms:{}};
    surface.compile(color,g,instanced);surface.compile(depth,g,instanced,true);
    const sourceText=JSON.stringify([color.vertexShader,color.fragmentShader,depth.vertexShader,depth.fragmentShader]),key=surface.programKey(g,instanced);
    if(seen.has(key))assert.equal(sourceText,seen.get(key),profile.source+'/'+source.name);else seen.set(key,sourceText);
    g.dispose();
   }surface.texture.dispose();surface.material.dispose();
  }
 }
 assert.equal(surfaces,475);assert.ok(seen.size<475*8,'identical source logic must share programs across models');
});
