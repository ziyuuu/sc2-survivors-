import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {deployExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {ZERG_SWARM_CARDS,type ZswCardId} from '../src/data/zerg-swarm';
import {swarmCardCopy} from '../src/data/zerg-swarm-copy';
import {offerView,catalogueCards} from '../src/ui/presentation/intermission';
import {cardPresentation} from '../src/ui/intermission-skin/presentation';
import {armedNodeViews} from '../src/ui/presentation/armed-cards';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {SWARM_PERIODIC,type SwarmPeriodic} from '../src/data/zerg-swarm-rules';
import {applySwarmCard,swarmOfferLegal} from '../src/simulation/progression/zerg-swarm-acquisition';
import {pendingBuildChoice,prepareArmedChoices} from '../src/simulation/combat/armed-support';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {spawnSwarmEvent,swarmBlast,swarmPart} from '../src/simulation/combat/zerg-swarm-spawn';
import {captureSwarmAttack,applySwarmSpore} from '../src/simulation/combat/zerg-swarm-spores';
import {productionQuote,updateExpeditionProduction} from '../src/simulation/expedition-production';
import {applyExperienceBody} from '../src/simulation/zerg-encounters';
import {swarmSize,swarmContactSpan,swarmContactScale,swarmCanCross,swarmIgnoresPair} from '../src/simulation/combat/zerg-swarm-density';
import {ContactSolver} from '../src/simulation/movement/contacts';
import {movementRadius} from '../src/simulation/movement/steering';
import {swarmScenario} from '../preview/zerg-swarm-20261120/scenarios';
import {drawSwarmCarriers} from '../src/render/units/zerg-swarm-carriers';
import type {AnimatedBatch} from '../src/render/units/animated-batch';
import {tickZergSwarm} from '../src/simulation/combat/zerg-swarm';
import {grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {tickEquipmentLife} from '../src/simulation/starship/lifecycle';
import {swarmFormal,swarmHighest} from '../src/simulation/combat/zerg-swarm-state';
import {zergBeforePrimary,zergHeroDeath,zergState,zergTeamBuff,tickZergHero} from '../src/simulation/combat/zerg-hero-passives';
import type {HeroId} from '../src/data/heroes';
import {registerZergRevival,tickZergRevival} from '../src/simulation/combat/zerg-hero-revival';

const seed=201120,recipe=chooseCampaignMap(seed);
function world(race:'terran'|'zerg'='zerg'){
 const w=new World({race,seed,waves:false,terrain:campaignTerrain(recipe),obstacles:[]});
 w.starship.enabled=true;
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.ok(w.start());
 w.missions.enabled=w.encounters.enabled=false;w.expedition.ledger=[];w.pods=[];
 for(const g of w.expedition.building!.groups)g.enabled=false;
 return w;
}
function rank(w:World,id:Parameters<typeof applySwarmCard>[1],times=1){
 for(let i=0;i<times;i++)assert.ok(applySwarmCard(w,id),id);
}
function archive(w:World){
 return readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),equipment:w.starship.account})).bundle.run!;
}
const temps=(w:World)=>w.allies().filter(u=>u.zergSwarm);
const advance=(w:World,t:number)=>{for(let i=0;i<Math.round(t*60);i++)w.step();};

function revivalWorld(phase:boolean){
 const w=new World({race:'zerg',seed,waves:false,sandbox:true,terrain:false,obstacles:[]});
 w.starship.enabled=true;
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 const put=(template:string,slot:EquipmentSlot,polluted=false)=>{
  const a=w.starship.account,r=grantEquipment(a,{template,race:'zerg',slot,polluted},'swarm-revival:'+a.serial,{kind:'warehouse'});
  assert.ok(r.ok);
  if(polluted){a.dust=100000;assert.ok(cleanseEquipment(a,r.value.id).ok);}
  assert.ok(w.equipItem(r.value.id,slot).ok);
 };
 for(const slot of ATTRIBUTE_SLOTS)put('set.advanced.survivor.3',slot);
 if(phase)put('module.phase.5','control',true);
 assert.ok(w.start());w.missions.enabled=w.encounters.enabled=false;
 w.expedition.ledger=[];w.pods=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 w.expedition.familySlots.push('roach');
 const body=w.addUnit('roach','terran',w.anchor.x+3,w.anchor.z);
 rank(w,'ZSW-G04',3);w.expedition.zergSwarm!.rng.revival=0;
 return {w,body};
}

function twinWorld(id:HeroId){
 const w=new World({race:'zerg',seed,waves:false,sandbox:true,terrain:false,obstacles:[]});
 w.starship.enabled=true;if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.ok(w.start());w.missions.enabled=w.encounters.enabled=false;
 const record={id,rank:1,entityId:null,skillReady:0,revivePaid:false,awaitingSpawn:true};
 w.heroes.set(id,record);assert.ok(deployExpeditionHero(w,record,false));rank(w,'ZSW-O01');tickZergSwarm(w);
 const base=w.heroEntity(id)!,twin=w.entities.get(w.expedition.zergSwarm!.twin!.body!)!;
 base.x=base.z=0;twin.x=1;twin.z=0;
 return {w,base,twin};
}

