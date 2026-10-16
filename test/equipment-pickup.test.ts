import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,discardEquipment,itemsAt,BACKPACK_CAPACITY} from '../src/simulation/starship/inventory';
import {collectNearbyEquipment} from '../src/simulation/starship/drops';
import {registerEquipmentDrop,equipmentGroundDrops,equipmentLandingPoint,pruneEquipmentLoot} from '../src/simulation/starship/loot-presentation';
import {EquipmentLootAudio} from '../src/render/effects/equipment-loot-audio';
import {EQUIPMENT_ABSORB_SECONDS,equipmentDropLift,equipmentAbsorb,layoutEquipmentLabels} from '../src/render/units/equipment-loot-style';
import type {Quality} from '../src/simulation/starship/types';
import {createWorldStarshipHost} from '../src/ui/starship/world-host';
const world=()=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});w.start();return w;};
function drop(w:World,q:Quality=3,x=6,z=0){const r=grantEquipment(w.starship.account,{template:q===5?'set.orange.hero.5':'attribute.'+q,race:'terran',slot:'offense1',binding:q===5?{hero:'raynor'}:undefined},'test-drop:'+w.starship.account.serial,{kind:'ground',run:w.starship.account.run!.id,x,z});assert.ok(r.ok);assert.equal(registerEquipmentDrop(w,r.value),true);return r.value;}

