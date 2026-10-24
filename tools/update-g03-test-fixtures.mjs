import fs from 'node:fs/promises';import assert from 'node:assert/strict';
// Existing mechanism tests now exercise the full-content production tier.
// Low-tier negative cases remain explicit; no diagnostic bypass is introduced.
for(const file of ['missions','field-events','fun-shop','fun-feedback-r4-pacing','special-stages','fun-visual-batch2']){
 const p='test/'+file+'.test.ts';let s=await fs.readFile(p,'utf8');assert.ok(s.includes('new World({'));s=s.replaceAll('new World({','new World({difficulty:\'hard\',');await fs.writeFile(p,s);
}
const p='test/expanded-encounters.test.ts';let s=await fs.readFile(p,'utf8');s=s.replace("='normal',stage=10","='hard',stage=10").replaceAll('new World({terrain:campaignTerrain','new World({difficulty:\'hard\',terrain:campaignTerrain');
s=s.replace("const w=world(difficulty),m=start(w,'whitePack')", "const w=world(difficulty);if(difficulty==='easy'){assert.equal(spawnFunEncounter(w,'whitePack'),false);return;}const m=start(w,'whitePack')");
s=s.replace("const w=world(difficulty);w.expedition.race='zerg';", "const w=world(difficulty);if(difficulty==='easy'||difficulty==='normal'){assert.equal(spawnFunEncounter(w,'infectedTerrans'),false);return;}w.expedition.race='zerg';");
s=s.replace("const m=start(w,'whitePack'),u=bodies(w,m.actors)[0],a=w.allies()[0];", "if(difficulty==='easy'){assert.equal(spawnFunEncounter(w,'whitePack'),false);assert.ok(w.starship.totals.dps+w.starship.totals.attackSpeed>0);return;}const m=start(w,'whitePack'),u=bodies(w,m.actors)[0],a=w.allies()[0];");
s=s.replace('six white bodies transform before the first damage and pay six elite packages once','white-pack gate or six transformations and once-only elite packages').replace('infected explosion retains the ordinary baneling damage and bonus profile','infection gate or ordinary baneling explosion profile').replace('equipped growth stats enter actual encounter combat and rewards retain their difficulty context','equipment growth respects the encounter gate and legal reward context');
await fs.writeFile(p,s);
