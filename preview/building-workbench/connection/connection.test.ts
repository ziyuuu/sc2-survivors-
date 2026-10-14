import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEVELOPMENT, PRODUCTION_LINES, seatRecipe} from '../../../src/data/expedition-buildings';
import type {FamilyId, Race} from '../../../src/data/races';
import {NativeBuildingSandbox, PROJECTS, TREE_STEPS, newBuildingState, grantFacility, facilityCount, candidates, project, eligible, canUnlock, canProduce, evolutionTargets, getOffers, purchase, refresh, refreshCost, setDirection, nextPhase, nextWindow, placementDraft, applyPlacement, type BuildingState, type Offer} from './index';

const rich=(race:Race)=>newBuildingState(race,{minerals:1e7,gas:1e7});
function find(s:BuildingState,id:string):Offer {
 const d=project(id)!;assert.ok(eligible(s,d),'eligible '+id);assert.ok(setDirection(s,d.line!).ok);
 for(let i=0;i<150;i++){const q=getOffers(s).find(q=>q.projectId===id);if(q)return q;assert.ok(refresh(s,s.revision).ok);}
 throw Error('Offer not drawn: '+id);
}
function buy(s:BuildingState,id:string,target?:string){const q=find(s,id),result=purchase(s,q,target);assert.ok(result.ok,JSON.stringify(result));return {q,result};}
function advance(s:BuildingState){if(s.phase==='building')nextPhase(s);if(s.phase==='shop')nextPhase(s);assert.ok(nextWindow(s).ok);}

