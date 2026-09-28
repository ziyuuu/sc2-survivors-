import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadM3FromFile} from '../.cache/m3-converter/m3-loader.js';
import {localSourceFile} from './local-source-cache.mjs';
const dossier=JSON.parse(fs.readFileSync('reports/local/closeout-source-audit.json','utf8'));
const building=JSON.parse(fs.readFileSync('tools/closeout-building-models.json','utf8'));
const targets=[...dossier.models.filter(m=>m.originalModel).map(m=>({id:m.runtimeId,path:m.originalModel})),...building.map(m=>({id:m.id,path:m.assetPath}))];
const out=[];
for(const target of targets){
 const file=localSourceFile('assets/private/m3/'+target.path.replaceAll('\\','/').split('/').at(-1).toLowerCase());
 try{
  const bytes=fs.readFileSync(file),s=await loadM3FromFile(file),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
  const sequences=get(s.model.sequences).map(a=>({name:str(a.name),startMs:a.anim_ms_start,endMs:a.anim_ms_end,flags:a.flags}));
  const events=get(s.model.sequence_transformation_collections).map(c=>({collection:str(c.name),events:get(c.sdev).flatMap(e=>get(e.keys).map((k,i)=>({timeMs:get(e.frames)[i],name:str(k.name),payload:str(k.payload),bone:k.bone})))})).filter(c=>c.events.length);
  out.push({id:target.id,file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sequences,events,attachments:get(s.model.attachment_points).map(a=>({name:str(a.name),bone:a.bone}))});
 }catch(error){out.push({id:target.id,file,error:String(error)});}
}
const report='reports/local/closeout-m3-events.json';fs.writeFileSync(report,JSON.stringify(out,null,2));
console.log(JSON.stringify({count:out.length,errors:out.filter(x=>x.error),bytes:fs.statSync(report).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(report)).digest('hex')}));
