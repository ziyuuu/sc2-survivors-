/** Finite production-engine probes for host loss, hero revival and I/V isolated fire. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {doomsdayScenario} from '../preview/doomsday-showcase-20261117/scenarios';
import {DOOMSDAY_DRIVERS} from '../src/simulation/combat/doomsday-orange';
import {DOOMSDAY_BLUEPRINTS,acquireDoomsdayBlueprint,reconcileDoomsdayRefits} from '../src/simulation/combat/doomsday-refits';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {reconcileMechanicalSeats} from '../src/simulation/combat/doomsday-roster';
import {productionQuote,updateExpeditionProduction,releasePaidPassenger} from '../src/simulation/expedition-production';
import {FAMILY_REQUIREMENTS,familyLine} from '../src/data/expedition-buildings';
import {observeWorld} from '../src/simulation/observation';
const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-20261117';await fs.mkdir(out,{recursive:true});
const result={revivals:[] as any[],replacement:[] as any[],fire:[] as any[],arrival:[] as any[]};
for(const driver of DOOMSDAY_DRIVERS){
 const {world:w}=doomsdayScenario('M-O01',1,false,driver),u=w.heroEntity(driver)!;w.paused=false;
 const polygon=[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}];assert.ok(w.castHero(driver,{ground:polygon,air:polygon,occludedGround:[],occludedAir:[]}),driver+' skill unavailable');
 for(let i=0;i<240;i++)w.step();
 const previousId=u.id,oldRank=u.rank,skillReady=w.heroes.get(driver)!.skillReady;
 assert.ok(skillReady>0,driver+' did not use native skill');
 w.hit(u,1e12,[],1,'zerg',0,1,undefined,true);assert.equal(u.hp,0);w.endStage();assert.ok(w.reviveHero(driver));const paid={...w.wallet};assert.equal(w.reviveHero(driver),false);
 const snapshot=w.captureRun(),copy=doomsdayScenario('M-O01',1,false,driver).world;copy.restoreRun(snapshot);
 for(let i=0;i<4&&copy.phase==='reward';i++)assert.ok(copy.skipReward());
 const revived=copy.heroEntity(driver)!;assert.ok(revived.hp>0);assert.notEqual(revived.id,previousId);assert.equal(revived.rank,oldRank);assert.equal(copy.allies().filter(u=>u.heroId===driver).length,1);
 assert.equal(revived.doomsday!.heroArmor!.remaining,revived.doomsday!.heroArmor!.max);assert.deepEqual(copy.wallet,paid);
 result.revivals.push({driver,oldId:previousId,newId:revived.id,rank:oldRank,skillUsed:skillReady>0,armor:revived.doomsday!.heroArmor!.remaining,receiptOnce:true});
}
for(const [id,family] of Object.entries(DOOMSDAY_BLUEPRINTS)){
 const w=new World({race:'terran',seed:171145,waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[]});w.start();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.expedition.ledger=[];w.pods=[];w.stage=12;w.wallet={minerals:100000,gas:100000};
 for(const g of w.expedition.building!.groups)g.enabled=false;
 const line=familyLine(family),group=w.grantFacility(line as 'factory'|'starport')!;for(const t of FAMILY_REQUIREMENTS[family])w.expedition.tech[t]=1;w.phase='reward';assert.ok(w.setBuildingGroupOutputs(group.id,[family]));w.phase='battle';w.expedition.familySlots=[family];
 const host=w.addUnit(family,'terran',0,0,5);w.addUnit('marine','terran',-6,-6);w.expedition.doomsday=newDoomsdayState();w.expedition.doomsday.ranks[id]=1;w.expedition.build!.main='doomsday';reconcileMechanicalSeats(w,true);acquireDoomsdayBlueprint(w,id as keyof typeof DOOMSDAY_BLUEPRINTS);
 w.expedition.build!.counts.doomsday=3;w.expedition.build!.milestones=[{id:'doomsday:3',branch:'doomsday',at:3,offers:['M-N04','M-N05'],claimed:'M-N05'}];w.expedition.doomsday.ranks['M-N05']=1;
 const base=productionQuote(w,family).seconds;host.hp=0;reconcileDoomsdayRefits(w);updateExpeditionProduction(w,0);const b=w.expedition.doomsday.blueprints![id]!,job=w.expedition.ledger.find(j=>j.id===b.order?.jobId)!;assert.ok(job,id+' has no replacement job');
 const seconds=job.remaining,factor=id.startsWith('M-O')?1.5:1.25;assert.ok(Math.abs(seconds-base*factor)<1e-6);const paid={...w.wallet};
 updateExpeditionProduction(w,seconds/2,false);const snapshot=w.captureRun(),copy=new World({race:'terran',seed:171145,waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[]});copy.restoreRun(snapshot);updateExpeditionProduction(copy,seconds/2+.01,false);
 const restoredJob=copy.expedition.ledger.find(j=>j.id===job.id)!,pod=copy.pods.find(p=>p.id===restoredJob.podId)!;assert.ok(pod,id+' has no physical delivery pod');
 // Isolate manufacture from contested landing: explicitly stage the real pod at opening before the production passenger transaction.
 pod.status='opening';pod.guardianIds.clear();const next=releasePaidPassenger(copy,pod,0,{x:10,z:10});assert.ok(next);reconcileMechanicalSeats(copy);reconcileDoomsdayRefits(copy);assert.equal(copy.expedition.doomsday!.blueprints![id]!.host!.entityId,next.id);assert.equal(releasePaidPassenger(copy,pod,0,{x:10,z:10}),null);assert.equal(copy.expedition.doomsday!.blueprints![id]!.losses,1);assert.deepEqual(copy.wallet,paid);
 result.replacement.push({id,family,baseSeconds:base,manufactureSeconds:seconds,factor,losses:1,hostId:next.id,restoredHalfway:true,landing:'controlled opening; contested flight/landing time excluded'});
}
for(const id of ['M-B07','M-P06'] as const)for(const rank of [1,5])for(const variant of [0,1] as const){
 const f=doomsdayScenario(id,variant),w=f.world,u=w.entities.get(f.mainId)!;u.rank=rank;w.refreshStats(u);u.hp=u.maxHp;w.paused=false;let damage=0;observeWorld(w,(_s,k,n)=>{if(k==='damage')damage+=n;});for(let i=0;i<720;i++)w.step();assert.equal(w.tick,720);
 result.fire.push({id,rank,variant,seconds:12,damage,posture:u.mode,flying:u.flying,seed:171145});
}
if(process.env.DOOMSDAY_NATURAL_ARRIVAL)for(const [id,family] of Object.entries(DOOMSDAY_BLUEPRINTS)){
 const w=new World({race:'terran',seed:171145,waves:false,terrain:new FlatTerrain(),obstacles:[]});w.start();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.expedition.ledger=[];w.pods=[];w.stage=12;w.wallet={minerals:100000,gas:100000};w.anchor.x=w.anchor.z=0;
 for(const g of w.expedition.building!.groups)g.enabled=false;const group=w.grantFacility(familyLine(family) as 'factory'|'starport')!;for(const t of FAMILY_REQUIREMENTS[family])w.expedition.tech[t]=1;w.phase='reward';assert.ok(w.setBuildingGroupOutputs(group.id,[family]));w.phase='battle';w.expedition.familySlots=[family];
 const host=w.addUnit(family,'terran',0,0,5);for(let i=0;i<3;i++)w.addUnit(family,'terran',(i-1)*3,-3,5);w.acquireHero('raynor');w.acquireHero('tychus');
 w.expedition.doomsday=newDoomsdayState();w.expedition.doomsday.ranks[id]=1;w.expedition.build={counts:{doomsday:3},main:'doomsday',milestones:[{id:'doomsday:3',branch:'doomsday',at:3,offers:['M-N04','M-N05'],claimed:'M-N04'}],orange:null};w.expedition.doomsday.ranks['M-N04']=1;reconcileMechanicalSeats(w,true);acquireDoomsdayBlueprint(w,id as keyof typeof DOOMSDAY_BLUEPRINTS);
 const initialMembers=w.allies().filter(u=>!u.heroId).map(u=>u.id);let combatDamage=0,activeTicks=0,scans=0;observeWorld(w,(_source,kind,amount)=>{if(kind==='damage')combatDamage+=amount;});
 w.hit(host,1e12,[],1,'zerg',0,1,undefined,true);w.paused=false;let madeAt:number|null=null,landedAt:number|null=null,openedAt:number|null=null,guards=0,orderIssued=false;
 for(let tick=0;tick<9000&&w.phase==='battle';tick++){
  w.step();const b=w.expedition.doomsday!.blueprints![id]!,job=w.expedition.ledger.find(j=>j.id===b.order?.jobId),pod=w.pods.find(p=>p.id===job?.podId);
  if(pod){madeAt??=pod.createdAt;guards=Math.max(guards,pod.guardTypes.length);if(!orderIssued){w.issueMove({x:pod.x,z:pod.z});orderIssued=true;}if(pod.status!=='falling')landedAt??=w.time;if(pod.status==='opening')openedAt??=w.time;}
  if(madeAt!==null&&w.time-madeAt>6&&w.order)w.cancelOrder();
  // Use the normal player scan for buried guards; their threat must be defeated, not erased from the pod.
  if([...w.entities.values()].some(u=>u.owner==='zerg'&&u.hp>0&&u.cloaked&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<=12)&&w.castDetection())scans++;
  if(w.allies().some(u=>u.hp>0&&u.weaponDamage>0&&u.lastShotAt>=w.time-1))activeTicks++;
  if(b.host&&b.host.entityId!==host.id){result.arrival.push({id,family,stage:12,seed:171145,manufacturedAt:madeAt,landedAt,openedAt,arrivedAt:w.time,guards,scans,losses:b.losses,formalLosses:initialMembers.filter(id=>(w.entities.get(id)?.hp??0)<=0).length,combatDamage,activeSeconds:activeTicks/60,newId:b.host.entityId,hostUnavailableSeconds:w.time});break;}
 }
 assert.equal(result.arrival.at(-1)?.id,id,JSON.stringify({id,phase:w.phase,time:w.time,decision:w.requiresPlayerDecision,b:w.expedition.doomsday?.blueprints?.[id],jobs:w.expedition.ledger,pods:w.pods.map(p=>({status:p.status,hp:p.hp,guards:p.guardianIds.size})),enemies:[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0).map(u=>({type:u.unitType,x:u.x,z:u.z,hp:u.hp,cloaked:u.cloaked})),allies:w.allies().map(u=>({type:u.unitType,hero:u.heroId,x:u.x,z:u.z,hp:u.hp,target:u.attackTarget})),podPosition:w.pods.map(p=>({x:p.x,z:p.z}))}));
}
await fs.writeFile(out+'/lifecycle.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
