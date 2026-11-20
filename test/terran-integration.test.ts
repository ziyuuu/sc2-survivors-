import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newBioState} from '../src/simulation/combat/bio-state';
import {bioBody,bioStimFactor,bioKnockDistance} from '../src/simulation/combat/bio-runtime';
import {bioTickCombat,bioHeal,bioOnEnemyDeath} from '../src/simulation/combat/bio-combat';
import {bioLifeTick} from '../src/simulation/combat/bio-life';
import type {BioId} from '../src/data/terran-bio';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectShopWeights} from '../src/simulation/progression/expedition-drafts';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import type {BuildBranch,BuildCardId} from '../src/simulation/progression/build-progress';
import {RARITIES} from '../src/data/rewards';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {healExpedition} from '../src/simulation/combat/expedition-combat';
import {releasePaidPassenger} from '../src/simulation/expedition-production';
import {observeWorld} from '../src/simulation/observation';

function battle(ranks:Partial<Record<BioId,number>>={}){
 const w=new World({race:'terran',seed:191145,waves:false,sandbox:true,terrain:false,obstacles:[]});
 assert.ok(w.start());w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;
 w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(const g of w.expedition.building!.groups)g.enabled=false;
 w.expedition.bio={...newBioState(),ranks};return w;
}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
function foe(w:World){const e=w.addUnit('roach','zerg',0,3);e.hp=e.maxHp=100000;e.armor=0;e.weaponDamage=e.moveSpeed=0;return e;}

test('P03 and N09 use the stronger direct leech rate and one recovery cap',()=>{
 const w=battle({'BIO-P03':1,'BIO-N09':1}),u=w.addUnit('marine','terran',0,0),e=foe(w);
 u.hp=u.maxHp*.3;bioBody(u).shareEnd=6;
 const before=u.hp,enemyHp=e.hp;w.fire(u,e);
 close(u.hp-before,Math.min((enemyHp-e.hp)*.1,u.maxHp*.03));
});

test('a full kill-growth account keeps its N01 reserve, including the last ordinary growth point',()=>{
 for(const kills of [29,30]){
  const w=battle({'BIO-N01':1,'BIO-G03':1}),u=w.addUnit('marine','terran',0,0),e=foe(w);
  bioBody(u).kills=kills;w.expedition.bio!.nodeReserves['BIO-N01']=2;e.hp=.1;w.fire(u,e);
  assert.equal(u.bio!.kills,30);assert.equal(w.expedition.bio!.nodeReserves['BIO-N01'],2);
 }
});

test('N03 free stim uses the purchased W04 strength without charging life',()=>{
 const w=battle({'BIO-W01':1,'BIO-W04':3,'BIO-N03':1});
 const dead=w.addUnit('marine','terran',0,0),ally=w.addUnit('marauder','terran',1,0);const hp=ally.hp;
 w.killEncounterHost(dead);close(ally.hp,hp);close(bioStimFactor(w,ally),1.85);close(ally.stimUntil,5);
});

test('a free extension preserves a paid stim receipt and refunds it once after the real end, including restore',()=>{
 const w=battle({'BIO-W01':1,'BIO-W04':1,'BIO-G08':1,'BIO-N03':1});
 const ally=w.addUnit('marine','terran',0,0),dead=w.addUnit('marauder','terran',1,0);
 w.upgrades.set('stim',1);assert.ok(w.stim());const paid=ally.bio!.paid!;
 w.time=8;w.tick=480;w.killEncounterHost(dead);close(ally.stimUntil,13);
 w.time=11;w.tick=660;bioTickCombat(w,1/60);assert.equal(ally.bio!.refund,undefined);
 w.restoreRun(w.captureRun());const restored=w.entities.get(ally.id)!,hp=restored.hp;
 for(let tick=661;tick<=1080;tick++){w.tick=tick;w.time=tick/60;bioTickCombat(w,1/60);}
 close(restored.hp-hp,paid*.3);assert.equal(restored.bio!.refund,undefined);
});

