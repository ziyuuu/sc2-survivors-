import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {encodeGraph,decodeGraph} from '../src/persistence/graph-codec';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {eligible,getOffers,getEvolutionOffers,newBuildingState,pruneBuildingOffers,project,grantFacility,purchase,unlockProductionFamily,canProduce,placementDraft,applyPlacement} from '../src/simulation/building/rules';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionDevelopment,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {productionQuote,updateExpeditionProduction} from '../src/simulation/expedition-production';
import {worldBuildingContext} from '../src/simulation/building/expedition';
import {deliverReward} from '../src/simulation/missions/rewards';
import type {MissionRecord} from '../src/simulation/missions/state';
import {renderBuildingPlacement} from '../src/ui/presentation/building-panel';

const options={race:'zerg' as const,seed:529,sandbox:true,waves:false,terrain:false as const,obstacles:[]};
function world(){return new World({...options,equipmentAccount:newEquipmentAccount(529)});}
function equip(w:World,template:string,slot:EquipmentSlot){const r=grantEquipment(w.starship.account,{template,race:'zerg',slot},'feedback:'+slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
function extraChoice(w:World){for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.advanced.choice.4',slot);}
function freeResearch(w:World){equip(w,'module.contract.4','logistics');}
function open(w:World,target:string){assert.ok(w.setDevelopmentTarget(target));assert.ok(w.start());w.wallet={minerals:100000,gas:100000};w.endStage();}
function roundtrip(w:World){const copy=world();copy.restoreRun(decodeGraph(JSON.parse(JSON.stringify(encodeGraph(w.captureRun())))) as ReturnType<World['captureRun']>);return copy;}
const receipt=(w:World)=>({wallet:{...w.wallet},rng:w.rngState,nextId:w.nextId,refresh:w.expedition.refreshCount,free:w.expedition.freeRefresh.building});
const card=(w:World,id:string)=>w.rewards.find(r=>r.value===id) as ExpeditionReward|undefined;

test('free Queen unlock removes only invalid retained cards and preserves survivor identity and quote',()=>{
 const w=world();extraChoice(w);freeResearch(w);open(w,'unlock.queen');
 const queen=card(w,'unlock.queen')!,hatch=card(w,'hatchery')!;assert.ok(queen&&hatch);
 const survivors=structuredClone(w.rewards.filter(r=>r!==queen&&r!==hatch));assert.equal(survivors.length,1);
 assert.ok(w.choose(hatch.offerId));assert.equal(w.rewardRound,'building');assert.equal(w.expedition.tech['unlock.queen'],1);
 assert.deepEqual(w.expedition.building!.groups[0].outputs,['zergling','queen']);assert.ok(w.expedition.building!.groups.slice(1).every(g=>g.outputs.join()==='zergling'));
 assert.deepEqual(w.rewards,survivors);const before=receipt(w);
 const ctx=draftContext(w);ctx.random=()=>{throw Error('pruning must not reroll');};ctx.nextOfferId=()=>{throw Error('pruning must not replace survivors');};
 assert.deepEqual(drawExpeditionDevelopment(ctx),survivors);assert.deepEqual(receipt(w),before);
 assert.equal(w.choose(queen.offerId),false);assert.deepEqual(receipt(w),before);
 const copy=roundtrip(w);assert.deepEqual(copy.rewards,survivors);assert.deepEqual(receipt(copy),before);
});

for(const [race,family] of [['terran','reaper'],['zerg','queen'],['protoss','adept']] as const)test(race+': paid first unlock appends once and only charges the quoted technology',()=>{
 const b=newBuildingState(race,{minerals:10000,gas:10000});b.frozenTarget='unlock.'+family;
 const q=getOffers(b,{random:()=>0}).find(q=>q.projectId===b.frozenTarget)!,wallet={...b.wallet},g=b.groups[0];g.enabledFamilies={[g.outputs[0]]:false};
 assert.ok(purchase(b,q).ok);assert.deepEqual(g.outputs,[race==='terran'?'marine':race==='zerg'?'zergling':'zealot',family]);
 assert.equal(g.enabledFamilies[g.outputs[0]],false);assert.equal(g.enabledFamilies[family],true);
 assert.deepEqual(b.wallet,{minerals:wallet.minerals-q.cost.minerals,gas:wallet.gas-q.cost.gas});
 const before=structuredClone(b);assert.equal(unlockProductionFamily(b,family),false);assert.deepEqual(b,before);
});

test('first unlock selects one compatible running group, preserving full/paused groups and cursor',()=>{
 const b=newBuildingState('zerg');b.tech['unlock.roach']=1;const full=b.groups[0],paused=grantFacility(b,'hatchery')!,chosen=grantFacility(b,'hatchery')!,spare=grantFacility(b,'hatchery')!;
 full.outputs=['zergling','roach'];paused.enabled=false;chosen.cursor=0;chosen.enabledFamilies={zergling:false};
 const before=structuredClone([full,paused,spare]);assert.ok(unlockProductionFamily(b,'queen'));
 assert.deepEqual([full,paused,spare],before);assert.deepEqual(chosen.outputs,['zergling','queen']);assert.equal(chosen.cursor,0);assert.equal(chosen.enabledFamilies.zergling,false);
 const fullState=newBuildingState('zerg'),g=fullState.groups[0];g.outputs=['zergling','roach'];fullState.tech['unlock.roach']=1;const prior=structuredClone(g);unlockProductionFamily(fullState,'queen');assert.deepEqual(g,prior);
 const p=newBuildingState('zerg');p.groups[0].enabled=false;const old=structuredClone(p.groups);unlockProductionFamily(p,'queen');assert.deepEqual(p.groups,old);
 const noFacility=newBuildingState('terran');unlockProductionFamily(noFacility,'viking');assert.deepEqual(noFacility.groups[0].outputs,['marine']);
});

test('evolution schedules the first unlocked family in the evolved hatchery and preserves others',()=>{
 const w=world();w.expedition.tech['unlock.roach']=1;w.grantFacility('hatchery');open(w,'evolve-zerg.evolution');
 assert.ok(w.setDevelopmentDirection('zerg.evolution'));const r=Object.values(w.expedition.developmentQuotes).find(r=>r.value==='evolve-zerg.evolution')!;assert.ok(r);
 assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,w.expedition.shopRevision,2));
 assert.deepEqual(w.expedition.building!.groups.map(g=>g.outputs),[['zergling'],['zergling','hydralisk']]);
 assert.deepEqual(roundtrip(w).expedition.building!.groups,w.expedition.building!.groups);
});

test('mission technology uses one unlock receipt and preserves a paid in-flight production order',()=>{
 const w=world();assert.ok(w.start());w.wallet={minerals:10000,gas:10000};updateExpeditionProduction(w,0);assert.ok(w.expedition.ledger.length);
 const paid=structuredClone(w.expedition.ledger),cash={...w.wallet},cursor=w.expedition.building!.groups[0].cursor;
 const m:MissionRecord={id:'unlock-feedback-mission',kind:'intel',phase:'active',stage:4,age:0,bodyIds:[],enemyIds:[],queue:[],progress:0,completed:0,total:1,nextSpawn:0,receipts:[],reward:{kind:'technology',id:'unlock.queen'}};
 worldBuildingContext(w)!.missionTechnology='unlock.queen';assert.ok(deliverReward(w,m,{x:0,z:0}));
 assert.deepEqual(w.expedition.ledger,paid);assert.deepEqual(w.wallet,cash);assert.equal(w.expedition.building!.groups[0].cursor,cursor);
 assert.deepEqual(w.expedition.building!.groups[0].outputs,['zergling','queen']);
 const after=w.captureRun();assert.ok(deliverReward(w,m,{x:0,z:0}));assert.deepEqual(w.captureRun(),after);
 updateExpeditionProduction(w,0);assert.deepEqual(w.expedition.ledger,paid);assert.deepEqual(w.wallet,cash);
});

test('automatic scheduling survives restore, waits for money, then starts through normal production',()=>{
 const w=world();open(w,'unlock.queen');assert.ok(w.choose(card(w,'unlock.queen')!.offerId));
 const copy=roundtrip(w);assert.deepEqual(copy.expedition.building!.groups[0].outputs,['zergling','queen']);
 assert.ok(copy.setProductionEnabled('zergling',false));if(copy.phase==='reward')copy.skipReward();assert.equal(copy.phase,'battle');
 copy.wallet={minerals:0,gas:0};updateExpeditionProduction(copy,0);assert.equal(copy.expedition.ledger.length,0);
 copy.wallet={minerals:1000,gas:1000};const q=productionQuote(copy,'queen');updateExpeditionProduction(copy,0);
 assert.equal(copy.expedition.ledger.length,1);assert.equal(copy.expedition.ledger[0].family,'queen');assert.equal(copy.expedition.ledger[0].state,'training');
 assert.deepEqual(copy.wallet,{minerals:1000-q.minerals,gas:1000-q.gas});const cash={...copy.wallet};updateExpeditionProduction(copy,0);assert.equal(copy.expedition.ledger.length,1);assert.deepEqual(copy.wallet,cash);
});

test('early heavy unlock reserves output but cannot train before stage 10, and cancellation stays usable',()=>{
 const w=new World({...options,race:'terran'});const group=w.grantFacility('factory')!;w.expedition.tech['unlock.tank']=1;
 const b=worldBuildingContext(w)!;unlockProductionFamily(b,'thor');assert.deepEqual(group.outputs,['hellion','thor']);
 assert.equal(canProduce(b,group,'thor',9),false);assert.equal(canProduce(b,group,'thor',10),true);
 const html=renderBuildingPlacement(b);const button=html.match(/<button[^>]*data-family="thor"[^>]*>/)![0];assert.ok(!button.includes('disabled'));assert.ok(button.includes('aria-pressed="true"'));
 const draft=placementDraft(b);assert.ok(applyPlacement(b,draft).ok);const cancel=placementDraft(b);cancel.groups.find(g=>g.id===group.id)!.outputs=['hellion'];assert.ok(applyPlacement(b,cancel).ok);
 const readd=placementDraft(b);readd.groups.find(g=>g.id===group.id)!.outputs.push('thor');assert.equal(applyPlacement(b,readd).ok,false);
 // Separate preplanned state verifies the real scheduler's stage gate.
 group.outputs=['thor'];group.enabledFamilies={thor:true};w.expedition.building!.groups[0].enabled=false;assert.ok(w.start());w.wallet={minerals:10000,gas:10000};
 w.stage=9;updateExpeditionProduction(w,0);assert.equal(w.expedition.ledger.length,0);
 w.stage=10;updateExpeditionProduction(w,0);assert.equal(w.expedition.ledger[0].family,'thor');
});

test('restoring previously unlocked or deliberately removed output never retroactively schedules it',()=>{
 const w=world();w.expedition.tech['unlock.queen']=1;assert.ok(w.start());w.endStage();
 const groups=structuredClone(w.expedition.building!.groups);const copy=roundtrip(w);assert.deepEqual(copy.expedition.building!.groups,groups);
 assert.equal(unlockProductionFamily(copy.expedition.building!,'queen'),false);assert.deepEqual(copy.expedition.building!.groups,groups);
});

test('old same-window saves prune stale unlocks in every cached direction without repricing or redrawing',()=>{
 const w=world();extraChoice(w);open(w,'unlock.queen');
 const original=structuredClone(w.rewards),queen=card(w,'unlock.queen')!;
 // Represents a pre-fix save after automatic technology completion. Real free
 // research is covered above; here retain the old invalid persisted shelf.
 w.expedition.tech['unlock.queen']=1;
 const before=receipt(w),survivors=original.filter(r=>r.offerId!==queen.offerId);
 const copy=roundtrip(w);assert.deepEqual(copy.rewards,survivors);assert.deepEqual(receipt(copy),before);
 assert.ok(!Object.values(copy.expedition.building!.offers).flat().some(q=>q?.projectId==='unlock.queen'));
 assert.ok(!Object.values(copy.expedition.developmentQuotes).some(r=>r.value==='unlock.queen'));
 assert.ok(copy.setDevelopmentDirection('zerg.evolution'));assert.ok(copy.setDevelopmentDirection('zerg.basic'));
 assert.deepEqual(copy.rewards,survivors);assert.equal(copy.wallet.minerals,before.wallet.minerals);
});

test('free skill/system/research completion cannot leave obsolete or old-level quotes',()=>{
 for(const id of ['ling_speed','system.zerg.basic','research.zerg.basic.weapon']){
  const b=newBuildingState('zerg',{minerals:10000,gas:10000});b.stage=12;b.tech['system.zerg.basic']=1;
  if(id==='system.zerg.basic')delete b.tech[id];b.frozenTarget=id;
  const before=getOffers(b,{random:()=>0}),q=before.find(q=>q.projectId===id)!;assert.ok(q,id);
  b.tech[id]=(b.tech[id]??0)+1;
  const survivors=before.filter(x=>x.id!==q.id),rng=b.randomState;
  assert.deepEqual(getOffers(b,{random:()=>{throw Error('no reroll');}}),survivors,id);
  assert.equal(b.randomState,rng);assert.ok(!Object.values(b.quotes).some(x=>x.id===q.id));
 }
});

test('facility grants and evolution changes remove only invalid cached quotes and stale targets',()=>{
 const b=newBuildingState('zerg');b.tech['unlock.queen']=1;grantFacility(b,'hatchery');b.direction='zerg.evolution';b.frozenTarget='evolve-zerg.evolution';
 const q=getEvolutionOffers(b,{random:()=>0}).find(q=>q.projectId==='evolve-zerg.evolution')!,cost=structuredClone(q.cost),first=b.groups[0],second=b.groups[1];assert.deepEqual(q.targets,[first.id,second.id]);
 first.directions.push('ground');let current=getEvolutionOffers(b,{random:()=>0}).find(x=>x.id===q.id)!;assert.deepEqual(current.targets,[second.id]);assert.deepEqual(current.cost,cost);
 second.directions.push('ground');assert.ok(!getEvolutionOffers(b).some(x=>x.id===q.id));
 b.direction='zerg.basic';b.frozenTarget='hatchery';const facility=getOffers(b,{random:()=>0}).find(x=>x.projectId==='hatchery')!;assert.ok(facility);grantFacility(b,'hatchery');
 pruneBuildingOffers(b);assert.ok(!b.offers['zerg.basic']!.some(x=>x.id===facility.id));
});

test('insufficient funds do not prune valid offers and an exhausted cached shelf stays empty',()=>{
 const b=newBuildingState('zerg');const offers=getOffers(b,{random:()=>0}),before=structuredClone(offers);b.wallet={minerals:0,gas:0};assert.deepEqual(getOffers(b),before);
 for(const q of offers){const d=project(q.projectId)!;if(d.kind==='facility')while(eligible(b,d))grantFacility(b,'hatchery');else b.tech[d.id]=d.maxLevel;}
 assert.deepEqual(getOffers(b,{random:()=>{throw Error('empty cache must not refill');}}),[]);
 assert.deepEqual(getOffers(b,{random:()=>{throw Error('empty cache must not refill');}}),[]);
});
