import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BattleRenderer} from '../src/render/scene/battle-renderer';

test('carrier alpha texture is uploaded and filtered behind the resource gate once per root',()=>{
 const alpha=new THREE.Texture(),material=new THREE.MeshStandardMaterial({alphaMap:alpha});
 const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.PlaneGeometry(),material),new THREE.Mesh(new THREE.PlaneGeometry(),material));
 const uploaded:THREE.Texture[]=[];
 const view=Object.create(BattleRenderer.prototype) as any;
 view.quality='balanced';view.renderer={capabilities:{getMaxAnisotropy:()=>16},initTexture:(t:THREE.Texture)=>uploaded.push(t)};
 view.filterTextures(root);view.preloadTextures(root);
 assert.equal(alpha.anisotropy,4);
 assert.deepEqual(uploaded,[alpha]);
});
