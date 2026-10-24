import fs from 'node:fs/promises';
const base='D:/星际/reports/local/integration-i01-20261022';
let p=await fs.readFile(base+'/qa-production.mjs','utf8');p=p.replaceAll('qa-production-r1','qa-production-r2').replaceAll('4480','4481').replaceAll('offline-game-r1','offline-game-r2').replace("[['web','zerg'],['web','protoss'],['offline','terran']]","[['web','terran'],['offline','terran']]");await fs.writeFile(base+'/qa-production-r2.mjs',p);
let r=await fs.readFile(base+'/qa-recovery.mjs','utf8');r=r.replaceAll('qa-recovery-r1','qa-recovery-r2').replaceAll('4480','4481');await fs.writeFile(base+'/qa-recovery-r2.mjs',r);
for(const mode of ['desktop','touch']){const f=base+'/qa-offline-'+mode+'-r2/result.json';try{await fs.copyFile(f,base+'/qa-offline-'+mode+'-r2/missing-build-result.json');}catch(e){if(e.code!=='ENOENT')throw e;}}
