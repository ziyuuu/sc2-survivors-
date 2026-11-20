import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {TUNING} from '../src/data/game';
import {ZERG_SIX,ZERG_SIX_UNITS} from '../src/data/zerg-six';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {placeZergSixTrial} from '../preview/zerg-six-20261120/scenarios';
import type {Entity} from '../src/simulation/types';

function battle(){
 const w=new World({race:'zerg',seed:201120,waves:false,sandbox:true,terrain:false,obstacles:[]});
 assert.ok(w.start());
 w.missions.enabled=w.encounters.enabled=w.starship.enabled=false;
 w.entities.clear();
 for(const group of w.expedition.building!.groups)group.enabled=false;
 return w;
}
function advance(w:World,seconds:number,observe=()=>{}){
 for(let i=0;i<Math.round(seconds/TUNING.step);i++){w.step(TUNING.step);observe();}
}
function stand(w:World,type:Entity['unitType'],x:number,z:number,hp:number){
 const u=w.addUnit(type,'zerg',x,z);
 u.hp=u.maxHp=hp;
 u.armor=0;u.moveSpeed=0;u.weaponDamage=0;u.stoppedUntil=100;
 return u;
}
const children=(w:World,kind:string)=>w.allies().filter(u=>u.hp>0&&u.zergSix?.temp?.kind===kind);
const at=(w:World,type:Entity['unitType'],x=0,z=0)=>w.addUnit(type,'terran',x,z);

test('six bodies use the R2 baseline and existing rank growth without opening their campaign families',()=>{
 const w=battle();
 for(const id of ZERG_SIX){
  const d=ZERG_SIX_UNITS[id],u=at(w,id);
  assert.equal(u.maxHp,d.maxHp,id);
  assert.equal(u.weaponDamage,d.attackDamage,id);
  assert.equal(u.attackPeriod,d.attackPeriod,id);
  assert.equal(u.maxEnergy,0,id);
  assert.equal(w.isFamilyAvailable(id),false,id);
  u.rank=3;w.refreshStats(u,true);
  assert.ok(Math.abs(u.weaponDamage/u.attackPeriod-d.attackDamage/d.attackPeriod*3)<1e-9,id);
 }
});

test('aberration counts actual HP damage, uses capped countercharge and triggers shell on real low-HP hit',()=>{
 const w=battle(),a=at(w,'aberration'),e=stand(w,'roach',0,2,300);
 a.hp=150;
 w.hit(a,46,[],1,'zerg',0,1,e.id);
 assert.equal(a.hp,104);
 assert.equal(a.zergSix?.strain,46);
 assert.equal(a.zergSix?.shellUntil,4);
 w.hit(a,40,[],1,'zerg',0,1,e.id);
 assert.equal(a.hp,76);
 assert.equal(a.zergSix?.strain,64);
 a.weaponCooldown=10;a.nextShotAt=10;
 advance(w,1.5);
 assert.ok(e.hp>=264&&e.hp<265);
 assert.ok((e.zergSix?.immuneUntil??0)>w.time);
 assert.equal(a.zergSix?.strain,0);
});

test('devourer corrosion is shared, targets the impact plane, and expires after retreat',()=>{
 const w=battle(),a=at(w,'devourer',-1,0),b=at(w,'devourer',1,0);
 const air=stand(w,'mutalisk',0,5,5000),near=stand(w,'corruptor',.9,5,5000),ground=stand(w,'roach',.8,5,5000);
 air.armor=near.armor=8;
 advance(w,8);
 assert.equal(air.zergSix?.corrosion?.layers,4);
 assert.equal(w.effectiveArmor(air),6);
 assert.ok(near.hp<near.maxHp);
 assert.ok(ground.hp<ground.maxHp,'separately targeted by one volley missile');
 assert.ok(a.zergSix?.ready&&b.zergSix?.ready);
 assert.ok(w.issueMove({x:0,z:-18}));
 advance(w,8.5);
 assert.equal(air.zergSix?.corrosion,undefined);
 assert.equal(w.effectiveArmor(air),8);
});

