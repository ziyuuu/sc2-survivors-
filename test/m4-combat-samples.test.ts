import {settleWeaponFlights} from './helpers/weapon-flight';
import {tickProtossEliteState} from '../src/simulation/combat/protoss-elite-runtime';
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {ELITES} from '../src/data/elites';
import {modelPresentationAccent,modelPresentationScale,attackPresentation} from '../src/data/combat-presentation';
import {castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {expeditionAttackRange,tickAutoAbilities,tickAreaSpells} from '../src/simulation/combat/expedition-combat';
import {SOURCE_ABILITIES} from '../src/data/expansion-units';
import {BILE} from '../src/data/sc2-units';

const make=(race:'terran'|'zerg'|'protoss')=>{const w=new World({race,seed:67,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();return w;};
const foe=(w:World,x:number,z=0,flying=false)=>{const e=w.addUnit(flying?'mutalisk':'roach','zerg',x,z);e.hp=e.maxHp=10000;e.armor=0;w.hash.rebuild(w.entities.values());return e;};

test('current elite identities use the formal rules for all three variants',()=>{
 for(const family of ['viking','ravager','high_templar'])assert.deepEqual(Object.values(ELITES).filter(e=>e.family===family).map(e=>e.id),[`${family}.1`,`${family}.2`,`${family}.3`]);
});

test('elite family choice spends once, rejects implicit or cross-family selections, and keeps other variants available',()=>{
 const w=make('terran');w.expedition.familySlots.push('viking');w.expedition.tech.starport=1;const v=w.addUnit('viking','terran',1,0);w.refreshStats(v);
 assert.deepEqual(w.eliteVariants('viking').map(e=>e.id),['viking.1','viking.2','viking.3']);assert.equal(w.resolveEliteVariant('viking'),null);assert.equal(w.resolveEliteVariant('viking','ravager.2'),null);
 assert.equal(w.resolveEliteVariant('viking','viking.2'),'viking.2');assert.equal(w.acquireElite('viking.2'),true);assert.deepEqual(w.eliteVariants('viking').map(e=>e.id),['viking.1','viking.2','viking.3']);
 const copy=make('terran');copy.restoreRun(w.captureRun());assert.equal(copy.eliteOwned('viking.2')?.rank,1);assert.deepEqual(copy.eliteVariants('viking').map(e=>e.id),['viking.1','viking.2','viking.3']);
});

test('three highlighted new variants apply only their approved target, radius, or storm conditions',()=>{
 const t=make('terran'),v=t.addUnit('viking','terran',0,0);v.eliteId='viking.2';t.refreshStats(v,true);
 const armoredAir=foe(t,3,0,true);armoredAir.attributes=['Armored','Biological'];

 armoredAir.flying=false;
 v.eliteId='viking.3';v.nativeMode='viking_assault';assert.equal(expeditionAttackRange(t,v)-expeditionAttackRange(t,{...v,eliteId:'viking.2'}),0);
 v.nativeMode='viking_fighter';assert.equal(expeditionAttackRange(t,v)-expeditionAttackRange(t,{...v,eliteId:'viking.2'}),0);

 const z=make('zerg'),r=z.addUnit('ravager','terran',0,0);r.eliteId='ravager.2';z.refreshStats(r,true);const bileTarget=foe(z,4,0);r.bileCooldown=0;z.expedition.tech.bile=1;z.updateBile(r,0);
 const bile=z.zergElites.biles[0];assert.ok(bile);assert.equal(bile.radius,BILE.radius*1.5);
 const edge=foe(z,bileTarget.x+BILE.radius+bileTarget.unitRadius+.05,0);edge.weaponDamage=0;edge.moveSpeed=0;bileTarget.weaponDamage=0;bileTarget.moveSpeed=0;
 const edgeHp=edge.hp;z.paused=false;z.advance(BILE.delay+.05);assert.ok(edge.hp<edgeHp,'enlarged warning radius also deals real damage at its edge');

 const p=make('protoss'),templar=p.addUnit('high_templar','terran',0,0);templar.eliteId='high_templar.3';p.refreshStats(templar,true);templar.energy=templar.maxEnergy=200;p.expedition.tech.storm=1;
 const victim=foe(p,4,0);tickAutoAbilities(p,templar);
 const spell=p.protossElites.fields.find(effect=>effect.kind==='storm');assert.ok(spell);
 assert.equal(spell.amount,1200/SOURCE_ABILITIES.psiStorm.searchPeriods);
 const before=victim.hp;p.time=spell.next;tickProtossEliteState(p);
 assert.ok(Math.abs(before-victim.hp-spell.amount)<1e-8);
});

test('Raynor piercing shot advances over 0.2 seconds and saved mid-flight targets are hit once',()=>{
 const w=make('terran');assert.ok(w.acquireHero('raynor'));const hero=w.heroEntity('raynor')!;hero.x=hero.z=0;const near=foe(w,4),far=foe(w,9);w.hash.rebuild(w.entities.values());
 assert.ok(castExpeditionHero(w,'raynor'));assert.equal(w.heroCasts[0].phase,'line-travel');w.time=.08;resolveExpeditionHeroCasts(w);assert.equal(near.hp,4940);assert.equal(far.hp,10000);assert.deepEqual(w.heroCasts[0].hitIds,[near.id]);
 const copy=make('terran');copy.restoreRun(w.captureRun());copy.paused=false;copy.time=.16;copy.hash.rebuild(copy.entities.values());resolveExpeditionHeroCasts(copy);assert.equal(copy.entities.get(near.id)!.hp,4940);assert.equal(copy.entities.get(far.id)!.hp,4940);copy.time=.2;resolveExpeditionHeroCasts(copy);assert.equal(copy.heroCasts.length,0);assert.equal(copy.entities.get(near.id)!.hp,4940);assert.equal(copy.entities.get(far.id)!.hp,4940);
});

test('Dehaka committed primary keeps its own ground identity; Fenix retains bounded secondary damage',()=>{
 const z=make('zerg');assert.ok(z.acquireHero('dehaka'));const dehaka=z.heroEntity('dehaka')!;dehaka.x=dehaka.z=0;const primary=foe(z,1,0),secondary=foe(z,1.6,.3),behind=foe(z,-1,0);z.hash.rebuild(z.entities.values());z.fire(dehaka,primary);assert.equal(primary.hp,10000);settleWeaponFlights(z);assert.equal(primary.hp,10000-dehaka.weaponDamage);assert.equal(secondary.hp,10000);assert.equal(behind.hp,10000);
 const p=make('protoss');assert.ok(p.acquireHero('fenix'));const fenix=p.heroEntity('fenix')!;fenix.x=fenix.z=0;const center=foe(p,4),around=foe(p,4,.7),distant=foe(p,10,3);p.hash.rebuild(p.entities.values());p.fire(fenix,center);settleWeaponFlights(p);assert.equal(center.hp,10000-fenix.weaponDamage);assert.equal(around.hp,10000);assert.equal(distant.hp,10000);
 for(let i=0;i<3;i++){p.fire(fenix,center);settleWeaponFlights(p);}assert.ok(Math.abs(center.hp-(10000-fenix.weaponDamage*6.5))<1e-8);assert.ok(Math.abs(around.hp-(10000-fenix.weaponDamage*2.5))<1e-8);assert.equal(distant.hp,10000);
});

test('presentation scales never alter physics and the recovery signal has no death event',()=>{
 const w=make('zerg'),bane=w.addUnit('baneling','terran',0,0),enemy=foe(w,1);w.hash.rebuild(w.entities.values());const radius=bane.unitRadius;w.fire(bane,enemy);settleWeaponFlights(w);assert.equal(bane.unitRadius,radius);assert.ok(w.visualEvents.some(e=>e.kind==='baneling-recover'&&e.entityId===bane.id));assert.equal(w.visualEvents.some(e=>e.kind==='death'&&e.entityId===bane.id),false);
 const elite=w.addUnit('ravager','terran',0,2);elite.eliteId='ravager.2';elite.modelKey=ELITES['ravager.2'].model;assert.equal(modelPresentationScale(elite),1.25);assert.equal(elite.unitRadius,w.addUnit('ravager','terran',2,2).unitRadius);const event=w.visualEvents.find(e=>e.kind==='attack');assert.ok(event&&attackPresentation(event),'Baneling now has an explicit family presentation without a death event');
 assert.equal(modelPresentationAccent(elite),9);
 elite.eliteId='ravager.1';assert.equal(modelPresentationAccent(elite),8);
 elite.eliteId='ravager.3';assert.equal(modelPresentationAccent(elite),10);
 elite.team='enemy';assert.equal(modelPresentationAccent(elite),0);
 const hero=w.heroEntity('dehaka')??(w.acquireHero('dehaka'),w.heroEntity('dehaka')!);assert.equal(modelPresentationScale(hero),1.25);
 const air=w.addUnit('carrier','terran',5,5);air.modelKey='hero.hots_leviathan';assert.equal(modelPresentationScale(air),1.15*.54065);
});
