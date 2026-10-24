import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as old from '../reports/local/performance-s04-20261020/baseline-logic/main.mjs';
import * as current from '../reports/local/performance-s04-20261020/candidate-logic/main.mjs';
import {setup,legal,effectSets,snapshot} from './performance-s04-cases.mjs';
const root='reports/local/performance-s04-20261020',checks=[],libs=[old,current],hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function same(name,p){const data=p.map((c,i)=>({state:snapshot(libs[i],c.w),shot:c.shot??null}));try{assert.deepEqual(data[1],data[0],name);}catch(e){await fs.writeFile(root+'/equivalence-failure.json',JSON.stringify({name,old:data[0],current:data[1]},null,2));throw e;}checks.push({name,sha256:hash(data[0])});}
for(const name of Object.keys(effectSets))for(const seed of [1,42,529,10577])for(const n of [1,2,16,100,300]){
 const p=libs.map(lib=>setup(lib,name,n,seed));for(const c of p)c.call();await same(`effects/${name}/${seed}/${n}`,p);
 for(let i=1;i<=4;i++)for(const [j,c]of p.entries()){c.w.time=i;libs[j].tickEquipmentCombat(c.w);}await same(`effects-resolved/${name}/${seed}/${n}`,p);
}
for(const name of ['split','bounce','cleave','pierce','combined','execute','overload'])for(const flag of ['ties','reverse-order','dead','cloaked','air','blocked','static-hive','stale-index','kill','converted']){
 const p=libs.map(lib=>setup(lib,name,24,529));for(const c of p){for(const [i,t]of c.targets.entries()){if(flag==='ties'||flag==='reverse-order'){t.x=i%2?-2:2;t.z=3;}if(flag==='dead')t.hp=0;if(flag==='cloaked')t.cloaked=true;if(flag==='air')t.flying=i%2===0;if(flag==='kill')t.hp=1;if(flag==='converted')t.owner=i%2?'zerg':'terran';}
 if(flag==='reverse-order')c.w.entities=new Map([...c.w.entities].reverse());if(flag==='blocked')c.w.obstacles=[{x:0,z:1,radius:1}];
 if(flag==='static-hive'){const t=c.targets[1];c.w.entities.delete(t.id);c.w.hive=t;const x=c.targets[2];c.w.entities.delete(x.id);c.w.expansionHives.set(x.id,x);}
 if(flag==='stale-index'){for(const t of c.targets){t.x=50;t.z=50;}c.w.hash.rebuild(c.w.entities.values());for(const t of c.targets){t.x=0;t.z=2;}}
 c.call();}await same(`boundary/${name}/${flag}`,p);
}
// This includes actual equipment selection, finite true-damage budgets and the real native attack path.
for(const name of ['attributes','double','split','cleave','pierce','dot','moving'])for(const seed of [1,42,529]){
 const p=libs.map(lib=>legal(lib,name,100,seed));for(let k=0;k<6;k++){for(const c of p)c.call();await same(`legal-fire/${name}/${seed}/${k}`,p);}
 for(let i=1;i<=4;i++)for(const [j,c]of p.entries()){c.w.time=i;libs[j].tickEquipmentCombat(c.w);libs[j].tickWeaponFlights(c.w,1);}await same(`legal-dot/${name}/${seed}`,p);
}
for(const n of [1,16,100,300])for(const flag of ['normal','expired','mixed-sources','future','catch-up','death','overlap','air']){
 const p=libs.map(lib=>setup(lib,'acid',n));for(const c of p){for(const [i,a]of c.w.zergElites.areas.entries()){if(flag==='expired')a.until=i%2?.5:1;if(flag==='mixed-sources')a.source.id+=i%5;if(flag==='future')a.next=10;if(flag==='catch-up')a.next=-2;if(flag==='overlap'){a.point={x:0,z:0};a.damage=i%2?100:10;}}
 for(const t of c.targets){if(flag==='death')t.hp=15;if(flag==='air')t.flying=true;}
 // Do not call the benchmark reset: preserve these timing boundaries.
 libs[p.indexOf(c)].tickZergEliteState(c.w);}await same(`acid/${n}/${flag}`,p);
}
for(const id of current.ALL_HERO_IDS)for(const flag of ['normal','paused','stopped','cooldown','dead','no-target']){
 const p=libs.map(lib=>setup(lib,'hero-'+id,40));for(const [i,c]of p.entries()){if(flag==='paused')c.w.paused=true;if(flag==='stopped')c.source.stoppedUntil=1;if(flag==='cooldown')c.w.heroes.get(id).skillReady=1;if(flag==='dead')c.source.hp=0;if(flag==='no-target'){for(const t of c.targets)t.hp=0;for(const u of c.w.allies())if(u!==c.source)u.hp=0;}
 c.result=libs[i].castExpeditionHero(c.w,id,c.view);}assert.equal(p[0].result,p[1].result,id+'/'+flag);await same(`hero/${id}/${flag}`,p);
 if(flag==='normal'){for(let i=0;i<180;i++)for(const [j,c]of p.entries()){c.w.time+=1/60;libs[j].resolveExpeditionHeroCasts(c.w);}await same(`hero-resolved/${id}`,p);}
}
// Preview is not cached across calls: remove its target before the command and require a new decision.
for(const id of ['raynor','tosh','dehaka']){const p=libs.map(lib=>setup(lib,'hero-'+id,20));for(const [j,c]of p.entries()){assert.equal(libs[j].canCastExpeditionHero(c.w,id,c.view),true);for(const t of c.targets)t.hp=0;assert.equal(libs[j].castExpeditionHero(c.w,id,c.view),false);}await same('hero-invalidated/'+id,p);}
// Independent launch DTOs remain independent, and source removal cannot mutate an in-flight packet.
{const p=libs.map(lib=>setup(lib,'snapshot',100));for(const c of p){c.call();assert.equal(c.w.weaponFlights.length,5);const frozen=structuredClone(c.w.weaponFlights.map(p=>p.source));c.source.weaponDamage=999999;c.source.attributes.push('FixtureMutation');c.w.entities.delete(c.source.id);assert.deepEqual(c.w.weaponFlights.map(p=>p.source),frozen);assert.notEqual(c.w.weaponFlights[0].source,c.w.weaponFlights[1].source);}
 await same('snapshot-independence',p);for(let i=0;i<90;i++)for(const [j,c]of p.entries()){c.w.time+=1/60;libs[j].tickWeaponFlights(c.w,1/60);}await same('snapshot-arrival',p);}
for(const name of ['attributes','split','cleave','pierce','dot','moving']){const p=libs.map(lib=>legal(lib,name,60,529));for(let i=0;i<360;i++){for(const c of p){const tick=c.w.tick;c.w.step();assert.equal(c.w.tick,tick+1,name);}if(i%60===59)await same(`world/${name}/${i+1}`,p);}console.log('World verified '+name);}
await fs.writeFile(root+'/equivalence.json',JSON.stringify({pass:true,checks,normalization:'Identical run UUID set before actions; full selected run state, RNG, account, status/special registries, visual/attack events, combat maps and synthetic AttackBudget compared. Six legal equipped Worlds each assert 360 actual tick advances. Diagnostic health and parked targets are not natural campaign acceptance.'},null,2));console.log(JSON.stringify({pass:true,checks:checks.length}));
