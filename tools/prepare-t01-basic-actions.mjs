import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='reports/local/t01-20261024',all=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8')).dynamic;
const rows=all.filter(c=>c.group==='普通单位'&&c.rank===1&&c.race==='terran'&&['spawn','idle','move','attack','hit','death'].includes(c.action));
assert.equal(rows.length,59);
const selection=rows.map(c=>{
 const s={id:c.id,seconds:c.action==='death'?9:c.action==='attack'?8:6,framing:{zoom:1.1,pitch:60},times:[.05,.15,.35,.7,1.2,2,3,4,6]};
 if(c.action==='attack')Object.assign(s,{targetAngle:0,stopAttacksAt:3,times:[.05,.15,.25,.35,.5,.7,1,1.2,1.5,2,2.5,3,3.1,3.3,3.6,4,4.5,5,6,8]});
 if(c.action==='hit')s.times=[.016667,.05,.1,.15,.25,.35,.5,.7,1,1.5,2,3,4,6];
 if(c.action==='death')s.times=[.016667,.05,.1,.2,.3,.5,.75,1,1.5,2,3,4,5,6,7,8,9];
 return s;
});
await fs.writeFile(base+'/actions-r13-selection.json',JSON.stringify(selection,null,2),{flag:'wx'});
console.log(JSON.stringify({rows:selection.length,frames:selection.reduce((n,r)=>n+r.times.length+1,0)}));
