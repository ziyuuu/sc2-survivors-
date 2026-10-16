import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {SkillEffects} from '../src/render/effects/confirmed-hero/skill-effects';
import {castExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {sourceEndingTimes} from '../src/render/effects/source/player';
import {equipmentPresentation,equipmentPresentationReceipts,equipmentBurnZone} from '../src/simulation/starship/presentation';
import {createEquipmentProjections,retireEquipmentProjection} from '../src/simulation/starship/projections';
import {equipmentApparition} from '../src/render/units/equipment-apparition';
import {equipmentEffectRequests,equipmentMarkers,equipmentFallbackRoutes} from '../src/render/effects/equipment-effects';
import {UnitMaterialSurface} from '../src/render/materials/unit-material-batch';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog';
const world=()=>new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});

test('equipment receipts freeze committed positions without consuming either random stream',()=>{
 const w=world();w.start();const u=w.allies()[0],v=w.addUnit('zergling','zerg',4,4),rng=w.rngState,account=JSON.stringify(w.starship.account);
 equipmentPresentation(w,'derived-hit',u,v);const receipt=equipmentPresentationReceipts(w)[0],original=structuredClone(receipt);u.x+=40;v.z-=20;v.hp=0;w.entities.delete(v.id);
 assert.deepEqual(receipt,original);assert.equal(w.rngState,rng);assert.equal(JSON.stringify(w.starship.account),account);
 w.time=1;equipmentPresentation(w,'capture',u);w.time=0;assert.equal(equipmentPresentationReceipts(w).length,0);
});
test('phantom child bodies get independent appearance; retirement records each living body once',()=>{
 const w=world();w.start();const u=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);const children=ownedInterceptors(w,u.id),child=children[0];assert.ok(child);
 const copies=createEquipmentProjections(w,u,1,'phantom',8,.5,.5);assert.equal(copies.length,1);const mother=copies[0],copiedChild=[...w.entities.values()].find(v=>v.summonOwnerId===mother.id)!;assert.ok(copiedChild);
 assert.equal(equipmentApparition(w,u.id),undefined);assert.equal(equipmentApparition(w,child.id),undefined);assert.equal(equipmentApparition(w,mother.id)?.opacity,.7);assert.deepEqual(equipmentApparition(w,mother.id),equipmentApparition(w,copiedChild.id));
 assert.equal(equipmentPresentationReceipts(w).filter(e=>e.kind==='projection-birth').length,1+children.length);retireEquipmentProjection(w,mother.id);retireEquipmentProjection(w,mother.id);assert.equal(equipmentPresentationReceipts(w).filter(e=>e.kind==='projection-end').length,1+children.length);
});
test('material slots isolate apparitions and reset reused slots without modifying original material',()=>{
 const profile=Object.values(UNIT_MATERIAL_CATALOG)[0],source=profile.materials[0],material=new THREE.MeshStandardMaterial(),surface=new UnitMaterialSurface({profile,source,textures:{}},material,3),pose={clip:profile.clips[0]?.name??'',seconds:0};
 const context={entityId:1,runId:'a',time:0,apparition:{tint:[.1,.2,1] as const,opacity:.7}},row=surface.texture.image.height-1;
 surface.write(0,pose,context);surface.write(1,pose);surface.write(2,pose,{...context,apparition:{tint:[.4,.5,1],opacity:.5}});
 const read=(slot:number)=>Array.from(surface.data.slice((row*3+slot)*4,(row*3+slot+1)*4));assert.deepEqual(read(1),[1,1,1,1]);assert.equal(read(0)[3],Math.fround(.7));assert.equal(read(2)[3],.5);surface.write(0,pose);assert.deepEqual(read(0),[1,1,1,1]);assert.equal(material.opacity,1);assert.equal(material.transparent,false);assert.equal(material.color.getHex(),0xffffff);
 surface.material.dispose();surface.texture.dispose();material.dispose();
});
test('fire follows real creation time, radius and lifetime; paused requests are identical',()=>{
 const w=world();w.start();w.time=10;const zone=equipmentBurnZone(w,{source:'test',x:7,z:8,radius:3,damage:10,next:11,until:14});w.starship.burnZones.push(zone);w.time=11;
 const first=equipmentEffectRequests(w,()=>2),again=equipmentEffectRequests(w,()=>2);assert.deepEqual(first,again);assert.ok(first.length>1);for(const r of first){assert.equal(r.age,1);assert.equal(r.placement.y,2);assert.ok(Math.hypot(r.placement.x-zone.x,r.placement.z-zone.z)<zone.radius);assert.ok(r.loop&&r.clip);}
 w.time=14.1;assert.equal(equipmentEffectRequests(w,()=>2).length,0);
});