test('P02 stops counting combat time once the last real damage is over three seconds old',()=>{
 const w=battle({'BIO-P02':1}),u=w.addUnit('marine','terran',0,0);
 bioBody(u).lastCombat=0;u.bio!.surviveTime=19.9;w.time=3.5;w.tick=210;bioTickCombat(w,.2);
 assert.equal(u.bio!.survival??0,0);close(u.bio!.surviveTime!,19.9);
});

test('O01 lets a Terran hero receive the purchased B08 shield, amplified once',()=>{
 const w=battle({'BIO-O01':1,'BIO-B08':1});w.acquireHero('raynor');const u=w.heroEntity('raynor')!;
 u.hp=u.maxHp*.4;bioHeal(w,u,u.maxHp*.2);
 close(u.bio?.barrier??0,u.maxHp*.08*1.75);
});

test('O01 amplifies the positive P06 recovery without amplifying P03 self-payment',()=>{
 const w=battle({'BIO-O01':1,'BIO-P06':1,'BIO-P03':1});w.acquireHero('raynor');const u=w.heroEntity('raynor')!;
 u.hp=u.maxHp*.4;bioBody(u).moltEnd=3;const hp=u.hp;w.time=1;w.tick=60;bioTickCombat(w,1);
 close(u.hp-hp,u.maxHp*(.06/3*1.75-.01));
});

test('O01 amplifies treatment-suppression and knockback resistance and lets the hero recover residue',()=>{
 const w=battle({'BIO-O01':1,'BIO-B07':3,'BIO-W06':3,'BIO-G06':1});w.acquireHero('raynor');const u=w.heroEntity('raynor')!;
 u.x=u.z=0;u.hp=u.maxHp*.3;const e=foe(w);w.applyStatus(u,e,'corruption',.4,10);const hp=u.hp;
 bioHeal(w,u,10);close(u.hp-hp,10*(1-.4*(1-.35*1.75)));close(bioKnockDistance(w,u,10),10*(1-.3*1.75));
 e.x=e.z=0;bioOnEnemyDeath(w,e,u.id);const before=u.hp;bioTickCombat(w,0);
 close(u.hp-before,u.maxHp*.02*1.75*(1-.4*(1-.35*1.75)));
});

test('O01 giant hero collision size is rebuilt from its original radius during repeated refresh and restore',()=>{
 const w=battle();w.acquireHero('raynor');const u=w.heroEntity('raynor')!,radius=u.unitRadius;
 w.expedition.bio!.ranks={'BIO-O01':1,'BIO-G03':3};w.refreshStats(u);const hp=u.maxHp;
 for(let i=0;i<100;i++)w.refreshStats(u);close(u.unitRadius,radius*1.2);close(u.movementRadius??u.unitRadius,radius*1.2);close(u.maxHp,hp);
 w.restoreRun(w.captureRun());const saved=w.entities.get(u.id)!;w.refreshStats(saved);close(saved.unitRadius,radius*1.2);
});

test('W01 keeps a dead hound seat cooldown across host death, replacement and archive restore',()=>{
 const w=battle({'BIO-W01':1}),host=w.addUnit('marine','terran',0,0);bioLifeTick(w,0);
 const dog=w.entities.get(host.bio!.hound!)!;w.hit(dog,100000,[],1,'zerg',0,1);w.killEncounterHost(host);
 w.time=10;w.tick=600;const replacement=w.addUnit('marine','terran',0,0);bioLifeTick(w,0);
 assert.equal(w.allies().filter(u=>u.bio?.role==='hound').length,0);
 w.restoreRun(w.captureRun());w.time=89;w.tick=5340;bioLifeTick(w,0);assert.equal(w.allies().filter(u=>u.bio?.role==='hound').length,0);
 w.time=90;w.tick=5400;bioLifeTick(w,0);const dogs=w.allies().filter(u=>u.bio?.role==='hound');assert.equal(dogs.length,1);assert.equal(dogs[0].bio!.host,replacement.id);
});