test('main game and workbench import the same approved canonical definitions',()=>{
 assert.equal(DEVELOPMENT.find(d=>d.id==='hatchery')!.maxLevel,15);
 assert.equal(project('hatchery'),DEVELOPMENT.find(d=>d.id==='hatchery'));
 assert.deepEqual(PRODUCTION_LINES.barracks.families,['marine','reaper','marauder']);
 assert.equal(project('hatchery')!.maxLevel,15);assert.deepEqual(TREE_STEPS.barracks.flat(),['marine','reaper','marauder']);
 assert.deepEqual([project('evolve-zerg.evolution')!.minerals,project('evolve-zerg.evolution')!.gas],[150,100]);
 assert.deepEqual([project('evolve-zerg.air')!.minerals,project('evolve-zerg.air')!.gas],[100,150]);
 assert.deepEqual([project('crystal')!.minerals,project('crystal')!.gas,project('crystal')!.batch,project('crystal')!.maxLevel],[300,0,2,4]);
});
for(const race of ['terran','zerg','protoss'] as const){
 test(race+': base free refresh, shared bonus and paid ladder have no hidden free increments',()=>{
  const s=rich(race);s.bonusRefresh=1;
  for(const expected of [0,0,50,90]){assert.equal(refreshCost(s),expected);const before=s.wallet.minerals;assert.ok(refresh(s,s.revision).ok);assert.equal(before-s.wallet.minerals,expected);}
  assert.equal(s.paidRefresh,2);nextPhase(s);assert.equal(refreshCost(s),130);assert.ok(refresh(s,s.revision).ok);nextPhase(s);assert.ok(nextWindow(s).ok);assert.equal(refreshCost(s),0);assert.equal(s.paidRefresh,0);
 });
 test(race+': a paid construction is atomic and duplicate/stale requests change nothing',()=>{
  const s=rich(race),id=race==='zerg'?'hatchery':race==='terran'?'barracks':'gateway',q=find(s,id),before={...s.wallet};
  const forged={...q,projectId:'unlock.carrier'};const snapshot=structuredClone(s);assert.equal(purchase(s,forged).ok,false);assert.deepEqual(s,snapshot);
  const expectedCost={...q.cost};q.cost.minerals=0;q.cost.gas=0;
  assert.ok(purchase(s,q).ok);assert.equal(facilityCount(s,id),2);assert.deepEqual(s.wallet,{minerals:before.minerals-expectedCost.minerals,gas:before.gas-expectedCost.gas});
  const paid=structuredClone(s);assert.equal(purchase(s,q).ok,false);assert.deepEqual(s,paid);
  advance(s);assert.equal(purchase(s,q).ok,false);
 });
 test(race+': failed placement is all-or-nothing and cancel has no mutation',()=>{
  const s=rich(race),draft=placementDraft(s),before=structuredClone(s);draft.groups[0].enabled=false;assert.deepEqual(s,before);
  draft.groups[0].outputs=['carrier'];assert.equal(applyPlacement(s,draft).ok,false);assert.deepEqual(s,before);
  draft.groups[0].outputs=[TREE_STEPS[s.groups[0].line][0][0]];assert.ok(applyPlacement(s,draft).ok);assert.equal(s.groups[0].enabled,false);assert.equal(applyPlacement(s,draft).ok,false);
 });
 test(race+': attack/defense gates stay at stages 6 and 12 with native prices',()=>{
  const s=rich(race),line=s.direction,d=project('research.'+line+'.weapon')!;
  assert.equal(eligible(s,d),false);s.tech['system.'+line]=1;assert.ok(eligible(s,d));
  buy(s,d.id);assert.equal(s.tech[d.id],1);advance(s);assert.equal(eligible(s,d),false);s.stage=6;assert.ok(eligible(s,d));
  const q=find(s,d.id);assert.deepEqual(q.baseCost,{minerals:200,gas:100});purchase(s,q);advance(s);assert.equal(eligible(s,d),false);s.stage=12;
  assert.deepEqual(find(s,d.id).baseCost,{minerals:275,gas:150});
 });
}
test('Terran/Protoss pools contain only the selected line; prerequisites never become cross-line cards',()=>{
 for(const [race,line,base] of [['terran','starport','factory'],['protoss','stargate','gateway']] as const){
  const s=rich(race);if(race==='protoss'){s.groups=[];delete s.tech.gateway;}
  assert.ok(setDirection(s,line).ok);assert.deepEqual(candidates(s),[]);const before=structuredClone(s);assert.equal(refresh(s,s.revision).ok,false);assert.deepEqual(s,before);
  grantFacility(s,base);assert.deepEqual(candidates(s).map(d=>d.id),[line]);
 }
});
test('approved sequential and parallel branches use global unlocks, not living units',()=>{
 const t=rich('terran');assert.ok(canUnlock(t,'reaper'));assert.equal(canUnlock(t,'marauder'),false);t.tech['unlock.reaper']=1;assert.ok(canUnlock(t,'marauder'));
 grantFacility(t,'factory');grantFacility(t,'starport');assert.ok(canUnlock(t,'science_vessel'));assert.equal(canUnlock(t,'viking'),false);t.tech['unlock.science_vessel']=1;assert.ok(canUnlock(t,'viking'));
 const p=rich('protoss');p.tech['unlock.adept']=1;assert.ok(canUnlock(p,'stalker'));assert.ok(canUnlock(p,'sentry'));assert.equal(canUnlock(p,'high_templar'),false);p.tech['unlock.sentry']=1;assert.ok(canUnlock(p,'high_templar'));assert.ok(canUnlock(p,'stalker'));
 const z=rich('zerg');assert.ok(canUnlock(z,'roach'));assert.ok(canUnlock(z,'queen'));z.tech['unlock.ravager']=1;z.groups[0].directions=['ground'];assert.ok(canUnlock(z,'ultralisk'));assert.ok(canUnlock(z,'lurker'));
});
test('Zerg evolves a selected hatchery at confirmed prices, unlocks globally and preserves local outputs',()=>{
 const s=rich('zerg');grantFacility(s,'hatchery');assert.deepEqual(evolutionTargets(s,'evolve-zerg.evolution'),[]);assert.deepEqual(evolutionTargets(s,'evolve-zerg.air'),[]);
 s.tech['unlock.roach']=1;
 const q=find(s,'evolve-zerg.evolution'),before={...s.wallet};assert.deepEqual(q.baseCost,{minerals:150,gas:100});
 const original=structuredClone(s);assert.equal(purchase(s,q,'h99').ok,false);assert.deepEqual(s,original);assert.ok(purchase(s,q,'h1').ok);
 assert.deepEqual(s.wallet,{minerals:before.minerals-q.cost.minerals,gas:before.gas-q.cost.gas});
 assert.ok(s.tech['unlock.hydralisk']);assert.deepEqual(s.groups[0].outputs,['zergling']);assert.ok(canProduce(s,s.groups[0],'hydralisk'));assert.equal(canProduce(s,s.groups[1],'hydralisk'),false);
 advance(s);buy(s,'evolve-zerg.air','h2');assert.deepEqual(s.groups[1].directions,['air']);assert.ok(s.tech['unlock.mutalisk']);
 advance(s);buy(s,'evolve-zerg.air','h1');assert.deepEqual(s.groups[0].directions,['ground','air']);const draft=placementDraft(s);draft.groups[0].outputs=['hydralisk','mutalisk'];assert.ok(applyPlacement(s,draft).ok);assert.deepEqual(s.groups[1].outputs,['zergling']);
});
test('Zerg cap includes the starter; no evolution or buy can create a sixteenth hatchery',()=>{
 const s=rich('zerg');for(let i=1;i<15;i++)assert.ok(grantFacility(s,'hatchery'));assert.equal(grantFacility(s,'hatchery'),null);assert.equal(s.groups.length,15);assert.equal(eligible(s,project('hatchery')!),false);assert.equal(new Set(s.groups.flatMap(g=>g.ids)).size,15);
});
test('crystals buy a whole pair, allow a second pair, and keep an independent output plan',()=>{
 const s=rich('protoss');s.tech['unlock.adept']=1;const {q}=buy(s,'crystal');assert.deepEqual(q.baseCost,{minerals:300,gas:0});assert.equal(facilityCount(s,'crystal'),2);
 const draft=placementDraft(s);draft.groups.find(g=>g.id==='crystal-pair')!.outputs=['zealot','adept'];assert.ok(applyPlacement(s,draft).ok);assert.deepEqual(s.groups[0].outputs,['zealot']);
 advance(s);buy(s,'crystal');assert.equal(facilityCount(s,'crystal'),4);assert.equal(eligible(s,project('crystal')!),false);assert.equal(s.groups.filter(g=>g.kind==='crystal').length,1);
});
test('free/double-build talents settle entire crystal pairs and still respect funds/cap',()=>{
 const s=rich('protoss');const q=find(s,'crystal');s.talents.free_house=3;s.talents.double_build=3;s.randomState=1;
 const wallet={...s.wallet};const result=purchase(s,q);assert.ok(result.ok);assert.equal(facilityCount(s,'crystal'),4);assert.equal(result.added,4);assert.equal(wallet.minerals-s.wallet.minerals,q.cost.minerals);
 const poor=rich('protoss'),p=find(poor,'crystal');poor.wallet.minerals=p.cost.minerals;poor.talents.double_build=3;poor.randomState=1;assert.ok(purchase(poor,p).ok);assert.equal(facilityCount(poor,'crystal'),2);assert.equal(poor.wallet.minerals,0);
});
test('insufficient funds, stale refresh and forged quotes never consume cash or randomness',()=>{
 const s=rich('terran'),q=find(s,'barracks');s.wallet.minerals=0;const before=structuredClone(s);assert.equal(purchase(s,q).ok,false);assert.deepEqual(s,before);
 s.baseRefreshUsed=true;const broke=structuredClone(s);assert.equal(refresh(s,s.revision).ok,false);assert.deepEqual(s,broke);assert.equal(refresh(s,s.revision-1).ok,false);
});
test('direction switching preserves quoted prices; UI and all prerequisites read the same definitions',()=>{
 const s=rich('terran'),a=getOffers(s).map(q=>[q.id,q.cost]);setDirection(s,'factory');getOffers(s);setDirection(s,'barracks');assert.deepEqual(getOffers(s).map(q=>[q.id,q.cost]),a);
 for(const d of PROJECTS.filter(d=>d.unlock==='family'))assert.deepEqual({minerals:d.minerals,gas:d.gas},seatRecipe(d.families[0]));
});
for(const race of ['terran','zerg','protoss'] as const){
 test(race+': line research reaches the original unit stat calculation',()=>{
  const h=new NativeBuildingSandbox(race),s=h.state;s.wallet.minerals=1e7;s.wallet.gas=1e7;
  const unit=h.world.allies()[0],before={damage:unit.weaponDamage,armor:unit.armor};
  s.tech['system.'+s.direction]=1;buy(s,'research.'+s.direction+'.weapon');h.sync();assert.ok(unit.weaponDamage>before.damage);
  advance(s);buy(s,'research.'+s.direction+'.defense');h.sync();assert.ok(unit.armor>before.armor);assert.deepEqual(h.world.economyTotals.purchases,s.spent.construction);assert.equal(h.world.economyTotals.rerolls,s.spent.refresh);
 });
 test(race+': native payment, training, carrier ledger and body delivery run without a game mount',()=>{
  const host=new NativeBuildingSandbox(race),s=host.state,w=host.world;s.wallet.minerals=10000;s.wallet.gas=10000;
  const family=s.groups[0].outputs[0],quote=host.quote(family),before={...s.wallet},bodies=w.familyBodies(family).length;
  host.tick(0);assert.equal(host.orders().length,1);const job=host.orders()[0],width=family==='zergling'?2:1;
  assert.deepEqual(s.wallet,{minerals:before.minerals-quote.minerals*width,gas:before.gas-quote.gas*width});assert.equal(job.remaining,quote.seconds);assert.equal(job.passengers.length,width);
  const paid={...s.wallet},draft=placementDraft(s);draft.groups[0].enabled=false;assert.ok(applyPlacement(s,draft).ok);host.tick(quote.seconds);assert.equal(job.state,'risk');assert.deepEqual(s.wallet,paid);assert.equal(host.deliverReady(),width);assert.equal(job.state,'settled');assert.equal(w.familyBodies(family).length,bodies+width);assert.equal(host.deliverReady(),0);assert.deepEqual(s.wallet,paid);
 });
}
test('native Zerg producers alternate independently, including ground/air mixed outputs',()=>{
 const h=new NativeBuildingSandbox('zerg','developed'),s=h.state;s.wallet.minerals=1e6;s.wallet.gas=1e6;
 s.groups.forEach(g=>g.enabled=g.id==='h2'||g.id==='h3');h.tick(0);assert.deepEqual(h.orders().map(j=>[h.orderGroups.get(j.id),j.family]),[['h2','hydralisk'],['h3','roach']]);
 const jobs=structuredClone(h.orders());const d=placementDraft(s);d.groups.find(g=>g.id==='h2')!.outputs=['mutalisk','hydralisk'];assert.ok(applyPlacement(s,d).ok);assert.deepEqual(h.orders(),jobs);
 h.tick(100,false);h.deliverReady();h.tick(0);assert.equal(h.orders().at(-1)!.family,'queen');assert.equal(h.orders().filter(j=>h.orderGroups.get(j.id)==='h2').length,2);
});
test('native mixed-direction production actually alternates hydralisk then mutalisk on the same hatchery',()=>{
 const h=new NativeBuildingSandbox('zerg','developed');h.state.wallet.minerals=10000;h.state.wallet.gas=10000;h.state.groups.forEach(g=>g.enabled=g.id==='h2');
 h.tick(0);assert.equal(h.orders()[0].family,'hydralisk');h.tick(100,false);assert.equal(h.deliverReady(),1);h.tick(0);assert.equal(h.orders()[1].family,'mutalisk');assert.deepEqual(h.orders().map(j=>j.facilityIds),[[2],[2]]);
});
test('native gateway and crystal jobs run concurrently without a shared-line collision',()=>{
 const h=new NativeBuildingSandbox('protoss'),s=h.state;s.wallet.minerals=10000;s.wallet.gas=10000;s.tech['unlock.adept']=1;grantFacility(s,'crystal');
 h.tick(0);assert.equal(h.orders().length,2);assert.deepEqual(h.orders().map(j=>j.passengers.length),[1,2]);assert.deepEqual(h.orders().map(j=>h.orderGroups.get(j.id)),['gateway','crystal-pair']);
 const before={...s.wallet};h.tick(0);assert.equal(h.orders().length,2);assert.deepEqual(s.wallet,before);
});
test('native production discounts and paid reservations are reused across all hatcheries',()=>{
 const h=new NativeBuildingSandbox('zerg'),s=h.state;s.wallet.minerals=10000;s.wallet.gas=10000;s.talents.permanent_discount=2;
 for(let i=1;i<15;i++)grantFacility(s,'hatchery');h.tick(0);assert.equal(h.orders().length,15);assert.ok(h.orders().every(j=>j.passengers.every(p=>p.paid.minerals===20)));assert.equal(new Set(h.orders().map(j=>j.id)).size,15);
 const before={...s.wallet};h.tick(0);assert.deepEqual(s.wallet,before);
});
test('heavy-family gate and stage18 boundary are enforced by the module',()=>{
 const s=rich('terran');const g=grantFacility(s,'factory')!;s.tech['unlock.thor']=1;s.stage=8;assert.equal(canProduce(s,g,'thor'),false);s.stage=9;assert.ok(canProduce(s,g,'thor'));s.stage=18;s.phase='front';const before=structuredClone(s);assert.equal(nextWindow(s).ok,false);assert.deepEqual(s,before);
});
