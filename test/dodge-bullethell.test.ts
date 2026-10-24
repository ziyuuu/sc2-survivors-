import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {beginSpecialStage,markSpecialReady} from '../src/simulation/special-stages/runtime';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {barragePosition,dodgeCue,dodgeShots} from '../src/simulation/special-stages/dodge-patterns';
function fixture(types=['marine','marauder','reaper','hellion']){
 const w=new World({seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount()});w.start();w.stage=4;w.prepareStage();w.entities.clear();
 for(const type of types)w.addUnit(type as 'marine','terran',0,0);
 w.pods=[];w.missions.enabled=w.encounters.enabled=false;assert.ok(beginSpecialStage(w,'dodge','fixture'));assert.ok(markSpecialReady(w));return w;
}
test('opening keeps full-size bodies and leaves time to read the first volley',()=>{
 const w=fixture(),a=w.specialStages.active!;for(let i=0;i<600;i++)w.step();assert.equal(w.specialStages.active,a);assert.ok(a.hits<5);
 assert.ok(a.barrage.length>0&&a.barrage.length<50);for(const b of a.barrage){const u=w.entities.get(b.id)!;assert.equal(u.visualScale??1,1);assert.equal(b.radius,.42);}
});
for(const types of [['marine','marauder','reaper','hellion'],['thor','thor','thor','thor'],['queen','queen','queen','queen'],['zealot','zealot','zealot','zealot']])test('full choreography preserves health and stays below 300 bodies: '+types[0],()=>{
 const w=fixture(types),a=w.specialStages.active!,hp=w.allies().map(u=>[u.id,u.hp,u.shield]),phrases=new Set<string>();let peak=0;
 setDiagnosticHealthLock(w,true);
 while(w.specialStages.active&&a.clock<3600){if(a.cue)phrases.add(a.cue.pattern!);w.step();peak=Math.max(peak,a.barrage.length+4);}
 assert.equal(a.clock,3600);assert.equal(w.specialStages.last?.result,'success');assert.ok(a.hits>=0);assert.ok(peak<70,`peak ${peak}`);assert.deepEqual([...phrases].sort(),['aim','cross','fan','ribbon','squeeze']);
 for(const [id,health,shield]of hp){const u=w.entities.get(id)!;assert.ok(u.hp>=health);assert.ok(u.shield>=shield);}
});
test('curves and captured aiming are deterministic and all emitters stay upstream',()=>{
 for(let clock=180,serial=0;clock<3540;clock+=42,serial++){
  const cue=dodgeCue(clock,serial,{x:3,z:8},2.25,3.6),copy=structuredClone(cue),shots=dodgeShots(cue);assert.deepEqual(shots,dodgeShots(copy));
  for(const shot of shots){assert.equal(shot.z,-21);assert.ok(shot.vz>0);const b={...shot,id:1,radius:.42,hit:false,born:clock,originX:shot.x,originZ:shot.z};assert.deepEqual(barragePosition(b,clock),{x:shot.x,z:shot.z});assert.deepEqual(barragePosition(b,clock+90),barragePosition(structuredClone(b),clock+90));}
 }
});
test('disabling the lab safety lock restores the fifth-hit failure rule',()=>{
 const w=fixture(),a=w.specialStages.active!;setDiagnosticHealthLock(w,true);a.hits=5;w.step();assert.equal(w.specialStages.active,a);setDiagnosticHealthLock(w,false);w.step();assert.equal(w.specialStages.last?.result,'failed');
});
