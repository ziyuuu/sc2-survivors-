import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [run,numbers,observation]=process.argv.slice(2);assert.match(run,/^ui-interactions-r\d+$/);assert.ok(observation);
const root='reports/local/t01-20261024/'+run,index=JSON.parse(await fs.readFile(root+'/review/index.json','utf8'));
let report;try{report=JSON.parse(await fs.readFile(root+'/visual-review.json','utf8'));}catch{report={scope:'Per-case review of actual hover/focus, scroll and transaction screenshots in each viewport. Native state assertions are separate; emulated touch is not physical-device acceptance.',rows:[]};}
for(const n of numbers.split(',').map(Number)){
 const item=index[n-1];assert.ok(item);assert.ok(item.steps.length,'Generate and inspect the selected screenshots first');const images=[];
 for(const file of item.steps)images.push({file:'review/'+file,sha256:createHash('sha256').update(await fs.readFile(root+'/review/'+file)).digest('hex')});
 const row={id:item.id,images,status:'reviewed',observation,at:new Date().toISOString()},old=report.rows.findIndex(r=>r.id===row.id);if(old<0)report.rows.push(row);else report.rows[old]=row;
}
report.reviewed=report.rows.length;await fs.writeFile(root+'/visual-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({reviewed:report.reviewed}));
