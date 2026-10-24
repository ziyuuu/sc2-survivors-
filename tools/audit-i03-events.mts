import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {familyWorld} from './lib/i03-fixtures.mts';
import {tickMissions,cancelMissions} from '../src/simulation/missions/runtime';
import {MISSION_KINDS} from '../src/simulation/missions/state';
import {tickEncounters,cancelEncounters} from '../src/simulation/encounters/runtime';
import {ENCOUNTER_KINDS} from '../src/simulation/encounters/state';
import {FUN_KINDS} from '../src/simulation/encounters/expanded-state';
import {tickFieldPickups,collectFieldPickup} from '../src/simulation/field-events/pickups';
import {tickReplacementHorde} from '../src/simulation/field-events/hordes';
import {FIELD_PICKUPS,HORDE_KINDS} from '../src/simulation/field-events/state';
import {offerSpecialTicket,claimSpecialTicket,enterSpecialTicket,legalSpecialKinds,tickSpecialEntrance} from '../src/simulation/special-stages/runtime';
import {SPECIAL_STAGE_KINDS} from '../src/simulation/special-stages/state';
const rows:Record<string,Record<string,any>>={missions:{},encounters:{},pickups:{},hordes:{},tickets:{},portals:{}},expected={missions:MISSION_KINDS,encounters:[...ENCOUNTER_KINDS,...FUN_KINDS],pickups:FIELD_PICKUPS,hordes:HORDE_KINDS,tickets:SPECIAL_STAGE_KINDS,portals:SPECIAL_STAGE_KINDS};
function make(seed:number,family:'queen'|'marine'='queen'){const {w,witness}=familyWorld(family,{automatic:true,seed});w.phase='battle';w.stage=12;w.stageElapsed=20;w.time+=20;w.tick=Math.round(w.time*60);w.prepareStage();w.pods=w.pods.filter(p=>p.status==='rescued');w.nextExpansionAt=Infinity;return {w,witness};}
const exclusions:Record<string,number>={unsafeHordeWindow:0};
for(const category of Object.keys(rows) as (keyof typeof expected)[]){
 for(let trial=1;trial<=1200&&Object.keys(rows[category]).length<expected[category].length;trial++){
  const seed=Math.imul(trial,0x9e3779b9)>>>0,{w,witness}=make(seed,category==='missions'&&trial%2===0?'marine':'queen');let kind:string|undefined;
  if(category==='missions'){if(w.expedition.race==='terran'){const scheduled=w.eventPlan.find(e=>e.kind==='egg');assert.ok(scheduled);w.stageElapsed=Math.max(w.stageElapsed,scheduled.at);w.step();const egg=[...w.economicTargets.values()].find(e=>e.kind==='egg'&&e.status==='active');assert.ok(egg);w.hit(egg,1e12,[],1,'terran',0,1,w.allies()[0].id);assert.ok(w.workers>0);}for(let i=0;i<900&&!w.missions.active;i++)tickMissions(w);kind=w.missions.active?.kind;}
  if(category==='encounters'){for(let i=0;i<1200&&!w.encounters.active&&!w.encounters.expanded.short&&!w.encounters.expanded.queen;i++)tickEncounters(w);kind=w.encounters.active?.kind??w.encounters.expanded.short?.kind??w.encounters.expanded.queen?.kind;}
  if(category==='pickups'){tickFieldPickups(w);const p=w.fieldEvents.pickups[0];kind=p?.kind;if(p){w.anchor.x=p.x;w.anchor.z=p.z;assert.ok(collectFieldPickup(w,p.id));assert.equal(collectFieldPickup(w,p.id),false);}}
  if(category==='hordes'){w.stageElapsed=30;if(!w.replacementWindowSafe()){exclusions.unsafeHordeWindow++;continue;}tickReplacementHorde(w);kind=w.fieldEvents.horde?.kind;if(kind){const h=w.fieldEvents.horde!;assert.ok(h.spawned>0);w.time=h.until;tickReplacementHorde(w);assert.equal(w.fieldEvents.horde,null);assert.equal(w.fieldEvents.lastHorde?.kind,kind);}}
  if(category==='tickets'){w.phase='reward';offerSpecialTicket(w);kind=w.specialStages.ticket?.kind;if(kind){assert.ok(claimSpecialTicket(w));w.stage++;w.phase='battle';assert.ok(enterSpecialTicket(w));assert.equal(w.specialStages.active?.kind,kind);}}
  if(category==='portals'){tickSpecialEntrance(w);kind=w.specialStages.portal?.kind;}
  if(kind&&!rows[category][kind])rows[category][kind]={seed,stage:12,race:w.expedition.race,workers:w.workers,buildingPath:witness.path.map((p:any)=>p.project),members:w.allies().map(u=>({id:u.id,type:u.unitType,rank:u.rank})),source:category==='missions'?'tickMissions → advanceMissionClock → eligible kind → spawn':category==='encounters'?'tickEncounters → real 12% trial → eligible kind → spawn':category==='pickups'?'20-second native weighted trial → reachable pickup → collect once':category==='hordes'?'safe native replacement window → 20% trial → actual enemy admission → 20-second end':category==='tickets'?'native 25% intermission ticket → claim → next-stage entry':'native 20% portal trial → connected legal point',state:category==='portals'?w.specialStages.portal:category==='hordes'?w.fieldEvents.lastHorde:category==='missions'?{kind:w.missions.active?.kind,phase:w.missions.active?.phase}:null};
 }
 console.log(JSON.stringify({category,found:Object.keys(rows[category]),missing:expected[category].filter(k=>!rows[category][k])}));
}
const missing=Object.fromEntries(Object.entries(expected).map(([category,kinds])=>[category,kinds.filter(k=>!rows[category][k])]));await fs.writeFile('reports/local/integration-i03-20261022/event-sources.json',JSON.stringify({at:new Date().toISOString(),scope:'Native automatic clocks/probabilities without event kind injection, on controlled stage-12 flat terrain after a reproducible legal building/paid-unit path. Time/funding/battle safety are fixtures. This is a source-path proof, not natural campaign survival or five-map navigation acceptance.',rows,expected,missing,exclusions},null,2));assert.equal(Object.values(missing).flat().length,0);
