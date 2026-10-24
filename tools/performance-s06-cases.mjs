import {make,snapshot} from './performance-s01-s02-cases.mjs';
export {snapshot};
export function setup(lib,name,n=176,seed=529,theme){
 const w=make(lib,'zerg',seed);w.stage=18;
 if(theme){w.terrain=lib.campaignTerrain({version:3,seed,theme});w.initialTerrain=w.terrain;w.prepareStage();w.hive=null;w.expansionHives.clear();w.entities.clear();w.economicTargets.clear();w.waves=[];w.specialPlan=[];w.nextWave=Infinity;}
 w.autoWaves=false;w.scheduledStage=w.stage;w.stageStartedAt=0;w.time=10;w.anchorStoppedFor=1;
 const backlog=()=>Array.from({length:n},(_,i)=>({type:['zergling','roach','hydralisk','mutalisk'][i%4],bearing:i*.71,at:i<300?0:20+i/100,campaignStage:w.stage,lane:i,stamp:w.enemyStamp(w.stage,i/60),resources:{minerals:1,gas:1},detector:i===0}));
 let call;
 if(name.startsWith('ambient')||name==='endless'){
  if(name==='endless'){w.endless={round:1,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};w.terrain=w.endlessTerrain;w.spawnCells=w.terrain.connectedLocations(w.anchor,.9,1.4);}
  if(name==='ambient-fallback'){w.nearbyPoint=()=>({x:0,z:9});w.obstacles=[{x:0,z:9,w:4,h:4}];}
  if(name==='ambient-empty')w.spawnCells=[];
  w.ambientBacklog=backlog();call=()=>w.releaseAmbient();
 }else if(name.startsWith('free')||name.startsWith('hive')||name.startsWith('carrier')){
  for(let i=0;i<n;i++){const u=w.addUnit(i%7===0?'mutalisk':'roach',i%2?'zerg':'terran',Math.sin(i*2.4)*(i%11),Math.cos(i*2.4)*(i%11));if(i%3===0)u.hp=0;}
  if(name.endsWith('blocked')){const blocker=w.addUnit('ultralisk','zerg',0,0);blocker.unitRadius=100;}
  if(name.startsWith('carrier')){for(let i=0;i<n;i++)w.pods.push({id:1e6+i,x:0,z:9,hp:i===n-1?1:0,unitRadius:i===n-1?100:1.25,status:i===n-1?'active':'destroyed',guardianIds:new Set(),guardTypes:[]});call=()=>lib.findCarrierLanding(w,'zergling');}
  else if(name.startsWith('hive'))call=()=>w.hiveSpawnPoint({x:0,z:0,unitRadius:3},0);
  else call=()=>w.freePosition('zergling',{x:0,z:0});
 }else if(name==='queue'){
  w.ambientBacklog=backlog().map((e,i)=>({...e,at:i/10}));w.time=-1;w.stageWave=0;w.waves=Array.from({length:30},(_,i)=>({at:i/3,bearing:.5,types:['roach','zergling','mutalisk']}));
  call=()=>w.spawnWave();
 }else throw Error(name);
 return {w,call};
}
