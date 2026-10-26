import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RUNTIME_ASSETS} from '../src/assets/runtime.generated';
import {NonHeroEffects} from '../src/render/effects/nonhero-effects';
import {World} from '../src/simulation/world';
import {recordMutation} from '../src/simulation/combat/shop-support';

function fixture(){
 const w=new World({race:'terran',seed:102501,terrain:false,obstacles:[],waves:false,sandbox:true});
 w.start();w.entities.clear();
 const source=w.addUnit('marine','terran',0,0),target=w.addUnit('roach','zerg',0,4);
 w.expedition.support.levels.mutation=1;w.time=2;recordMutation(w,source,target,100);
 const batches=new Map<string,any>();
 for(const asset of RUNTIME_ASSETS){if(asset.kind!=='effect-texture')continue;const sprite=(asset as any).sprite??{columns:1,rows:1};
  batches.set(asset.id,{cells:sprite.columns*sprite.rows,mesh:{material:new THREE.ShaderMaterial({uniforms:{map:{value:new THREE.Texture()},grid:{value:new THREE.Vector2(sprite.columns,sprite.rows)}}})}});
 }
 const effects=new NonHeroEffects(new THREE.Scene(),{batches} as any,new THREE.PerspectiveCamera()) as any;
 effects.terran.prepare();
 const sample=(time:number,visible=true)=>{w.time=time;effects.terran.begin(time);effects.support(w,()=>visible,(p:any,h=0)=>({...p,y:h}),()=>{},()=>{},()=>{},1);effects.terran.end();const fire=effects.terran.batches.get('fire');return {count:fire.count,frame:fire.count?fire.data.getX(0):null};};
 return {w,target,sample};
}

test('an active native mutation burn keeps animating after the first atlas duration without changing its receipt',()=>{
 const {w,sample}=fixture(),receipt=structuredClone(w.expedition.support.burns);
 const frames=[2,2.25,2.5,3,3.25,4.5].map(time=>{const value=sample(time);assert.equal(value.count,1);assert.ok(value.frame!<28,'the fire atlas tail is blank');return value.frame;});
 assert.ok(new Set(frames).size>1,'sustained burn must not freeze on one atlas cell');
 assert.deepEqual(w.expedition.support.burns,receipt);
});

test('expired, hidden and dead burn targets emit no fire instance',()=>{
 const {target,sample}=fixture();
 assert.equal(sample(2,false).count,0);assert.equal(sample(5).count,0);
 target.hp=0;assert.equal(sample(2).count,0);
});
