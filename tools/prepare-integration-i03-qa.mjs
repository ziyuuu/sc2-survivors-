import fs from 'node:fs/promises';
const previous='D:/星际/reports/local/integration-i02-20261022',base='D:/星际/reports/local/integration-i03-20261022';
for(const [from,to]of [['build-web.mjs','build-web.mjs'],['serve.mjs','serve.mjs'],['assemble-offline-r2.mjs','assemble-offline.mjs'],['verify-offline-r2.mts','verify-offline.mts'],['qa-production.mjs','qa-production.mjs'],['qa-touch.mjs','qa-touch.mjs']]){
 let s=await fs.readFile(previous+'/'+from,'utf8');s=s.replaceAll('I02','I03').replaceAll('integration-i02-20261022','integration-i03-20261022').replaceAll('4482','4483').replaceAll('-r2','-r1').replaceAll('local I03 settlement fixes','local I03 reachability and effect fixes');
 // The unchanged shared asset donor belongs to I01 r2, not the new version.
 s=s.replaceAll('integration-i01-20261022/offline-lab-r1.html','integration-i01-20261022/offline-lab-r2.html');
 await fs.writeFile(base+'/'+to,s);
}
console.log('I03 versioned Web/offline builders and native mouse/touch QA prepared.');
