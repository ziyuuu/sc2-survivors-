import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import assert from 'node:assert/strict';
const root='D:/星际',rel='reports/local/g02-20261022',base=root+'/'+rel,reportFile='reports/qa/g01-hero-g02-20261022.json';
const read=async f=>JSON.parse((await fs.readFile(root+'/'+f,'utf8')).replace(/^\uFEFF/,''));
async function hash(f){const h=createHash('sha256');for await(const b of createReadStream(f))h.update(b);return h.digest('hex');}
const report=await read(reportFile),board=await read('docs/project/performance-board.json'),cleanup=await read(rel+'/cleanup.json'),verification=await read(rel+'/verification.json');
assert.ok(cleanup.pass&&cleanup.protectedExact&&cleanup.browserClosed);assert.ok(verification.pass);assert.equal(board.revision,119);assert.equal(board.next,'G02');assert.equal(board.tasks.find(x=>x.id==='G01').status,'已完成');assert.equal(board.tasks.find(x=>x.id==='G02').status,'待讨论');
const source=await read(rel+'/final-source.json');for(const row of source.files){assert.equal(await hash(root+'/'+row.file),row.sha256);assert.equal(await hash(base+'/final-source/'+row.file),row.sha256);}
const full=await fs.readFile(base+'/full-regression-r2.log','utf8'),retry=await fs.readFile(base+'/network-retry-r2.log','utf8');assert.match(full,/tests 2213/);assert.match(full,/pass 2206/);assert.match(full,/fail 7/);assert.match(retry,/tests 16/);assert.match(retry,/pass 16/);assert.match(retry,/fail 0/);
const links=[];
for(const file of ['preview/g02-20261022/index.html',rel+'/visual-review/index.html']){
  const html=await fs.readFile(root+'/'+file,'utf8');for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const target=match[1];if(/^https?:/.test(target))continue;const resolved=path.resolve(path.dirname(root+'/'+file),decodeURI(target));await fs.access(resolved);links.push({from:file,target,exists:true});}
}
for(const file of ['docs/project/G01_HERO_G02_REVIEW_20261022.md','docs/project/FUN_FEEDBACK_R4_PLAN_20261022.md']){
  const md=await fs.readFile(root+'/'+file,'utf8');for(const match of md.matchAll(/\]\(([^)]+)\)/g)){const target=match[1];if(/^https?:/.test(target))continue;const resolved=path.resolve(path.dirname(root+'/'+file),target);await fs.access(resolved);links.push({from:file,target,exists:true});}
}
for(const id of ['G01','G02','G03','U05'])for(const file of board.tasks.find(x=>x.id===id).evidence)await fs.access(path.resolve(root+'/docs/project',file));
const boundFiles=[
  'AGENTS.md','docs/project/performance-board.json','docs/project/PERFORMANCE_BOARD.html','docs/project/PERFORMANCE_TODO.md','docs/project/G01_HERO_G02_REVIEW_20261022.md','docs/project/G01_CARD_EQUIPMENT_HERO_REVIEW_20261022.md','docs/project/FUN_FEEDBACK_R4_PLAN_20261022.md','docs/project/FUN_FEEDBACK_R4_20261022.md','preview/g02-20261022/index.html',
  ...['before.json','before-pilot-included-policy.json','final-source.json','verification.json','verify-post-cleanup.log','cleanup.json','analysis.json','offense-r3.json','offense-r4.json','offense-r5.json','channels-r4.json','specialists-r3.json','battles-r2.json','hero-gates-r2.json','stacking-r1.json','full-regression-r2.log','network-retry-r2.log','typecheck-r3.log','docs-check-r3.log','mutation-before.log','mutation-after-r1.log','web-game-r1-build.json','web-lab-r1-build.json','offline-game-r1-build.json','offline-game-verification-r1.json','qa-helper-inputs.json','visual-review.json','visual-review/index.html','qa-production-r1/result.json','qa-ui-still-r1/result.json','qa-runtime-r1/result.json','qa-runtime-r2/result.json'].map(f=>rel+'/'+f),
  ...report.visual.finalImages,...report.visual.archivedImages,
  ...['tools/lib/g02-fixtures.mts','tools/audit-g02-offense.mts','tools/audit-g02-battles.mts','tools/audit-g02-hero-gates.mts','tools/audit-g02-channels.mts','tools/audit-g02-specialists.mts','tools/audit-g02-stacking.mts','tools/summarize-g02.mjs','tools/prepare-g02-qa.mjs','tools/verify-g02.mjs','tools/record-g02-review.mjs','tools/cleanup-g02-qa.ps1','tools/closeout-g02-review.mjs']
];
report.bound=[];for(const file of [...new Set(boundFiles)]){report.bound.push({file,bytes:(await fs.stat(root+'/'+file)).size,sha256:await hash(root+'/'+file)});}
report.cleanup=cleanup;delete report.cleanupPending;report.verification=verification;
report.preservedFailures.push('Sandbox CIM process query was unavailable; approved native process read confirmed the owned browser closed before deleting only this batch profile.');
report.closeout={pass:true,allFinalSourcesStillExact:true,buildBindingsRecheckedAfterCleanup:true,localLinks:links.length,allLocalLinksExist:true,rawAndFinalEvidenceBound:report.bound.length,g01Complete:true,g02DecisionPending:true,boardCounts:report.boardCounts};
await fs.writeFile(root+'/'+reportFile,JSON.stringify(report,null,2)+'\n');await fs.writeFile(base+'/links.json',JSON.stringify(links,null,2)+'\n');
console.log(JSON.stringify(report.closeout));
