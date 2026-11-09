// Research fixture. Exercise the existing special-ticket rule with two RNG sources.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../src/simulation/world.ts';
import {offerSpecialTicket} from '../src/simulation/special-stages/runtime.ts';
import {newEquipmentAccount} from '../src/simulation/starship/inventory.ts';

function ticketStream(seed,stage){
 let draw=0;
 return ()=>{
  const bytes=createHash('sha256').update(JSON.stringify([1,seed,'ticket',stage,draw++])).digest();
  return bytes.readUInt32LE(0)/2**32;
 };
}

function schedule(seed,extraDraws,independent){
 const w=new World({race:'terran',difficulty:'normal',seed,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(seed)});
 w.start();
 w.phase='reward';
 const combatRandom=w.random;
 const rows=[];
 for(let stage=4;stage<=18;stage++){
  w.stage=stage-1;
  for(let i=0;i<extraDraws;i++)combatRandom();
  const before=w.rngState;
  if(independent)w.random=ticketStream(seed,stage);
  try{offerSpecialTicket(w);}finally{w.random=combatRandom;}
  if(independent)assert.equal(w.rngState,before);
  const t=w.specialStages.ticket;
  if(!t)continue;
  rows.push({stage:t.stage,kind:t.kind});
  // Hold player/party inputs constant: one marine; take every ticket; no portals.
  w.specialStages.used.add(t.stage);
  w.specialStages.lastEnteredKind=t.kind;
  w.specialStages.ticket=null;
 }
 assert(rows.length<=3);
 assert(rows.every((row,i)=>!i||row.stage>=rows[i-1].stage+3));
 return rows;
}

const samples=[529,530,531,532].map(seed=>{
 const current=schedule(seed,0,false),currentAfterCombat=schedule(seed,23,false);
 const planned=schedule(seed,0,true),plannedAfterCombat=schedule(seed,23,true);
 assert.deepEqual(planned,plannedAfterCombat);
 return {seed,current,currentAfterCombat,planned,plannedAfterCombat};
});
assert(samples.some(s=>JSON.stringify(s.current)!==JSON.stringify(s.currentAfterCombat)));
assert(new Set(samples.map(s=>JSON.stringify(s.planned))).size>1);
console.log(JSON.stringify({extraDrawsPerStage:23,samples},null,2));