test('N06 and P03 apply to every native segment of one elite round, without counting six rounds',()=>{
 const run=(ranks:Partial<Record<BioId,number>>)=>{
  const w=battle(ranks),first=w.addUnit('marine','terran',0,0),u=w.addUnit('reaper','terran',1,0),e=foe(w);
  u.eliteId='reaper.1';w.refreshStats(u,true);u.hp=u.maxHp*.2;w.fire(first,e);const hp=e.hp,own=u.hp;u.shotSequence=1;
  w.fire(u,e);for(let tick=1;tick<=40;tick++){w.tick=tick;w.time=tick/60;tickWeaponFlights(w,1/60);}
  return {damage:hp-e.hp,recovery:u.hp-own,max:u.maxHp,rounds:u.bio?.rounds??0};
 };
 const base=run({}),buff=run({'BIO-N06':1,'BIO-P03':1});close(buff.damage,base.damage*1.3);close(buff.recovery,Math.min(buff.damage*.1,buff.max*.03));assert.equal(buff.rounds,1);
});

test('ordinary and elite medical units honor B04 full healing and the target B07 resistance',()=>{
 for(const elite of [false,true])for(const mechanical of [false,true]){
  const w=battle({'BIO-B04':1,'BIO-B07':3}),medic=w.addUnit('medivac','terran',0,0),patient=w.addUnit(mechanical?'tank':'marine','terran',1,0),e=foe(w);
  if(elite){medic.eliteId='medivac.1';w.refreshStats(medic,true);}medic.healRate=10;medic.energy=100;
  patient.hp=patient.maxHp*.2;w.applyStatus(patient,e,'corruption',.4,10);const hp=patient.hp;healExpedition(w,medic,1);
  close(patient.hp-hp,10*(1-.4*(mechanical?1:.65)));
 }
});

test('P02 records real poison damage and healing of an engaged ally as combat activity',()=>{
 const w=battle({'BIO-P02':1}),u=w.addUnit('marine','terran',0,0),e=foe(w),ally=w.addUnit('marauder','terran',1,0);
 w.time=10;w.tick=600;bioBody(e).poisons=[{kind:'venom',source:u.id,power:10,start:6,next:10,end:11}];bioTickCombat(w,1/60);assert.equal(u.bio?.lastCombat,10);
 w.time=11;bioBody(ally).lastCombat=11;ally.hp*=.5;bioHeal(w,ally,10,u.id);assert.equal(u.bio?.lastCombat,11);
});

test('N02 formal-seat lethal cooldown survives replacement after the original rush',()=>{
 const w=battle({'BIO-N02':1,'BIO-W02':1}),u=w.addUnit('marauder','terran',0,0);bioLifeTick(w,0);
 w.hit(u,1e6,[],1,'zerg',0,1);assert.equal(u.bio?.rushEnd,2);u.bio!.rushEnd=undefined;w.killEncounterHost(u);
 w.time=10;w.tick=600;const next=w.addUnit('marauder','terran',0,0);bioLifeTick(w,0);w.restoreRun(w.captureRun());const restored=w.entities.get(next.id)!;
 w.hit(restored,1e6,[],1,'zerg',0,1);assert.equal(restored.hp,0);assert.equal(restored.bio?.rushEnd,undefined);
});

test('O03 settles an already paid incoming body once before consolidation, without death or another payment',()=>{
 const w=battle(),host=w.addUnit('marine','terran',0,0,3),pod=w.spawnPod('marine',{x:4,z:0},901,1);pod.status='opening';pod.guardianIds.clear();
 w.expedition.ledger.push({id:901,family:'marine',line:'barracks',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{purpose:'body',paid:{minerals:50,gas:0},status:'waiting',entityId:null}]});
 w.expedition.bio!.ranks['BIO-O03']=1;bioLifeTick(w,0);w.restoreRun(w.captureRun());const after=w.pods.find(p=>p.id===pod.id)!,wallet={...w.wallet};let deaths=0;observeWorld(w,(_id,kind,amount)=>{if(kind==='deaths')deaths+=amount;});
 assert.ok(releasePaidPassenger(w,after,0,{x:4,z:0}));assert.equal(w.familyUnits('marine').length,1);assert.equal(w.familyUnits('marine')[0].id,host.id);
 assert.equal(w.expedition.ledger[0].passengers[0].status,'released');assert.deepEqual(w.wallet,wallet);assert.equal(deaths,0);assert.equal(releasePaidPassenger(w,after,0,{x:4,z:0}),null);
});

