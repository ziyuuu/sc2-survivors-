import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RACES,FAMILIES_BY_RACE,type FamilyId} from '../src/data/races';
import {familyLine} from '../src/data/expedition-buildings';
import {applySupply,supplyEligibility,supplyPrice} from '../src/simulation/progression/supply-cards';
import {releasePaidPassenger} from '../src/simulation/expedition-production';
import {renderIntermission,IntermissionNavigation,offerView} from '../src/ui/presentation/intermission';
import {productionFacilities} from '../src/ui/presentation/facility-controls';
import {cardPresentation} from '../src/ui/intermission-skin/presentation';

function setup(f:FamilyId,n=4,rank=1){const race=RACES.find(r=>FAMILIES_BY_RACE[r].includes(f as never))!,w=new World({race,sandbox:true,waves:false,terrain:false,seed:27});w.start();w.entities.clear();w.expedition.zerglingPairs=[];w.expedition.ledger=[];w.expedition.familySlots=[f];const line=familyLine(f);w.expedition.facilities=[{id:1,kind:race==='zerg'?'hatchery':line,line,techLab:false}];w.expedition.tech['research.'+line+'.weapon']=3;w.expedition.tech['research.'+line+'.defense']=3;for(let i=0;i<n;i++)w.addFamilyMember(f,{x:i*3-8,z:-4},rank);return w;}
for(const race of RACES)for(const f of FAMILIES_BY_RACE[race])for(const mode of ['direct','pod']as const)test(`${f} ${mode}: +3 fills seats then promotes, respecting full-card payment and pair ranks`,()=>{
 for(const n of [4,5]){const w=setup(f,n),paid=supplyPrice(f,3,mode),sum=()=>w.familyUnits(f).reduce((n,u)=>n+u.rank,0),before=sum();assert.ok(supplyEligibility(w,f,3,mode).legal);assert.ok(applySupply(w,f,3,mode,paid));
 if(mode==='pod'){const j=w.expedition.ledger.at(-1)!,p={id:99,jobId:j.id,unitType:f,passengers:j.passengers.map(()=>({status:'waiting',entityId:null})),status:'opening',freeConscript:false}as never;assert.equal(j.passengers.reduce((n,p)=>n+p.paid.minerals,0),paid.minerals);assert.equal(j.passengers.reduce((n,p)=>n+p.paid.gas,0),paid.gas);for(let i=0;i<j.passengers.length;i++)if(j.passengers[i].status==='waiting')assert.ok(releasePaidPassenger(w,p,i,{x:8,z:4+i}));assert.equal(j.state,'settled');}
 assert.equal(w.familySeatCount(f),5);assert.equal(sum(),before+3);if(f==='zergling')for(const pair of w.expedition.zerglingPairs)assert.ok(w.familyBodies(f).filter(u=>u.pairId===pair.id).every(u=>u.rank===pair.rank));}
 const full=setup(f,5,5);assert.equal(supplyEligibility(full,f,3,mode).legal,false);const u=full.ordinaryUnits(f)[0];u.rank=4;full.refreshStats(u);assert.equal(supplyEligibility(full,f,3,mode).amount,1);assert.ok(applySupply(full,f,3,mode,supplyPrice(f,3,mode)));
});
test('intermission has four peer services, direct settings, no catalogue or claim route; rendering is read-only',()=>{
 for(const race of RACES){const w=setup(FAMILIES_BY_RACE[race][0]);w.wallet={minerals:10000,gas:10000};w.endStage();w.setDevelopmentDirection(familyLine(FAMILIES_BY_RACE[race][0]));const nav=new IntermissionNavigation(),before=structuredClone(w.captureRun()),html=renderIntermission(w,'',nav),fac=productionFacilities(w);
 assert.equal((html.match(/class="feedback-progress-strip"/g)??[]).length,1);assert.match(html,/data-action="settings"/);assert.doesNotMatch(html,/data-action="ui-menu"|data-page="catalog"|boss-loot/);for(const name of ['设施调整','武器与防护研究','强化一览','休整'])assert.ok(html.includes(name));assert.equal((html.match(/data-action="battle-base"/g)??[]).length,1);assert.match(fac,/已解锁|未解锁/);assert.match(fac,/production-output/);
 for(const r of w.rewards)cardPresentation(w,offerView(w,r),r as never);nav.push({page:'catalog'});assert.equal(nav.depth,0);nav.push({page:'menu'});assert.equal(nav.depth,0);assert.deepEqual(w.captureRun(),before);
 }
});
test('facility unlock controls quote existing offers only and retain native one-purchase stage transition',()=>{
 const w=setup('marine',1);w.wallet={minerals:10000,gas:10000};w.expedition.developmentTarget='unlock.marauder';w.endStage();w.setDevelopmentDirection('barracks');const r=w.rewards.find(r=>(r as any).expeditionEffect.definitionId==='unlock.marauder')!;assert.ok(r);const html=productionFacilities(w);assert.ok(html.includes(`data-id="${r.offerId}"`));const before={...w.wallet};assert.ok(w.choose(r.offerId));assert.equal(w.rewardRound,'random');assert.equal(w.wallet.minerals,before.minerals-r.minerals);assert.equal(w.wallet.gas,before.gas-r.gas);assert.ok(w.isFamilyAvailable('marauder'));assert.ok(w.setProductionOutputs('barracks',['marine','marauder']));assert.equal(w.setProductionOutputs('barracks',['marine','marauder','reaper']),false);assert.doesNotMatch(productionFacilities(w),/data-action="reward"/);
});
