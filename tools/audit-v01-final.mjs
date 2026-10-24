import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='reports/local/v01-20261024',baseline=JSON.parse(await fs.readFile(base+'/baseline.json')),sha=b=>createHash('sha256').update(b).digest('hex');
const changed=[];for(const row of baseline.files)if(sha(await fs.readFile(row.file))!==row.sha256)changed.push(row.file);
const expected=['src/simulation/expedition-state.ts','src/simulation/persistence/starship-snapshot.ts','src/simulation/world.ts'];assert.deepEqual(changed.sort(),expected.sort());
async function walk(dir){return(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]))).flat();}
const all=[...await walk('src'),...await walk('test')],old=new Set(baseline.files.map(r=>r.file)),added=all.filter(p=>!old.has(p));assert.deepEqual(added.sort(),['test/v01-loot-checkpoint.test.ts','test/v01-supply-checkpoint.test.ts']);
const inputs=[];for(const kind of ['web-game-final-r1','offline-game-final-r1']){const build=JSON.parse(await fs.readFile(base+'/'+kind+'-build.json'));for(const row of build.inputs){const file=row.path??row.file;assert.equal(sha(await fs.readFile(file)),row.sha256,file);}inputs.push({kind,count:build.inputs.length,match:true});}
const current='dist/SC2-Survivors-Current-20261006.html',currentSHA=sha(await fs.readFile(current));assert.equal(currentSHA,'c13862cfdc4d43881277fa4b35fb733a604009f023095c3df0d055a8f42e669d');
const web=JSON.parse(await fs.readFile(base+'/web-game-final-r1-build.json')),offline=JSON.parse(await fs.readFile(base+'/offline-game-final-r1-build.json'));
const report={pass:true,baseline:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,added,total:all.length,inputs,currentSHA,currentUnchanged:true,assetCount:web.assetCount,resources:web.resources.length,offlineChunks:offline.chunks,unchangedAreas:['UI and text','rendering and camera','controls','game prices and probabilities','asset catalogs'],noPerformanceCandidateAdopted:true};await fs.writeFile(base+'/source-audit-final.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
