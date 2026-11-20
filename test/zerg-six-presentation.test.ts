import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {BattleEffects} from '../src/render/effects/battle-effects';
import type {VisualEvent} from '../src/simulation/types';

function spray(flying:boolean,mount={x:1.2,y:6.8,z:2.3}){
 const effects=new BattleEffects(new Scene());
 // The focused check observes the draw packets before texture and WebGL upload.
 effects.batches.set('fx.acid.0',{} as never);
 const e:VisualEvent={unitType:'viper',kind:'attack',serial:1,time:3,entityId:8,flying:true,
  facing:0,x:1,y:6.2,z:.3,end:{x:2,z:4.8},endY:flying?6.2:.6,targetFlying:flying,siege:false};
 effects.event(e,mount);
 return {e,mount,effects};
}

for(const flying of [false,true])test('Viper spray starts at its animated mouth and ends on the '+(flying?'air':'ground')+' target plane',()=>{
 const {e,mount,effects}=spray(flying);
 const particles=effects.particles;
 assert.equal(effects.stats.attack,1);
 assert.equal(particles.length,7);
 const first=particles[0],last=particles.at(-1)!;
 assert.deepEqual([first.x,first.y,first.z,first.start],[mount.x,mount.y,mount.z,e.time]);
 assert.ok(Math.hypot(last.x-e.end.x,last.y-e.endY,last.z-e.end.z)<1e-9);
 assert.ok(particles.every((p,i)=>i===0||p.y<particles[i-1].y&&p.start>particles[i-1].start));
 assert.ok(particles.every(p=>p.life<=.15&&(p.opacity??1)<1&&p.size<.5));
});

test('six unit cues route to the independent particle layers at the real impact point',()=>{
 const layers=[
  ['aberration','shell','fx.zsix.devourer.acid.5',false,false],
  ['aberration','counter','fx.zsix.broodlord.impact.1',false,false],
  ['devourer','acid','fx.zsix.devourer.acid.5',true,false],
  ['devourer','acid','fx.zsix.devourer.acid.5',false,true],
  ['infestor','infection','fx.zsix.infestor.impact.0',true,false],
  ['swarm_host','locusts','fx.zsix.locust.impact.1',true,false],
  ['viper','vortex','fx.zsix.viper.cloud.1',true,false],
  ['brood_lord','brood','fx.zsix.broodlord.impact.1',false,false]
 ] as const;
 for(const [unitType,zergCue,asset,ground,targetFlying] of layers){
  const fx=new BattleEffects(new Scene());
  fx.batches.set(asset,{} as never);
  const y=targetFlying?6.2:.6;
  const event:VisualEvent={kind:'support-impact',zergCue,unitType,targetFlying,serial:10,time:2,entityId:1,
   flying:false,facing:0,siege:false,x:0,y:.6,z:0,end:{x:4,z:5},endY:y};
  fx.event(event);
  assert.equal(fx.particles.length,1,zergCue);
  const p=fx.particles[0];
  assert.equal(p.asset,asset,zergCue);
  assert.deepEqual([p.x,p.y,p.z,p.ground],[4,y,5,ground],zergCue);
 }
});
