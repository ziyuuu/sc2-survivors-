import fs from 'node:fs/promises';
const base='reports/local/t01-20261024',rows=JSON.parse(await fs.readFile(base+'/actions-r18-selection.json','utf8'));
for(const row of rows){
 row.times=[...new Set([...row.times,...Array.from({length:13},(_,i)=>(i+6)/60)])].sort((a,b)=>a-b);
 row.inspectProjectiles=true;
 if(!row.id.includes('hero.stukov')){row.expectedMeshGoneAt=3.6;row.endingModels=['NeedleSpinesWeapon'];}
 // Full original viewport remains captured; the lower zoom keeps the airborne
 // target and the complete flight inside the scene for every control.
 row.framing={zoom:1.15,pitch:60};
}
await fs.writeFile(base+'/actions-r19-selection.json',JSON.stringify(rows,null,2),{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,firstShotSamples:13}));
