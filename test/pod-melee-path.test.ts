import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';

test('a melee fighter reaches a guard on the far side of a friendly rescue pod',()=>{
 const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});
 w.start();
 const zealot=w.allies()[0];
 zealot.x=8.97;zealot.z=2.61;zealot.prev={x:zealot.x,z:zealot.z};
 w.anchor={x:9.93,z:3.15,facing:0};
 const pod=w.spawnPod('zealot',{x:10.75,z:2.25});
 pod.guardTypes=[];
 w.landPod(pod);
 const guard=w.addUnit('zergling','zerg',10.73,3.85);
 guard.guardianPod=pod.id;
 guard.guardOrigin=true;
 guard.moveSpeed=0;
 guard.weaponDamage=0;
 guard.hp=guard.maxHp=100;
 pod.guardianIds.add(guard.id);
 const before=guard.hp;
 for(let i=0;i<360&&guard.hp===before;i++)w.step();
 assert.ok(guard.hp<before,`the zealot stayed \${Math.hypot(zealot.x-guard.x,zealot.z-guard.z).toFixed(2)} units from its guard`);
});
