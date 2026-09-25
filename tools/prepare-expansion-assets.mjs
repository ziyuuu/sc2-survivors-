import {localSourceFile} from './local-source-cache.mjs';
import fs from 'node:fs/promises';
import {ddsToPng} from './dds-png.mjs';
import {cascProvenance} from './casc-provenance.mjs';
const icons=[...JSON.parse(await fs.readFile(new URL('./expansion-icons.json',import.meta.url),'utf8')),...JSON.parse(await fs.readFile(new URL('./three-race-icons.json',import.meta.url),'utf8'))],manifest=[];
for(const a of icons){const input='assets/private/dds/'+a.name+'.dds',packedFile='public/assets/icons/'+a.id+'.png';try{const bytes=await fs.readFile(localSourceFile(input)),provenance=cascProvenance(input,bytes);if(!provenance.sourceSha256)throw Error('Unverified original icon');await fs.writeFile(packedFile,ddsToPng(bytes));manifest.push({id:a.id,kind:'icon',required:true,packedFile,...provenance});}catch(e){manifest.push({id:a.id,kind:'icon',required:true,packedFile,error:String(e)});}}
await fs.writeFile('assets/private/expansion-ui.json',JSON.stringify({manifest},null,2));