test('same-family independent and captured bodies never count as formal swarm sources',()=>{
 const w=world(),regular=w.allies()[0],independent=w.addUnit('zergling','terran',0,0,7),captured=w.addUnit('zergling','terran',0,0,6);
 w.starship.members.set(independent.id,{source:'fixture',items:[],independent:true});
 w.starship.captured.set(captured.id,{base:structuredClone(captured),rank:6});
 assert.ok(swarmFormal(w,regular));assert.equal(swarmFormal(w,independent),false);assert.equal(swarmFormal(w,captured),false);
 assert.equal(swarmHighest(w),1);
});

test('twin Zagara shares death credit and one six-baneling limit',()=>{
 const {w,base,twin}=twinWorld('zagara');
 const enemy=w.addUnit('roach','zerg',2,0);
 for(let cycle=0;cycle<3;cycle++){
  for(let i=0;i<10;i++)zergHeroDeath(w,enemy);
  tickZergHero(w,base,0);tickZergHero(w,twin,0);
  assert.equal(w.allies().filter(u=>u.temporaryKind==='hero-baneling').length,(cycle+1)*2);
  assert.equal(zergState(base).kills,0);assert.equal(zergState(twin).kills,0);
 }
 for(let i=0;i<10;i++)zergHeroDeath(w,enemy);
 tickZergHero(w,base,0);tickZergHero(w,twin,0);
 assert.equal(w.allies().filter(u=>u.temporaryKind==='hero-baneling').length,6);
 w.restoreRun(archive(w));w.paused=false;
 tickZergHero(w,w.heroEntity('zagara')!,0);
 assert.equal(w.allies().filter(u=>u.temporaryKind==='hero-baneling').length,6,'restored summons retain the shared cap');
});

test('twin Dehaka shares one death essence and preserves it through a body replacement',()=>{
 const {w,base,twin}=twinWorld('dehaka'),enemy=w.addUnit('roach','zerg',2,0);
 zergHeroDeath(w,enemy);assert.equal(zergState(base).essence,1);assert.equal(zergState(twin).essence,1);
 twin.x=30;zergHeroDeath(w,enemy);
 assert.equal(zergState(base).essence,2);assert.equal(zergState(twin).essence,2);
 w.hit(twin,1e9,[],1,'zerg');w.time=60;tickZergSwarm(w);
 assert.equal(zergState(w.entities.get(w.expedition.zergSwarm!.twin!.body!)!).essence,2);
 w.restoreRun(archive(w));
 assert.ok(w.allies().filter(u=>u.heroId==='dehaka').every(u=>zergState(u).essence===2));
});

test('twin parasite and infection death effects settle once for the hero identity',()=>{
 for(const id of ['niadra','stukov'] as const){
  const {w,base,twin}=twinWorld(id),enemy=w.addUnit('roach','zerg',2,0),patient=w.addUnit('ultralisk','terran',2,1);
  patient.hp=1;const before=w.stats.healed;
  zergBeforePrimary(w,base,enemy);zergBeforePrimary(w,twin,enemy);zergHeroDeath(w,enemy);
  if(id==='niadra')assert.equal(w.stats.healed-before,400);
  else assert.equal(w.zergHeroes.pools.length,1);
 }
});

test('twin Leviathan supplies the union aura without equipment or double stacking',()=>{
 const {w,base,twin}=twinWorld('hots_leviathan');w.starship.enabled=false;
 base.x=-15;twin.x=15;const patient=w.addUnit('roach','terran',15,1);
 assert.equal(zergTeamBuff(w,patient).health,.25);
 base.x=15;assert.equal(zergTeamBuff(w,patient).health,.25);
});

test('catalogue lists 45 unique cards, 126 ranks and one race',()=>{
 assert.equal(new Set(ZERG_SWARM_CARDS.map(c=>c.id)).size,45);
 assert.equal(ZERG_SWARM_CARDS.filter(c=>c.purchase!=='orange').reduce((n,c)=>n+c.maxRank,0),126);
 const terran=world('terran');
 assert.equal(applySwarmCard(terran,'ZSW-W02','foreign'),false);
 assert.equal(swarmOfferLegal(world(),'ZSW-P02'),false);
});

