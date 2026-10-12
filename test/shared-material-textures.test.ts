import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture,CubeTexture,RepeatWrapping,ClampToEdgeWrapping,SRGBColorSpace,NoColorSpace} from 'three';
import {SharedMaterialTextures} from '../src/render/materials/shared-textures';

test('shared original images decode once but retain independent material samplers and color interpretation',async()=>{
 let loads=0;const source=new Texture({width:4,height:4});
 const cache=new SharedMaterialTextures({loadAsync:async()=>{loads++;return source;}}as any);
 const [a,b]=await Promise.all([cache.image('verified:source'),cache.image('verified:source')]);
 assert.equal(loads,1);assert.notEqual(a,b);assert.equal(a.source,b.source);assert.equal(a.image,source.image);
 a.wrapS=RepeatWrapping;a.colorSpace=SRGBColorSpace;b.wrapS=ClampToEdgeWrapping;b.colorSpace=NoColorSpace;
 assert.equal(a.wrapS,RepeatWrapping);assert.equal(b.wrapS,ClampToEdgeWrapping);assert.notEqual(a.colorSpace,b.colorSpace);
 assert.equal((await cache.image('verified:source')).source,source.source);assert.equal(loads,1);
});

test('failed material source remains retryable; cube face order is part of identity',async()=>{
 let loads=0,cubes=0;const cache=new SharedMaterialTextures({loadAsync:async()=>{if(++loads===1)throw Error('decode');return new Texture();}}as any,{loadAsync:async()=>{cubes++;return new CubeTexture();}}as any);
 await assert.rejects(cache.image('source'),/decode/);await cache.image('source');assert.equal(loads,2);
 const faces=['a','b','c','d','e','f'],[a,b]=await Promise.all([cache.cube(faces),cache.cube([...faces])]);
 assert.equal(cubes,1);assert.notEqual(a,b);assert.equal(a.source,b.source);
 await cache.cube([...faces].reverse());assert.equal(cubes,2);
});
