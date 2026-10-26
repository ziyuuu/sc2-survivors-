import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {callFleet,tickFleetCall} from '../../src/simulation/missions/fleet';
import {MISSION_RULES} from '../../src/simulation/missions/config';
import {createEquipmentProjections} from '../../src/simulation/starship/projections';
import {equipmentApparition} from '../../src/render/units/equipment-apparition';
import {equipmentPresentation,equipmentPresentationReceipts} from '../../src/simulation/starship/presentation';
import {equipmentEffectRequests} from '../../src/render/effects/equipment-effects';
const fresh=()=>{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});w.entities.clear();w.visualEvents=[];w.phase='battle';w.starship.enabled=true;w.anchor={x:0,z:0,facing:0};w.paused=false;return w;};
const w=fresh();w.missions.fleet.unlocked=true;const called=callFleet(w,{x:0,z:0}),fleet=[];
for(let i=0;i<MISSION_RULES.fleet.arrivalTicks*3+10;i++){w.tick++;w.time=w.tick/60;const before=w.missions.fleet.ships.size;tickFleetCall(w);if(w.missions.fleet.ships.size!==before)fleet.push({time:w.time,ships:w.missions.fleet.ships.size,pending:structuredClone(w.missions.fleet.pending)});}
const p=fresh(),original=p.addUnit('marine','terran',0,0),clones=createEquipmentProjections(p,original,2,'phantom',8,.5,.5);
const projection={count:clones.length,units:clones.map(u=>({id:u.id,type:u.unitType,temporaryUntil:u.temporaryUntil,appearance:equipmentApparition(p,u.id)})),events:equipmentPresentationReceipts(p).map(e=>e.kind)};
const r=fresh(),ling=r.addUnit('zergling','terran',0,0);equipmentPresentation(r,'recall-from',ling);equipmentPresentation(r,'expiry',ling);const genericEquipment=equipmentEffectRequests(r,()=>0).map(q=>({key:q.key,model:q.model}));
ling.temporary=true;ling.temporaryKind='fun-brood';ling.temporaryUntil=1;r.time=1;r.updateUnit(ling,1/60);
const report={called,fleet,finalFleet:w.missions.fleet.ships.size,projection,genericEquipment,nativeBroodExpiry:r.visualEvents.filter(e=>e.kind==='unit-expired'),scope:'Read-only native-module diagnostic; no production source or delivery edits.'};
await fs.mkdir('.cache/t01-feedback-check',{recursive:true});await fs.writeFile('.cache/t01-feedback-check/native.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
