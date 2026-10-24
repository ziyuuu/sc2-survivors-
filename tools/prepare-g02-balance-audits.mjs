import fs from 'node:fs/promises';
for(const kind of ['offense','channels','specialists','battles','stacking']){
 const input='tools/audit-g02-'+kind+'.mts';let s=await fs.readFile(input,'utf8');s=s.replaceAll("'./lib/g02-fixtures.mts'","'./lib/g02-balance-fixtures.mts'").replaceAll('reports/local/g02-20261022','reports/local/g02-balance-20261022');
 if(kind==='channels')s=s.replace('channels-r4.json','channels-r1.json');if(kind==='specialists')s=s.replace('specialists-r3.json','specialists-r1.json');if(kind==='battles')s=s.replace('battles-r2.json','battles-r1.json');
 await fs.writeFile('tools/audit-g02-balance-'+kind+'.mts',s);
}
console.log('Prepared five same-scenario audits against current native prices.');