test('infection keeps the two strongest clocks, commits drops once, and only lethal DOT converts',()=>{
 const w=battle(),m=at(w,'infestor',0,0),m2=at(w,'infestor',-1,0),m3=at(w,'infestor',1,0);
 const victim=stand(w,'roach',0,4,250),other=stand(w,'roach',3,4,250),boss=stand(w,'ultralisk',1.5,4.4,250);
 boss.enemyTier='boss';m3.rank=2;w.refreshStats(m3,true);
 advance(w,2.6);
 assert.equal(victim.zergSix?.infections?.length,2);
 assert.ok(victim.zergSix?.infections?.some(t=>t.source===m3.id));
 assert.ok(victim.hp<250);
 for(const u of [m,m2,m3]){u.nextShotAt=100;u.weaponCooldown=100;}
 advance(w,1);
 assert.ok(other.zergSix?.infections?.length);
 other.hp=1;w.hit(other,10,[],1,'terran',.5,0,m.id);
 assert.equal(children(w,'converted').length,0);
 victim.hp=boss.hp=1;
 advance(w,1.1);
 assert.ok(victim.deadAt!==null&&boss.deadAt!==null);
 const control=children(w,'converted');
 assert.deepEqual(control.map(u=>u.zergSix?.temp?.original),[victim.id]);
 assert.equal(control[0].hp,1);
 assert.ok(w.pickups.length>0||w.wallet.minerals>0);
 assert.equal(w.stats.kills,3);
 const kills=w.stats.kills;
 w.hit(control[0],100,[],1,'zerg');
 assert.equal(control[0].hp,1);
 advance(w,9);
 assert.equal(children(w,'converted').length,0);
 assert.equal(w.stats.kills,kills);
});

test('volley checks real in-flight reservations and movement cancels only unlaunched missiles',()=>{
 const w=battle(),d=at(w,'devourer');
 for(const [i,x] of [-1,0,1].entries())stand(w,i===0?'mutalisk':'roach',x,5,1000);
 const until=(condition:()=>boolean)=>{
  for(let i=0;i<240&&!condition();i++)w.step(TUNING.step);
  assert.ok(condition());
 };
 until(()=>d.zergSix?.cast?.kind==='volley');
 assert.ok(w.issueMove({x:0,z:-18}));
 advance(w,.1);
 assert.equal(d.zergSix?.cast,undefined);
 assert.equal(d.zergSix?.ready,undefined);
 assert.equal(w.weaponFlights.filter(p=>p.zergVolley).length,0);
 const live=battle(),v=at(live,'devourer');
 const enemies=[stand(live,'corruptor',-1,5,1000),stand(live,'roach',0,5,1000),stand(live,'roach',1,5,1000)];
 for(let i=0;i<240&&!live.weaponFlights.some(p=>p.zergVolley);i++)live.step(TUNING.step);
 const [projectile]=live.weaponFlights.filter(p=>p.zergVolley);
 assert.ok(projectile);
 const victim=enemies.find(e=>e.id===projectile.target)!;
 assert.ok(victim.flying);
 assert.ok(live.issueMove({x:0,z:-18}));
 advance(live,.25);
 assert.equal(v.zergSix?.cast,undefined);
 assert.equal(live.weaponFlights.filter(p=>p.zergVolley).length,1);
 assert.ok(v.zergSix?.ready&&v.zergSix.ready>live.time);
 advance(live,1);
 assert.ok(victim.hp<victim.maxHp);
 assert.equal(live.weaponFlights.filter(p=>p.zergVolley).length,0);
});

test('host uses real locusts, earns cooldown on birth, and unburrows promptly under real movement input',()=>{
 const w=battle(),host=at(w,'swarm_host');
 const e=stand(w,'roach',0,7,1500);
 advance(w,1.8);
 assert.equal(children(w,'locust').length,4);
 assert.equal(host.zergSix?.burrow,'burrowed');
 assert.ok(host.zergSix?.ready&&host.zergSix.ready>11);
 advance(w,3.5);
 assert.ok(e.hp<e.maxHp);
 assert.ok(w.issueMove({x:0,z:-15}));
 advance(w,.3);
 assert.equal(host.zergSix?.burrow,undefined);
 advance(w,5);
 assert.ok(host.z<-5);
 assert.equal(children(w,'locust').length,0);
});

test('many hosts share the locust limit and existing children expire after parent death',()=>{
 const w=battle(),hosts=Array.from({length:14},(_,i)=>at(w,'swarm_host',(i%5-2)*.7,Math.floor(i/5)*.7));
 stand(w,'roach',0,8,50000);
 advance(w,1.8);
 assert.equal(children(w,'locust').length,48);
 assert.ok(hosts.filter(u=>u.zergSix?.ready&&u.zergSix.ready>10).length===12);
 for(const h of hosts.slice(1))w.hit(h,1e5,[],1,'zerg',0,1,undefined,true);
 assert.equal(children(w,'locust').length,48);
 advance(w,8.2);
 assert.equal(children(w,'locust').length,0);
});

