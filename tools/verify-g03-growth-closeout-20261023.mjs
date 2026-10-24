import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/g03-growth-consumption-20261023',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reportPath='reports/qa/g03-growth-consumption-20261023.json',docPath='docs/project/G03_GROWTH_CONSUMPTION_20261023.md',r=read(reportPath),board=read('docs/project/performance-board.json'),doc=fs.readFileSync(docPath,'utf8');
assert.equal(board.revision,135);assert.equal(board.tasks.length,62);assert.equal(board.tasks.find(t=>t.id==='G03').status,'待讨论');
assert.equal(r.count,57);assert.equal(r.totalRouteRecords,102);assert.equal(r.allFormalCounts.total,102);assert.equal(r.allFormalCounts.entered,73);assert.equal(r.allFormalCounts.lost,29);
assert.equal(r.analysis.sha256,sha(r.analysis.file));assert.equal(r.findings,fs.readFileSync(root+'/findings.md','utf8'));
const a=read(root+'/after.json');for(const f of a.files){assert.equal(sha(f.file),f.sha256);assert.equal(sha(root+'/after/'+f.file),f.sha256);}
assert.equal(sha(r.source.current.file),r.source.current.sha256);
for(const row of [...r.rows,...r.historicalRows]){assert.equal(sha(row.file),row.sha256);assert.deepEqual(row.reconciliation,{minerals:0,gas:0});}
for(const entry of Object.values(r.reportingTools))assert.equal(sha(entry.file),entry.sha256);
for(const name of ['batch-status','repair-batch-status']){const b=read(root+'/'+name+'.json');assert.equal(b.active.length,0);assert.equal(b.pending,0);assert.ok(b.finished.every(j=>j.code===0));}
for(const d of ['routes','repaired-routes'])assert.ok(!fs.readdirSync(root+'/'+d).some(f=>f.endsWith('.lock')));
for(const item of r.cleanup.removed)assert.equal(fs.existsSync(item.path),false);
for(const match of doc.matchAll(/\]\(([^)]+)\)/g)){const ref=match[1];if(!/^(https?:|#)/.test(ref))assert.ok(fs.existsSync(path.resolve(path.dirname(docPath),ref)),ref);}
assert.ok(fs.readFileSync('AGENTS.md','utf8').startsWith('## G03高品质成长与消费构筑补测完成'));
const result={date:'2026-10-23',complete:true,report:{file:reportPath,sha256:sha(reportPath)},document:{file:docPath,sha256:sha(docPath)},board:{revision:135,status:board.tasks.reduce((o,t)=>(o[t.status]=(o[t.status]??0)+1,o),{})},candidateSources:a.files.length,currentUnchanged:true,formalRuns:102,pilots:1,regressionUnique:r.verification.uniqueTests,controlledProbes:15,initialCloseout:'Report and board succeeded; AGENTS file open failed. AGENTS was subsequently patched separately and board views regenerated; revision was not incremented twice.',verifiedAt:new Date().toISOString()};
fs.writeFileSync(root+'/final-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
