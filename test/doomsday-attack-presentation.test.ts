import test from 'node:test';
import assert from 'node:assert/strict';
import {doomsdayScenario} from '../preview/doomsday-showcase-20261117/scenarios';
import {DOOMSDAY_STYLE as S,customDoomsdayShot,doomsdayGrowthTier,doomsdayOwnsFlight,doomsdayShotStyle,doomsdayRefitStyle} from '../src/simulation/combat/doomsday-presentation';
import * as THREE from 'three';
import {DoomsdayPrimitives} from '../src/render/effects/doomsday-primitives';
import {DoomsdayRefitViews} from '../src/render/effects/doomsday-refit-views';
import {armMagazine,phaseCollapse,repairMist} from '../src/render/effects/doomsday-node-views';
import {beginDoomsdayRound} from '../src/simulation/combat/doomsday-combat';
import {newDoomsdayState,validateDoomsdayCombat} from '../src/simulation/combat/doomsday-state';

test('personal armor respects veteran ranks and polarization visuals require a mechanical member',()=>{
 const {world:w,mainId}=doomsdayScenario('M-W01'),marine=w.entities.get(mainId)!;
 const state=w.expedition.doomsday=newDoomsdayState();w.expedition.build!.main='doomsday';
 const tank=w.addUnit('tank','terran',2,-1,5);
 state.ranks={'M-P01':2,'M-P03':1};state.veterans.push({entityId:tank.id,bornAt:tank.bornAt,family:'tank',ranks:{}});
 assert.equal(doomsdayGrowthTier(w,tank),0);assert.equal(doomsdayGrowthTier(w,marine),1);
 delete state.ranks['M-P03'];marine.rank=10;
 assert.equal(doomsdayGrowthTier(w,marine),0);state.ranks['M-N03']=1;
 assert.equal(doomsdayGrowthTier(w,marine),0);assert.equal(doomsdayRefitStyle(w,marine),undefined);
 state.ranks['M-P03']=1;
 assert.equal(doomsdayGrowthTier(w,marine),3);assert.deepEqual(doomsdayRefitStyle(w,marine),[0,0,0,6]);
 marine.shotSequence=1;marine.lastShotAt=w.time;
 assert.equal(doomsdayRefitStyle(w,marine)?.[3],6.75);
 marine.lastShotAt=w.time-.3;assert.equal(doomsdayRefitStyle(w,marine)?.[3],6);
 tank.rank=7;assert.equal(doomsdayGrowthTier(w,tank),2);
 marine.temporary=true;assert.equal(doomsdayGrowthTier(w,marine),0);
});

test('a launched shell and its restored checkpoint keep their original grade and loaded ammunition',()=>{
 const {world:w,mainId}=doomsdayScenario('M-P01',1,false,undefined,{group:'tiger',stage:2});
 w.paused=false;
 for(let i=0;i<90&&!w.weaponFlights.length;i++)w.step();
 const shot=w.weaponFlights.find(f=>f.source.id===mainId)!;
 assert.ok(shot);const frozen=doomsdayShotStyle(w,shot.source);
 assert.ok(frozen&S.breakthrough);assert.equal(frozen&S.polarized,0);
 const main=w.entities.get(mainId)!;w.expedition.doomsday!.ranks['M-N03']=1;main.rank=10;
 main.doomsday!.nanoAmmo=true;beginDoomsdayRound(w,main);
 assert.ok(doomsdayShotStyle(w,main)&S.nano);main.doomsday!.nanoAmmo=false;
 assert.ok(doomsdayShotStyle(w,main)&S.nano);assert.ok(doomsdayShotStyle(w,main)&S.polarized);
 assert.equal(doomsdayShotStyle(w,shot.source),frozen);
 w.restoreRun(w.captureRun());assert.equal(doomsdayShotStyle(w,w.weaponFlights[0].source),frozen);
 const old=w.weaponFlights[0].source;delete old.doomsday!.round!.shotStyle;
 assert.doesNotThrow(()=>validateDoomsdayCombat(old.doomsday));
 assert.ok(doomsdayShotStyle(w,old)&S.breakthrough);assert.equal(doomsdayShotStyle(w,old)&S.polarized,0);
});

test('the third siege shot records only real rear contacts, independently of outer splash',()=>{
 const {world:w}=doomsdayScenario('M-P05',1,false,undefined,{group:'tiger',stage:4});
 w.paused=false;let serial=0;const contacts:number[]=[];
 for(let i=0;i<240;i++){w.step();for(const e of w.visualEvents)if(e.serial>serial){
  serial=e.serial;if(e.doomsdayEffect==='bore-hit'){contacts.push(e.shotSequence!);assert.ok(e.doomsdayOrigin);assert.ok(e.end.z>e.doomsdayOrigin!.z);}
 }}
 assert.ok(contacts.length>=2);assert.ok(contacts.every(n=>n%3===0));
});

