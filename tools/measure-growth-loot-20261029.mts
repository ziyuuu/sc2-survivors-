/** Finite opportunity/settlement replay, NOT a combat AI or measured player distribution.
 * Native stage schedules, event admission, mission ticks, reward plans and inventory are used.
 * The named profiles supply explicit kill/participation assumptions and instant travel.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {campaign18GuardCounts,campaign18StageConfig,campaign18Schedule,campaign18Runtime} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {endlessWaveTemplate,endlessFrequencyIntegral,ENDLESS,nextEndlessExpansion} from '../src/data/endless';
import {expansionBatch} from '../src/data/hives';
import {newEquipmentAccount,grantEquipment,equip,collectEquipment,discardEquipment,settleEquipment,itemsAt,BACKPACK_CAPACITY} from '../src/simulation/starship/inventory';
import {dropEnemyEquipment} from '../src/simulation/starship/drops';
import {equipmentEnemyDied} from '../src/simulation/starship/growth';
import {equipmentValue} from '../src/simulation/starship/modules';
import {tickEventPacing} from '../src/simulation/field-events/pacing';
import {tickBait} from '../src/simulation/fun-shop/bait';
import {tickReplacementHorde} from '../src/simulation/field-events/hordes';
import {tickMissions,missionStage,cancelMissions} from '../src/simulation/missions/runtime';
import {prepareFleetGate} from '../src/simulation/missions/fleet';
import {tickEncounters,flushEncounterRewards,cancelEncounters} from '../src/simulation/encounters/runtime';
import {commitFunMedical,funDeath,requestFunAttack} from '../src/simulation/encounters/expanded';
import {offerSpecialTicket,claimSpecialTicket,enterSpecialTicket,tickSpecialEntrance,beginSpecialStage,markSpecialReady,finishSpecialStage,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {resolveSpecialResource} from '../src/simulation/special-stages/rewards';
import type {Difficulty} from '../src/data/stages';
import type {Entity} from '../src/simulation/types';
import type {EquipmentItem} from '../src/simulation/starship/types';

const difficulties:Difficulty[]=['easy','normal','hard','hell'];
const profiles=[
 {id:'limited',kills:.55,participate:.25,bait:0,tavern:0,deliveries:1,module:null},
 {id:'baseline',kills:.85,participate:.75,bait:0,tavern:0,deliveries:2,module:null},
 {id:'bait-1',kills:1,participate:1,bait:1,tavern:1,deliveries:3,module:null},
 {id:'bait-3-pickup',kills:1,participate:1,bait:3,tavern:3,deliveries:3,module:'module.pickup.3'},
 {id:'bait-3-plunder',kills:1,participate:1,bait:3,tavern:3,deliveries:3,module:'module.plunder.5'},
] as const;
type Profile=typeof profiles[number];
const random=(seed:number)=>{let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);
const round=(n:number)=>Math.round(n*1000)/1000;
const sourceNames=['campaign-wave','campaign-elite','campaign-boss','campaign-hive-guards','rescue-guards','endless-wave','endless-elite','endless-boss','endless-hive-guards','mission-guards','mission-rewards','encounter-rewards','replacement-horde','bait-elite','special-resources','special-arena','special-crossing','special-dodge','plunder'];
function replay(difficulty:Difficulty,seed:number,p:Profile){
 const a=newEquipmentAccount(seed),input=new Set<string>();
 if(p.module){const r=grantEquipment(a,{template:p.module,race:'terran',slot:'gathering'},'fixture-module',{kind:'warehouse'});assert.ok(r.ok);assert.ok(equip(a,'terran',r.value.id,'gathering').ok);input.add(r.value.id);}
 const w=new World({difficulty,seed,race:'terran',terrain:new FlatTerrain(),obstacles:[],waves:true,equipmentAccount:a});
 w.start();w.workers=8;w.entities.clear();w.heroes.clear();w.expedition.familySlots=['marine','medivac'];
 for(let i=0;i<4;i++)w.addUnit('marine','terran',i*2,0,5);w.addUnit('medivac','terran',0,3,5);
 for(const channel of Object.values(w.expedition.production))channel.enabled={};
 w.funShop.levels.bait=p.bait;w.funShop.levels.tavern=p.tavern;
 const outcome=random(seed^0x32445),ledger=new Map<string,EquipmentItem>(),sources=Object.fromEntries(sourceNames.map(s=>[s,0])),events:Record<string,number>={},births:Record<string,number>={};
 const accepted=new Map<string,boolean>(),age=new Map<string,number>();let picked=0,destroyed=0;
 function record(source:string){for(const item of Object.values(w.starship.account.items))if(!input.has(item.id)&&!ledger.has(item.id)){ledger.set(item.id,structuredClone(item));sources[source]=(sources[source]??0)+1;}}
 function pickup(){const current=w.starship.account;for(const item of Object.values(current.items))if(current.locations[item.id]?.kind==='ground'){
  if(itemsAt(current,'backpack').length>=BACKPACK_CAPACITY){const old=itemsAt(current,'backpack').sort((x,y)=>x.quality-y.quality||x.id.localeCompare(y.id))[0];assert.ok(discardEquipment(current,old.id).ok);destroyed++;}
  const r=collectEquipment(current,item.id);assert.ok(r.ok,r.ok?'':r.error);picked++;
 }}
 function label(kind:string){events[kind]=(events[kind]??0)+1;}
 function accept(id:string,kind:string){if(!accepted.has(id)){accepted.set(id,outcome()<p.participate);age.set(id,w.time);label(kind);}return accepted.get(id)!;}
 function move(point:{x:number;z:number}){w.anchor.x=point.x;w.anchor.z=point.z;for(const [i,u] of w.allies().filter(u=>!u.temporary&&!u.heldBy).entries()){u.x=point.x+(i%3)*1.5;u.z=point.z+Math.floor(i/3)*1.5;}w.hash.rebuild(w.entities.values());}
 const sample=w.addUnit('roach','zerg',25,0);w.entities.delete(sample.id);
 function death(u:Entity,source:string){const q=w.encounters.expanded.queen;if(q&&accept(q.id,'encounter:cruelQueen'))funDeath(w,u,q.actors[0]);dropEnemyEquipment(w,u);record(source);equipmentEnemyDied(w,u);record('plunder');u.hp=0;w.entities.delete(u.id);}
 function bodies(n:number,source:string,tier?:'elite'|'boss',density=1){for(let i=0;i<n;i++){
  births[source]=(births[source]??0)+1;if(tier!=='boss'&&outcome()>p.kills)continue;
  const u={...sample,id:w.nextId++,bornAt:w.time,hp:sample.maxHp,enemyOrigin:'regular',enemyTier:tier,enemySpawn:{stage:w.stage,progress:1,density}} as Entity;death(u,source);
 }}
 function special(){const s=w.specialStages.active;if(!s)return;const kind=s.kind;label('special:'+kind);markSpecialReady(w);
  if(kind==='resources'){for(const b of s.resources.values()){b.hp=0;resolveSpecialResource(w,b.id);}}
  else if(kind==='arena'){for(const id of s.enemies){const u=w.entities.get(id)!;death(u,'special-arena');}}
  record('special-'+kind);pickup();finishSpecialStage(w,kind==='resources'?'timeout':'success');record('special-'+kind);pickup();if(w.specialStages.active?.phase==='loot')assert.ok(quitSpecialStage(w));
 }
 function eventTick(){
  const m=w.missions.active;if(m&&accept(m.id,'mission:'+m.kind)){
   const b=(m.kind==='intel'?w.missions.bodies.get(m.bodyIds.at(-1)!):m.kind==='rescue'&&m.rescue?.target?w.entities.get(m.rescue.target):[...w.missions.bodies.values()].find(b=>!b.resolved&&b.role!=='base'));
   if(b)move(b);
   if(m.kind==='hives'&&w.time-age.get(m.id)!>=20)for(const b of w.missions.bodies.values())b.hp=0;
   if(m.kind==='eggs')for(const b of [...w.missions.bodies.values()])if(!b.resolved)w.hit(b,1e9,[],1,'terran',0,1);
  }
  if(w.missions.active?.kind==='fleet')prepareFleetGate(w);tickMissions(w);record('mission-rewards');
  const e=w.encounters.active;if(e&&accept(e.id,'encounter:'+e.kind)){
   const u=e.subject===null?undefined:w.entities.get(e.subject);if(u){move(u);if(e.kind==='golden'||e.kind==='giant'&&e.tier>=3)w.hit(u,1e9,[],1,'terran',0,1);}
  }
  const f=w.encounters.expanded.short;if(f&&accept(f.id,'encounter:'+f.kind)){
   const actors=f.actors.map(id=>w.entities.get(id)).filter((u):u is Entity=>!!u&&u.hp>0);
   if(f.kind==='infectedTerrans'){const med=w.allies().find(u=>u.unitType==='medivac')!;for(const u of actors)commitFunMedical(w,med,u,u.maxHp);}
   else if(['whitePack','flyingRoaches','corruptedProtoss'].includes(f.kind))for(const u of actors){w.hit(u,1e9,[],1,'terran',0,1);}
   else if(f.kind==='devourer'&&f.phase==='rescue')for(const u of actors)w.hit(u,1e9,[],1,'terran',0,1);
  }
  const q=w.encounters.expanded.queen;if(q&&accept(q.id,'encounter:cruelQueen')&&q.kills>=300){requestFunAttack(w,'cruelQueen');const u=w.entities.get(q.actors[0]);if(u?.hp)w.hit(u,1e9,[],1,'terran',0,1);}
  tickEncounters(w);record('encounter-rewards');
  for(const u of [...w.entities.values()])if(u.hp>0&&u.owner==='zerg'&&!u.fun&&!u.encounter){const source=u.mission?'mission-guards':w.fieldEvents.pacing.baitElites.includes(u.id)?'bait-elite':'replacement-horde';if(outcome()<p.kills)death(u,source);else {u.hp=0;w.entities.delete(u.id);}}
  // Accepted queens are assigned eligible scheduled kills until the native attack threshold.
  // Parasites/devourer/flying-roach support has no equipment reward and is not fabricated.
  for(const [id,u] of w.entities)if(u.hp<=0)w.entities.delete(id);
  flushEncounterRewards(w);record('encounter-rewards');pickup();
 }
 let clock=0;
 for(let stage=1;stage<=18;stage++){
  w.stage=stage;w.stageElapsed=0;w.stageStartedAt=clock;w.phase='battle';w.paused=false;w.hive=null;w.pods=[];w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();missionStage(w);move({x:0,z:0});w.prepareStage();
  const plan=campaign18Schedule(campaign18StageConfig(stage,difficulty),seed),waves=mixCampaignWaves(plan.waves,stage,difficulty,seed),hives=campaign18Runtime(campaign18StageConfig(stage,difficulty),plan).hiveBatches;
  let wi=0,si=0,hi=0;const guards=campaign18GuardCounts(stage,difficulty);
  for(let i=0;i<p.deliveries;i++)bodies(sum(Object.values(campaign18GuardCounts(stage,difficulty,i).counts)),'rescue-guards');
  if(w.specialStages.ticket?.claimed){enterSpecialTicket(w);special();}
  for(let second=0;second<w.duration;second++){
   w.time=clock+second;w.tick=Math.round(w.time*60);w.stageElapsed=second;
   while(wi<waves.length&&waves[wi].at<=second){const wave=waves[wi++];w.stageWave=wi;
    if(!w.fieldEvents.horde)for(const member of wave.members??[])bodies(1,'campaign-wave',undefined,member.stamp.density);
   }
   while(si<plan.specials.length&&plan.specials[si].at<=second){const e=plan.specials[si++];w.nextSpecial=si;bodies(1,e.tier==='elite'?'campaign-elite':'campaign-boss',e.tier==='elite'?'elite':'boss');}
   while(hi<hives.length&&hives[hi].at<=second){bodies(hives[hi++].types.length,'campaign-hive-guards');}
   tickReplacementHorde(w);tickEventPacing(w);tickBait(w);
   if(w.specialStages.portal&&accept('portal:'+stage+':'+w.specialStages.portal.until,'portal:'+w.specialStages.portal.kind)){move(w.specialStages.portal.point);beginSpecialStage(w,w.specialStages.portal.kind,'portal');special();}
   tickSpecialEntrance(w);if(w.specialStages.active)special();
   // Only the event managers need their fixed ticks; no GPU, movement AI, combat or survival is simulated.
   if(w.missions.active||w.encounters.active||w.encounters.expanded.short||w.encounters.expanded.queen){for(let tick=0;tick<60;tick++){w.time=clock+second+tick/60;w.tick=Math.round(w.time*60);eventTick();}}
   else eventTick();
   w.effects=[];w.pickups=[];w.rewardDrops=[];
  }
  clock+=w.duration;w.time=clock;w.phase='reward';offerSpecialTicket(w);if(w.specialStages.ticket&&!w.specialStages.ticket.claimed&&outcome()<p.participate)claimSpecialTicket(w);
 }
 cancelMissions(w);cancelEncounters(w);w.phase='battle';w.paused=false;move({x:0,z:0});
 const specials:{time:number;tier:'elite'|'boss'}[]=[];
 for(const tier of ['elite','boss'] as const){let progress=0;const interval=ENDLESS[tier].interval*(tier==='elite'&&difficulty==='easy'?2:1);for(let tick=1;tick<=960*60;tick++){const time=tick/60;progress=Math.min(1,progress+(endlessFrequencyIntegral(time)-endlessFrequencyIntegral(time-1/60))/interval);if(progress>=1-1e-8){specials.push({time,tier});progress=0;}}}
 for(let r=1;r<=16;r++){
  w.endless={round:r,startedAt:clock,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};w.time=clock+(r-1)*60;
  for(const wave of endlessWaveTemplate(seed,r,difficulty))for(const member of wave.members??[])bodies(1,'endless-wave',undefined,member.stamp.density);
  for(const e of specials.filter(e=>e.time>(r-1)*60&&e.time<=r*60))bodies(1,'endless-'+e.tier,e.tier);
  // Explicit production assumption: same number of successful deliveries per endless minute.
  for(let i=0;i<p.deliveries;i++)bodies(sum(Object.values(campaign18GuardCounts(18,difficulty,i).counts)),'rescue-guards');
  // Hell expansion destroyed after its first batch (8 seconds), no indefinite hive farming.
  if(difficulty==='hell')for(let at=20;at<960;at=nextEndlessExpansion(at+.001))if(at+8>(r-1)*60&&at+8<=r*60)bodies(expansionBatch(18,1).length,'endless-hive-guards');
  pickup();
 }
 record('unclassified');assert.equal(sources.unclassified??0,0);pickup();
 assert.ok(settleEquipment(a,'success').ok);const extracted=[...ledger.keys()].filter(id=>!!a.items[id]).length;
 const salvaged=a.settlement?.salvaged.length??0,lost=a.settlement?.lost.length??0;
 assert.equal(ledger.size,sum(Object.values(sources)));assert.equal(ledger.size,picked);assert.equal(extracted+destroyed+salvaged+lost,picked);
 return {seed,generated:ledger.size,picked,destroyed,salvaged,lost,extracted,quality:[1,2,3,4,5].map(q=>[...ledger.values()].filter(i=>i.quality===q).length),sources,events,births,dropBonus:equipmentValue(w,'equipment_drop_chance')};
}
const samples=Number(process.env.LOOT_SAMPLES??'16'),selected=process.env.LOOT_PROFILE,selectedDifficulty=process.env.LOOT_DIFFICULTY;
assert.ok(Number.isSafeInteger(samples)&&samples>0&&samples<=64);
const groups=[];
function distribution(values:number[]){const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return {mean:round(sum(values)/values.length),min:sorted[0],p10:sorted[Math.floor((sorted.length-1)*.1)],median:sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2,p90:sorted[Math.floor((sorted.length-1)*.9)],max:sorted.at(-1)};}
for(const profile of profiles.filter(p=>!selected||p.id===selected))for(const difficulty of difficulties.filter(d=>!selectedDifficulty||d===selectedDifficulty)){
 const runs=Array.from({length:samples},(_,i)=>replay(difficulty,529+i*7919,profile)),quality=[1,2,3,4,5].map((_,i)=>round(sum(runs.map(r=>r.quality[i]))/samples)),group={difficulty,profile,samples,generated:distribution(runs.map(r=>r.generated)),qualityMean:quality,whiteShare:round(quality[0]/sum(quality)),blue:distribution(runs.map(r=>r.quality[2])),picked:distribution(runs.map(r=>r.picked)),destroyed:distribution(runs.map(r=>r.destroyed)),extracted:distribution(runs.map(r=>r.extracted)),sourceMeans:Object.fromEntries(sourceNames.map(s=>[s,round(sum(runs.map(r=>r.sources[s]??0))/samples)])),eventMeans:Object.fromEntries([...new Set(runs.flatMap(r=>Object.keys(r.events)))].sort().map(k=>[k,round(sum(runs.map(r=>r.events[k]??0))/samples)])),runs};groups.push(group);console.log(JSON.stringify({difficulty,profile:profile.id,...group.generated,whiteShare:group.whiteShare}));
}
const sourceFiles=['src/simulation/starship/drops.ts','src/data/enemy-tuning.ts','src/data/terran-elites.ts','src/simulation/combat/terran-elite-runtime.ts','src/simulation/encounters/runtime.ts','src/simulation/encounters/expanded.ts','src/simulation/missions/encounters.ts','src/simulation/special-stages/rewards.ts'];
const report={date:'2026-10-29',horizon:'Campaign 1–18 plus completed endless 1–16',method:'Finite native opportunity/settlement replay with explicit kill/participation/production profiles, fixed mission ticks and instant objective travel. No combat/survival validation.',quantileMethod:'p10/p90 use the observed value at floor((n-1)*p); median averages the two central observations for even n.',limits:['Profiles are assumptions, not empirical player cohorts; quantiles are conditional RNG distributions.','No player damage or path travel; all admitted optional tasks can be approached instantly. This overstates completion availability.','Main/expansion campaign hive reserves are fully killed; hell endless hives die after the first batch. No indefinite resource farming.','Participating queens are assigned eligible primary kills until the native 300-kill attack threshold; this is a scripted success assumption, not measured queen combat.','Input module excluded; all generated loot counted before pickup/destruction; inventory pickup is scripted, including its real capacity and successful extraction.','Only one fixed Terran roster (four Marines and a Medivac); other roster/race eligibility and real device play remain outside this replay.'],sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),groups:groups.map(({runs,...g})=>g)};
const output=process.argv[2]??'reports/qa/growth-loot-replay-20261029.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.mkdirSync('reports/local/growth-loot-20261029',{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('reports/local/growth-loot-20261029/replay-detail.json',JSON.stringify(groups,null,2)+'\n');
