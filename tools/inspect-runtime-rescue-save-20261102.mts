/** Read-only runtime audit: a real rescue birth on the final stage tick.
 * Assertions document the current defect. No diagnostic health/damage helpers,
 * no real save storage, and no product code modifications are used here. */
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {spawnMission} from '../src/simulation/missions/runtime';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';

for(const race of ['terran','zerg','protoss'] as const){
  Object.defineProperty(globalThis.crypto,'randomUUID',{value:()=>`runtime-rescue-${race}-529`,configurable:true});
  const w=new World({seed:529,race,difficulty:'normal',waves:false,terrain:campaignTerrain(chooseCampaignMap(529)),obstacles:[],equipmentAccount:newEquipmentAccount(529)});
  assert.ok(w.start());w.stage=14;w.prepareStage();
  // Start a bounded valid late-stage window. The mission's own 240-tick
  // signal creates its actors; no test creates or edits the escort bodies.
  w.tick=Math.round((w.duration-4)*60);w.time=w.tick/60;w.stageElapsed=w.duration-4;
  assert.ok(spawnMission(w,'rescue'));
  const archive=()=>writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),equipment:structuredClone(w.starship.account)},1);
  let current:string|null=null,commits=0;
  const backend:SaveBackend={read:async()=>[current,null,null],commit:async(raw,expected)=>{assert.equal(current,expected);current=raw;commits++;}};
  const repository=new SaveRepository(backend);await repository.load();
  const before=archive();readArchive(before);await repository.commit(before);
  for(let tick=0;tick<240;tick++)w.step();
  assert.equal(w.phase,'reward');assert.equal(w.missions.active?.kind,'rescue');
  const escorts=[...w.entities.values()].filter(u=>u.hp>0&&u.temporary&&u.mission?.holdout&&u.pairId);
  const after=archive(),saved=w.captureRun();
  let restoreError:string|null=null,archiveError:string|null=null,saveError:string|null=null;
  try{w.restoreRun(saved);}catch(error){restoreError=String(error);}
  try{readArchive(after);}catch(error){archiveError=String(error);}
  try{await repository.commit(after);}catch(error){saveError=String(error);}
  if(race==='zerg'){
    assert.ok(escorts.length>=4);assert.match(restoreError??'',/双生编制无效/);
    assert.match(archiveError??'',/双生编制无效/);assert.match(saveError??'',/双生编制无效/);
    assert.equal(current,before);assert.equal(commits,1);
  }else{
    assert.equal(escorts.length,0);assert.equal(restoreError,null);assert.equal(archiveError,null);assert.equal(saveError,null);
    assert.equal(current,after);assert.equal(commits,2);
  }
  console.log(JSON.stringify({case:'rescue-birth-on-stage-final-tick',race,steps:240,phase:w.phase,time:w.time,runId:w.runId,liveRescueFriends:w.missions.active?.rescue?.friends.length,
    escorts:escorts.map(u=>({id:u.id,pairId:u.pairId,temporary:u.temporary,registered:w.expedition.zerglingPairs.some(p=>p.id===u.pairId)})),restoreError,archiveError,saveError,oldCheckpointRetained:current===before,commits}));
}
