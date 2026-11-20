import {readArchive,writeArchive} from '../src/persistence/archive';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DOOMSDAY_CARDS,type DoomsdayId} from '../src/data/terran-doomsday';
import {doomsdayScenario} from '../preview/doomsday-showcase-20261117/scenarios';
import {observeWorld} from '../src/simulation/observation';
import {World} from '../src/simulation/world';
const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-20261117';await fs.mkdir(out,{recursive:true});
function run(id:DoomsdayId,variant:0|1|2,boss=false){
 const f=doomsdayScenario(id,variant,boss),w=f.world;w.restoreRun(f.snapshot);let copy:World|undefined;const damage={damage:0,healed:0},flights=new Set<number>(),kinds:Record<string,number>={},trace={healedAt120:0,preheated:0,tow:0,blue:0,dots:0,width:0,stopped:0,fragment:0,battery:0,transform:0};
 observeWorld(w,(_source,kind,amount)=>{if(kind in damage)damage[kind as keyof typeof damage]+=amount;});
 const summary=()=>({members:w.allies().map(u=>({id:u.id,type:u.unitType,hero:u.heroId,hp:u.hp,maxHp:u.maxHp,armor:u.armor,rank:u.rank,period:u.attackPeriod,radius:u.unitRadius,moveRadius:u.movementRadius??u.unitRadius,distance:u.distanceWalked,attributes:u.attributes,ds:structuredClone(u.doomsday)})),enemies:[...w.entities.values()].filter(u=>u.owner==='zerg').map(u=>({id:u.id,hp:u.hp,x:u.x,z:u.z,visible:w.visibleTo(u,'terran')}))});
 const before=summary();w.paused=false;
 for(let step=0;step<720;step++){
  w.step();copy?.step();if(step===119)trace.healedAt120=damage.healed;
  for(const p of w.weaponFlights)if(!flights.has(p.id)){flights.add(p.id);const k=p.doomsdayDerived?.kind??'native';kinds[k]=(kinds[k]??0)+1;}
  for(const u of w.entities.values()){const s=u.doomsday;if(s?.round?.preheated)trace.preheated++;if(s?.tow&&s.tow.untilTick>w.tick)trace.tow++;if(s?.blueFlame&&Object.keys(s.blueFlame).length)trace.blue++;if(s?.batteryStage)trace.battery++;trace.stopped=Math.max(trace.stopped,u.stoppedUntil??0);trace.fragment=Math.max(trace.fragment,s?.fragmentReadyTick??0);if(u.id===f.mainId&&u.mode==='siege'&&!trace.transform)trace.transform=w.tick;}
  trace.dots=Math.max(trace.dots,w.expedition.doomsday?.dots?.length??0);for(const e of w.expedition.doomsday?.areas??[])trace.width=Math.max(trace.width,e.line?.width??0);
  if(step===359&&variant){copy=doomsdayScenario(id,variant).world;copy.restoreRun(readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!);copy.paused=false;}
 }
 if(copy){assert.deepEqual(copy.captureRun(),w.captureRun(),id+' midpoint replay differs');}
 return {id,variant,boss,before,after:summary(),...damage,kinds,trace,state:structuredClone(w.expedition.doomsday),restored:!!copy};
}
type Row=ReturnType<typeof run>;
const rows:Row[]=[],checks:{id:string;pass:boolean;reason?:string}[]=[];
const ids=(process.env.DOOMSDAY_QA_CARDS?.split(',')??DOOMSDAY_CARDS.map(c=>c.id)) as DoomsdayId[];
for(const id of ids){
 try{
  const b=run(id,0),c=run(id,1);rows.push(b,c);const a=c.after.members[0],prior=b.after.members[0],initial=c.before.members[0];
  const more=()=>assert.ok(c.damage>b.damage+1e-5,id+' must increase actual damage');
  switch(id){
   case 'M-W01':case 'M-G01':case 'M-B03':case 'M-B05':case 'M-P05':case 'M-P06':case 'M-N02':case 'M-N04':case 'M-N05':case 'M-N06':case 'M-N07':case 'M-N08':case 'M-N09':more();break;
   case 'M-W02':case 'M-B02':assert.ok(c.after.enemies.some((u,i)=>u.hp<b.after.enemies[i].hp),id+' must hit newly covered enemy');break;
   case 'M-W03':assert.ok(initial.period<b.before.members[0].period);break;
   case 'M-W04':assert.ok(c.trace.healedAt120>b.trace.healedAt120);break;
   case 'M-G04':case 'M-G08':case 'M-N01':assert.ok(c.healed>b.healed);break;
   case 'M-W05':assert.ok(c.trace.preheated>0);break;
   case 'M-W06':assert.ok(c.trace.fragment>0);assert.ok(a.hp>prior.hp);break;
   case 'M-W07':assert.ok(c.trace.transform<b.trace.transform);break;
   case 'M-W08':case 'M-G09':assert.ok(a.hp>prior.hp);break;
   case 'M-W09':assert.ok(c.trace.battery>0);assert.ok(c.healed>b.healed);break;
   case 'M-G02':assert.ok(initial.ds?.nano);assert.ok(a.hp>prior.hp);break;
   case 'M-G03':assert.ok(a.distance>prior.distance);break;
   case 'M-G05':assert.ok(c.trace.tow>0);break;
   case 'M-G06':assert.ok(c.trace.blue>0);break;
   case 'M-G07':assert.ok(c.before.enemies[0].visible&&!b.before.enemies[0].visible);break;
   case 'M-B01':assert.ok(initial.maxHp>b.before.members[0].maxHp&&initial.moveRadius<b.before.members[0].moveRadius);break;
   case 'M-B04':assert.ok(initial.moveRadius<b.before.members[0].moveRadius);break;
   case 'M-B06':assert.ok((c.state?.interceptReady??0)>0);assert.ok(a.hp>prior.hp);break;
   case 'M-B07':assert.ok(a.ds?.dual?.air.nextReadyTick&&a.ds.dual.ground.nextReadyTick);break;
   case 'M-B08':assert.ok(c.trace.stopped>0);break;
   case 'M-B09':assert.ok(c.kinds.turret>0);break;
   case 'M-P01':assert.ok(initial.maxHp>b.before.members[0].maxHp);break;
   case 'M-P02':assert.ok(c.after.enemies.some((u,i)=>Math.hypot(u.x-b.after.enemies[i].x,u.z-b.after.enemies[i].z)>.1));break;
   case 'M-P03':assert.ok(initial.attributes.includes('Mechanical')&&!initial.attributes.includes('Biological'));break;
   case 'M-P04':assert.ok(c.kinds.node>0);break;
   case 'M-N03':assert.ok(c.after.members.some(u=>u.id>Math.max(...c.before.members.map(m=>m.id))&&u.rank>=5));break;
   case 'M-O01':assert.ok(c.before.members.filter(u=>u.hero).every(u=>u.ds?.heroArmor));break;
   case 'M-O02':assert.ok(c.kinds.barrage>=36);break;
   case 'M-O03':more();break;
  }
  if(id.startsWith('M-N')){const r=run(id,2);rows.push(r);assert.equal(r.state!.nodeReserves[id],0,id+' reserve was not actually spent');if(id==='M-N09')assert.equal(r.trace.width,1.6);if(id==='M-N03')assert.ok(r.after.members.some(u=>u.id>Math.max(...r.before.members.map(m=>m.id))&&u.rank>=6));}
  if(id.startsWith('M-N')){
   const base=run(id,0,true),node=run(id,1,true),repeat=run(id,2,true);rows.push(base,node,repeat);
   assert.equal(repeat.state!.nodeReserves[id],0,id+' boss fixture reserve was not spent');
   if(id==='M-N01')assert.ok(node.healed>base.healed);
   else if(id==='M-N03')assert.ok(node.after.members.some(u=>u.id>Math.max(...node.before.members.map(m=>m.id))&&u.rank>=5));
   else assert.ok(node.damage>base.damage,id+' boss fixture must increase actual damage');
  }
  checks.push({id,pass:true});console.log(id+' passed');
 }catch(e){checks.push({id,pass:false,reason:String((e as Error).stack??e)});console.log(id+' FAILED '+String(e));}
}
await fs.writeFile(out+'/simulation.json',JSON.stringify({seed:171145,seconds:12,scope:'Controlled actual World fixtures; no full campaign or balance acceptance claim.',checks,rows},null,2));
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).map(c=>({id:c.id,reason:c.reason?.slice(0,260)}))}));if(checks.some(c=>!c.pass))process.exitCode=1;
