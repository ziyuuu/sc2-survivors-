import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='reports/local/t01-20261024';
const catalogue=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8')).dynamic;
const prior=JSON.parse(await fs.readFile(base+'/actions-r19-selection.json','utf8'));
const rows=prior.filter(r=>r.id.startsWith('actor:elite.hydralisk.2:')).map(r=>({
 id:r.id,seconds:1.5,framing:{zoom:.65,pitch:60},targetAngle:0,
 times:[...Array.from({length:31},(_,i)=>(i+6)/60),.7,.8,1,1.2,1.5],
 stopAttacksAt:7/60,inspectProjectiles:true,
 scope:'Single native shot with pending windup and piercing packet preserved. Wide camera supplement to the complete repeated-attack run.'
}));
assert.equal(rows.length,12);
const controls=['actor:queen:1:attack-ground:TalonsMissile','actor:queen:1:attack-air','actor:ravager:1:attack','actor:viking:1:attack','actor:adept:1:attack','actor:sentry:1:attack','actor:sentry:1:auto-ability','actor:high_templar:1:auto-ability','actor:void_ray:1:attack','actor:void_ray:1:attack-air','actor:colossus:1:attack'];
for(const id of controls){assert.ok(catalogue.find(c=>c.id===id));rows.push({id,seconds:16,framing:{zoom:1,pitch:60},targetAngle:0,stopAttacksAt:3,inspectProjectiles:true,times:[.05,.1,.15,.2,.25,.3,.4,.5,.7,1,1.5,2,2.5,3,3.1,3.3,3.6,4,4.5,5,6,7,8,8.2,8.5,9,10,12,14,16],scope:'Native rendering control for shared Death-mesh end; particles, beams, displacement and source lifetime remain observable through expiry.'});}
await fs.writeFile(base+'/actions-r20-selection.json',JSON.stringify(rows,null,2),{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,singlePiercing:12,sharedEndingControls:controls.length}));
