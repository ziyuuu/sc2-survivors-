import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DYNAMIC_CASES} from './t01/catalogue.ts';
const base='reports/local/t01-20261024';
const previous=JSON.parse(await fs.readFile(base+'/actions-r16/report.json','utf8')).build,freeze=base+'/actions-r16/frozen-web';
await fs.mkdir(freeze,{recursive:false});
for(const item of previous.artifacts){const bytes=await fs.readFile(previous.out+'/'+item.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);await fs.writeFile(freeze+'/'+item.file,bytes,{flag:'wx'});}
for(const file of ['asset-manifest.json','runtime-config.json'])await fs.copyFile(previous.out+'/'+file,freeze+'/'+file);
await fs.writeFile(freeze+'/build.json',JSON.stringify(previous,null,2),{flag:'wx'});
await fs.writeFile(freeze+'/replay-build.json',JSON.stringify({...previous,out:freeze},null,2),{flag:'wx'});
const template=JSON.parse(await fs.readFile(base+'/actions-r16-selection.json','utf8'))[0],rows=[];
for(const actor of ['thor','elite.thor.1','elite.thor.2','elite.thor.3']){
 for(let rank=1;rank<=5;rank++)for(const [plane,weapon,pose] of [['ground','ThorsHammer','highImpactGroundAttack'],['air','LanceMissileLaunchers','highImpactAttack']])rows.push({...template,id:`actor:${actor}:${rank}:form:thor_high_impact:attack-${plane}:${weapon}`,expectedAttackPoses:['highImpactReady',pose,'highImpactIdle'],expectedEndPose:'highImpactIdle'});
 for(const plane of ['ground','air'])rows.push({...template,id:`actor:${actor}:1:${plane==='ground'?'attack':'attack-air'}`,expectedAttackPoses:['ready','attack','idle'],expectedEndPose:'idle'});
}
rows.push({...template,id:'actor:hero.purifier_flagship:1:attack-air'});
for(const row of rows)assert.ok(DYNAMIC_CASES.some(c=>c.id===row.id&&!c.applicability));
await fs.writeFile(base+'/actions-r17-selection.json',JSON.stringify(rows,null,2),{flag:'wx'});console.log(JSON.stringify({rows:rows.length,freeze}));