test('clouds integrate reversed strengths and fractional overlap exactly after archive restoration',()=>{
 const w=battle(),u=w.addUnit('tank','terran',0,0),e=foe(w);
 w.expedition.bio!.fields=[{kind:'cloud',source:u.id,x:e.x,z:e.z,radius:2,power:150,start:0,next:1,end:1.25},{kind:'cloud',source:u.id,x:e.x,z:e.z,radius:2,power:100,start:.5,next:1.5,end:2.25}];
 const hp=e.hp;w.time=1;w.tick=60;bioTickCombat(w,0);w.restoreRun(w.captureRun());
 for(let tick=61;tick<=150;tick++){w.time=tick/60;w.tick=tick;bioTickCombat(w,1/60);}
 close(hp-w.entities.get(e.id)!.hp,150*1.25+100);assert.equal(w.expedition.bio!.fields?.length,0);
});

test('N07 never reserves a second body in a family while a twin or cocoon already holds its formal seat',()=>{
 const w=battle({'BIO-G05':1,'BIO-B03':1,'BIO-N07':1}),u=w.addUnit('reaper','terran',0,0);
 bioLifeTick(w,1/60);const twin=w.entities.get(u.bio!.twin!)!;w.killEncounterHost(u);
 assert.equal(w.familySeatCount('reaper'),1);assert.equal(w.expedition.bio!.appointments!.length,1);
 w.hit(twin,100000,[],1,'zerg',0,1);assert.equal(w.familySeatCount('reaper'),1);
 assert.equal(w.expedition.bio!.appointments!.length,1);assert.equal(w.expedition.bio!.appointments![0].kind,'cocoon');
 const state=w.captureRun();w.restoreRun(state);assert.equal(w.familySeatCount('reaper'),1);
});

test('G09 spreads sixty percent of the strongest current poison, including a matured P05 strain',()=>{
 const w=battle({'BIO-G09':1,'BIO-P05':1}),u=w.addUnit('marine','terran',0,0),dead=foe(w),next=w.addUnit('roach','zerg',1,3);
 w.time=10;w.tick=600;bioBody(dead).poisons=[{kind:'strain',source:u.id,power:10,start:0,next:11,end:15},{kind:'venom',source:u.id,power:12,start:9,next:11,end:13}];
 bioOnEnemyDeath(w,dead,u.id);const spread=next.bio!.poisons![0];close(spread.power,20*.6);close(spread.end,13);
});

test('two overlapping clouds from one machine share the strongest damage budget; different machines add',()=>{
 for(const sameSource of [true,false]){
  const w=battle(),source=w.addUnit('tank','terran',0,0),second=w.addUnit('tank','terran',2,0),e=foe(w);
  w.expedition.bio!.fields=[{kind:'cloud',source:source.id,x:e.x,z:e.z,radius:2,power:100,next:1,end:1.25},{kind:'cloud',source:sameSource?source.id:second.id,x:e.x,z:e.z,radius:2,power:150,next:1,end:2}];
  const hp=e.hp;
  for(let tick=1;tick<=120;tick++){w.tick=tick;w.time=tick/60;bioTickCombat(w,1/60);}
  close(hp-e.hp,sameSource?300:425);assert.equal(w.expedition.bio!.fields.length,0);
 }
});

