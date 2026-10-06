import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='reports/local/hero-aura-correction-20261005';
const read=async name=>JSON.parse(await fs.readFile(`${root}/${name}`,'utf8'));
async function fingerprint(path){
 const hash=createHash('sha256');let bytes=0;
 for await(const chunk of createReadStream(path)){bytes+=chunk.length;hash.update(chunk);}
 return {path,bytes,sha256:hash.digest('hex')};
}
const [baseline,zerg,terran,productionZerg,productionTerran,saves,web,test]=await Promise.all([
 fs.readFile('reports/local/zerg-heroes-20261005/delivery.json','utf8').then(JSON.parse),
 read('zerg-demo/browser.json'),read('terran-demo/browser.json'),
 read('production-heroes/report.json'),read('production-terran/report.json'),
 read('production-save/report.json'),fs.readFile('dist/web/web-release.json','utf8').then(JSON.parse),
 fs.readFile(root+'/tests.log','utf8')
]);
const tests={tests:Number(test.match(/ℹ tests (\d+)/)?.[1]),passed:Number(test.match(/ℹ pass (\d+)/)?.[1]),failed:Number(test.match(/ℹ fail (\d+)/)?.[1])};
assert.deepEqual(tests,{tests:875,passed:875,failed:0});
const artifacts=[];
for(const old of baseline.artifacts.filter(a=>a.path!=='dist/SC2-Survivors-Demo.html')){
 const current=await fingerprint(old.path);assert.equal(current.sha256,old.sha256,`preserve ${old.path}`);assert.equal(current.bytes,old.bytes);
 artifacts.push({...current,originalPreserved:true});
}
assert.equal(artifacts.length,5);
for(const path of ['dist/Six-Zerg-Heroes-With-Auras-20261005.html','dist/Six-Terran-Heroes-With-Auras-20261005.html','dist/SC2-Survivors-Hero-Auras-20261005.html','dist/SC2-Survivors-Demo.html'])artifacts.push({...await fingerprint(path),corrected:true});
assert.equal(artifacts.at(-1).sha256,artifacts.at(-2).sha256);
for(const [report,path,attackCount,skillCount] of [[zerg,'dist/Six-Zerg-Heroes-With-Auras-20261005.html',18,6],[terran,'dist/Six-Terran-Heroes-With-Auras-20261005.html',18,6]]){
 assert.equal(report.sha256,artifacts.find(a=>a.path===path).sha256);
 assert.equal(report.failure??null,null);assert.deepEqual(report.errors,[]);assert.deepEqual(report.remoteRequests,[]);
 assert.equal(report.attacks.length,attackCount);assert.equal(report.skills.length,skillCount);assert.equal(report.bosses.length,2);
}
assert.equal(zerg.revivals.length,2);assert.equal(zerg.layouts.length,12);
assert.ok(zerg.attacks.every(c=>c.auras.heroes===1&&c.auras.layers===2&&c.auras.textLabels===0));
for(const report of [productionZerg,productionTerran]){
 assert.equal(report.appBuildId,web.appBuildId);assert.equal(report.failure??null,null);assert.deepEqual(report.errors,[]);assert.equal(report.checks.length,2);
 assert.ok(report.checks.every(c=>c.schema===18&&c.saveRestored&&c.auraTextVisible===false&&c.debugApi===false));
}
assert.ok(productionZerg.checks.every(c=>c.zergAuraDisplays===3&&c.terranAuraDisplays===0&&c.mechanismsPreserved));
assert.ok(productionTerran.checks.every(c=>c.auras===3&&c.aurasRestored===3));
assert.equal(saves.failure??null,null);assert.deepEqual(saves.errors,[]);assert.equal(saves.checks.filter(c=>c.saveFieldsPreserved).length,2);
assert.equal(web.runSchema,18);assert.equal(web.release,baseline.web.release);assert.equal(web.assetCount,baseline.web.assetCount);assert.equal(web.assetBytes,baseline.web.assetBytes);
const source=[];
for(const old of baseline.source.filter(s=>s.path.startsWith('src/data/')||s.path.startsWith('src/simulation/'))){
 const current=await fingerprint(old.path);assert.equal(current.sha256,old.sha256,`unchanged combat ${old.path}`);source.push({...current,combatUnchanged:true});
}
for(const path of ['src/render/effects/confirmed-hero/hero-aura-effects.ts','src/render/effects/confirmed-hero/controller.ts','src/render/effects/zerg-hero-effects.ts','src/render/scene/battle-renderer.ts','src/ui/hud/squad-console.ts','preview/hero-integrated-demo/app.ts','preview/hero-integrated-demo/shell.html','preview/zerg-hero-integrated-demo/app.ts','preview/zerg-hero-integrated-demo/shell.html'])source.push(await fingerprint(path));
const browserSummary=r=>({attacks:r.attacks.length,skills:r.skills.length,bosses:r.bosses.length,revivals:r.revivals?.length??0,layouts:r.layouts?.length??0,controls:r.controls.length,errors:r.errors.length,remoteRequests:r.remoteRequests.length,sha256:r.sha256});
const delivery={scope:'User clarified: show all twelve revised hero foot aura effects; hide only aura text. Unchanged actual buffs/debuffs, numeric combat rules, approved gun/skill effects and original models. New artifact names preserve five prior HTMLs byte-for-byte. Schema18/profile v5 unchanged. Full P3/M6/M7, human/device/source-clip acceptance remain open. No cleanup, Google upload, push or deployment.',tests,browser:{zerg:browserSummary(zerg),terran:browserSummary(terran)},productionZerg:productionZerg.checks,productionTerran:productionTerran.checks,productionSaves:saves.checks,artifacts,web,source};
await fs.writeFile(root+'/artifacts.json',JSON.stringify({artifacts,web,source},null,2));
await fs.writeFile(root+'/delivery.json',JSON.stringify(delivery,null,2));
console.log(JSON.stringify({tests,browser:delivery.browser,productionGroups:productionZerg.checks.length+productionTerran.checks.length,preservedOriginals:artifacts.filter(a=>a.originalPreserved).length,combatFilesUnchanged:source.filter(a=>a.combatUnchanged).length,correctedArtifacts:artifacts.filter(a=>a.corrected),web},null,2));
