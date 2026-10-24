import fs from 'node:fs/promises';
const previous='reports/local/u06-confirmed-20261023',base='reports/local/v01-20261024';
for(const [source,destination]of [['build-web.mjs','build-final-web.mjs'],['assemble-offline.mjs','assemble-final-offline.mjs'],['verify-offline.mts','verify-final-offline.mts']]){
 let code=await fs.readFile(previous+'/'+source,'utf8');
 code=code.replaceAll('U06_VERSION','V01_VERSION').replaceAll('U06_OFFLINE_MODE','V01_OFFLINE_MODE').replaceAll('main (local U06 consistent minimal UI)','main (local V01 correctness regression)').replaceAll("version=process.env.V01_VERSION??'r1'","version=process.env.V01_VERSION??'final-r1'").replaceAll('D:/星际/'+previous,'D:/星际/'+base).replaceAll("mode=process.env.V01_OFFLINE_MODE??'lab'","mode=process.env.V01_OFFLINE_MODE??'game'");
 await fs.writeFile(base+'/'+destination,code);
}
console.log('Prepared frozen final production Web/offline build and verification tools.');
