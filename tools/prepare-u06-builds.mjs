import fs from 'node:fs';
const root='reports/local/u06-ui-minimal-20261023',old='reports/local/d05-checkpoint-20261023';
for(const name of ['build-web.mjs','assemble-offline.mjs','verify-offline.mts','serve.mjs']){let s=fs.readFileSync(old+'/'+name,'utf8').replaceAll('D05','U06').replaceAll('d05-checkpoint-20261023','u06-ui-minimal-20261023').replaceAll('equipment checkpoint persistence','consistent minimal UI').replaceAll('4489','4493');fs.writeFileSync(root+'/'+name,s);}