test('all swarm cards use player copy in catalogue and current offers',()=>{
 const w=world(),catalogue=catalogueCards(w);
 for(const card of ZERG_SWARM_CARDS){
  const copy=swarmCardCopy(card.short),entry=catalogue.find(c=>c.id===card.id)!;
  assert.equal(copy.effects.length,card.maxRank,card.id);
  assert.ok(copy.brief.endsWith('。')&&copy.effects.every(text=>text.endsWith('。')),card.id);
  assert.doesNotMatch(copy.detail,/(?:^[123] ·|同上|M\(|\bCD\b|%[AHQ]\b)/m,card.id);
  assert.equal(cardPresentation(w,entry).simple,copy.brief);
  assert.equal(cardPresentation(w,entry).detail,copy.detail);
  if(card.purchase==='node'||card.purchase==='orange')continue;
  const offer:ExpeditionReward={
   id:'zerg-swarm.'+card.id,offerId:'card:'+card.id,sold:false,name:card.name,
   description:'2 · 旧存档规格说明',icon:'tech.attack',rarity:card.quality,kind:'buff',value:card.id,
   minerals:50,gas:0,baseMinerals:50,baseGas:0,discount:0,expeditionWindow:0,expeditionRound:'random',
   expeditionEffect:{kind:'zergSwarm',cardId:card.id,expectedRank:1},
  };
  const view=offerView(w,offer),rendered=cardPresentation(w,view,offer);
  assert.equal(rendered.simple,copy.brief);
  assert.equal(rendered.detail,copy.detail);
 }
 assert.equal(swarmCardCopy('W02').effects[1],'每 22 秒投放 6 只跳虫，协助作战 20 秒。');
 assert.match(swarmCardCopy('W03').detail,/每 0\.25 秒/);
});

test('third ordinary point locks the branch, white repeats are free of progress and N04 can be claimed three times',()=>{
 const w=world();
 w.expedition.familySlots=['zergling','roach','hydralisk','queen','ravager'];
 assert.ok(applySwarmCard(w,'ZSW-W01','a'));
 assert.ok(applySwarmCard(w,'ZSW-W01','b'));
 assert.ok(applySwarmCard(w,'ZSW-B01','c'));
 assert.equal(w.expedition.build!.main,null);
 assert.ok(applySwarmCard(w,'ZSW-W02','d'));
 w.phase='reward';prepareArmedChoices(w);
 const state=w.expedition.zergSwarm!;
 // Find a legitimate frozen first shelf that contains the desired node.
 for(let draw=0;!pendingBuildChoice(w)?.offers.includes('ZSW-N04')&&draw<50;draw++){
  w.expedition.build!.milestones[0].offers=[];prepareArmedChoices(w);
 }
 assert.equal(w.expedition.build!.main,'zerg-swarm');assert.ok(!w.skipReward());
 const bought=['B01','B01','B03','B04','B05','B06','B07','B08','B09'] as const;
 for(let i=0;i<3;i++){
  const pending=pendingBuildChoice(w)!;
  assert.ok(pending.offers.includes('ZSW-N04'));
  const node=armedNodeViews(w).find(c=>c.zergSwarmId==='ZSW-N04')!;
  assert.equal(cardPresentation(w,node).simple,swarmCardCopy('N04').brief);
  assert.equal(node.detail,swarmCardCopy('N04').detail);
  const copy=world();copy.restoreRun(archive(w));assert.deepEqual(pendingBuildChoice(copy)?.offers,pending.offers);
  assert.ok(w.claimBuildChoice(pending.id,w.expedition.shopRevision,'ZSW-N04'));
  for(let k=0;k<3;k++)assert.ok(applySwarmCard(w,`ZSW-${bought[i*3+k]}`,`next-${i*3+k}`));
  prepareArmedChoices(w);
 }
 assert.equal(state.ranks['ZSW-N04'],3);
 const orange=pendingBuildChoice(w)!;
 assert.ok(w.claimBuildChoice(orange.id,w.expedition.shopRevision,'ZSW-O02'));
 assert.equal(w.squadCap(),6);
 w.expedition.familySlots.push('aberration');
 assert.deepEqual(w.expedition.familySlots.map(f=>w.familyMemberCap(f)).sort((a,b)=>b-a),[9,9,9,9,5,5],JSON.stringify({families:w.expedition.familySlots,ranks:w.expedition.zergSwarm?.ranks,expanded:w.expedition.zergSwarm?.expanded}));
 assert.ok(archive(w));
});

test('paired periodic bodies use real fixed steps, follow the group and restore with their original lifespan',()=>{
 const w=world();rank(w,'ZSW-W02');rank(w,'ZSW-W05');rank(w,'ZSW-N08');
 advance(w,5.5);assert.equal(temps(w).length,0);
 const copy=world();copy.restoreRun(archive(w));copy.paused=false;
 advance(w,1);advance(copy,1);
 assert.equal(temps(w).length,4);
 assert.deepEqual(temps(copy).map(u=>[u.rank,u.bornAt,u.zergSwarm]),temps(w).map(u=>[u.rank,u.bornAt,u.zergSwarm]));
 assert.ok(temps(w).every(u=>!u.pairId&&u.zergSwarm!.expires-u.bornAt===22.5));
 assert.equal(w.expedition.zergSwarm!.clocks.W02.next,30);
 advance(w,23);assert.equal(temps(w).length,0);
});

test('every scheduled ordinary card delivers its real recipe and still uses the common cooldown',()=>{
 for(const [code,row] of Object.entries(SWARM_PERIODIC) as [SwarmPeriodic,typeof SWARM_PERIODIC[SwarmPeriodic]][]){
  const w=world();w.stage=14;
  for(const family of ['hydralisk','mutalisk','devourer','viper','brood_lord','roach'])w.expedition.tech['unlock.'+family]=1;
  rank(w,('ZSW-'+code) as ZswCardId);
  const point=w.freePosition('roach',w.anchor,2,6)!;
  const enemy=w.addUnit('roach','zerg',point.x,point.z);enemy.hp=enemy.maxHp=1e6;
  const s=w.expedition.zergSwarm!,clock=s.clocks[code],first=code[0]==='P'?8:5;
  assert.equal(clock.next,first,code);
  w.time=first;tickZergSwarm(w);
  const batch=s.batches.find(b=>b.source===code);assert.ok(batch,code);
  const expected=batch.original.reduce((n,p)=>n+p.count*p.width,0);
  w.time=first+row.delay;tickZergSwarm(w);
  const units=temps(w).filter(u=>u.zergSwarm?.origin===code);
  assert.equal(units.length,expected,code);assert.equal(clock.next,w.time+row.cd[0],code);
  assert.ok(units.every(u=>u.temporary&&!u.pairId),code);
  if(code==='G02')assert.ok(units.every(u=>u.zergSwarm?.oneUse));
 }
});

test('only a frozen physical primary can seed on a lethal hit, with zero experience rewards',()=>{
 const w=world();rank(w,'ZSW-W03',3);const state=w.expedition.zergSwarm!;
 const {x,z}=w.anchor;
 const claw=w.addUnit('zergling','terran',x,z),acid=w.addUnit('roach','terran',x+2,z);
 w.expedition.familySlots=['zergling','roach','queen'];
 const victim=w.addUnit('roach','zerg',x+.9,z),weak=w.addUnit('roach','zerg',x+1,z+.5);
 applyExperienceBody(w,weak,.05,'r2');
 w.hash.rebuild(w.entities.values());
 state.rng.spores=0;
 captureSwarmAttack(w,acid,victim,5);
 w.hit(victim,2,[],1,'terran',.5,0,acid.id,false,false,0,true,false,false,{swarmOrigin:acid.swarmAttack});
 assert.equal(state.rng.spores,0);assert.equal(applySwarmSpore(w,weak),false);
 victim.hp=.1;
 w.fire(claw,victim);
 if(victim.hp>0){
  captureSwarmAttack(w,claw,victim,claw.weaponDamage);
  w.hit(victim,10,[],1,'terran',.5,0,claw.id,false,false,0,true,false,false,{swarmOrigin:claw.swarmAttack});
 }
 assert.ok(victim.deadAt!==null&&state.rng.spores!==0);
 assert.equal(temps(w).length,1);
 const kills=w.stats.kills,drops=w.pickups.length;
 w.hit(victim,100);
 assert.equal(w.stats.kills,kills);assert.equal(w.pickups.length,drops);
});

test('queen weapon identity freezes once and does not permit acid or secondary hits',()=>{
 const w=world();rank(w,'ZSW-N05');w.expedition.familySlots.push('queen');
 const q=w.addUnit('queen','terran',w.anchor.x,w.anchor.z),e=w.addUnit('roach','zerg',q.x+2,q.z);
 q.activeWeapon='Talons';captureSwarmAttack(w,q,e,6);const origin=q.swarmAttack!;
 q.activeWeapon='AcidSpines';assert.equal(origin.weapon,'queen/Talons');
 captureSwarmAttack(w,q,e,6);assert.equal(q.swarmAttack!.weapon,'queen/AcidSpines');
});

test('spore propagation skips existing marks and chooses the nearest unmarked enemy once',()=>{
 const w=world();rank(w,'ZSW-B03',3);
 const s=w.expedition.zergSwarm!,{x,z}=w.anchor;
 const claw=w.addUnit('zergling','terran',x,z);
 const host=w.addUnit('roach','zerg',x+1,z),marked=w.addUnit('roach','zerg',x+1.5,z);
 const next=w.addUnit('roach','zerg',x+2,z),far=w.addUnit('roach','zerg',x+3,z);
 applySwarmSpore(w,host);applySwarmSpore(w,marked);
 w.time=2;s.rng.spores=0;
 claw.shotSequence=1;captureSwarmAttack(w,claw,host,1);
 w.hit(host,1,[],1,'terran',.5,0,claw.id,false,false,0,true,false,false,{swarmOrigin:claw.swarmAttack});
 assert.equal(s.spores[host.id].until,10);
 assert.equal(s.spores[marked.id].until,8,'an existing neighbouring mark is not refreshed by propagation');
 assert.equal(s.spores[next.id]?.until,10,'spread reaches the closest unmarked enemy');
 assert.equal(s.spores[far.id],undefined,'one hit cannot recursively spread');
 const rng=s.rng.spores;
 w.hit(host,1,[],1,'terran',.5,0,claw.id,false,false,0,true,false,false,{swarmOrigin:claw.swarmAttack});
 assert.equal(s.rng.spores,rng,'same weapon round is not rolled again');
});

test('eligible physical hits refresh an isolated mark without rolling nonexistent propagation',()=>{
 for(const id of ['ZSW-W03','ZSW-B03','ZSW-N05'] as const){
  const w=world();rank(w,id);
  const s=w.expedition.zergSwarm!,{x,z}=w.anchor;
  const claw=w.addUnit('zergling','terran',x,z),host=w.addUnit('roach','zerg',x+1,z);
  applySwarmSpore(w,host);w.time=2;
  const rng=s.rng.spores;
  captureSwarmAttack(w,claw,host,1);
  w.hit(host,1,[],1,'terran',.5,0,claw.id,false,false,0,true,false,false,{swarmOrigin:claw.swarmAttack});
  assert.equal(s.spores[host.id].until,10,id);
  assert.equal(s.rng.spores,rng,id);
  assert.equal(s.attackChecks[claw.id],undefined,'refresh alone is not a propagation attempt');
 }
});

test('living swarm fighters keep fighting until their finite lifetime ends',()=>{
 for(const family of ['roach','swarm_host'] as const){
  const w=world();rank(w,'ZSW-W02');
  const formal=w.allies().slice();
  const [unit]=spawnSwarmEvent(w,'presence',[swarmPart(family,1,1,2)],w.anchor);
  assert.ok(unit);
  for(const u of formal)w.hit(u,1e9,[],1,'zerg');
  w.step();assert.equal(w.phase,'battle',family+' is still able to fight');
  advance(w,2.1);assert.equal(w.phase,'lost','an empty periodic timer cannot hold the run open');
 }
});

test('a winning swarm revival cancels phase copies and preserves the unused equipment rescue',()=>{
 const {w,body}=revivalWorld(true);
 w.hit(body,1e9,[],1,'zerg',0,1);
 const recovery=w.starship.life.pending.get(body.id)!;
 assert.equal(recovery.source,'phase');assert.equal(recovery.projections.length,2);
 assert.ok(w.expedition.zergSwarm!.revivals[body.id]);
 const restored=new World({race:'zerg',seed,waves:false,sandbox:true,terrain:false,obstacles:[]});restored.restoreRun(archive(w));restored.paused=false;
 advance(restored,3.1);
 assert.ok(restored.entities.get(body.id)!.hp>0);
 assert.equal(restored.starship.life.pending.has(body.id),false);
 assert.ok(recovery.projections.every(id=>!restored.entities.get(id)?.hp),'losing phase copies must retire');
 assert.deepEqual([...restored.starship.numbers].filter(([key])=>key.includes(':rescue:')),[],'the losing rescue must not consume a use');
});

test('a cancelled equipment rescue remains available for the next actual death',()=>{
 const {w,body}=revivalWorld(false);
 w.hit(body,1e9,[],1,'zerg',0,1);advance(w,3.1);
 const returned=w.entities.get(body.id)!;assert.ok(returned.hp>0);
 w.hit(returned,1e9,[],1,'zerg',0,1);
 assert.equal(w.expedition.zergSwarm!.revivals[body.id],undefined,'seat cooldown blocks another branch revival');
 assert.equal(w.starship.life.pending.get(body.id)?.source,'survivor');
 w.time+=10;tickEquipmentLife(w);
 assert.ok(w.entities.get(body.id)!.hp>0,'the unused survivor charge restores the original once');
 assert.equal(w.starship.life.pending.size,0);
});

test('legacy competing rescue charges migrate back to reservations without a second refund',()=>{
 const {w,body}=revivalWorld(false);w.hit(body,1e9,[],1,'zerg',0,1);
 const recovery=w.starship.life.pending.get(body.id)!,held=recovery.rescueReservation!;
 assert.ok(held);w.starship.numbers.set(held.member,1);w.starship.numbers.set(held.key,1);delete recovery.rescueReservation;
 w.restoreRun(archive(w));w.paused=false;
 assert.deepEqual(w.starship.life.pending.get(body.id)!.rescueReservation,held);
 assert.equal(w.starship.numbers.has(held.member),false);assert.equal(w.starship.numbers.has(held.key),false);
 w.restoreRun(archive(w));w.paused=false;advance(w,3.1);
 assert.ok(w.entities.get(body.id)!.hp>0);assert.equal(w.starship.numbers.has(held.key),false);
});

test('same-time revivals choose native then equipment before branch and retire losers',()=>{
 for(const native of [true,false]){
  const {w,body}=revivalWorld(true);
  if(native){
   const source=w.addUnit('queen','terran',body.x+1,body.z);source.heroId='niadra';
   assert.ok(registerZergRevival(w,source,w.nextId++,1));
  }
  w.hit(body,1e9,[],1,'zerg',0,1);
  const r=w.starship.life.pending.get(body.id)!;
  if(native)w.zergHeroes.revivals[0].next=3;
  else r.until=3;
  w.time=3;tickEquipmentLife(w);tickZergRevival(w);tickZergSwarm(w);
  const returned=w.entities.get(body.id)!;
  assert.ok(returned.hp>0);assert.equal(returned.hp/returned.maxHp,native?.4:1);
  assert.equal(w.expedition.zergSwarm!.revivals[body.id],undefined);
  assert.equal(w.starship.life.pending.has(body.id),false);
  assert.deepEqual([...w.starship.numbers].filter(([key])=>key.includes(':rescue:')),[]);
  if(native)assert.equal(w.zergHeroes.revivals[0].charges,1);
 }
});

test('a swarm strike only hits eligible enemies once, including on restoring a legacy visual',()=>{
 const w=world(),point={x:w.anchor.x,z:w.anchor.z};
 w.entities.clear();
 const ally=w.addUnit('roach','terran',point.x,point.z);
 const foe=w.addUnit('roach','zerg',point.x+1,point.z);
 const air=w.addUnit('mutalisk','zerg',point.x,point.z+1);
 for(const u of [ally,foe,air])u.nextShotAt=60;
 const before=[ally.hp,foe.hp,air.hp];
 swarmBlast(w,point,2.5,20,true);
 assert.ok(foe.hp<before[1]);
 assert.equal(ally.hp,before[0]);
 assert.equal(air.hp,before[2]);
 assert.equal(w.visualEvents.filter(e=>e.kind==='bile-impact').length,1);
 assert.equal(w.effects.some(fx=>fx.kind==='bile'),false);
 const visual={...point,id:0,owner:'terran' as const,hp:1,maxHp:1,armor:0,unitRadius:0,attributes:[],flying:false};
 w.effect('bile',visual,point,3,.5);
 const normal=w.effect('bile',ally,{x:point.x+30,z:point.z},3,.5);
 const restored=world();restored.restoreRun(archive(w));
 assert.deepEqual(restored.effects.map(fx=>fx.id),[normal.id]);
 const settled=w.stats.damage;
 restored.paused=false;advance(restored,1);
 assert.equal(restored.stats.damage,settled);
 assert.equal(restored.entities.get(ally.id)!.hp,before[0]);
});

test('event capacity counts actual bodies and O03 grows a pair recipe once',()=>{
 const w=world();rank(w,'ZSW-O03');
 const p=w.anchor;
 const wave=spawnSwarmEvent(w,'event',[swarmPart('zergling',3,7,20,2)],p);
 assert.equal(wave.length,8);
 for(let n=0;n<15;n++)spawnSwarmEvent(w,'event',[swarmPart('zergling',4,7,20,2)],p);
 assert.ok(temps(w).length<=90);assert.equal(temps(w).length%2,0);
});

test('old orders preserve progress and completed formal cargo is delivered once by G01',()=>{
 const w=world(),s=w.expedition;const quote=productionQuote(w,'roach');
 const current={id:w.nextJob++,family:'roach',line:'zerg.basic',facilityIds:[],remaining:quote.seconds/2,state:'training',podId:null,passengers:[{status:'waiting',entityId:null,purpose:'body',paid:{minerals:40,gas:10}}]} as const;
 const order=structuredClone(current) as unknown as typeof s.ledger[number];s.ledger.push(order);
 rank(w,'ZSW-W01');assert.equal(order.remaining,current.remaining*.85);assert.equal(productionQuote(w,'roach').seconds,quote.seconds*.85);
 rank(w,'ZSW-G01');w.time=8;order.state='awaiting';s.familySlots.push('roach');
 updateExpeditionProduction(w,0,false);assert.equal(s.zergSwarm!.delivery?.job,order.id);
 const copy=world();copy.restoreRun(archive(w));copy.paused=false;
 for(const run of [w,copy]){run.time=9;updateExpeditionProduction(run,0,false);}
 assert.equal(w.expedition.ledger[0].passengers[0].status,'released');
 assert.deepEqual(copy.expedition.ledger[0].passengers[0],w.expedition.ledger[0].passengers[0]);
 assert.equal(w.expedition.ledger[0].passengers[0].paid.minerals,40);
});

test('one successful branch revival preserves the body identity, and its clone cannot revive',()=>{
 const w=world();rank(w,'ZSW-G04',3);rank(w,'ZSW-N03',2);
 const s=w.expedition.zergSwarm!,actor=w.addUnit('roach','terran',w.anchor.x,w.anchor.z);
 w.expedition.familySlots.push('roach');actor.specialReady=90;s.rng.revival=0;
 w.hit(actor,1e6,[],1,'zerg');
 assert.equal(Object.keys(s.revivals).length,1);assert.equal(w.familySeatCount('roach'),1);
 w.time=3;tickZergSwarm(w);
 const back=w.entities.get(actor.id)!;assert.ok(back.hp>0);assert.equal(back.hp/back.maxHp,.7);
 assert.equal(back.specialReady,90);
 assert.equal(temps(w).length,2);
 const rng=s.rng.revival;
 w.hit(temps(w)[0],1e6,[],1,'zerg');
 assert.equal(s.rng.revival,rng);assert.equal(Object.keys(s.revivals).length,0);
});

test('the orange twin uses one identity, shared casting cooldown and delayed single-body return',()=>{
 const w=world(),h={id:'zagara' as const,rank:2,entityId:null,skillReady:0,revivePaid:false,awaitingSpawn:true};
 w.heroes.set(h.id,h);assert.ok(deployExpeditionHero(w,h,false));rank(w,'ZSW-O01');
 tickZergSwarm(w);
 const s=w.expedition.zergSwarm!,base=w.heroEntity('zagara')!,child=w.entities.get(s.twin!.body!)!;
 assert.notEqual(base.id,child.id);assert.equal(w.heroes.size,1);assert.equal(base.weaponDamage,child.weaponDamage);
 const enemy=w.addUnit('roach','zerg',base.x+3,base.z);enemy.maxHp=enemy.hp=5e5;
 w.hash.rebuild(w.entities.values());
 assert.ok(w.castHero('zagara'));assert.ok(!w.castHero('zagara'));
 assert.equal(new Set(w.heroCasts.filter(c=>c.hero==='zagara').map(c=>c.source)).size,2);
 w.hit(child,1e9,[],1,'zerg');
 assert.equal(s.twin!.next,60);assert.equal(w.heroEntity('zagara')!.id,base.id);
 const restored=world();restored.restoreRun(archive(w));restored.paused=false;
 restored.time=59;tickZergSwarm(restored);assert.equal(restored.allies().filter(u=>u.heroId==='zagara').length,1);
 restored.time=60;tickZergSwarm(restored);assert.equal(restored.allies().filter(u=>u.heroId==='zagara').length,2);
});

test('26 archives migrate without initializing cards or consuming randomness',()=>{
 const w=world(),snapshot=w.captureRun();
 (snapshot as {schema:number}).schema=26;
 const migrated=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:snapshot,equipment:w.starship.account})).bundle.run!;
 assert.equal(migrated.schema,27);assert.equal(migrated.state.rngState,snapshot.state.rngState);
 assert.equal(migrated.state.expedition.zergSwarm,undefined);assert.deepEqual({...migrated.state.wallet},{...snapshot.state.wallet});
});

