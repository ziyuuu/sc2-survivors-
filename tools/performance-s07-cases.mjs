import {make,elite,snapshot} from './performance-s01-s02-cases.mjs';
export {snapshot};
export function cliffMap(placements=0){
 const width=21,height=21,walkWidth=40,walkHeight=40;
 return {version:1,source:{name:'S07 single cliff diagnostic',sha256:'s07-cliff',worldUnitsPerSc2Unit:1},width,height,bounds:[0,0,20,20],origin:[0,20,0],start:{x:3,z:10},hive:{x:18,z:10},heights:Array.from({length:441},(_,i)=>i%21>=10?3:0),syncHeights:[],levels:Array.from({length:441},(_,i)=>i%21>=10?2:1),walkWidth,walkHeight,cellSize:.5,walk:Array.from({length:1600},(_,i)=>i%40>=18&&i%40<20?0:1),opening:Array.from({length:1600},(_,i)=>i%40>=18&&i%40<20?0:1),reveal:Array(1600).fill(1),clearance:Array.from({length:1600},(_,i)=>i%40>=18&&i%40<20?0:3),placements:Array.from({length:placements},(_,i)=>({type:i%2?'MineralField':'PathingBlocker',blockerSize:i%2?undefined:.1,position:[18+i*.01,1,0],rotation:i*.1,scale:[1,1,1],unit:i%2===1})),ramps:[],stageAreas:Array(12).fill(380)};
}
export function setup(lib,name,n=24,seed=529,theme){
 const w=make(lib,'protoss',seed);w.stage=18;w.scheduledStage=18;w.time=10;w.tick=600;w.anchorStoppedFor=1;
 if(theme){w.terrain=lib.campaignTerrain({version:3,seed,theme});w.terrain.setStage(w.terrainStage);}
 let call,source,target,units=[],data;
 const scatter=(count,dense=false)=>{for(let i=0;i<count;i++){const a=i*2.399963,r=dense?.1+Math.sqrt(i)*.21:15+i%10,u=w.addUnit(i%5===0?'mutalisk':i%3?'roach':'zergling','zerg',Math.sin(a)*r,Math.cos(a)*r);if(!dense&&i%3===0)u.hp=0;units.push(u);}return units;};
 if(name.startsWith('cliff')){
  if(name==='cliff-map'){source=w.addUnit('reaper','terran',0,0);target={x:3,z:3};}
  else{data=cliffMap(name==='cliff-placements'?n:0);w.terrain=new lib.MapTerrain(data);source=w.addUnit('reaper','terran',7.5,10);target={x:11.5,z:10};}
  if(name==='cliff-blocked')w.addUnit('ultralisk','zerg',11.5,10).unitRadius=3;
  if(name!=='cliff-placements')scatter(n);
  call=()=>lib.cliffLanding(w,source,target);
 }else if(name.startsWith('engage')){
  target=w.addUnit('roach','zerg',0,8);for(let i=0;i<n;i++){const u=w.addUnit(i%3===0?'zealot':i%3===1?'stalker':'immortal','terran',(i%8-3.5)*.8,-2-Math.floor(i/8));u.attackTarget=target.id;units.push(u);}source=units[0];const slots=new lib.EngagementSlots();call=()=>{if(name==='engage-cold')w.time+=.401;return units.map(u=>slots.goal(u,target,units,w.anchor,w.time,w.mapHalf,w.obstacles,w.terrain));};call();
 }else if(name.startsWith('formation')){
  for(let i=0;i<n;i++)units.push(w.addUnit(i%2?'marine':'reaper','terran',(i%8-3.5),-2-Math.floor(i/8)));
  const formation=new lib.SquadFormation();call=()=>{if(name==='formation-cold')w.time+=1;formation.plan(units,w.anchor,w.time,w.mapHalf,w.obstacles,w.terrain);return units.map(u=>formation.goal(u));};call();
 }else if(name==='contacts'||name==='separation'||name==='step'){
  source=w.addUnit('marine','terran',0,0);if(name==='step')lib.setDiagnosticHealthLock(w,true);else source.hp=source.maxHp=1e6;scatter(n,true);w.hash.rebuild(w.entities.values());const solver=new lib.ContactSolver();
  call=name==='contacts'?()=>solver.resolve(w.entities.values(),w.hash,w.obstacles,w.mapHalf,1/60,null,w.terrain,(a,b)=>lib.equipmentIgnoreContact(w,a,b)):name==='separation'?()=>[...w.entities.values()].map(u=>w.separation(u)):()=>w.step();
 }else if(name==='marauder'||name==='immortal'){
  scatter(n);source=elite(lib,w,name==='marauder'?'marauder.3':'immortal.3',0,0);target=w.addUnit('roach','zerg',0,3);target.hp=target.maxHp=1e6;
  if(name==='immortal')for(let i=0;i<12;i++){const a=i*Math.PI/6,u=w.addUnit('roach','zerg',Math.sin(a)*3,3+Math.cos(a)*3);u.hp=u.maxHp=1e6;}
  w.hash.rebuild(w.entities.values());const positions=[...w.entities.values()].map(u=>[u,u.x,u.z]);
  call=()=>{for(const [u,x,z] of positions){u.x=x;u.z=z;}w.effects=[];w.visualEvents=[];w.time+=4;if(name==='marauder')lib.eliteAfterHit(w,source,target,1,1,true);else lib.protossEliteAfterHit(w,source,target,1,true);return [target.x,target.z];};
 }else if(name==='blink'){
  scatter(n);for(let i=0;i<8;i++)units.push(w.addUnit('stalker','terran',(i%4-1.5)*1.4,-Math.floor(i/4)*1.4));w.expedition.tech.blink=1;call=()=>lib.familyAbilityState(w,'stalker',{x:0,z:5});
 }else throw Error(name);
 return {w,call,source,target,units,data};
}
