import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DYNAMIC_CASES} from './t01/catalogue.ts';
import {HYDRALISK_MELEE,SC2_UNITS} from '../src/data/sc2-units.ts';
const base='reports/local/t01-20261024',previous=JSON.parse(await fs.readFile(base+'/catalogue-current.json','utf8'));
await fs.writeFile(base+'/catalogue-before-close-range.json',JSON.stringify(previous),{flag:'wx'});
assert.equal(previous.dynamic.length,11151);for(const c of previous.dynamic)assert.ok(DYNAMIC_CASES.some(n=>n.id===c.id));
const rows=[],actors=['hydralisk','elite.hydralisk.1','elite.hydralisk.2','elite.hydralisk.3','hero.stukov'];
const template={seconds:12,framing:{zoom:1.4,pitch:60},times:[.05,.1,.15,.2,.25,.35,.5,.7,1,1.5,2,2.5,3,3.1,3.3,3.6,4,5,6,8,9,10,12],targetAngle:0,stopAttacksAt:3,inspectPose:true,expectedNaturalRecovery:true};
for(const actor of actors){for(let rank=1;rank<=5;rank++)for(const plane of ['ground','air'])rows.push({...template,id:`actor:${actor}:${rank}:attack-${plane}:close-range`,expectedCadenceRatio:HYDRALISK_MELEE.period/SC2_UNITS.hydralisk.attackPeriod});for(const plane of ['ground','air'])rows.push({...template,id:`actor:${actor}:1:${plane==='ground'?'attack':'attack-air'}`,expectedCadenceRatio:1});}
for(const row of rows)assert.ok(DYNAMIC_CASES.some(c=>c.id===row.id));assert.equal(rows.length,60);
await fs.writeFile(base+'/actions-r18-selection.json',JSON.stringify(rows,null,2),{flag:'wx'});console.log(JSON.stringify({rows:rows.length,catalogue:DYNAMIC_CASES.length}));
