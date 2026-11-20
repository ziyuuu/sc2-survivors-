import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {doomsdayIncoming,tickDoomsdayDefense,interceptDoomsdayFlight} from '../src/simulation/combat/doomsday-defense';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {ContactSolver} from '../src/simulation/movement/contacts';
import {modelPresentationScale} from '../src/data/combat-presentation';
import type {DoomsdayId} from '../src/data/terran-doomsday';
function make(...ids:DoomsdayId[]){const w=new World({race:'terran',seed:161102,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.expedition.doomsday=newDoomsdayState();for(const id of ids)w.expedition.doomsday.ranks[id]=1;return w;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('nano armor preserves absolute wounds through repeated refresh, with separate hit and movement circles',()=>{
 const w=make(),u=w.addUnit('tank','terran',0,0),base=u.maxHp,radius=u.unitRadius,armor=u.armor;u.hp-=30;
 Object.assign(w.expedition.doomsday!.ranks,{'M-B01':1,'M-B04':1});w.refreshStats(u);
 close(u.maxHp,base*1.2);close(u.hp,base*1.2-30);close(u.armor,armor+2);close(u.unitRadius,radius);close(u.movementRadius!,radius*.92*.8);close(modelPresentationScale(u),.82);
 for(let i=0;i<3;i++)w.refreshStats(u);close(u.hp,base*1.2-30);
 const restored=make();restored.restoreRun(w.captureRun());close(restored.entities.get(u.id)!.hp,u.hp);close(restored.entities.get(u.id)!.movementRadius!,u.movementRadius!);
});
test('contact solver separates by occupancy while target distance still uses the original hit circles',()=>{
 const w=make('M-B04');for(const u of w.allies())w.entities.delete(u.id);const a=w.addUnit('tank','terran',0,0),b=w.addUnit('tank','terran',0,0);const separation=a.unitRadius*1.8;b.z=separation;a.prev={x:a.x,z:a.z};b.prev={x:b.x,z:b.z};w.hash.rebuild(w.entities.values());
 assert.equal(new ContactSolver().resolve([a,b],w.hash,[],w.mapHalf,1/60),0);assert.equal(w.edgeDistance(a,b),0);
});
test('mechanization keeps identity and wounds, changes medical identity once, and excludes heroes',()=>{
 const w=make(),u=w.allies()[0],id=u.id,rank=u.rank,armor=u.armor;u.hp-=20;const hp=u.hp;w.expedition.doomsday!.ranks['M-P03']=1;w.refreshStats(u);w.refreshStats(u);
 assert.equal(u.id,id);assert.equal(u.rank,rank);close(u.hp,hp);close(u.armor,armor+2);assert.ok(u.attributes.includes('Mechanical'));assert.ok(!u.attributes.includes('Biological'));
 const restored=make();restored.restoreRun(w.captureRun());assert.deepEqual(restored.entities.get(id)!.attributes,u.attributes);
});
test('sloped armor distinguishes 49 and 51 degrees and convoy cover requires an intervening vehicle',()=>{
 const w=make('M-G09','M-W08'),car=w.addUnit('tank','terran',0,0),enemy=w.addUnit('roach','zerg',0,5);car.facing=0;
 for(const angle of [49,51]){enemy.x=Math.sin(angle*Math.PI/180)*5;enemy.z=Math.cos(angle*Math.PI/180)*5;close(doomsdayIncoming(w,car,enemy,true),angle===49?.85:1);}close(doomsdayIncoming(w,car,enemy,false),1);
 const soldier=w.allies()[0];soldier.x=0;soldier.z=0;car.z=2;enemy.x=0;enemy.z=6;close(doomsdayIncoming(w,soldier,enemy,true),.92);car.x=3;close(doomsdayIncoming(w,soldier,enemy,true),1);
});
test('scrap uses squad anchor, repairs once, and temporary expiry cannot drop parts',()=>{
 const w=make('M-G08'),dead=w.addUnit('tank','terran',0,0),patient=w.addUnit('tank','terran',0,1);patient.hp-=patient.maxHp*.5;w.anchor={x:10,z:0};w.hit(dead,dead.hp+1000,[],1,'zerg',0,1);assert.equal(w.expedition.doomsday!.scrap!.length,1);
 tickDoomsdayDefense(w);assert.equal(w.expedition.doomsday!.scrap!.length,1);w.anchor={x:0,z:0};const hp=patient.hp;tickDoomsdayDefense(w);close(patient.hp-hp,patient.maxHp*.12);tickDoomsdayDefense(w);close(patient.hp-hp,patient.maxHp*.12);
 const temporary=w.addUnit('tank','terran',0,0);temporary.temporary=true;w.expireUnit(temporary);assert.equal(w.expedition.doomsday!.scrap!.length,0);
});
test('interception consumes one eligible flight, persists shared cooldown, and leaves remaining damage real',()=>{
 for(const type of ['roach','ravager','hydralisk'] as const){const w=make('M-B06'),guard=w.addUnit('tank','terran',0,0),enemy=w.addUnit(type,'zerg',0,5);guard.hp=guard.maxHp=100000;enemy.weaponDamage=100;w.fire(enemy,guard);w.fire(enemy,guard);assert.equal(w.weaponFlights.length,2);interceptDoomsdayFlight(w);assert.equal(w.weaponFlights.length,1);const ready=w.expedition.doomsday!.interceptReady;const resumed=make();resumed.restoreRun(w.captureRun());interceptDoomsdayFlight(resumed);assert.equal(resumed.weaponFlights.length,1);assert.equal(resumed.expedition.doomsday!.interceptReady,ready);for(let i=0;i<90;i++){resumed.time+=1/60;resumed.tick++;tickWeaponFlights(resumed,1/60);}assert.ok(resumed.entities.get(guard.id)!.hp<100000);}
});
test('brace requires stationary chassis and actual nearby enemies before consuming its cooldown',()=>{
 const w=make('M-B08'),thor=w.addUnit('thor','terran',0,0),enemy=w.addUnit('roach','zerg',0,1.5);thor.velocity={x:1,z:0};tickDoomsdayDefense(w);assert.equal(thor.doomsday!.brace!.readyTick,0);thor.velocity={x:0,z:0};for(let i=0;i<89;i++)tickDoomsdayDefense(w);assert.equal(thor.doomsday!.brace!.readyTick,0);tickDoomsdayDefense(w);assert.equal(thor.doomsday!.brace!.readyTick,w.tick+720);assert.ok(enemy.stoppedUntil!>w.time);
});
test('wider flame hits the newly covered side band once without extending its forward range',()=>{
 const w=make(),car=w.addUnit('hellion','terran',0,0),main=w.addUnit('roach','zerg',0,4),side=w.addUnit('roach','zerg',.17,4);main.hp=side.hp=100000;main.armor=side.armor=0;side.unitRadius=0;w.hash.rebuild(w.entities.values());w.fire(car,main);assert.equal(side.hp,100000);w.expedition.doomsday!.ranks['M-W02']=1;w.fire(car,main);assert.equal(side.hp,100000);w.expedition.doomsday!.ranks['M-W02']=3;w.fire(car,main);close(100000-side.hp,car.weaponDamage);
});
