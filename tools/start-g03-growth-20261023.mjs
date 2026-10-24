import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='reports/local/g03-growth-consumption-20261023';
const baseline='reports/local/g03-tier-balance-20261023/behemoth-runtime';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
assert.ok(!fs.existsSync(root+'/before.json'),'The frozen baseline must not be overwritten');
fs.mkdirSync(root+'/before',{recursive:true});
const files=walk('src').concat(walk('test')).map(file=>({file,sha256:sha(file),bytes:fs.statSync(file).size}));
for(const row of files.filter(r=>r.file.startsWith('src/')))assert.equal(sha(baseline+'/'+row.file),row.sha256,'Reusable complete source baseline: '+row.file);
for(const file of ['AGENTS.md','docs/project/performance-board.json','package.json','tsconfig.json'])fs.copyFileSync(file,root+'/before/'+path.basename(file));
const current='dist/SC2-Survivors-Current-20261006.html';
fs.writeFileSync(root+'/before.json',JSON.stringify({date:'2026-10-23',files,baseline,current:{file:current,sha256:sha(current)},authorization:{rank:'Only purple/orange equipment additive normal DPS, true DPS and HP contributions: hero/elite +5% per rank above I; native stats and ordinary identities unchanged.',base:'Purple white DPS/HP/armor +5%, orange +8%, polluted-origin orange +10% total. Attack speed, affixes and set effects unchanged; unclean items still cannot be equipped.',measurements:'Complete spending/build controller coverage and paired native campaign samples; preserve failures/censors. No further balance changes without discussion.'}},null,2)+'\n');
console.log(JSON.stringify({root,files:files.length,reusedSourceFiles:files.filter(r=>r.file.startsWith('src/')).length,current:sha(current)}));