test('derived hits retain committed endpoints after death; original missiles do not get duplicate tracer geometry',()=>{
 const w=world();w.start();const marine=w.allies()[0],enemy=w.addUnit('zergling','zerg',8,9),marauder=w.addUnit('marauder','terran',0,0);
 equipmentPresentation(w,'derived-hit',marine,enemy);equipmentPresentation(w,'derived-hit',marauder,enemy);
 const routes=equipmentFallbackRoutes(w,()=>0);assert.equal(routes.length,1);assert.equal(routes[0].to.x,8);
 enemy.x=25;enemy.hp=0;assert.deepEqual(equipmentFallbackRoutes(w,()=>0),routes);w.time+=.13;assert.equal(equipmentFallbackRoutes(w,()=>0).length,0);
});

test('additional hero areas and status markers use committed radius and actual expiry without mutating state',()=>{
 const w=world();w.start();const u=w.allies()[0];equipmentPresentation(w,'hero-extra',u,{...u,x:12,z:15},'tychus',2);
 w.starship.hero.seals.set(u.id,w.time+4);const before=w.rngState,markers=equipmentMarkers(w);assert.ok(markers.some(m=>m.p.x===12&&m.radius===2));assert.ok(markers.some(m=>m.p===u&&m.color===0xce65ff));assert.equal(w.rngState,before);
 w.time+=.36;assert.ok(!equipmentMarkers(w).some(m=>m.p.x===12));w.time+=4;assert.ok(!equipmentMarkers(w).some(m=>m.color===0xce65ff));
});

test('overlapping Swann pulses display each real patient once through polluted protection, then remove it',()=>{
 const w=world(),a=w.starship.account;for(const slot of ATTRIBUTE_SLOTS.slice(0,6)){const result=grantEquipment(a,{template:'set.orange.corrupted_hero.5',race:'terran',slot,binding:{hero:'swann'},polluted:true},slot,{kind:'warehouse'});assert.ok(result.ok);a.dust=1e6;assert.ok(cleanseEquipment(a,result.value.id).ok);assert.ok(w.equipItem(result.value.id,slot).ok);}w.start();
 const u=w.heroEntity('swann')!;u.x=u.z=0;for(const id of w.entities.keys())if(id!==u.id)w.entities.delete(id);for(let i=0;i<12;i++){const patient=w.addUnit('tank','terran',Math.sin(i)*3,Math.cos(i)*3);patient.hp=1;}
 w.hash.rebuild(w.entities.values());w.heroes.get('swann')!.skillReady=0;assert.ok(castExpeditionHero(w,'swann'));assert.equal(w.heroCasts.length,4);
 const view:any={scene:new THREE.Scene(),gpu:new Map(),fx:{emit(){},heroQuality:'full'}},effects=new SkillEffects(view,w);for(const c of w.heroCasts)effects.begin('swann',[c],u);
 w.time=8.5;effects.render();assert.equal(effects.visualState().shields,12);effects.render();assert.equal(effects.visualState().shields,12);w.time=10;effects.render();assert.equal(effects.visualState().shields,0);
});

test('skill instance growth retains every prior transform rather than dropping additional shields',()=>{
 const w=world(),view:any={scene:new THREE.Scene(),gpu:new Map(),fx:{emit(){},heroQuality:'full'}},effects=new SkillEffects(view,w) as any;
 for(let i=0;i<600;i++)effects.draw('shield',{x:i,y:2,z:3},{x:1,y:2,z:1},0x8ac9a6);
 const batch=effects.batches.get('shield');assert.equal(batch.count,600);assert.equal(batch.mesh.instanceMatrix.count,1024);const m=new THREE.Matrix4();for(const i of [0,255,256,511,599]){batch.mesh.getMatrixAt(i,m);assert.equal(m.elements[12],i);assert.equal(m.elements[13],2);}
});

test('finite fire channels age from their actual expiry across skipped frames, while native indefinite endings are unchanged',()=>{
 const request={key:'fire',model:'ImpactModelFlames',age:1,seed:1,placement:{x:0,y:0,z:0,facing:0},stopTime:14};
 assert.deepEqual(sourceEndingTimes(request,11,14,30),{age:16,stopAge:4});
 assert.deepEqual(sourceEndingTimes({...request,stopTime:undefined},11,30,30.5),{age:.5,stopAge:1});
 assert.deepEqual(sourceEndingTimes(request,11,12,12),{age:0,stopAge:2});
});

test('coincident fields keep distinct birth keys and rendering other worlds cannot change their seeds',()=>{
 const setup=()=>{const w=world();w.start();for(let i=0;i<2;i++)w.starship.burnZones.push(equipmentBurnZone(w,{source:'same',x:1,z:2,radius:2,damage:1,next:1,until:4}));w.time=.2;return w;};
 const first=equipmentEffectRequests(setup(),()=>0);equipmentEffectRequests(setup(),()=>0);const second=equipmentEffectRequests(setup(),()=>0);assert.equal(new Set(first.map(r=>r.key)).size,first.length);assert.deepEqual(first,second);
});
