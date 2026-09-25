import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {acquireExpeditionHero,castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {readArchive,writeArchive} from '../src/persistence/archive';

function setup(){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],race:'terran'});w.start();w.entities.clear();w.heroes.clear();return w;}
function enemy(w:World,x=4){const u=w.addUnit('roach','zerg',x,0);u.maxHp=u.hp=10000;u.armor=0;w.hash.rebuild(w.entities.values());return u;}
function advance(w:World,time:number){w.time=time;w.hash.rebuild(w.entities.values());resolveExpeditionHeroCasts(w);}

test('Tychus grenade travels before impact and burns a biological enemy exactly three times across save/load',()=>{
 const w=setup();assert.ok(acquireExpeditionHero(w,'tychus',()=>true));const target=enemy(w);
 assert.ok(castExpeditionHero(w,'tychus'));advance(w,.59);assert.equal(target.hp,10000);advance(w,.6);
 assert.equal(target.hp,9760);assert.equal(w.heroCasts.filter(c=>c.phase==='dot').length,3);
 const run=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;
 const restored=setup();restored.restoreRun(run);restored.paused=false;
 for(const time of [1.6,2.6,3.6])advance(restored,time);
 assert.equal(restored.entities.get(target.id)?.hp,9670);assert.equal(restored.heroCasts.length,0);
});

test('Tychus burning excludes structures while direct grenade damage remains legal',()=>{
 const w=setup();assert.ok(acquireExpeditionHero(w,'tychus',()=>true));const target=enemy(w);target.attributes=['Structure'];
 assert.ok(castExpeditionHero(w,'tychus'));advance(w,.6);assert.equal(target.hp,9760);assert.equal(w.heroCasts.filter(c=>c.phase==='dot').length,0);
});

test('Nova frost applies only after a real biological hit and halves slow against bosses',()=>{
 const w=setup();assert.ok(acquireExpeditionHero(w,'nova',()=>true));const target=enemy(w);target.attributes=['Biological'];target.enemyTier='boss';
 assert.ok(castExpeditionHero(w,'nova'));advance(w,.34);assert.equal(target.hp,10000);assert.equal(target.moveSlowFactor,undefined);
 advance(w,.35);assert.equal(target.hp,9350);assert.equal(target.moveSlowFactor,.175);assert.equal(target.moveSlowUntil,2.35);
});
