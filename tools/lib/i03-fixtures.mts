import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {familyRace,type FamilyId} from '../../src/data/races';
import {familyResearchLevel} from '../../src/data/expedition-buildings';
import {canSupply} from '../../src/simulation/progression/supply-cards';
import {newBuildingState,linesFor,setDirection,getOffers,purchase,nextPhase,nextWindow,setGroupOutputs,setGroupEnabled} from '../../src/simulation/building/rules';
import {syncBuildingViews} from '../../src/simulation/building/expedition';
import {updateExpeditionProduction,receiptNeeded,releasePaidPassenger} from '../../src/simulation/expedition-production';
import {beginExpeditionWindow} from '../../src/simulation/progression/expedition-drafts';
const report=JSON.parse(fs.readFileSync('reports/local/integration-i03-20261022/development-paths.json','utf8'));
function releasePods(w:World){for(const pod of w.pods.filter(p=>p.jobId!==undefined&&p.passengers.some(x=>x.status==='waiting'))){w.time=Math.max(w.time,pod.landedAt);w.landPod(pod);assert.equal(pod.status,'active');assert.equal(pod.guardianIds.size,pod.guardTypes.length);for(const id of pod.guardianIds){const e=w.entities.get(id);if(e)w.hit(e,1e12,[],1,'terran',0,1,w.allies()[0].id);}w.hash.rebuild(w.entities.values());for(let i=0;i<1200&&pod.status!=='rescued';i++){w.time+=1/60;w.updatePods();}assert.equal(pod.status,'rescued');}}
function replay(witness:any){const race=witness.race,b=newBuildingState(race,{minerals:100000,gas:100000},witness.seed),last=witness.stage??witness.path.at(-1).stage;
 for(let stage=1;stage<=last;stage++){
  for(const line of linesFor(race)){assert.ok(setDirection(b,line).ok);getOffers(b);}
  const step=witness.path.find((p:any)=>p.stage===stage);if(step){assert.ok(setDirection(b,step.line).ok);const q=getOffers(b).find(q=>q.id===step.quote.id);assert.ok(q);assert.ok(purchase(b,q,step.target).ok);}
  if(stage<last){assert.ok(nextPhase(b).ok);assert.ok(nextPhase(b).ok);assert.ok(nextWindow(b).ok);}
 }return b;
}
/** A separate campaign path whose legal research supports every supply count for this family. */
export function supplyWorld(family:FamilyId){
 const race=familyRace(family),candidates=(Object.values(report.witnesses) as any[]).filter(x=>x.race===race&&x.path?.length).map(witness=>({witness,b:replay(witness)})).sort((a,b)=>(familyResearchLevel(b.b.tech,family,'weapon')+familyResearchLevel(b.b.tech,family,'defense'))-(familyResearchLevel(a.b.tech,family,'weapon')+familyResearchLevel(a.b.tech,family,'defense')));
 for(const {witness,b} of candidates){const w=new World({seed:529,race,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());w.pods=[];w.stage=17;w.expedition.building=b;w.expedition.tech=b.tech;w.wallet=b.wallet;syncBuildingViews(w.expedition);w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,17);if(canSupply(w,family,3,'direct'))return {w,witness};}
 throw Error('No legal research path for supply '+family);
}
/** Restore only a building state reproduced by native quotes from the normal starting building.
 * The battle, funding, time and rescue position are controlled fixtures, not a survival playthrough. */
export function familyWorld(family:FamilyId,options:{automatic?:boolean;seed?:number}={}){
 const witness=report.productions[family],race=familyRace(family),b=newBuildingState(race,{minerals:100000,gas:100000},witness.seed);
 for(let stage=1;stage<=witness.stage;stage++){
  for(const line of linesFor(race)){assert.ok(setDirection(b,line).ok);getOffers(b);}
  const step=witness.path.find((p:any)=>p.stage===stage);
  if(step){assert.ok(setDirection(b,step.line).ok);const quote=getOffers(b).find(q=>q.id===step.quote.id);assert.ok(quote,'replay quote '+family);assert.ok(purchase(b,quote,step.target).ok);}
  if(stage<witness.stage){assert.ok(nextPhase(b).ok);assert.ok(nextPhase(b).ok);assert.ok(nextWindow(b).ok);}
 }
 const group=b.groups.find(g=>g.id===witness.group.id)!;assert.ok(setGroupOutputs(b,group.id,[family]).ok);for(const g of b.groups)assert.ok(setGroupEnabled(b,g.id,g.id===group.id).ok);
 const w=new World({seed:options.seed??529,race,waves:!!options.automatic,sandbox:!options.automatic,terrain:options.automatic?new FlatTerrain():false,obstacles:[],...(options.automatic?{equipmentAccount:newEquipmentAccount(options.seed??529)}:{})});assert.ok(w.start());if(options.automatic){updateExpeditionProduction(w,1000,false);releasePods(w);}w.stage=witness.stage+1;w.prepareStage();w.pods=[];w.missions.enabled=!!options.automatic;w.encounters.enabled=!!options.automatic;
 w.expedition.building=b;w.expedition.tech=b.tech;w.wallet=b.wallet;syncBuildingViews(w.expedition);assert.ok(w.isFamilyAvailable(family),'production readiness '+family);
 const previousJobs=new Set(w.expedition.ledger.map(j=>j.id));updateExpeditionProduction(w,0);const job=w.expedition.ledger.find(j=>j.family===family&&!previousJobs.has(j.id));assert.ok(job,'native paid job '+family);assert.ok(job.passengers.some(p=>p.paid.minerals+p.paid.gas>0));
 updateExpeditionProduction(w,1000);const pod=w.pods.find(p=>p.jobId===job.id);assert.ok(pod,'native paid pod '+family);
 releasePods(w);
 assert.ok(w.familyUnits(family).length,'released body '+family);
 w.stage=17;w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,17);w.rewards=[];
 return {w,witness,job};
}
