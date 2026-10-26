import fs from 'node:fs';
import {loadM3FromFile} from '../.cache/m3-converter/m3-loader.js';
import {localSourceFile} from './local-source-cache.mjs';
import {M3_MODELS} from './m3-catalog.mjs';
const rows=[];
for(const [id,name]of M3_MODELS.filter(([id])=>/^model\.(marine|tank|hellion|hellbat|thor|viking|zergling|zealot|ultralisk)(\.|$)/.test(id)&&!id.endsWith('.death'))){
 const file=localSourceFile('assets/private/m3/'+name+'.m3');if(!fs.existsSync(file))continue;
 const s=await loadM3FromFile(file),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 const sequences=get(s.model.sequences).map(a=>({name:str(a.name),start:a.anim_ms_start,end:a.anim_ms_end}));
 const events=get(s.model.sequence_transformation_collections).map(c=>({collection:str(c.name),events:get(c.sdev).flatMap(e=>get(e.keys).map((k,i)=>({at:get(e.frames)[i],name:str(k.name),payload:str(k.payload)})))})).filter(c=>c.events.length);
 rows.push({id,file,sequences,events});
}
fs.writeFileSync('.cache/t01-motion-feedback/model-events.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({id:r.id,events:r.events.filter(e=>/Walk|Morph|Stand Work/.test(e.collection))})),null,2));
