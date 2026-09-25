import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {ELITE_TEMPLATES,ELITES} from '../src/data/elites';
import {EXPANSION_ELITES} from '../src/data/expansion-elites';
import {modelPresentationAccent,modelPresentationScale,attackPresentation} from '../src/data/combat-presentation';
import {castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {eliteDamageMultiplier} from '../src/simulation/combat/expedition-elites';
import {expeditionAttackRange,tickAutoAbilities,tickAreaSpells} from '../src/simulation/combat/expedition-combat';
import {SOURCE_ABILITIES} from '../src/data/expansion-units';
import {BILE} from '../src/data/sc2-units';

const make=(race:'terran'|'zerg'|'protoss')=>{const w=new World({race,seed:67,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();return w;};
const foe=(w:World,x:number,z=0,flying=false)=>{const e=w.addUnit(flying?'mutalisk':'roach','zerg',x,z);e.hp=e.maxHp=10000;e.armor=0;w.hash.rebuild(w.entities.values());return e;};

test('M4 template lift and three-way expansion families have exact approved effects',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(ELITE_TEMPLATES).map(([id,t])=>[id,[t.output,t.as,t.hp,t.move,t.armor]])),{quick:[1.7,1.5,1.35,1.1,0],heavy:[1.95,.95,1.5,1,.75],guard:[1.55,1,2,1,2],mobile:[1.65,1.25,1.5,1.25,.75],support:[1.55,1,1.55,1.1,.75]});
 for(const family of ['viking','ravager','high_templar'])assert.deepEqual(Object.values(ELITES).filter(e=>e.family===family).map(e=>e.id),[`${family}.1`,`${family}.2`,`${family}.3`]);
 assert.equal(EXPANSION_ELITES['viking.2'].effect.amount,1.25);assert.equal(EXPANSION_ELITES['ravager.2'].effect.amount,1.2);assert.equal(EXPANSION_ELITES['high_templar.3'].effect.amount,1.2);
});

test('elite family choice spends once, rejects implicit or cross-family selections, then locks the chosen path',()=>{
 const w=make('terran');w.expedition.familySlots.push('viking');w.expedition.tech.starport=1;const v=w.addUnit('viking','terran',1,0);w.refreshStats(v);
 assert.deepEqual(w.eliteVariants('viking').map(e=>e.id),['viking.1','viking.2','viking.3']);assert.equal(w.resolveEliteVariant('viking'),null);assert.equal(w.resolveEliteVariant('viking','ravager.2'),null);
 assert.equal(w.resolveEliteVariant('viking','viking.2'),'viking.2');assert.equal(w.acquireElite('viking.2'),true);assert.deepEqual(w.eliteVariants('viking').map(e=>e.id),['viking.2']);
 const copy=make('terran');copy.restoreRun(w.captureRun());assert.equal(copy.expedition.elitePaths.viking,'viking.2');assert.deepEqual(copy.eliteVariants('viking').map(e=>e.id),['viking.2']);
});

test('three highlighted new variants apply only their approved target, radius, or storm conditions',()=>{
 const t=make('terran'),v=t.addUnit('viking','terran',0,0);v.eliteId='viking.2';t.refreshStats(v,true);
 const armoredAir=foe(t,3,0,true);armoredAir.attributes=['Armored','Biological'];
 assert.equal(eliteDamageMultiplier(v,armoredAir),1.25);
 armoredAir.flying=false;assert.equal(eliteDamageMultiplier(v,armoredAir),1);
 v.eliteId='viking.3';v.nativeMode='viking_assault';assert.equal(expeditionAttackRange(t,v)-expeditionAttackRange(t,{...v,eliteId:'viking.2'}),1);
 v.nativeMode='viking_fighter';assert.equal(expeditionAttackRange(t,v)-expeditionAttackRange(t,{...v,eliteId:'viking.2'}),0);

 const z=make('zerg'),r=z.addUnit('ravager','terran',0,0);r.eliteId='ravager.2';z.refreshStats(r,true);const bileTarget=foe(z,4,0);r.bileCooldown=0;z.updateBile(r,0);
 const bile=z.effects.find(effect=>effect.kind==='bile');assert.ok(bile);assert.equal(bile.radius,BILE.radius*1.2);
 const edge=foe(z,bileTarget.x+BILE.radius+bileTarget.unitRadius+.05,0);edge.weaponDamage=0;edge.moveSpeed=0;bileTarget.weaponDamage=0;bileTarget.moveSpeed=0;
 const edgeHp=edge.hp;z.paused=false;z.advance(BILE.delay+.05);assert.ok(edge.hp<edgeHp,'enlarged warning radius also deals real damage at its edge');

 const p=make('protoss'),templar=p.addUnit('high_templar','terran',0,0);templar.eliteId='high_templar.3';p.refreshStats(templar,true);templar.energy=templar.maxEnergy=200;p.expedition.tech.storm=1;
 const victim=foe(p,4,0);tickAutoAbilities(p,templar);
 const spell=p.expedition.spells.find(effect=>effect.kind==='storm');assert.ok(spell);
 assert.equal(spell.amount,SOURCE_ABILITIES.psiStorm.damagePerTick*1.2);
 const before=victim.hp;p.time=spell.next;tickAreaSpells(p);
 assert.ok(Math.abs(before-victim.hp-spell.amount)<1e-8);
});