test('actual inventory success emits one pickup; pause, decision and radius cannot collect or replay',()=>{
 const w=world(),a=w.starship.account,item=drop(w),rng=w.rngState,gearRng=a.rng;
 assert.equal(registerEquipmentDrop(w,item),false);assert.equal(w.starship.loot.events.length,1);
 w.anchor={x:3.49,z:0};collectNearbyEquipment(w);assert.equal(a.locations[item.id].kind,'ground');
 w.anchor={x:3.5,z:0};w.paused=true;collectNearbyEquipment(w);assert.equal(a.locations[item.id].kind,'ground');w.paused=false;
 const release=w.acquireInterfacePause();collectNearbyEquipment(w);assert.equal(a.locations[item.id].kind,'ground');release();
 collectNearbyEquipment(w);assert.equal(a.locations[item.id].kind,'backpack');const events=w.starship.loot.events,receipt=events.find(e=>e.kind==='pickup')!;assert.equal(receipt.item!.id,item.id);assert.equal(receipt.backpack,1);assert.equal(receipt.x,6);
 for(let n=0;n<12;n++)collectNearbyEquipment(w);assert.equal(events.filter(e=>e.kind==='pickup').length,1);assert.equal(w.starship.loot.events.filter(e=>e.kind==='pickup').length,1);assert.equal(w.rngState,rng);assert.equal(a.rng,gearRng);assert.equal(equipmentGroundDrops(w).length,0);
});
test('full backpack preserves the exact dropped item, warns once, then collects after real space is freed',()=>{
 const w=world(),a=w.starship.account;for(let n=0;n<BACKPACK_CAPACITY;n++){const r=grantEquipment(a,{template:'attribute.1',race:'terran',slot:'offense1'},'pack:'+n,{kind:'backpack',run:a.run!.id});assert.ok(r.ok);}
 const item=drop(w,4,0,0),before=structuredClone(item),rng=a.rng;
 for(let n=0;n<20;n++){w.time+=.1;collectNearbyEquipment(w);}assert.equal(a.locations[item.id].kind,'ground');assert.deepEqual(a.items[item.id],before);assert.equal(a.rng,rng);assert.equal(w.starship.loot.events.filter(e=>e.kind==='full').length,1);assert.equal(w.starship.loot.events.filter(e=>e.kind==='pickup').length,0);
 assert.ok(discardEquipment(a,itemsAt(a,'backpack')[0].id).ok);collectNearbyEquipment(w);assert.equal(a.locations[item.id].kind,'backpack');assert.equal(itemsAt(a,'backpack').length,64);assert.equal(w.starship.loot.events.filter(e=>e.kind==='pickup').length,1);
});
test('ground is reachable for air kills, pickup cannot cross a wall, and previous-map loot stays off the new map',()=>{
 const w=world(),item=drop(w,3,2,0);w.obstacles=[{x:1,z:0,w:.3,h:5}];collectNearbyEquipment(w);assert.equal(w.starship.account.locations[item.id].kind,'ground');
 const original={x:1,z:0},point=equipmentLandingPoint(w,original);assert.ok(Math.abs(point.x-1)>.35||Math.abs(point.z)>2.7);assert.deepEqual(original,{x:1,z:0});
 w.terrain=new FlatTerrain();assert.equal(equipmentGroundDrops(w).length,0);collectNearbyEquipment(w);assert.equal(w.starship.account.locations[item.id].kind,'ground');
 const air=drop(w,4,w.mapHalf+4,w.mapHalf+4),loc=w.starship.account.locations[air.id];assert.equal(loc.kind,'ground');if(loc.kind==='ground')assert.ok(w.terrain.canOccupy({x:loc.x!,z:loc.z!},.2));
});
test('read-only projection and native-clock presentation never mutate item, world RNG or account RNG',()=>{
 const w=world();drop(w);const before=structuredClone(w.starship.account),rng=w.rngState;for(let n=0;n<5;n++)equipmentGroundDrops(w);assert.deepEqual(w.starship.account,before);assert.equal(w.rngState,rng);
 assert.equal(equipmentDropLift(Infinity),0);assert.equal(equipmentDropLift(.8),0);assert.equal(equipmentDropLift(.2),equipmentDropLift(.2));
 const from={x:5,y:0,z:2},to={x:0,y:1,z:0};assert.deepEqual(equipmentAbsorb(from,to,0),{...from,scale:1});const end=equipmentAbsorb(from,to,EQUIPMENT_ABSORB_SECONDS);assert.ok(Math.hypot(end.x-to.x,end.y-to.y,end.z-to.z)<1e-9);
 w.time=5;pruneEquipmentLoot(w);assert.equal(w.starship.loot.events.length,0);assert.equal(equipmentGroundDrops(w).length,1);
});
test('drop bursts use one highest-quality sound and independent sound cursors, without replay on subsequent updates',()=>{
 const w=world(),audio=new EquipmentLootAudio();for(const q of [1,2,3,4,5] as Quality[])drop(w,q);assert.equal(audio.update(w),undefined);w.time=.11;assert.deepEqual(audio.update(w),{kind:'drop',quality:5,at:0});assert.equal(audio.update(w),undefined);
 w.anchor={x:6,z:0};collectNearbyEquipment(w);assert.equal(audio.update(w),undefined);w.time=.37;const next=audio.update(w);assert.equal(next?.kind,'pickup');assert.equal(itemsAt(w.starship.account,'backpack').length,5);assert.equal(w.starship.loot.events.filter(e=>e.kind==='pickup').length,5);w.paused=true;w.time=.5;assert.equal(audio.update(w),undefined);
});
test('labels group dense drops by quality and avoid actual HUD rectangles without changing object count',()=>{
 const input=Array.from({length:40},(_,n)=>({id:String(n),x:200+n%3,y:180+n%2,width:140,quality:(n%5+1) as Quality,distance:5,name:'fixture'}));const before=structuredClone(input),placed=layoutEquipmentLabels(input,390,700,[{left:0,top:0,right:390,bottom:95}]);assert.equal(placed.length,1);assert.equal(placed[0].quality,5);assert.equal(placed[0].extra,39);assert.ok(placed[0].top>=95);assert.deepEqual(input,before);
});
test('map changes discard pending loot sounds and a real polluted receipt carries its distinct cue',()=>{
 const w=world(),audio=new EquipmentLootAudio();drop(w,4);audio.update(w);w.terrain=new FlatTerrain();w.time=.2;assert.equal(audio.update(w),undefined);
 const a=w.starship.account,result=grantEquipment(a,{template:'attribute.4',race:'terran',slot:'offense1',polluted:true},'pollution-audio',{kind:'ground',run:a.run!.id,x:6,z:0});assert.ok(result.ok);registerEquipmentDrop(w,result.value);audio.update(w);w.time=.31;assert.equal(audio.update(w)?.polluted,true);
});
test('independent UI host shares range, terrain, successful receipt and full-bag presentation with automatic pickup',()=>{
 const w=world(),h=createWorldStarshipHost(w,{resolveImage:key=>key}),item=drop(w,3,6,0),held=h.acquireWindow();
 assert.equal(h.pickup(item.id).ok,false);w.anchor={x:4,z:0};w.obstacles=[{x:5,z:0,w:.2,h:4}];assert.equal(h.pickup(item.id).ok,false);w.obstacles=[];
 assert.equal(h.pickup(item.id).ok,true);assert.equal(w.starship.account.locations[item.id].kind,'backpack');assert.equal(w.starship.loot.events.filter(e=>e.kind==='pickup').length,1);assert.equal(h.pickup(item.id).ok,false);assert.equal(w.starship.loot.events.filter(e=>e.kind==='pickup').length,1);held();h.dispose?.();
});