test('a card overlay leaves the native attack, missile and impact available to their weapon renderer',()=>{
 const {world:w,mainId}=doomsdayScenario('M-P01',1,false,undefined,{group:'tiger',stage:2});
 w.paused=false;
 for(let i=0;i<90&&!w.weaponFlights.length;i++)w.step();
 const shell=w.weaponFlights.find(f=>f.source.id===mainId)!;
 const style=S.phase|S.nano|S.bore|S.polarized|S.armor|S.breakthrough;
 shell.source.doomsday!.round!.shotStyle=style;
 assert.equal(customDoomsdayShot(style),false);
 assert.equal(doomsdayOwnsFlight(w,shell),false);
 assert.equal(doomsdayOwnsFlight(w,{...shell,doomsdayDerived:{round:'test',kind:'split',penetration:0}}),true);
 assert.equal(customDoomsdayShot(S.giant|style),true);
 assert.equal(customDoomsdayShot(S.sword),true);
});

test('repair stays on the patient, ammunition lights its own gun, and the dark core follows impact',()=>{
 const draw=new DoomsdayPrimitives(new THREE.Group());
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
 function points(name:string){
  const batch=draw.root.getObjectByName('doomsday-'+name) as THREE.InstancedMesh|undefined;
  return Array.from({length:batch?.count??0},(_,i)=>{
   batch!.getMatrixAt(i,matrix);return position.setFromMatrixPosition(matrix).clone();
  });
 }
 draw.begin();
 repairMist(draw,{x:-5,y:1,z:0},{x:0,y:1,z:0},1,.23,'engineer',true,31);
 armMagazine(draw,{x:4,y:1,z:0},{x:6,y:1.4,z:0},.12);
 draw.end();
 assert.ok(points('mist').length>0&&points('mist').every(p=>p.x> -1.3&&p.x<0));
 assert.ok(points('scan').some(p=>p.x<0)&&points('scan').some(p=>p.x>4&&p.x<6));
 assert.equal(points('beam').length,0);
 draw.begin();phaseCollapse(draw,{x:3,y:2,z:1},0,true,false,9);draw.end();
 assert.equal(points('vortex').length,0);
 draw.begin();phaseCollapse(draw,{x:3,y:2,z:1},.15,true,false,9);draw.end();
 assert.deepEqual(points('vortex').map(p=>p.toArray()),[[3,2,1]]);
 draw.reset();assert.equal(draw.count(),0);draw.dispose();
});

test('a stowed sword submits no detached hilt, while a swing samples the cannon grip and guide',()=>{
 const {world:w}=doomsdayScenario('M-O02',2);
 const view=new DoomsdayRefitViews(new THREE.Group()),sockets=new Set<string>();
 const render=()=>view.update(w,()=>2,()=>true,(_u,_action,_time,side)=>{
  sockets.add(side);return {x:0,y:1,z:side==='SwordGuide'?1:0};
 });
 render();assert.ok(!sockets.has('SwordGrip'));
 w.paused=false;
 while(!w.expedition.doomsday!.slashes?.length&&w.tick<120)w.step();
 render();assert.ok(sockets.has('SwordGrip')&&sockets.has('SwordGuide'));
 view.dispose();
});

test('one phase fold follows the original hostile flank, including when one shot breaks shield and costs HP',()=>{
 const {world:w,mainId}=doomsdayScenario('M-B04'),tank=w.entities.get(mainId)!;
 const attacker=[...w.entities.values()].find(e=>e.owner==='zerg')!;
 const start={x:attacker.x,z:attacker.z};
 w.expedition.doomsday!.ranks['M-G02']=1;w.refreshStats(tank);
 const shield=tank.doomsday!.nano!,hp=tank.hp;
 w.hit(tank,shield.remaining+25,[],1,'zerg',.5,0,attacker.id);
 assert.ok(shield.remaining===0&&tank.hp<hp);
 const contacts=w.visualEvents.filter(e=>e.doomsdayOrigin&&['hit','shield-break'].includes(e.kind));
 assert.equal(contacts.length,2);
 attacker.x=tank.x+9;attacker.z=tank.z;
 assert.ok(contacts.every(e=>e.doomsdayOrigin?.x===start.x&&e.doomsdayOrigin.z===start.z));
 const scene=new THREE.Group(),view=new DoomsdayRefitViews(scene);
 const before=JSON.stringify(w.captureRun());view.update(w,()=>1.8,()=>true);
 const well=scene.getObjectByName('doomsday-well') as THREE.InstancedMesh;
 assert.equal(well.count,1);
 const position=new THREE.Vector3(),matrix=new THREE.Matrix4();
 well.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);
 assert.ok(position.x<tank.x&&position.z>tank.z);
 assert.equal(JSON.stringify(w.captureRun()),before);
 w.time+=.51;view.update(w,()=>1.8,()=>true);assert.equal(well.count,0);
 view.dispose();
});
