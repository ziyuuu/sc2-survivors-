/** Thirty-second native scenarios with exact archive continuation at six seconds. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BIO_CARDS} from '../src/data/terran-bio';
import {bioScenario,startBioScene} from '../preview/bio-synergy-20261118/scenarios';
import {writeArchive,readArchive} from '../src/persistence/archive';
const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-integration-20261119';await fs.mkdir(out,{recursive:true});const rows:any[]=[];
for(const card of BIO_CARDS)for(const variant of card.purchase==='node'?[0,1,2]:[0,1]){
 const w=bioScenario(card.id,variant).world;startBioScene(w,card.id);for(let tick=0;tick<360;tick++)w.step();
 const copy=bioScenario(card.id,variant).world;copy.restoreRun(readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!);copy.paused=w.paused;
 for(let tick=360;tick<1800;tick++){w.step();copy.step();for(const u of w.entities.values())assert.ok([u.hp,u.maxHp,u.unitRadius,u.weaponDamage,u.attackPeriod].every(Number.isFinite),card.id+' non-finite state');}
 assert.deepEqual(copy.captureRun(),w.captureRun(),card.id+' archive continuation');rows.push({id:card.id,variant,phase:w.phase,time:w.time,damage:w.stats.damage,healed:w.stats.healed,bodies:w.entities.size,restored:true});console.log(card.id+' '+variant+' '+w.phase+' '+w.time);
}
await fs.writeFile(out+'/bio-lifecycle.json',JSON.stringify({scope:'99 native base/held/reserve scenarios, maximum 30 simulated seconds, exact archive replay from second six; actual game-over states are preserved.',rows},null,2));console.log(JSON.stringify({scenarios:rows.length,exactArchiveReplays:rows.length}));
