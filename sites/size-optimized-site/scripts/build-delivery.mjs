import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const result=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
const mode=JSON.parse(fs.readFileSync('delivery/mode.json','utf8'));
const root=path.resolve('dist/client'),assets=path.join(root,'assets');
const legacy=new Set(JSON.parse(fs.readFileSync('delivery/legacy-bundles.json','utf8')));
for(const name of fs.readdirSync(assets))if(/^bundle-[a-z0-9-]+\.bin$/.test(name)&&(mode.phase==='r2'||!legacy.has(name))){
 const target=path.resolve(assets,name);if(!target.startsWith(assets+path.sep))throw Error('Invalid asset path');fs.unlinkSync(target);
}
if(mode.phase==='bridge')for(const name of fs.readdirSync('delivery/bridge'))fs.copyFileSync(path.join('delivery/bridge',name),path.join(root,name));
console.log('Delivery build:',mode.phase);