test('density uses original radii for terrain and damage and grants passage only while moving',()=>{
 const w=world();const u=w.allies()[0],enemy=w.addUnit('roach','zerg',u.x,u.z);
 const native=u.unitRadius,range=u.attackRange;
 for(const id of ['ZSW-G08','ZSW-B09','ZSW-N07'] as const)rank(w,id,3);
 const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7);
 near(swarmSize(w,u),.65);near(swarmContactScale(w,u),.35);
 near(swarmContactSpan(w,u,enemy),movementRadius(u)*.35+movementRadius(enemy));
 assert.equal(u.unitRadius,native);assert.equal(u.attackRange,range);
 const ally=w.addUnit('roach','terran',u.x,u.z);
 assert.ok(swarmCanCross(w,u,enemy)&&swarmCanCross(w,u,ally));
 assert.equal(swarmCanCross(w,u,{...enemy,attributes:['Structure']}),false);
 assert.equal(swarmCanCross(w,u,{...enemy,flying:true}),false);
 const solver=new ContactSolver();
 const resolve=()=>{w.hash.rebuild([u,enemy]);return solver.resolve([u,enemy],w.hash,[],w.mapHalf,1/60,null,w.terrain,(a,b)=>swarmIgnoresPair(w,a,b),1,(a,b)=>swarmContactSpan(w,a,b));};
 enemy.prev={x:enemy.x,z:enemy.z};u.prev={x:u.x-.1,z:u.z};assert.equal(resolve(),0);
 u.prev={x:u.x,z:u.z};assert.ok(resolve()>0);assert.ok(Math.hypot(u.x-enemy.x,u.z-enemy.z)>0);
});

