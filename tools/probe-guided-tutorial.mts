import assert from 'node:assert/strict';
/** Finite natural-combat calibration. Uses clicks/native ports, never hit/HP writes. */
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {chooseTutorial} from '../src/simulation/tutorial/runtime';
import {guided,guidedClickRef,guidedStep,guidedProducer,guidedItem,acknowledgeGuidedSave,activateGuidedTarget,beginGuidedClick,finishGuidedClick,withGuidedCommand,permitGuidedProduction,updateGuided} from '../src/simulation/tutorial/guided';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {GUIDED_FAMILY} from '../src/data/tutorial-script';
import type {Race} from '../src/data/races';
import fs from 'node:fs/promises';
const race=(process.argv[2]??'terran') as Race;const boundaries=process.argv.includes('--boundaries'),checks:string[]=[];
const a=newEquipmentAccount(529);a.tutorial={status:'eligible',version:2};
const w=new World({race,seed:17,terrain:campaignTerrain(chooseCampaignMap(17)),equipmentAccount:a});
w.start();chooseTutorial(w,true);let count=0,last='',failure='';
for(let frame=0;frame<36000;frame++){
 const g=guided(w),s=guidedStep(w);if(!g||!s){if(a.tutorial?.tail)break;failure='ended without tail';break;}
 acknowledgeGuidedSave(w);
 if(g.phase==='waiting'){
  if(boundaries&&['move','landing-1'].includes(g.step)){const failed=new World({seed:17});failed.restoreRun(w.captureRun());acknowledgeGuidedSave(failed);assert.ok(activateGuidedTarget(failed));if(g.step==='move'){for(const u of failed.allies())failed.hit(u,1e8,[],1,'zerg');failed.advance(.2);assert.equal(failed.phase,'lost');assert.equal(failed.starship.account.tutorial?.status,'closed');checks.push('real defeat closes tutorial without revival');}else{const pod=failed.pods.find(p=>p.id===failed.expedition.ledger.find(j=>j.id===guided(failed)!.jobs.at(-1))?.podId)!;for(let i=0;i<240&&pod.status==='falling';i++)failed.step();assert.notEqual(pod.status,'falling');failed.hit(pod,1e8,[],1,'zerg');failed.advance(1);assert.equal(failed.starship.account.tutorial?.status,'closed');assert.equal(guided(failed),undefined);checks.push('carrier loss preserves paid loss and resumes normal rules');}}
  if(boundaries){const copy=new World({seed:17});copy.restoreRun(w.captureRun());assert.equal(guided(copy)?.step,g.step);assert.deepEqual(copy.wallet,w.wallet);const items=JSON.stringify(copy.starship.account.items),jobs=JSON.stringify(copy.expedition.ledger),wallet={...copy.wallet},bought=copy.expedition.developmentBought;assert.ok(chooseTutorial(copy,false));assert.equal(guided(copy),undefined);assert.equal(copy.starship.account.tutorial?.status,'skipped');assert.equal(JSON.stringify(copy.starship.account.items),items);assert.equal(JSON.stringify(copy.expedition.ledger),jobs);assert.deepEqual(copy.wallet,wallet);assert.equal(copy.expedition.developmentBought,bought);copy.paused=false;if(copy.phase==='battle'){const before=copy.wallet.minerals;copy.updateEconomy(1);assert.ok(copy.wallet.minerals>before);assert.ok(copy.issueMove({x:copy.anchor.x+1,z:copy.anchor.z}));}checks.push(g.step+':restore/skip/current-stage/property-preservation');}

  if(last===s.id){failure='repeated click '+s.id;break;}last=s.id;count++;
  console.log(JSON.stringify({step:s.id,phase:w.phase,time:w.stageElapsed,wallet:w.wallet,units:w.allies().map(u=>[u.unitType,Math.round(u.hp),u.eliteId]),target:g.bosses[String(w.stage)]?.id}));
  if(['move','drone','resources','landing','boss','loot','card','rally'].includes(s.kind)){if(!activateGuidedTarget(w)){failure='marker rejected '+s.id;break;}}
  else{
   if(!beginGuidedClick(w,guidedClickRef(w))){failure='click rejected';break;}
   let ok=true;
   withGuidedCommand(w,()=>{
    if(['production-on','production-off','output'].includes(s.kind)){
     g.draft??=w.beginBuildingPlacement()!;const p=guidedProducer(w),d=g.draft.groups.find(p=>p.id===g.producer)??g.draft.groups.find(d=>d.id===p?.id)!;g.producer=d.id;
     if(s.kind==='output')d.outputs=[GUIDED_FAMILY[race]];else d.enabled=s.kind==='production-on';finishGuidedClick(w);
    }else if(s.kind==='apply'){
     if(s.after==='dispatch')permitGuidedProduction(w);ok=w.applyBuildingPlacement(g.draft!);delete g.draft;if(!s.after)finishGuidedClick(w);
    }else if(s.kind==='build'||s.kind==='system'||s.kind==='supply'){
     const offer=w.rewards.find(r=>!r.sold&&'expeditionEffect'in r&&(s.kind==='supply'?(r.expeditionEffect as any).kind==='supply'&&(r.expeditionEffect as any).mode==='direct':(r.expeditionEffect as any).definitionId===(s.kind==='system'?`system.${({terran:'barracks',zerg:'zerg.basic',protoss:'gateway'} as const)[race]}`:({terran:'barracks',zerg:'hatchery',protoss:'crystal'} as const)[race])));
     if(!offer){failure='offer missing '+s.id+' '+JSON.stringify(w.rewards);ok=false;return;}ok=w.choose(offer.offerId);if(ok)finishGuidedClick(w);
    }else if(s.kind==='supply-round'||s.kind==='front'){if(s.after==='dispatch')permitGuidedProduction(w);ok=w.skipReward();if(s.kind==='supply-round'&&ok)finishGuidedClick(w);}
    else if(s.kind==='detail')finishGuidedClick(w);
    else if(s.kind==='equip'){const id=guidedItem(w)!;ok=w.equipItem(id,a.items[id].slot).ok;}
    else if(s.kind==='extract')ok=w.extractEquipment();
   });
   if(!ok){failure||='native action failed '+s.id;break;}
   w.changed();
  }
 }
 w.paused=false;w.step();updateGuided(w);
 if(w.phase==='lost'){failure='natural defeat '+s.id;break;}
}
const result={race,count,failure,checks,status:a.tutorial,step:guided(w)?.step,phase:w.phase,stage:w.stage,time:w.stageElapsed,wallet:w.wallet,units:w.allies().map(u=>({type:u.unitType,hp:u.hp,elite:u.eliteId})),tutorial:w.expedition.tutorial};
await fs.mkdir('reports/local/tutorial-20261105/guided-probe',{recursive:true});await fs.writeFile(`reports/local/tutorial-20261105/guided-probe/${race}${boundaries?'-boundaries':''}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({race,count,failure,step:guided(w)?.step,phase:w.phase,time:w.stageElapsed,wallet:w.wallet}));if(failure||!a.tutorial?.tail)process.exitCode=1;
