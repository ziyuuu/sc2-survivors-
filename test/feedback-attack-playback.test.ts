import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip} from 'three';
import * as animations from '../src/render/loaders/animations.ts';
import * as settings from '../src/render/settings/quality.ts';
import {World} from '../src/simulation/world.ts';
import {readFileSync} from 'node:fs';
import {ANIMATION_PROFILES} from '../src/render/loaders/animation-profiles.ts';
import {assetUrl} from '../src/assets/manifest.ts';
import {ELITES,type EliteId} from '../src/data/elites.ts';
import * as THREE from 'three';
import {AnimatedBatch} from '../src/render/units/animated-batch.ts';

const clips=(names:string[])=>names.map(name=>new AnimationClip(name,1,[]));
test('Colossus fire never selects its ready channel, including elite skins',()=>{
 for(const key of ['colossus','elite.colossus.1','elite.colossus.2','elite.colossus.3']){
  const mapped=animations.mapAnimations(clips(['Stand','Walk','Attack Ready Channel','Attack 02','Stand Channel Start','Stand Channel','Stand Channel End']),key);
  assert.equal(mapped.attack?.name,'Stand Channel Start');assert.equal(mapped.ready?.name,'Attack Ready Channel');
 }
});
test('Templar projectile cast uses an original spell clip and carrier declares no main gun',()=>{
 const templar=animations.mapAnimations(clips(['Stand','Walk','Spell A','Spell']), 'high_templar');
 assert.equal(templar.attack?.name,'Spell A');assert.equal(templar.skill?.name,'Spell');
 const carrier=animations.mapAnimations(clips(['Stand','Walk 01']), 'carrier');
 assert.equal(carrier.attack,undefined);
});
test('shot presentation survives idle/move, restores elapsed pose, and yields to priority actions',()=>{
 const select=(animations as any).selectAttackPresentation;
 assert.equal(typeof select,'function','a shot-driven presentation selector is required');
 const unit={unitType:'reaper',action:'idle',hp:60,lastShotAt:10,shotSequence:1,shotInterval:1,windup:0,attackPeriod:1,modeTimer:0};
 const mapped=animations.mapAnimations(clips(['Stand','Walk','Attack']), 'reaper');
 const first=select(unit,10,mapped),later=select({...unit,action:'move'},10.2,mapped);
 assert.equal(first.action,'attack');assert.equal(later.action,'attack');assert.ok(later.seconds>first.seconds);
 assert.deepEqual(select(unit,10.2,mapped),later,'restoring renderer state uses saved shot age, not a restarted clip');
 assert.equal(select(unit,12,mapped),null);
 for(const override of [{hp:0},{action:'dead'},{action:'sieging'},{action:'skill'},{nativeModeUntil:11},{recoveryUntil:11}])assert.equal(select({...unit,...override},10.2,mapped),null);
 assert.equal(select({...unit,shotSequence:0,lastShotAt:0},0,mapped),null);
});
test('ending a priority mode cannot revive an interrupted old shot',()=>{
 const mapped=animations.mapAnimations(clips(['Stand','Walk','Attack']),'reaper'),state={};
 const u={unitType:'reaper',action:'idle',hp:60,lastShotAt:10,shotSequence:1,shotInterval:2,windup:0,modeTimer:0} as any;
 assert.ok(animations.selectAttackPresentation(u,10,mapped,state));
 assert.equal(animations.selectAttackPresentation({...u,action:'sieging'},10.05,mapped,state),null);
 assert.equal(animations.selectAttackPresentation(u,10.1,mapped,state),null);
 assert.ok(animations.selectAttackPresentation({...u,lastShotAt:10.2,shotSequence:2},10.2,mapped,state));
});
test('Void Ray ticks preserve one start/channel clock and play the original end clip',()=>{
 const select=(animations as any).selectAttackPresentation;
 assert.equal(typeof select,'function');
 const mapped=animations.mapAnimations(clips(['Stand','Walk','Attack','Stand Channel','Attack End']),'void_ray');
 const state={},unit={unitType:'void_ray',hp:100,action:'idle',lastShotAt:10,shotSequence:1,shotInterval:.1,windup:0,modeTimer:0};
 assert.equal(select(unit,10,mapped,state).action,'attack');
 assert.equal(select({...unit,lastShotAt:10.8,shotSequence:9},10.8,mapped,state).action,'attackChannel');
 assert.equal(select({...unit,action:'attack',windup:.02,lastShotAt:10.8,shotSequence:9},10.85,mapped,state).action,'attackChannel','the next damage tick windup must not restart the beam');
 assert.equal(select({...unit,lastShotAt:10.8,shotSequence:9},11.15,mapped,state).action,'attackEnd');
});
test('energy-saving poses hold between 15Hz ticks but display every new event immediately',()=>{
 const sample=(settings as any).samplePoseClock;
 assert.equal(typeof sample,'function');
 const state={};
 assert.equal(sample(state,'energy-saving',1,'move'),1);
 assert.equal(sample(state,'energy-saving',1.03,'move'),1);
 assert.equal(sample(state,'energy-saving',1.031,'attack:1'),1.031);
 assert.equal(sample(state,'energy-saving',1.05,'attack:1'),1.031);
 assert.equal(sample(state,'energy-saving',1.10,'attack:1'),1.10);
 assert.equal(sample(state,'complete',1.11,'attack:1'),1.11);
 assert.equal(sample(state,'energy-saving',1.12,'attack:1'),1.12,'mode switch is immediate');
 assert.equal(sample(state,'energy-saving',1.12,'attack:1'),1.12,'paused clock does not advance');
});

