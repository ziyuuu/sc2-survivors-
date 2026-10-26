import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {SC2_UNITS,HYDRALISK_MELEE} from '../../src/data/sc2-units';
import {DYNAMIC_CASES} from './catalogue';
import type {Entity} from '../../src/simulation/types';
import type {HeroId} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
const base='reports/local/t01-20261024',cases=DYNAMIC_CASES.filter(c=>c.fixture?.cadence==='hydralisk-close'),rows:any[]=[],failures:any[]=[];
assert.equal(cases.length,50);assert.equal(new Set(DYNAMIC_CASES.map(c=>c.id)).size,DYNAMIC_CASES.length);
for(const c of cases)for(const distance of [.25,.75])try{
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});w.selectRace('zerg');assert.ok(w.start());w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.swarm.pending=[];
 Object.assign(w,{waves:[],specialPlan:[],eventPlan:[],nextWave:Infinity,nextExpansionAt:Infinity});w.missions.enabled=false;w.encounters.enabled=false;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:true,pending:false});Object.assign(w.anchor,{x:0,z:0});w.trail=[{x:0,z:0}];w.expedition.facilities=[];w.expedition.familySlots=['hydralisk'];w.expedition.ledger=[];w.expedition.zerglingPairs=[];
 let u:Entity|undefined;
 if(c.actor!.startsWith('hero.')){const id=c.actor!.slice(5) as HeroId;for(let n=0;n<c.rank!;n++)assert.ok(w.acquireHero(id));u=w.heroEntity(id);}
 else if(c.actor!.startsWith('elite.')){const id=c.actor!.slice(6) as keyof typeof ELITES;for(let n=0;n<c.rank!;n++)assert.ok(w.acquireElite(id));u=w.eliteOwned(id);}
 else u=w.addFamilyMember('hydralisk',{x:0,z:0},c.rank);
 assert.ok(u);Object.assign(u,{x:0,z:0,prev:{x:0,z:0}});const t=w.addUnit(c.target==='air'?'mutalisk':'roach','zerg',0,0);Object.assign(t,{x:u.unitRadius+t.unitRadius+distance,z:0,hp:1e8,maxHp:1e8,weaponCooldown:1e6,nextShotAt:1e6,moveSpeed:0});t.prev={x:t.x,z:t.z};w.hash.rebuild(w.entities.values());
 const shots:any[]=[];let previous=0;for(let n=0;n<180;n++){w.step();if((u.shotSequence??0)>previous){shots.push({time:w.time,sequence:u.shotSequence,interval:u.shotInterval,period:u.attackPeriod,edgeDistance:w.edgeDistance(u,t)});previous=u.shotSequence!;}}
 assert.ok(shots.length>=2,'Native attacks did not repeat');assert.ok(t.hp<1e8);const ratio=distance<HYDRALISK_MELEE.range?HYDRALISK_MELEE.period/SC2_UNITS.hydralisk.attackPeriod:1;
 for(const s of shots){assert.ok(Math.abs(s.interval/s.period-ratio)<1e-7,'Native ratio mismatch');assert.equal(s.edgeDistance<=HYDRALISK_MELEE.range,distance<HYDRALISK_MELEE.range);}
 rows.push({id:c.id,controlledEdgeDistance:distance,expectedRatio:ratio,shots,targetDamage:1e8-t.hp});
}catch(e){failures.push({id:c.id,distance,error:String(e)});}
const files=['tools/t01/catalogue.ts','tools/t01/runtime.ts','src/simulation/world.ts','src/data/sc2-units.ts'];const sources=await Promise.all(files.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const report={scope:'Every friendly hydralisk base body, five ranks and both planes, real native repeated attack at two controlled distances. Source cadence is not a separate melee clip or rendered acceptance.',catalogueCount:DYNAMIC_CASES.length,added:cases.length,rows,failures,sources};
await fs.writeFile(base+'/hydralisk-close-audit-r1.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({cases:cases.length,probes:rows.length,failures}));if(failures.length)process.exitCode=1;
