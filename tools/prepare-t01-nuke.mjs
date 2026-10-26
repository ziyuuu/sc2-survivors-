// Add the pinned GhostNukeExplode source through the existing M3 pipeline.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='.cache/t01-nuke-beams',sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:true});
if(!await fs.stat(root+'/baseline.json').catch(()=>null)){
 const files=[];
 async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else files.push({file:p,sha256:sha(await fs.readFile(p))});}}
 await scan('src');await scan('test');
 await fs.writeFile(root+'/baseline.json',JSON.stringify({files},null,2));
}
const dependencies=[];
for(const file of await fs.readdir('tools'))if(file.endsWith('dependencies.json')||file==='sc2-casc-targets.json'){
 const rows=JSON.parse((await fs.readFile('tools/'+file,'utf8')).replace(/^\uFEFF/,''));
 if(Array.isArray(rows))for(const r of rows)if(r.installFile&&r.sha256)dependencies.push(r);
}
await fs.writeFile(root+'/dependencies.json',JSON.stringify(dependencies));
await fs.writeFile(root+'/source-map.json',JSON.stringify({routes:[],models:[{modelDataId:'GhostNukeExplode',assetPath:'Assets/Effects/Terran/Nuke/Nuke.m3',scale:[1,1,1]}]}));
const catalog=JSON.parse(await fs.readFile('src/render/effects/source/catalog.json','utf8'));
if(!catalog.GhostNukeExplode){const run=spawnSync(process.execPath,['tools/prepare-combat-effects.mjs','--append','--out='+root,'--dependencies='+root+'/dependencies.json'],{stdio:'inherit',windowsHide:true});assert.equal(run.status,0,'Original nuke extraction failed');}
const refraction=spawnSync(process.execPath,['tools/prepare-combat-refraction.mjs','--models=GhostNukeExplode','--out='+root],{stdio:'inherit',windowsHide:true});assert.equal(refraction.status,0,'Original nuke refraction extraction failed');