test('Raynor piercing shot advances over 0.2 seconds and saved mid-flight targets are hit once',()=>{
 const w=make('terran');assert.ok(w.acquireHero('raynor'));const hero=w.heroEntity('raynor')!;hero.x=hero.z=0;const near=foe(w,4),far=foe(w,9);w.hash.rebuild(w.entities.values());
 assert.ok(castExpeditionHero(w,'raynor'));assert.equal(w.heroCasts[0].phase,'line-travel');w.time=.08;resolveExpeditionHeroCasts(w);assert.equal(near.hp,9700);assert.equal(far.hp,10000);assert.deepEqual(w.heroCasts[0].hitIds,[near.id]);
 const copy=make('terran');copy.restoreRun(w.captureRun());copy.paused=false;copy.time=.16;copy.hash.rebuild(copy.entities.values());resolveExpeditionHeroCasts(copy);assert.equal(copy.entities.get(near.id)!.hp,9700);assert.equal(copy.entities.get(far.id)!.hp,9700);copy.time=.2;resolveExpeditionHeroCasts(copy);assert.equal(copy.heroCasts.length,0);assert.equal(copy.entities.get(near.id)!.hp,9700);assert.equal(copy.entities.get(far.id)!.hp,9700);
});

test('Dehaka and Fenix sample basics add bounded secondary damage without extra APM copies',()=>{
 const z=make('zerg');assert.ok(z.acquireHero('dehaka'));const dehaka=z.heroEntity('dehaka')!;dehaka.x=dehaka.z=0;const primary=foe(z,1,0),secondary=foe(z,1.6,.3),behind=foe(z,-1,0);z.hash.rebuild(z.entities.values());z.fire(dehaka,primary);assert.equal(primary.hp,9920);assert.equal(secondary.hp,9960);assert.equal(behind.hp,10000);
 const p=make('protoss');assert.ok(p.acquireHero('fenix'));const fenix=p.heroEntity('fenix')!;fenix.x=fenix.z=0;const center=foe(p,4),around=foe(p,4,.7),distant=foe(p,4,3);p.hash.rebuild(p.entities.values());p.fire(fenix,center);assert.equal(center.hp,9928);assert.ok(Math.abs(around.hp-(10000-72*.35))<1e-8);assert.equal(distant.hp,10000);
});

test('presentation scales never alter physics and the recovery signal has no death event',()=>{
 const w=make('zerg'),bane=w.addUnit('baneling','terran',0,0),enemy=foe(w,1);w.hash.rebuild(w.entities.values());const radius=bane.unitRadius;w.fire(bane,enemy);assert.equal(bane.unitRadius,radius);assert.ok(w.visualEvents.some(e=>e.kind==='baneling-recover'&&e.entityId===bane.id));assert.equal(w.visualEvents.some(e=>e.kind==='death'&&e.entityId===bane.id),false);
 const elite=w.addUnit('ravager','terran',0,2);elite.eliteId='ravager.2';elite.modelKey=ELITES['ravager.2'].model;assert.equal(modelPresentationScale(elite),1.15);assert.equal(elite.unitRadius,w.addUnit('ravager','terran',2,2).unitRadius);const event=w.visualEvents.find(e=>e.kind==='attack');if(event)assert.equal(attackPresentation(event)?.tint??null,null);
 assert.equal(modelPresentationAccent(elite),9);
 elite.eliteId='ravager.1';assert.equal(modelPresentationAccent(elite),8);
 elite.eliteId='ravager.3';assert.equal(modelPresentationAccent(elite),10);
 elite.team='enemy';assert.equal(modelPresentationAccent(elite),0);
 const hero=w.heroEntity('dehaka')??(w.acquireHero('dehaka'),w.heroEntity('dehaka')!);assert.equal(modelPresentationScale(hero),1.25);
 const air=w.addUnit('carrier','terran',5,5);air.modelKey='hero.hots_leviathan';assert.equal(modelPresentationScale(air),1.15);
});
