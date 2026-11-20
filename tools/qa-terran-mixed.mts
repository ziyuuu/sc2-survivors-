/** Actual mixed purchases and native combat, with a full archive continuation. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {TERRAN_PATHS,terranShelf} from './qa-terran-budget.mts';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {readArchive,writeArchive} from '../src/persistence/archive';
import type {BuildBranch,BuildCardId} from '../src/simulation/progression/build-progress';

const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-integration-20261119';await fs.mkdir(out,{recursive:true});
const branches:BuildBranch[]=['armed','doomsday','bio'];
const side:Record<BuildBranch,BuildCardId[]>={armed:['W01','G01','B03'],doomsday:['M-W01','M-B01','M-B04'],bio:['BIO-W02','BIO-G03','BIO-B04']};
const rows:any[]=[];
function create(){return new World({race:'terran',seed:191145,waves:false,terrain:new FlatTerrain(),obstacles:[]});}
for(const branch of branches)for(let variant=0;variant<3;variant++){
 const w=create();assert.ok(w.start());w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 for(const [i,type] of (['marine','reaper','marauder','hellion','tank','medivac'] as const).entries())w.addUnit(type,'terran',(i-2.5)*1.6,0,5);
 w.acquireHero('raynor');w.stage=16;w.wallet={minerals:100000,gas:100000};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
 for(const id of TERRAN_PATHS[branch]){
  const offer=terranShelf(w,id);assert.ok(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),id);
  const choice=pendingBuildChoice(w);if(choice)assert.ok(w.claimBuildChoice(choice.id,w.expedition.shopRevision,choice.offers[choice.at===12?variant:0]));
 }
 for(const secondary of branches.filter(b=>b!==branch))for(const id of side[secondary]){const offer=terranShelf(w,id);assert.ok(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),id);}
 assert.equal(w.expedition.build?.main,branch);assert.ok(w.expedition.build?.orange);assert.ok(!pendingBuildChoice(w));
 assert.ok(w.expedition.build!.milestones.every(m=>m.branch===branch||!m.claimed));
 w.phase='battle';w.paused=false;w.time=w.tick=w.stageElapsed=0;w.anchor.x=w.anchor.z=0;
 for(const u of w.allies()){u.hp=u.maxHp;u.weaponCooldown=0;u.lastShotAt=-100;u.shotSequence=0;u.attackTarget=u.pendingTarget=null;}
 for(let i=0;i<18;i++)w.addUnit(i%3===0?'mutalisk':i%3===1?'roach':'hydralisk','zerg',(i%6-2.5)*1.3,6+Math.floor(i/6)*1.4,5);
 const boss=w.addUnit('ultralisk','zerg',0,12,5);boss.enemyTier='boss';boss.hp=boss.maxHp=1000000;w.hash.rebuild(w.entities.values());
 for(let tick=0;tick<300;tick++)w.step();
 const copy=create();copy.restoreRun(readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!);copy.paused=w.paused;
 for(let tick=300;tick<1800;tick++){w.step();copy.step();for(const u of w.entities.values())assert.ok([u.hp,u.maxHp,u.unitRadius,u.weaponDamage,u.attackPeriod].every(Number.isFinite));}
 assert.deepEqual(copy.captureRun(),w.captureRun(),branch+' mixed continuation '+variant);
 const row={branch,orange:w.expedition.build!.orange,time:w.time,phase:w.phase,damage:w.stats.damage,healed:w.stats.healed,bodies:w.entities.size,restored:true};rows.push(row);console.log(JSON.stringify(row));
}
await fs.writeFile(out+'/mixed.json',JSON.stringify({scope:'Nine mixed main/side-branch purchase paths; all three ultimates per main; native air/ground/Boss combat up to 30 seconds; exact archive replay after five seconds.',rows},null,2));
