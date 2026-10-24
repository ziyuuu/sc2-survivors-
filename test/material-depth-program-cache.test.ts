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
const shader=()=>({vertexShader:THREE.ShaderLib.depth.vertexShader,fragmentShader:THREE.ShaderLib.depth.fragmentShader,uniforms:{} as Record<string,{value:unknown}>});

test('colour-only material changes share exact depth programs while alpha and pose layouts remain distinct',()=>{
 const profile=structuredClone(UNIT_MATERIAL_CATALOG.marine),original=new UnitMaterialSurface(prepared(profile),new THREE.MeshStandardMaterial(),2),changed=structuredClone(profile);changed.materials[0].hdrEmission+=.125;
 const colour=new UnitMaterialSurface(prepared(changed),new THREE.MeshStandardMaterial(),2),g=geometry(),a=shader(),b=shader();original.compile(a,g,true,true);colour.compile(b,g,true,true);
 assert.notEqual(original.programKey(g),colour.programKey(g));assert.equal(original.programKey(g,true,true),colour.programKey(g,true,true));assert.equal(a.vertexShader,b.vertexShader);assert.equal(a.fragmentShader,b.fragmentShader);assert.notEqual(a.uniforms.umState.value,b.uniforms.umState.value);
 const alpha=structuredClone(profile);alpha.materials[0].layers.alpha??=structuredClone(alpha.materials[0].layers.diffuse!);alpha.materials[0].layers.alpha!.flags^=16;
 const cutout=new UnitMaterialSurface(prepared(alpha),new THREE.MeshStandardMaterial(),2);assert.notEqual(original.programKey(g,true,true),cutout.programKey(g,true,true));assert.notEqual(original.programKey(g,true,true),original.programKey(g,false,true));assert.notEqual(original.programKey(g,true,true),original.programKey(geometry(true),true,true));
 for(const surface of [original,colour,cutout]){surface.texture.dispose();surface.material.dispose();}g.dispose();
});

test('every shipped material only shares a depth key when its actual Three depth GLSL is identical',()=>{
 const seen=new Map<string,string>(),oldKeys=new Set<string>();let surfaces=0,layouts=0;
 for(const profile of Object.values(UNIT_MATERIAL_CATALOG))for(const source of profile.materials){surfaces++;
  for(const basic of [false,true]){const surface=new UnitMaterialSurface(prepared(profile,source),basic?new THREE.MeshBasicMaterial():new THREE.MeshPhysicalMaterial(),1);
   for(const uv1 of [false,true])for(const instanced of [false,true]){layouts++;const g=geometry(uv1),depth=shader();surface.compile(depth,g,instanced,true);
    const actual=JSON.stringify([depth.vertexShader,depth.fragmentShader]),key=surface.programKey(g,instanced,true);oldKeys.add(surface.programKey(g,instanced));
    if(seen.has(key))assert.equal(actual,seen.get(key),profile.source+'/'+source.name);else seen.set(key,actual);g.dispose();
   }surface.texture.dispose();surface.material.dispose();
  }
 }
 assert.equal(surfaces,475);assert.equal(layouts,3800);assert.ok(seen.size<oldKeys.size,'colour differences must not create duplicate depth programs');
 console.log(JSON.stringify({depthShaderLayouts:layouts,oldColourDependentKeys:oldKeys.size,exactDepthKeys:seen.size}));
});