test('all eleven ordinary and three elite models map real source attacks without idle fallback',()=>{
 for(const family of Object.keys(ANIMATION_PROFILES))for(const key of [family,...[1,2,3].map(n=>`elite.${family}.${n}`)]){
  const sourceKey=key.startsWith('elite.')?ELITES[key.slice(6) as EliteId].model:key;
  const url=assetUrl('model.'+sourceKey);assert.ok(url,`${key} source URL`);
  const bytes=readFileSync('public/'+url.replace(/^\//,'')),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const mapped=animations.mapAnimations(clips(json.animations.map((a:any)=>a.name)),key);
  assert.ok(mapped.idle,`${key} idle`);assert.ok(mapped.move,`${key} move`);
  if(family==='carrier')assert.equal(mapped.attack,undefined);else assert.ok(mapped.attack&&mapped.attack!==mapped.idle,`${key} needs a real source attack`);
 }
});

test('rendering both pose modes during actual shooting leaves the same simulation snapshot',()=>{
 const run=(mode:settings.AnimationMode)=>{
  const w=new World({race:'terran',sandbox:true,terrain:false,obstacles:[],waves:false,seed:187});w.start();w.entities.clear();
  const u=w.addUnit('reaper','terran',0,0),target=w.addUnit('roach','zerg',0,3);target.hp=target.maxHp=100000;target.weaponDamage=0;target.moveSpeed=0;
  const mapped=animations.mapAnimations(clips(['Stand','Walk','Attack']),'reaper'),playback={},pose={};let shots=0,presented=0;
  for(let tick=0;tick<180;tick++){
   w.step(1/60);const before=JSON.stringify(u),shot=animations.selectAttackPresentation(u,w.time,mapped,playback);
   settings.samplePoseClock(pose,mode,w.time,String(u.shotSequence));assert.equal(JSON.stringify(u),before);
   if(shot){presented++;assert.ok(['attack','move','idle'].includes(u.action));}shots=u.shotSequence??0;
  }
  assert.ok(shots>0);assert.ok(presented>shots*2,'each real shot persists across several simulation steps');
  return JSON.stringify({time:w.time,units:[...w.entities.values()],wallet:w.wallet,events:w.visualEvents});
 };
 assert.equal(run('complete'),run('energy-saving'));
});

test('baked pose output disables both interpolation layers in energy mode while transforms keep moving',()=>{
 const root=new THREE.Group(),bone=new THREE.Bone();bone.name='Shoulder';root.add(bone);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(12),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());root.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
 const stand=new THREE.AnimationClip('Stand',1,[new THREE.VectorKeyframeTrack('Shoulder.position',[0,1],[0,0,0,0,.1,0])]),attack=new THREE.AnimationClip('Attack',1,[new THREE.VectorKeyframeTrack('Shoulder.position',[0,1],[0,0,0,0,.8,0])]);
 const batch=new AnimatedBatch({scene:root,animations:[stand,attack]} as any,new THREE.Scene(),1);
 batch.begin();batch.add(1,0,0,0,'idle',.11,false,0,1,true,.11);
 assert.ok(batch.attributes[0].getZ(0)>0);assert.ok(batch.blendAttributes[0].getZ(0)>0);
 batch.animationMode='energy-saving';batch.begin();batch.add(2,0,0,0,'idle',.11,false,0,1,true,.11);
 assert.equal(batch.attributes[0].getZ(0),0);assert.equal(batch.blendAttributes[0].getZ(0),0);
 const pose=batch.attributes[0].getX(0);batch.begin();batch.add(3,0,0,0,'idle',.12,false,0,1,true,.12);
 assert.equal(batch.attributes[0].getX(0),pose);const matrix=new THREE.Matrix4();batch.meshes[0].getMatrixAt(0,matrix);assert.equal(matrix.elements[12],3);
});

test('restoring a shot keeps its elapsed pose without regenerating muzzle events or preferences in a run',()=>{
 const w=new World({race:'terran',sandbox:true,terrain:false,obstacles:[],waves:false});w.start();
 const u=w.addUnit('reaper','terran',0,0);u.lastShotAt=0;u.shotSequence=1;u.action='idle';w.time=.2;
 w.visual('attack',u,{x:0,z:3});assert.ok(w.visualEvents.length>0);
 const saved=w.captureRun(),copy=new World({sandbox:true,terrain:false,waves:false});copy.restoreRun(saved);
 assert.equal(copy.visualEvents.length,0);assert.equal(copy.paused,true);
 const mapped=animations.mapAnimations(clips(['Stand','Walk','Attack']),'reaper');
 assert.deepEqual(animations.selectAttackPresentation(copy.entities.get(u.id)!,copy.time,mapped),animations.selectAttackPresentation(u,w.time,mapped));
 assert.equal(JSON.stringify(saved).includes('animationMode'),false);
});