test('old swarm receipts, matured bodies and birth shields survive card replacement',()=>{
 const w=world();
 for(const id of ['ZSW-G08','ZSW-B08','ZSW-B09'] as const)assert.ok(applySwarmCard(w,id,'receipt-'+id),id);
 rank(w,'ZSW-N07');
 const [child]=spawnSwarmEvent(w,'replacement',[swarmPart('roach',1,3,22)],w.anchor);
 advance(w,6.2);const saved=archive(w),s=saved.state.expedition.zergSwarm!;
 s.version=1;s.shells[child.id]={birth:{remaining:5,until:9},loss:{remaining:8,until:10}};
 const old=saved.state.entities.get(child.id)!;old.zergSwarm!.hunt={target:1,started:0,last:5,round:4};
 const restored=world();restored.restoreRun(saved);
 const live=restored.entities.get(child.id)!,state=restored.expedition.zergSwarm!;
 assert.equal(state.version,2);assert.equal(state.purchases.length,s.purchases.length);
 assert.deepEqual(state.shells[child.id],{birth:{remaining:5,until:9}});
 assert.equal(live.zergSwarm!.hunt,undefined);assert.equal(live.zergSwarm!.origin,'replacement');
 assert.deepEqual(live.zergSwarm!.mature,{health:.2,damage:.15});
 assert.equal(live.zergSwarm!.expires,child.zergSwarm!.expires);assert.equal(live.maxHp,child.maxHp);
 assert.equal(applySwarmCard(restored,'ZSW-B08','receipt-ZSW-B08'),false);
});

