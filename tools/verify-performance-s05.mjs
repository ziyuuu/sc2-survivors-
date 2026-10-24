import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {lifecycle,draft} from './performance-s05-cases.mjs';
const root='reports/local/performance-s05-20261020',a=await import('../'+root+'/baseline-r2-logic/main.mjs'),b=await import('../'+root+'/candidate-r2-logic/main.mjs');
const report={method:'Same frozen production inputs except the seven S05 files; all serialized World/account/events/RNG plus production/receipt UI and query results. Only the three established run UUID fields normalized. Diagnostic historical records retained.',rows:[],pass:false},hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
try{
 for(const race of ['terran','zerg','protoss'])for(const seed of [91,529,1777])for(const n of [0,20,1000,10000])for(const kind of ['normal','retire',...(race==='zerg'?['twin-death','inject']:[])]){
  const before=lifecycle(a,race,seed,n,kind),after=lifecycle(b,race,seed,n,kind);assert.deepEqual(after,before,`${race}/${seed}/${n}/${kind}`);report.rows.push({race,seed,n,kind,checkpoints:before.length,sha256:hash(before)});}
 for(const kind of ['tactical-five','tactical-death','tactical-cancel'])for(const n of [0,1000,10000]){const before=lifecycle(a,'terran',529,n,kind);const after=lifecycle(b,'terran',529,n,kind);assert.deepEqual(after,before);report.rows.push({kind,n,checkpoints:before.length,sha256:hash(before)});}
 for(const race of ['terran','zerg','protoss'])for(const n of [0,1,2,3,20,1000,10000]){const before=draft(a,race,529,n),after=draft(b,race,529,n);assert.deepEqual(after,before);report.rows.push({kind:'draft',race,n,checkpoints:before.length,sha256:hash(before)});}
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{report.checkpoints=report.rows.reduce((s,r)=>s+r.checkpoints,0);await fs.writeFile(root+'/equivalence.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,rows:report.rows.length,checkpoints:report.checkpoints,failure:report.failure}));}
