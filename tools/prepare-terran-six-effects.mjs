import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const batch=JSON.parse(await fs.readFile('tools/terran-six-models.json','utf8'));
const profiles=JSON.parse(await fs.readFile('src/render/effects/source/catalog.json','utf8'));
const models=batch.filter(m=>m.id.startsWith('effect.')&&!profiles[m.modelDataId]).map(m=>({...m,scale:m.sourceScale?m.sourceScale.split(',').map(Number):[1,1,1]}));
if(models.length){
 const out='reports/local/terran-six-20261119/effects';await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/source-map.json',JSON.stringify({routes:[],models}));
 execFileSync(process.execPath,['tools/prepare-combat-effects.mjs','--out='+out,'--dependencies=tools/terran-six-dependencies.json','--append'],{stdio:'inherit'});
}
