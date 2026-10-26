import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/t01-20261024',catalogue=JSON.parse(await fs.readFile(root+'/catalogue-current.json','utf8')).dynamic;
// Instant boss healing has no native interruptible packet and is explicitly
// inapplicable in the catalogue. Its visible tail is checked by lifecycle QA.
const bases=['enemy:boss:ravager:skill','enemy:boss:lurker:skill','enemy:boss:roach:skill','enemy:boss:mutalisk:skill','enemy:boss:mutalisk:skill-air','enemy:boss:hydralisk:skill-air','enemy:elite:ravager:skill'];
const times=[.05,.15,.2,.25,.35,.5,.7,.8,.85,.9,.95,1,1.05,1.15,1.2,1.25,1.35,1.5,1.55,1.7,2,2.5,2.55,2.7,3,3.25,4,5,6,8,10,12,14,16];
const rows=bases.flatMap(id=>['before-commit','after-commit'].map(branch=>{
 const c=catalogue.find(c=>c.id===id+':'+branch);assert.ok(c&&!c.applicability);
 return {id:c.id,framing:{zoom:.8,pitch:60,followInspection:true},...(c.fixture.enemy.skill!=='heal'?{targetAngle:0}:{}),times,scope:'Native source death before/after commit, with committed bile and instantaneous healing retained according to actual production rules. Full rendered cycle; no gameplay rule override.'};
}));
await fs.writeFile(root+'/actions-r24-selection.json',JSON.stringify(rows,null,2),{flag:'wx'});
console.log(JSON.stringify({count:rows.length}));
