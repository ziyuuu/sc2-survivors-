import {spawnSync} from 'node:child_process';
for(const file of ['qa-expansion-v15.mjs','qa-controls-v15.mjs']){const p=spawnSync(process.execPath,['tools/'+file],{stdio:'inherit'});if(p.status!==0)process.exit(p.status??1);}
