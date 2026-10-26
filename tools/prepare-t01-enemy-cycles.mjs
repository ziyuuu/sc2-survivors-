import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='reports/local/t01-20261024',catalogue=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8')).dynamic;
const cases=catalogue.filter(c=>c.runner==='enemy'&&c.rank===1&&!c.applicability&&['skill','auto-ability','aura','mode'].includes(c.action)&&!c.fixture.enemy.interruption);
assert.equal(cases.length,101);
const times=[.05,.15,.2,.35,.5,.6,.65,.7,.8,.85,.9,.95,1,1.05,1.15,1.2,1.25,1.35,1.5,1.55,1.7,2,2.5,2.55,2.7,3,3.25,4,5,6,8,10,12,14,16];
const selection=cases.map(c=>({id:c.id,framing:{zoom:.8,pitch:60},...(c.action==='skill'&&c.fixture.enemy.skill!=='heal'?{targetAngle:0}:{}),times:c.action==='mode'?[1/60,...Array.from({length:35},(_,i)=>(i+1)/10),4]:times.filter(t=>t<=c.seconds),scope:'Individual native enemy full cycle; explicit level/trait/form and ground/air branch. Native automatic detection and transformation remain active.'}));
await fs.writeFile(base+'/actions-r21-selection.json',JSON.stringify(selection,null,2),{flag:'wx'});console.log(JSON.stringify({count:selection.length}));