test('vortex damages both layers, grants shared immunity, and does not move the boss or lord',()=>{
 const w=battle();
 at(w,'viper',-1,0);at(w,'viper',1,0);at(w,'queen',0,-4);
 const group=[stand(w,'roach',-.5,5,150),stand(w,'roach',1.3,5.5,150),stand(w,'mutalisk',-1.1,5.4,150)];
 const boss=stand(w,'ultralisk',0,5.8,200),lord=stand(w,'roach',1,6.2,200);
 boss.enemyTier='boss';lord.enemyTier='lord';
 advance(w,1.8);
 assert.ok((w.expedition.zergSixClouds?.length??0)>0);
 assert.ok(group.some(u=>(u.zergSix?.immuneUntil??0)>w.time));
 assert.equal(boss.zergSix?.immuneUntil,undefined);
 assert.equal(lord.zergSix?.immuneUntil,undefined);
 advance(w,2.3);
 assert.ok(group.every(u=>u.hp<150&&u.z>=3));
 assert.equal(boss.zergSix?.displacement,undefined);
 assert.equal(lord.zergSix?.displacement,undefined);
});

test('offset active clouds use the strongest coverage on a shared half-second damage clock',()=>{
 const w=battle(),weak=at(w,'viper',-2,0),strong=at(w,'viper',2,0),e=stand(w,'roach',0,6,500);
 for(const u of [weak,strong]){u.zergSix={ready:100};u.weaponCooldown=u.nextShotAt=100;}
 w.expedition.zergSixClouds=[
  {source:weak.id,point:{x:0,z:6},damage:6,next:.5,remaining:5},
  {source:strong.id,point:{x:0,z:6},damage:12,next:.7,remaining:5}
 ];
 advance(w,.55);
 assert.equal(w.stats.damage,12);
 assert.equal(e.zergSix?.lastCloudHit,.5);
 advance(w,.24);
 assert.equal(w.stats.damage,12);
 advance(w,.23);
 assert.equal(w.stats.damage,24);
});

test('brood shell and validated flight survive an archive and splash does not multiply births',()=>{
 const w=battle(),b=at(w,'brood_lord');
 const primary=stand(w,'ultralisk',0,7,1000),splash=stand(w,'roach',.8,7,1000),fly=stand(w,'mutalisk',0,6.6,1000);
 advance(w,1.25);
 assert.equal(w.weaponFlights.length,1);
 const archive=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));
 const next=battle();next.restoreRun(archive.bundle.run!);next.paused=false;
 assert.ok(next.issueMove({x:0,z:-14}));
 advance(next,.8);
 assert.ok(next.entities.get(primary.id)!.hp<primary.hp);
 assert.ok(next.entities.get(splash.id)!.hp<splash.hp);
 assert.equal(next.entities.get(fly.id)!.hp,fly.hp);
 assert.equal(children(next,'broodling').length,1);
 assert.equal(next.entities.get(b.id)!.shotSequence,1);
 advance(next,5.3);
 assert.equal(children(next,'broodling').length,0);
});

test('all six browser fixtures produce real combat through fixed-step World',()=>{
 for(const id of ZERG_SIX){
  const w=battle();
  placeZergSixTrial(w,id);
  let maxChild=0,control=0,clouds=0,shell=0,bileCasts=0;
  advance(w,18,()=>{
   bileCasts+=w.enemySpecials.casts.filter(c=>c.kind==='bile').length;
   maxChild=Math.max(maxChild,children(w,'locust').length,children(w,'broodling').length);
   control=Math.max(control,children(w,'converted').length);
   clouds=Math.max(clouds,w.expedition.zergSixClouds?.length??0);
   shell=Math.max(shell,...w.allies().map(u=>u.zergSix?.shellUntil??0));
  });
  assert.ok(w.stats.damage>0&&w.stats.shots>0,id);
  if(id==='infestor'){
   assert.ok(control>0,id);
   assert.equal(bileCasts,0,'the trial delays the Queen’s independent Bile clock during the first infection cycle');
  }
  if(id==='swarm_host'||id==='brood_lord')assert.ok(maxChild>0,id);
  if(id==='viper')assert.ok(clouds>0,id);
  if(id==='aberration')assert.ok(shell>0,id);
 }
});