test('reviving discards the cancelled windup, elapsed cooldown counts and future weapon deadlines stand',()=>{
 for(const future of [false,true]){
  const {world:w,leadId}=swarmScenario({id:'ZSW-G04',rank:1,hero:'kerrigan',cargo:'delivery'});
  advance(w,1);const recovery=w.expedition.zergSwarm!.revivals[leadId];
  assert.ok(recovery.body.lastShotAt>=0);
  if(future)recovery.body.nextShotAt=recovery.at+2;
  advance(w,recovery.at-w.time+.45);const u=w.entities.get(leadId)!;
  assert.ok(u.hp>0);
  if(future){assert.ok(u.lastShotAt<recovery.at);advance(w,2);assert.ok(u.lastShotAt>=recovery.at+2-1/60);}
  else assert.ok(u.lastShotAt>=recovery.at&&u.lastShotAt<recovery.at+.45);
 }
});

test('actual deliveries own the carrier, shell and parasite poses across snapshot restore',()=>{
 function actors(w:World){
  const result:{model:string;x:number;z:number;action:string}[]=[];
  const batches=new Map(['egg','swarm.fun-nydus','swarm.overlord'].map(model=>[model,{
   pose:()=>({duration:1}),add:(x:number,_y:number,z:number,_f:number,action:string)=>result.push({model,x,z,action})
  } as unknown as AnimatedBatch]));
  drawSwarmCarriers(w,batches,()=>0,()=>true,()=>1);return result;
 }
 for(const cargo of ['delivery','overflow'] as const){
  const {world:w}=swarmScenario({id:'ZSW-G01',rank:1,hero:'kerrigan',cargo});
  const home=actors(w)[0];advance(w,cargo==='delivery'?4.6:3.6);
  assert.equal(actors(w).length,1);assert.notEqual(actors(w)[0].x,home.x);advance(w,.6);
  const site=w.expedition.zergSwarm!.landings![0].point;
  assert.equal(actors(w).length,1);assert.equal(actors(w)[0].x,site.x);
  advance(w,2);assert.equal(actors(w)[0].x,home.x);
 }
 const {world:w}=swarmScenario({id:'ZSW-G02',rank:1,hero:'kerrigan',cargo:'delivery'});
 advance(w,5.2);assert.equal(actors(w).filter(p=>p.action==='spawn').length,8);
 advance(w,1.4);const shell=actors(w).filter(p=>p.action==='dead');assert.equal(shell.length,8);
 const snapshot=w.captureRun();w.restoreRun(snapshot);assert.deepEqual(actors(w).filter(p=>p.action==='dead'),shell);
 w.paused=false;advance(w,1);assert.equal(actors(w).filter(p=>p.action==='dead').length,0);
 const three=swarmScenario({id:'ZSW-P01',rank:1,hero:'kerrigan',cargo:'delivery'}).world;
 advance(three,9.15);assert.equal(actors(three).length,3);assert.equal(new Set(actors(three).map(p=>p.x)).size,3);
 const spores=swarmScenario({id:'ZSW-W03',rank:1,hero:'kerrigan',cargo:'delivery'}).world;
 advance(spores,.5);assert.ok(actors(spores).some(p=>p.model==='egg'&&p.action==='idle'));
 advance(spores,.6);assert.ok(actors(spores).some(p=>p.model==='egg'&&p.action==='dead'));
});
