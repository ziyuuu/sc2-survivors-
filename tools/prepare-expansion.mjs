import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const run=(cmd,args)=>{const p=spawnSync(cmd,args,{stdio:'inherit'});if(p.status!==0)throw Error(cmd+' failed; see docs/ASSET_DOWNLOAD_REQUIRED.md');};
run('python',['tools/resolve-expansion-models.py']);const lock=JSON.parse(await fs.readFile('tools/sc2-casc-lock.json','utf8'));let installed=false;try{installed=(await fs.readdir('.cache/casclib-'+lock.cascRevision)).some(f=>/^CascLib-.*\.dll$/.test(f));}catch{}
if(!installed)run('pwsh',['-NoProfile','-File','tools/fetch-sc2-casc.ps1']);
run('pwsh',['-NoProfile','-File','tools/fetch-expansion-casc.ps1']);const models=JSON.parse(await fs.readFile('tools/expansion-models.json','utf8')),effects=JSON.parse(await fs.readFile('tools/expansion-effects.json','utf8'));
run(process.execPath,['tools/import-m3-pack.mjs',...models.map(m=>m.id),'model.projectile.marauder','model.projectile.hydralisk',...effects.map(m=>m.id)]);
run(process.execPath,['tools/prepare-expansion-assets.mjs']);run(process.execPath,['tools/prepare-assets.mjs']);
