import test from 'node:test';
import assert from 'node:assert/strict';
import {UNIT_MATERIAL_CATALOG as catalog} from '../src/render/materials/unit-material-catalog';
import {presentationMaterialProfile} from '../src/render/materials/death-material-identity';
import {unitMaterialDependencies} from '../src/render/materials/unit-material-loader';

test('death body inherits its exact original diffuse identity without changing death opacity or tracks',()=>{
 let restored=0;
 for(const [key,raw]of Object.entries(catalog)){
  const actual=presentationMaterialProfile(key)!;assert.equal(actual.glbSha256,raw.glbSha256);assert.equal(actual.clips,raw.clips);
  for(const [i,source]of raw.materials.entries()){
   const material=actual.materials[i];assert.equal(material.layers,source.layers);
   const live=key.endsWith('.death')?catalog[key.slice(0,-6)]?.materials.find(m=>m.teamTexture&&m.layers.diffuse?.filename===source.layers.diffuse?.filename):undefined;
   if(!source.teamTexture&&live){restored++;assert.equal(material.teamTexture,live.teamTexture);assert.ok(unitMaterialDependencies(key).includes(live.teamTexture!));}
   else assert.equal(material,source);
  }
 }
 assert.equal(restored,124);
});

test('unrelated blood, guts and energy textures do not inherit a body team mask',()=>{
 for(const [key,raw]of Object.entries(catalog).filter(([k])=>k.endsWith('.death'))){
  const actual=presentationMaterialProfile(key)!;
  for(const [i,m]of raw.materials.entries())if(/blood|bones|guts|glow_haze/.test(m.layers.diffuse?.filename??'')&&!catalog[key.slice(0,-6)]?.materials.some(n=>n.layers.diffuse?.filename===m.layers.diffuse?.filename))assert.equal(actual.materials[i],m);
 }
});
