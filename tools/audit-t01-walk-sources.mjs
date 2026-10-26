import fs from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {loadM3FromFile} from '../.cache/m3-converter/m3-loader.js';
import {M3_MODELS,EXPANSION_MODELS} from './m3-catalog.mjs';
import {MOTION_ACTORS} from './t01/motion-audio-plan.mjs';
import {loadAudioSources,AUDIO_SOURCE_PROFILES} from './t01/audio-source.mjs';
const db=await loadAudioSources(),root='assets/private/actor-source/',models=new Map(),rows=[];
for(const p of new Set(Object.values(AUDIO_SOURCE_PROFILES).flat())){
 const file=root+p+'ModelData.xml';if(!fs.existsSync(file))continue;
 const doc=new DOMParser().parseFromString(fs.readFileSync(file,'utf8'),'text/xml');
 models.set(p,Array.from(doc.documentElement.childNodes).filter(n=>n.nodeType===1));
}
for(const [key,[actorProfile,id]] of Object.entries(MOTION_ACTORS)){
 const a=db.actor(id,actorProfile),sourceDefinition=EXPANSION_MODELS.find(r=>r.id==='model.'+key.replace(':','.'));
 const profile=sourceDefinition?.definitionLayer==='starcoop'||sourceDefinition?.definition?.includes('starcoop')?'coop':actorProfile;
 const model=sourceDefinition?.modelDataId??a.fields.Model?.value??id,t=new Map();
 for(const p of AUDIO_SOURCE_PROFILES[profile])for(const n of models.get(p)??[]){const k=n.getAttribute('id');t.set(k,[...t.get(k)??[],{n,file:root+p+'ModelData.xml'}]);}
 const chain=[],events=[];function visit(id,seen=new Set()){
  if(seen.has(id))return;seen.add(id);const ns=t.get(id)??[],parent=ns.findLast(r=>r.n.hasAttribute('parent'))?.n.getAttribute('parent');if(parent)visit(parent,seen);
  for(const {n,file}of ns){chain.push({id,file});for(const e of Array.from(n.childNodes).filter(n=>n.nodeType===1&&n.tagName==='Events')){const row=Object.fromEntries(Array.from(e.childNodes).filter(n=>n.nodeType===1).map(n=>[n.tagName,n.getAttribute('value')]));if(/Walk|Run/.test(row.Anim??''))events.push({...row,model:id,file});}}
 }
 visit(model);let m3Id=key==='hellbat'?'model.hellion.hellbat':key==='viking-assault'?'model.viking.assault':'model.'+key.replace(':','.'),source=M3_MODELS.find(([id])=>id===m3Id)?.[1];if(key==='hero:purifier_flagship')source=M3_MODELS.find(([id])=>id==='model.elite.carrier.1')?.[1];
 const embedded=[];let clips=[];
 if(source&&fs.existsSync('assets/private/m3/'+source+'.m3')){const s=await loadM3FromFile('assets/private/m3/'+source+'.m3'),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
  clips=get(s.model.sequences).filter(a=>/Walk|Run/.test(str(a.name))).map(a=>({name:str(a.name),duration:(a.anim_ms_end-a.anim_ms_start)/1000}));
  for(const c of get(s.model.sequence_transformation_collections).filter(c=>/Walk|Run/.test(str(c.name))))for(const e of get(c.sdev))for(const[k,i]of get(e.keys).map((k,i)=>[k,i]))embedded.push({collection:str(c.name),time:get(e.frames)[i]/1000,name:str(k.name),payload:str(k.payload)});
 }
 rows.push({key,profile,id,model,source,walkSpeed:a.fields.WalkAnimMoveSpeed?.value,chain,events,embedded,clips});
}
fs.writeFileSync('.cache/t01-sound-recheck/walk-sources.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(({key,model,walkSpeed,events,embedded,clips})=>({key,model,walkSpeed,events:events.filter(e=>e.Type==='Sound'),embedded,clips})),null,2));
