import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {ALL_FAMILIES,familyRace,type FamilyId} from '../../src/data/races';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
import {FAMILY_MODES} from '../../src/simulation/combat/family-actions';
import {SOURCE_UNIT_MODES,SOURCE_UNIT_WEAPON_IDS,sourceWeaponsForUnit,type VerifiedAddedUnitType} from '../../src/data/expansion-units';
import {unitData,validAttackTarget,selectWeapon} from '../../src/simulation/combat/expedition-combat';
import {eliteCanFire} from '../../src/simulation/combat/terran-elite-runtime';
import {initializeCarrierSubsystem,ownedInterceptors} from '../../src/simulation/combat/carriers';
import {prepareActorMode} from './actor-mode-fixture';
import type {Entity} from '../../src/simulation/types';
import type {Case} from './catalogue';

const base='reports/local/t01-20261024',catalogue:Case[]=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8')).dynamic;
const previous:Case[]=JSON.parse(await fs.readFile(base+'/catalogue-before-native-branches.json','utf8')).dynamic;
const removed=previous.filter(p=>!catalogue.some(c=>c.id===p.id));assert.deepEqual(removed,[],'Previously listed entries must not disappear');
assert.equal(new Set(catalogue.map(c=>c.id)).size,catalogue.length);
const actors=[...ALL_FAMILIES.map(family=>({id:family,family,race:familyRace(family)})),...Object.entries(HEROES).map(([id,h])=>({id:'hero.'+id,family:h.baseFamily,race:h.race})),...Object.entries(ELITES).map(([id,e])=>({id:'elite.'+id,family:e.family,race:familyRace(e.family)}))];
const rows:any[]=[],failures:any[]=[];
for(const actor of actors)for(let rank=1;rank<=5;rank++){
 const hero=actor.id.startsWith('hero.'),elite=actor.id.startsWith('elite.');
 const modes=!hero&&actor.family in FAMILY_MODES&&actor.id!=='elite.tank.1'?FAMILY_MODES[actor.family as keyof typeof FAMILY_MODES].map(([mode])=>mode):[actor.family];
 for(const mode of modes){
  try{
   const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
   w.selectRace(actor.race);assert.ok(w.start());w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.swarm.pending=[];
   Object.assign(w,{waves:[],specialPlan:[],eventPlan:[],nextWave:Infinity,nextExpansionAt:Infinity});w.missions.enabled=false;w.encounters.enabled=false;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:true,pending:false});Object.assign(w.anchor,{x:0,z:0});w.trail=[{x:0,z:0}];w.expedition.facilities=[];
   if(!hero)w.expedition.familySlots=[actor.family as FamilyId];w.expedition.ledger=[];w.expedition.zerglingPairs=[];
   let u:Entity|undefined;
   if(hero){const id=actor.id.slice(5) as HeroId;for(let i=0;i<rank;i++)assert.ok(w.acquireHero(id),actor.id);u=w.heroEntity(id);}
   else if(elite){const id=actor.id.slice(6) as keyof typeof ELITES;for(let i=0;i<rank;i++)assert.ok(w.acquireElite(id));u=w.eliteOwned(id);}
   else u=w.addFamilyMember(actor.family as FamilyId,{x:0,z:0},rank);
   assert.ok(u);Object.assign(u,{x:0,z:0,prev:{x:0,z:0}});
   const modePreparation=mode!==actor.family?prepareActorMode(w,u,mode):null;
   Object.assign(u,{x:0,z:0,prev:{x:0,z:0}});
   const data=unitData(u);let armed=u;
   if(actor.id==='hero.purifier_flagship'){initializeCarrierSubsystem(w);armed=ownedInterceptors(w,u.id)[0];assert.ok(armed);}
   const weapons=!eliteCanFire(w,u)?[]:armed!==u?[unitData(armed)]:!hero&&actor.family in SOURCE_UNIT_WEAPON_IDS?sourceWeaponsForUnit(actor.family as VerifiedAddedUnitType,u.nativeMode as keyof typeof SOURCE_UNIT_MODES):[data];
   const cases=catalogue.filter(c=>c.runner==='actor'&&c.actor===actor.id&&c.rank===rank&&c.action==='attack'&&(c.fixture?.mode??actor.family)===mode&&!c.applicability&&!c.fixture?.cadence);
   const probes=[],initialWeapon=u.activeWeapon;
   for(const weapon of weapons){
    const planes=weapon.targetType==='both'?['ground','air']:weapon.targetType==='none'?[]:[weapon.targetType];
    for(const plane of planes){
     u.activeWeapon=initialWeapon;w.refreshStats(u);
     const modeWeapon=SOURCE_UNIT_MODES[u.nativeMode as keyof typeof SOURCE_UNIT_MODES]?.weapon;
     const expected='weaponId' in weapon?weapon.weaponId:modeWeapon?.weaponId??null;
     const eligible=cases.filter(c=>c.target===plane);
     const c=eligible.find(c=>c.fixture?.weapon===expected)??eligible.find(c=>!c.fixture?.weapon);
     assert.ok(c,'Missing catalogue branch '+plane+'/'+expected);
     const t=w.addUnit(plane==='air'?'mutalisk':'roach','zerg',0,Math.max(1.5,Math.min(5,u.attackRange*.7)));
     if(c.fixture?.targetEdgeDistance!==undefined)t.z=u.unitRadius+t.unitRadius+c.fixture.targetEdgeDistance;
     assert.ok(validAttackTarget(w,u,t));assert.ok(validAttackTarget(w,armed,t));
     selectWeapon(w,armed,t);
     if(expected!==null&&actor.family in SOURCE_UNIT_WEAPON_IDS)assert.equal(armed.activeWeapon,expected);
     if(c.fixture?.selectedWeapon)assert.equal(armed.activeWeapon,c.fixture.selectedWeapon);
     const edgeDistance=w.edgeDistance(u,t);if(c.fixture?.targetEdgeDistance!==undefined)assert.ok(edgeDistance<=u.attackRange+1e-7,'Prepared explicit distance out of native range');
     probes.push({caseId:c.id,plane,expectedWeapon:expected,selectedWeapon:armed.activeWeapon??null,edgeDistance,nativeRange:u.attackRange,requiresNativeApproach:edgeDistance>u.attackRange,sourceBody:armed===u?'actor':'native-interceptor'});w.entities.delete(t.id);
    }
   }
   assert.equal(new Set(probes.map(p=>p.caseId)).size,cases.length,'Extra or unmapped attack case');
   rows.push({actor:actor.id,rank,mode,modePreparation,probes});
  }catch(e){failures.push({actor:actor.id,rank,mode,error:String(e)});}
 }
}
const files=['tools/t01/catalogue.ts','tools/t01/actor-branches.ts','tools/t01/actor-mode-fixture.ts','src/simulation/combat/expedition-combat.ts','src/simulation/combat/terran-elite-runtime.ts','src/simulation/combat/carriers.ts','src/data/expansion-units.ts','src/data/heroes.ts','src/data/elites.ts'];
const sources=await Promise.all(files.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const report={scope:'Five-rank native recruitment, real alternate-form preparation, target/weapon eligibility and catalogue mapping. No rendering or full-cycle acceptance inferred.',previousCount:previous.length,catalogueCount:catalogue.length,added:catalogue.filter(c=>!previous.some(p=>p.id===c.id)).length,notApplicable:catalogue.filter(c=>c.applicability).map(c=>({id:c.id,...c.applicability,source:c.source})),actors:actors.length,states:rows.length,probes:rows.reduce((n,r)=>n+r.probes.length,0),sources,failures,rows};
const out=base+'/'+(process.argv[2]??'native-branches-audit-r1')+'.json';await fs.writeFile(out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out,actors:report.actors,states:report.states,probes:report.probes,added:report.added,notApplicable:report.notApplicable.length,failures}));if(failures.length)process.exitCode=1;
