import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {ENEMY_CASES} from './enemy-catalogue';
import {prepareEnemyFixture,triggerEnemyFixture,beforeEnemyStep,afterEnemyStep,enemyFixtureSnapshot} from './enemy-fixture';
import {diagnosticHealthLock} from '../../src/diagnostics/combat-lock';

const base='reports/local/t01-20261024',name=process.argv[2]??'enemy-branches-audit-r1',filter=process.argv[3];
const prior=JSON.parse(await fs.readFile('tools/t01/catalogue-baseline-ids.json','utf8')).map((id:string)=>({id}));
const current=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8')).dynamic;
assert.equal(new Set(current.map((c:any)=>c.id)).size,current.length);
assert.deepEqual(prior.filter((p:any)=>!current.some((c:any)=>c.id===p.id)),[],'Previously listed cases cannot disappear');
const selected=filter?.startsWith('@')?new Set(JSON.parse(await fs.readFile(filter.slice(1),'utf8')).failures.map((f:any)=>f.id)):null;
const rows:any[]=[],failures:any[]=[],cases=ENEMY_CASES.filter(c=>!c.applicability&&(!filter||(selected?selected.has(c.id):c.id.includes(filter))));
const files=['tools/t01/enemy-catalogue.ts','tools/t01/enemy-fixture.ts','tools/t01/audit-enemy-branches.ts','src/simulation/world.ts','src/simulation/combat/enemy-specials.ts','src/simulation/combat/expedition-combat.ts'];
const sources=await Promise.all(files.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
for(const [i,c] of cases.entries()){
 let p:any,w:World|undefined,stats:any;
 try{
  w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
  w.selectRace('zerg');assert.ok(w.start());
  // Boss loot variants use the run receipt as a separate RNG seed. Fix that
  // identity too, so source-death comparisons cannot recruit different allies.
  w.runId='t01-enemy-audit:'+c.id;
  w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.swarm.pending=[];w.effects=[];w.visualEvents=[];w.weaponFlights=[];
  Object.assign(w,{waves:[],specialPlan:[],eventPlan:[],nextWave:Infinity,nextExpansionAt:Infinity});w.missions.enabled=false;w.encounters.enabled=false;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:true,pending:false});Object.assign(w.anchor,{x:0,z:0});w.trail=[{x:0,z:0}];w.expedition.facilities=[];
  p=prepareEnemyFixture(w,c,c.target??'ground');const initial=enemyFixtureSnapshot(w,p),start=w.time,xy={x:p.actor.x,z:p.actor.z};
  stats={shots:0,damage:0,maxDistance:0,modes:[],weapons:[],maxPackets:{casts:0,missiles:0,charges:0,acid:0,corrosion:0},maxAura:{armor:0,damage:0,speed:0},maxCorruption:0,patientBefore:initial.patient?.hp,patientAfter:null,packetsAtDeath:null};
  const modes=new Set(),weapons=new Set();triggerEnemyFixture(w,p);stats.actorHpAfterTrigger=p.actor.hp;
  for(let tick=0;tick<Math.ceil((c.seconds??8)*60);tick++){
   const alive=p.actor.hp>0;beforeEnemyStep(w,p);
   if(alive&&p.actor.hp<=0)stats.packetsAtDeath={elapsed:w.time-start,casts:w.enemySpecials.casts.length,missiles:w.enemySpecials.missiles.length,charges:w.enemySpecials.charges.size,acid:w.enemySpecials.acidZones.length};
   w.step();afterEnemyStep(w,p);assert.equal(w.phase,'battle','Fixture ended the battle');
   const u=w.entities.get(p.actor.id),patient=w.entities.get(p.patientId),s=w.enemySpecials;
   const witness=p.receipt.groundWitnessId??p.targetId;if(witness)stats.maxCorruption=Math.max(stats.maxCorruption,w.statuses.value(witness,'corruption',w.time));
   if(u){stats.shots=Math.max(stats.shots,u.shotSequence??0);stats.maxDistance=Math.max(stats.maxDistance,Math.hypot(u.x-xy.x,u.z-xy.z));modes.add(u.nativeMode??u.unitType);if(u.activeWeapon)weapons.add(u.activeWeapon);}
   for(const [k,n] of Object.entries({casts:s.casts.length,missiles:s.missiles.length,charges:s.charges.size,acid:s.acidZones.length,corrosion:w.corrosionZones.length}))stats.maxPackets[k]=Math.max(stats.maxPackets[k],n);
   if(patient){stats.patientAfter=patient.hp;stats.maxAura.armor=Math.max(stats.maxAura.armor,w.auraArmor.get(patient.id)??0);stats.maxAura.damage=Math.max(stats.maxAura.damage,w.auraDamage.get(patient.id)??0);stats.maxAura.speed=Math.max(stats.maxAura.speed,w.auraAttackSpeed.get(patient.id)??0);}
  }
  stats.damage=diagnosticHealthLock(w).damage;stats.modes=[...modes];stats.weapons=[...weapons];const end=enemyFixtureSnapshot(w,p);
  assert.equal(p.actor.enemyLevel,c.fixture!.enemy!.level);assert.equal(p.actor.rank,1);if(p.spec.trait)assert.equal(p.actor.lordTrait,p.spec.trait);
  if(c.action==='attack'){assert.ok(stats.shots>0,'No native weapon shot');assert.ok(stats.damage>0,'No native weapon damage');if(c.fixture?.selectedWeapon)assert.ok(weapons.has(c.fixture.selectedWeapon),'Requested weapon not observed');}
  else assert.equal(stats.shots,0,'Non-attack fixture fired a primary weapon');
  if(c.action==='move')assert.ok(stats.maxDistance>.5,'Native movement absent');
  if(c.action==='hit')assert.ok(stats.actorHpAfterTrigger<initial.actor!.hp,'Native hit feedback absent');
  if(c.action==='death')assert.ok(!end.actor||end.actor.hp<=0,'Native death absent');
  if(c.action==='mode')assert.ok(modes.has((c.data as {mode:string}).mode),'Requested native transition absent');
  if(c.action==='skill'){
   assert.ok(p.firstCast,'No native special cast');assert.equal(p.firstCast.kind,p.spec.skill);
   if(p.spec.interruption){assert.ok(p.interrupted,'Native source death missing');if(p.spec.interruption==='before-commit'){if(p.spec.skill==='bile'){assert.ok(stats.packetsAtDeath.casts>0,'Committed bile must survive source death');if(p.receipt.firstCast.damage>0)assert.ok(stats.damage>0,'Committed bile never hit its ground witness');}else assert.equal(stats.damage,0,'Cancelled skill damaged target');}}
   else if(p.spec.skill==='heal')assert.ok(stats.patientAfter>stats.patientBefore,'Native boss heal absent');
   else {assert.ok(stats.damage>0,'Native special did not damage a witness');if(c.family==='queen'&&p.spec.skill==='bile'){assert.ok(stats.maxCorruption>0,'Queen bile never applied healing suppression');assert.equal(p.receipt.firstCast.damage,0,'Queen bile must have zero direct impact damage');}}
   assert.equal(end.casts.length+end.missiles.length+end.charges.length+end.acidZones.length+end.corrosionZones.length,0,'Special packet remained after full cycle');
  }
  if(c.action==='auto-ability'){assert.ok(p.autoCast,'Native automatic transfusion absent');assert.ok(stats.patientAfter>stats.patientBefore,'Automatic healing absent');}
  if(c.action==='aura'){
   assert.ok(p.auraExited,'Aura exit missing');const trait=p.spec.trait??'carapace';assert.ok(trait==='regen'?p.receipt.auraExit.before.hp>stats.patientBefore:trait==='zeal'?stats.maxAura.damage>0&&stats.maxAura.speed>0:stats.maxAura.armor>0,'Aura never affected patient');
   assert.equal(end.patient!.armorAura+end.patient!.damageAura+end.patient!.speedAura,0,'Aura persisted outside radius');
  }
  rows.push({id:c.id,seconds:w.time-start,initial:initial.actor,stats,receipt:p.receipt,final:{actor:end.actor,patient:end.patient}});
 }catch(e){failures.push({id:c.id,error:String(e),stats,receipt:p?.receipt,state:w&&p?enemyFixtureSnapshot(w,p):null});}
 if((i+1)%100===0||i===cases.length-1)console.log(JSON.stringify({done:i+1,total:cases.length,failed:failures.length,current:c.id}));
}
const result={scope:'Every applicable listed native enemy fixture through its complete simulation cycle. No rendering or visual acceptance inferred.',sources,catalogue:{before:prior.length,current:current.length,enemy:ENEMY_CASES.length,applicable:cases.length,notApplicable:ENEMY_CASES.filter(c=>c.applicability).map(c=>({id:c.id,...c.applicability,source:c.source}))},rows,failures};
const out=base+'/'+name+'.json';await fs.writeFile(out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({out,passed:rows.length,failed:failures.length,failures:failures.map(f=>({id:f.id,error:f.error}))}));if(failures.length)process.exitCode=1;
