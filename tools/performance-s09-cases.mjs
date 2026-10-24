import {make,elite,snapshot} from './performance-s01-s02-cases.mjs';
export {snapshot};
export function setup(lib,{id='baneling',scenario='mixed-live',n=12,seed=529,theme,angle=0}={}){
 const w=make(lib,'zerg',seed);
 if(theme){w.terrain=lib.campaignTerrain({version:3,seed,theme});w.terrain.setStage(18);}
 const position=(x,z)=>({x:x*Math.cos(angle)+z*Math.sin(angle),z:z*Math.cos(angle)-x*Math.sin(angle)});
 const u=id.includes('.')?elite(lib,w,id):w.addUnit(id==='enemy'?'baneling':id==='temporary'?'baneling':id,id==='enemy'?'zerg':'terran',0,0);
 if(id==='temporary'){u.temporary=true;u.temporaryKind='hero-baneling';u.temporaryUntil=30;}
 const p=position(0,scenario==='contact'?.6:scenario==='chase'?8:6);
 const target=w.addUnit(scenario==='air-only'?'mutalisk':id==='enemy'?'marine':'roach',id==='enemy'?'terran':'zerg',p.x,p.z);target.hp=target.maxHp=1e6;target.stoppedUntil=1e9;target.weaponDamage=0;
 const blockers=[];
 if(scenario.startsWith('mixed')||scenario==='redirect'||scenario==='remove-blockers'||scenario==='wall')for(let i=0;i<n;i++){const q=position((i%4-1.5)*.8,1+Math.floor(i/4)*.8),a=w.addUnit('hydralisk','terran',q.x,q.z);if(scenario!=='mixed-live')a.stoppedUntil=1e9;blockers.push(a);}
 if(scenario==='wall')w.obstacles=[{x:0,z:3,w:100,h:1}];
 if(scenario==='chase'){target.stoppedUntil=0;target.weaponDamage=0;}
 if(scenario==='move-order')w.issueMove({x:0,z:-8});
 return {w,u,target,blockers};
}
export function run(lib,options={}){
 const {w,u,target,blockers}=setup(lib,options),shots=[],trace=[],states=[],initialStats={damage:u.weaponDamage,range:u.attackRange,period:u.attackPeriod,radius:u.unitRadius},lastPosition={x:u.x,z:u.z};let serial=0,maxTravel=0,minClearance=Infinity,terrainInvalid=0,removed=false;
 for(let i=0;i<900;i++){
  if(options.scenario==='redirect'&&i===60){target.x=4;target.z=6;w.hash.rebuild(w.entities.values());}
  if(options.scenario==='remove-blockers'&&i===60){for(const b of blockers)b.hp=0;removed=true;}
  w.step();maxTravel=Math.max(maxTravel,Math.hypot(u.x-lastPosition.x,u.z-lastPosition.z));Object.assign(lastPosition,{x:u.x,z:u.z});
  if(w.terrain&&!w.terrain.canOccupy(u,u.unitRadius))terrainInvalid++;
  for(const b of blockers)if(b.hp>0)minClearance=Math.min(minClearance,Math.hypot(u.x-b.x,u.z-b.z)-u.unitRadius-b.unitRadius);
  if((u.shotSequence??0)!==serial){serial=u.shotSequence??0;shots.push({time:w.time,tick:w.tick,x:u.x,z:u.z,hp:u.hp,recoveryUntil:u.recoveryUntil,targetHp:target.hp});}
  if(i%60===0)trace.push({tick:w.tick,x:u.x,z:u.z,shots:serial,edge:w.edgeDistance(u,target),target:u.attackTarget,hp:u.hp,recoveryUntil:u.recoveryUntil});
  if(i===0||i===59||i===899)states.push(snapshot(lib,w));
 }
 return {options,initialStats,shots,trace,states,maxTravel,minClearance:Number.isFinite(minClearance)?minClearance:null,terrainInvalid,removed,sourceHp:u.hp};
}
