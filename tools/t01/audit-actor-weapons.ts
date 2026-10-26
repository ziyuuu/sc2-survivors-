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
import {initializeCarrierSubsystem,ownedInterceptors} from '../../src/simulation/combat/carriers';
import type {Entity} from '../../src/simulation/types';

// This is a source/eligibility audit. It does not mark any rendered cycle passed.
const base='reports/local/t01-20261024';
const catalogue=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8')).dynamic;
const actors=[...ALL_FAMILIES.map(family=>({id:family,family,race:familyRace(family)})),...Object.entries(HEROES).map(([id,h])=>({id:'hero.'+id,family:h.baseFamily,race:h.race})),...Object.entries(ELITES).map(([id,e])=>({id:'elite.'+id,family:e.family,race:familyRace(e.family)}))];
const rows=[];
for(const actor of actors){
 const hero=actor.id.startsWith('hero.'),elite=actor.id.startsWith('elite.');
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 w.selectRace(actor.race);assert.ok(w.start());w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.swarm.pending=[];if(!hero)w.expedition.familySlots=[actor.family as FamilyId];w.expedition.ledger=[];w.expedition.zerglingPairs=[];
 let u:Entity|undefined;
 if(hero){const id=actor.id.slice(5) as HeroId;assert.ok(w.acquireHero(id),actor.id);u=w.heroEntity(id);}
 else if(elite){const id=actor.id.slice(6) as keyof typeof ELITES;assert.ok(w.acquireElite(id));u=w.eliteOwned(id);}
 else u=w.addFamilyMember(actor.family as FamilyId,{x:0,z:0},1);
 assert.ok(u);Object.assign(u,{x:0,z:0,prev:{x:0,z:0}});
 const modes=!hero&&actor.family in FAMILY_MODES&&actor.id!=='elite.tank.1'?FAMILY_MODES[actor.family as keyof typeof FAMILY_MODES].map(([mode])=>mode):[actor.family];
 for(const mode of modes){
  if(!hero){if(actor.family==='tank')u.mode=u.desiredMode=mode as 'tank'|'siege';else u.nativeMode=u.desiredNativeMode=mode===actor.family?undefined:mode as Entity['nativeMode'];u.activeWeapon=undefined;w.refreshStats(u);}
  const data=unitData(u);let armed=u;
  if(actor.id==='hero.purifier_flagship'){initializeCarrierSubsystem(w);armed=ownedInterceptors(w,u.id)[0];assert.ok(armed,'Flagship native child missing');}
  const weapons=armed!==u?[unitData(armed)]:!hero&&actor.family in SOURCE_UNIT_WEAPON_IDS?sourceWeaponsForUnit(actor.family as VerifiedAddedUnitType,u.nativeMode as keyof typeof SOURCE_UNIT_MODES):[data];
  const probes=[];
  for(const weapon of weapons){
   const planes=weapon.targetType==='both'?['ground','air']:weapon.targetType==='none'?[]:[weapon.targetType];
   for(const plane of planes){
    const target=w.addUnit(plane==='air'?'mutalisk':'roach','zerg',0,0);
    const minimum='minimumRange' in weapon?Number(weapon.minimumRange):0;
    const edgeDistance=(minimum+weapon.attackRange)/2;
    target.x=u.x+u.unitRadius+target.unitRadius+edgeDistance;target.z=u.z;
    assert.ok(validAttackTarget(w,u,target),actor.id+'/'+mode+'/'+plane);
    assert.ok(validAttackTarget(w,armed,target));selectWeapon(w,armed,target);
    const expected='weaponId' in weapon?weapon.weaponId:null;
    assert.equal(expected===null?null:armed.activeWeapon,expected,actor.id+'/'+mode+'/'+plane+'/'+edgeDistance);
    probes.push({plane,edgeDistance,expectedWeapon:expected,selectedWeapon:armed.activeWeapon??null,nativeTargetType:unitData(armed).targetType,sourceBody:armed===u?'actor':'native-interceptor'});
    w.entities.delete(target.id);
   }
  }
  const existing=catalogue.filter((c:any)=>c.runner==='actor'&&c.actor===actor.id&&c.rank===1&&c.action==='attack');
  const defaultMode=mode===actor.family;
  const missingPlanes=[...new Set(probes.map(p=>p.plane))].filter(plane=>!defaultMode||!existing.some((c:any)=>c.target===plane));
  const repeatedPlane=[...new Set(probes.filter((p,i)=>probes.some((q,j)=>j<i&&q.plane===p.plane&&q.expectedWeapon!==p.expectedWeapon)).map(p=>p.plane))];
  rows.push({actor:actor.id,family:actor.family,mode,defaultMode,sourceTargetType:data.targetType,probes,existingAttackCases:existing.map((c:any)=>c.id),missingPlanes,unmappedDistanceWeaponPlanes:repeatedPlane,baseAttackWithoutWeapon:defaultMode&&probes.length===0&&existing.length>0});
 }
}
const sourceFiles=['src/simulation/combat/expedition-combat.ts','src/simulation/combat/carriers.ts','src/data/expansion-units.ts','src/data/heroes.ts','src/data/elites.ts','tools/t01/catalogue.ts'];
const sources=await Promise.all(sourceFiles.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const result={at:new Date().toISOString(),scope:'Rank-one source eligibility for every registered actor and legal resting mode. Native target filtering and weapon selection exercised; no rendering, cycle or other-rank acceptance inferred.',actors:actors.length,states:rows.length,probes:rows.reduce((n,r)=>n+r.probes.length,0),sources,rows,issues:rows.filter(r=>r.missingPlanes.length||r.unmappedDistanceWeaponPlanes.length||r.baseAttackWithoutWeapon)};
await fs.writeFile(base+'/actor-weapon-audit-r2.json',JSON.stringify({...result,correction:'R1 treated the Purifier Flagship parent targetType=none as unarmed; R2 inspects its actual initialized interceptor and parent/child target eligibility. R1 retained.'},null,2),{flag:'wx'});
console.log(JSON.stringify({actors:result.actors,states:result.states,probes:result.probes,issues:result.issues.length}));
