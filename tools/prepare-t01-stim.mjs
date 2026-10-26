import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='.cache/t01-audio/stim';await fs.mkdir(root,{recursive:true});
const dependencies=[];
for(const file of await fs.readdir('tools'))if(file.endsWith('dependencies.json')||file==='sc2-casc-targets.json'){
 const rows=JSON.parse((await fs.readFile('tools/'+file,'utf8')).replace(/^\uFEFF/,''));if(Array.isArray(rows))for(const r of rows)if(r.installFile&&r.sha256)dependencies.push(r);
}
await fs.writeFile(root+'/dependencies.json',JSON.stringify(dependencies));
await fs.writeFile(root+'/source-map.json',JSON.stringify({routes:[],models:['StimpackStartImpact','StimpackEndImpact'].map(id=>({modelDataId:id,assetPath:`Assets/Effects/Terran/${id}/${id}.m3`,scale:[1,1,1]}))}));
const catalog=JSON.parse(await fs.readFile('src/render/effects/source/catalog.json','utf8'));
if(!catalog.StimpackStartImpact||!catalog.StimpackEndImpact){const run=spawnSync(process.execPath,['tools/prepare-combat-effects.mjs','--append','--out='+root,'--dependencies='+root+'/dependencies.json'],{stdio:'inherit',windowsHide:true});assert.equal(run.status,0,'Original stim extraction failed');}
