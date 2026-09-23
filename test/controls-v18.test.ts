import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {distance} from '../src/simulation/movement/steering';
import {ControlSettings,controlPreferences} from '../src/ui/controls/settings';
import {SKILLS,stickSkill} from '../src/ui/controls/skills';
import {PadState,STANDARD,validMapping,type PadSnapshot} from '../src/ui/gamepad/state';
import {CONTROL_COMBAT as C} from '../src/data/control-tuning';
const setup=(initial:any=['marine'])=>{const w=new World({sandbox:true,waves:false,obstacles:[],initial});w.start();return w;};
const foe=(w:World,x:number,z=0)=>{const e=w.addUnit('zergling','zerg',x,z);e.hp=e.maxHp=100000;e.weaponDamage=0;e.moveSpeed=0;return e;};

test('opposite ambient wave first, then pod guards: neither anchor nor soldiers chase the old spawn',()=>{
 for(const input of ['point','direction'] as const){const w=setup(['marine','marauder','hellion','tank']),old=foe(w,-5);w.advance(.3);
  for(const u of w.allies())u.attackTarget=old.id;
  if(input==='point')w.issueMove({x:24,z:0});else w.input={x:1,z:0};
  w.advance(.2);const pod=w.spawnPod('marine',{x:8,z:0});pod.guardTypes=['zergling','zergling'];w.landPod(pod);
  const guards=[...pod.guardianIds].map(id=>w.entities.get(id)!);guards.forEach((e,i)=>{e.x=4+i;e.z=1;e.hp=e.maxHp=100000;e.moveSpeed=0;e.weaponDamage=0;});
  const start=w.anchor.x;let guardShot=false,last=w.anchor.x,minUnit=Infinity;
  for(let i=0;i<150;i++){w.step();assert.ok(w.anchor.x>=last-1e-8);last=w.anchor.x;
   for(const u of w.allies())minUnit=Math.min(minUnit,u.x);
   guardShot ||= guards.some(g=>g.hp<g.maxHp);
  }
  assert.ok(w.anchor.x>start+8,input);assert.ok(guardShot,input);assert.ok(minUnit>-4.6,'units were dragged backward');
  assert.ok(!w.order||w.order.kind==='move');assert.equal(old.x,-5);
 }
});
test('new forward guards supersede an old reachable rear target within one bounded think interval',()=>{
 const w=setup(),u=w.allies()[0],old=foe(w,-3);u.moveSpeed=0;u.weaponCooldown=10;w.input={x:1,z:0};w.step();assert.equal(u.attackTarget,old.id);
 const fresh=foe(w,4);w.advance(C.thinkSeconds+C.thinkSpread*4);assert.equal(u.attackTarget,fresh.id);assert.ok(w.anchor.x>0);assert.equal(w.order,null);
});
test('a destination is a snapshot, never tracks the enemy originally standing there',()=>{
 const w=setup(),e=foe(w,8);w.issueMove({x:e.x,z:e.z});e.x=40;w.advance(6);assert.ok(Math.abs(w.anchor.x-8)<.13);assert.ok(w.allies()[0].x<12);
});
test('a fresh reverse command does not retain the old direction in target priority',()=>{
 const w=setup(),u=w.allies()[0],right=foe(w,4),left=foe(w,-4);u.moveSpeed=0;u.weaponCooldown=10;w.input={x:1,z:0};w.advance(.1);assert.equal(u.attackTarget,right.id);
 w.input={x:-1,z:0};w.advance(.3);assert.equal(u.attackTarget,left.id);assert.ok(w.marchDirection.x<0);
});
test('automatic shots keep marching through the windup without shortening weapon cooldowns',()=>{
 for(const type of ['marine','marauder','hellion','tank'] as const){const w=setup([type]),u=w.allies()[0],e=foe(w,4,1);u.rank=5;w.refreshStats(u);w.input={x:1,z:0};let aimingTicks=0,aimingMovement=0,moved=0;
  for(let i=0;i<150;i++){e.x=u.x+4;e.z=u.z+1;const before={x:u.x,z:u.z};w.step();if(u.windup>0){aimingTicks++;aimingMovement+=distance(u,before);}else moved+=distance(u,before);}
  const shots=w.visualEvents.filter(e=>e.entityId===u.id&&e.kind==='attack');assert.ok(shots.length>=2,type);assert.ok(aimingTicks>=10,type);assert.ok(aimingMovement>.2,type);assert.ok(moved>1,type);
  for(let i=1;i<shots.length;i++)assert.ok(shots[i].time-shots[i-1].time>=Math.max(u.attackPeriod,C.repositionSeconds+C.movingWindup)-1/60-1e-8,type);
 }
});
test('repeated movement commands never retarget an already committed bullet or reset its cooldown',()=>{
 const w=setup(),u=w.allies()[0],old=foe(w,3);w.step();assert.ok(u.windup>0);const cooldown=u.weaponCooldown,other=foe(w,-3);w.issueMove({x:-15,z:0});assert.equal(u.weaponCooldown,cooldown);
 w.advance(.05);assert.ok(old.hp<old.maxHp);assert.equal(other.hp,other.maxHp);assert.equal(w.stats.shots,1);
});
test('automatic targeting does not repeatedly pick an economic actor through local combat threats',()=>{
 const w=setup(),threat=foe(w,4),egg=w.spawnEconomic('egg',{x:1,z:0});w.advance(1);assert.ok(threat.hp<threat.maxHp);assert.equal(egg.hp,egg.maxHp);
 w.hit(threat,1e9);w.advance(3);assert.equal(egg.status,'rescued');assert.equal(w.scvs,1);
});
test('stationary units keep defending locally but do not chase a remote attacker across the map',()=>{
 const w=setup(),u=w.allies()[0],e=foe(w,4);w.advance(1);assert.ok(e.hp<e.maxHp);const anchor={...w.anchor};e.x=30;w.advance(6);assert.deepEqual(w.anchor,anchor);assert.ok(distance(u,anchor)<8);
});
test('default and persisted movement settings are independently validated',()=>{
 assert.deepEqual(controlPreferences(null),{desktop:'mouse',touch:'joystick'});assert.deepEqual(controlPreferences({desktop:'broken',touch:'tap'}),{desktop:'mouse',touch:'tap'});
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)},c=new ControlSettings(storage);let changes=0;c.listeners.add(()=>changes++);
 c.set('desktop','keyboard');c.set('touch','tap');c.set('touch','tap');assert.equal(changes,2);assert.deepEqual(new ControlSettings(storage).report(),{desktop:'keyboard',touch:'tap'});
 assert.equal(c.pointerMoves('mouse'),false);assert.equal(c.pointerMoves('touch'),true);assert.equal(c.pointerMoves('pen'),true);
});
test('blocked browser storage does not prevent changing control modes',()=>{const c=new ControlSettings({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});c.set('desktop','keyboard');assert.equal(c.desktop,'keyboard');});
test('six fixed right-stick skill sectors retain selection at neutral and tolerate angular jitter',()=>{
 for(let i=0;i<SKILLS.length;i++){const a=i*Math.PI/3;assert.equal(stickSkill(Math.sin(a),-Math.cos(a),null),SKILLS[i].id);}
 assert.equal(stickSkill(0,0,'hero-nova'),'hero-nova');assert.equal(stickSkill(.1,.1,null),null);
 const a=Math.PI/6+.04;assert.equal(stickSkill(Math.sin(a),-Math.cos(a),'dash'),'dash');
});
test('right stick cannot become movement or menu navigation and old standard mappings still work',()=>{
 const old={...STANDARD};delete old.skillX;delete old.skillY;delete old.invertSkillX;delete old.invertSkillY;assert.ok(validMapping(old));
 const p:PadSnapshot={id:'test',index:0,connected:true,mapping:'standard',axes:[0,0,1,0],buttons:Array.from({length:17},()=>({value:0,pressed:false,touched:false}))};
 const sample=new PadState().sample(p,old,100);assert.deepEqual(sample.move,{x:0,z:0});assert.ok(sample.skill.x>.9);assert.equal(sample.menu,'');assert.equal(sample.neutral,false);
 assert.equal(validMapping({...STANDARD,skillX:99}),false);assert.equal(validMapping({...STANDARD,skillY:undefined}),false);
});
test('custom right axes are calibrated separately, including inversion, while left stick stays active',()=>{
 const p:PadSnapshot={id:'custom',index:0,connected:true,mapping:'',axes:[.8,0,0,-1],buttons:Array.from({length:17},()=>({value:0,pressed:false,touched:false}))};
 const mapping={...STANDARD,skillX:3,skillY:2,invertSkillX:-1};assert.ok(validMapping(mapping));const s=new PadState().sample(p,mapping,1);assert.ok(s.move.x>.7);assert.ok(s.skill.x>.9);
});

test('switching between moving and standing windups cannot shorten actual shot intervals',()=>{
 const w=setup(),u=w.allies()[0],e=foe(w,4,1);let previous=-100;
 for(let i=0;i<300;i++){w.input={x:i%40<20?1:0,z:0};e.x=u.x+4;e.z=u.z+1;w.step();if(u.lastShotAt!==previous&&previous>0)assert.ok(u.lastShotAt-previous>=u.attackPeriod-1e-8);previous=u.lastShotAt;}
 assert.ok(w.stats.shots>3);
});

test('friendly control tuning does not speed up enemy firing turns',()=>{
 const w=setup(),e=w.addUnit('roach','zerg',3,0);e.facing=Math.PI/2;const before=e.facing;w.hash.rebuild(w.entities.values());w.updateUnit(e,1/60);assert.ok(Math.abs(e.facing-before)<=9/60+1e-8);assert.ok(Math.abs(e.facing-before)>.1);
});