const starts:Record<BuildBranch,BuildCardId[]>={armed:['W01','W04','G01'],doomsday:['M-W01','M-W05','M-G01'],bio:['BIO-W01','BIO-W02','BIO-W03']};
const later:Record<BuildBranch,BuildCardId[]>={armed:['W05','G02','B03','G04','B04','P01','W06','W07','W08','W09'],doomsday:['M-W03','M-B03','M-B01','M-W06','M-G02','M-G04','M-W07','M-G01','M-G02','M-G03'],bio:['BIO-W05','BIO-W06','BIO-W07','BIO-W09','BIO-G02','BIO-G03','BIO-G06','BIO-B02','BIO-P01','BIO-W08']};
function buy(w:World,id:BuildCardId){
 const ctx={...draftContext(w),currentOffers:[]},tiers=Object.keys(RARITIES);
 const pool=inspectShopWeights(ctx,true).filter(c=>c.weight>0).sort((a,b)=>tiers.indexOf(a.rarity)-tiers.indexOf(b.rarity));
 const at=pool.findIndex(c=>c.id.endsWith('.'+id));assert.ok(at>=0,'legal shelf '+id);
 const sum=(rows:typeof pool)=>rows.reduce((n,c)=>n+c.weight,0);let first=true;
 ctx.random=()=>{if(!first)return w.random();first=false;return (sum(pool.slice(0,at))+pool[at].weight/2)/sum(pool);};
 w.rewards=drawExpeditionReinforcements(ctx,true);const offer=w.rewards.find(c=>'cardId'in c.expeditionEffect&&c.expeditionEffect.cardId===id)!;
 assert.ok(offer,id);assert.ok(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),id);return offer;
}
for(const branch of ['armed','doomsday','bio'] as const)test(`${branch}: mixed ordinary purchases, mandatory third node, free ultimate and archive remain isolated`,()=>{
 const w=battle();w.addUnit('marine','terran',0,0);w.addUnit('marine','terran',1,0);w.addUnit('tank','terran',-3,0,5);w.addUnit('science_vessel','terran',-4,0);w.addUnit('hellion','terran',-5,0);
 w.wallet={minerals:100000,gas:100000};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
 for(const b of ['armed','doomsday','bio'] as const){
  buy(w,starts[b][0]);buy(w,starts[b][0]);assert.equal(w.expedition.build!.counts[b],1);buy(w,starts[b][1]);
 }
 buy(w,starts[branch][2]);const first=pendingBuildChoice(w)!;
 assert.equal(first.branch,branch);assert.equal(w.deferBuildChoice(first.id,w.expedition.shopRevision),false);
 assert.ok(w.claimBuildChoice(first.id,w.expedition.shopRevision,first.offers[0]));
 for(const b of (['armed','doomsday','bio'] as const).filter(b=>b!==branch)){buy(w,starts[b][2]);assert.equal(pendingBuildChoice(w),undefined);}
 assert.equal(w.expedition.build!.main,branch);assert.ok(w.expedition.build!.milestones.every(m=>m.branch===branch));
 for(const id of later[branch].slice(0,6)){
  buy(w,id);const choice=pendingBuildChoice(w);if(choice&&choice.at<9)assert.ok(w.claimBuildChoice(choice.id,w.expedition.shopRevision,choice.offers[0]));
 }
 const third=pendingBuildChoice(w)!;assert.equal(third.at,9);assert.equal(w.deferBuildChoice(third.id,w.expedition.shopRevision),false);assert.equal(w.skipReward(),false);
 assert.ok(w.claimBuildChoice(third.id,w.expedition.shopRevision,third.offers[0]));assert.equal(w.expedition.build!.orangeAt,12);
 for(const id of later[branch].slice(6,9))buy(w,id);
 const choice=pendingBuildChoice(w)!;assert.equal(choice.at,12);assert.equal(choice.offers.length,3);
 const bundle=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle;
 const restored=battle();restored.restoreRun(bundle.run!);restored.wallet={minerals:0,gas:0};
 assert.ok(restored.claimBuildChoice(choice.id,restored.expedition.shopRevision,choice.offers[0]));
 assert.deepEqual(restored.wallet,{minerals:0,gas:0});assert.equal(restored.expedition.build!.orange,choice.offers[0]);
 assert.equal(restored.claimBuildChoice(choice.id,restored.expedition.shopRevision,choice.offers[1]),false);
 restored.restoreRun(restored.captureRun());assert.equal(restored.expedition.build!.main,branch);assert.equal(restored.expedition.build!.orange,choice.offers[0]);
});
