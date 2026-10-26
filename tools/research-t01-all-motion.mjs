// Source research only. Does not change runtime data, audio routes or builds.
import fs from 'node:fs';
import path from 'node:path';
import {DOMParser} from '@xmldom/xmldom';
import {loadM3FromFile} from '../.cache/m3-converter/m3-loader.js';
import {M3_MODELS,EXPANSION_MODELS} from './m3-catalog.mjs';
const out='.cache/t01-all-motion';fs.mkdirSync(out,{recursive:true});
const walk=p=>fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]):[];
const children=n=>Array.from(n.childNodes??[]).filter(n=>n.nodeType===1);
const props=n=>Object.fromEntries(children(n).map(c=>[c.tagName,c.getAttribute('value')]));
const models=new Map(),sounds=new Map(),movementActors=[],allMotionModels=[];
const roots=['assets/private/actor-source',out+'/data'];
const files=roots.flatMap(walk).filter(p=>/(?:Model|Sound|Actor)Data\.xml$/i.test(p));
for(const file of files){
 const doc=new DOMParser().parseFromString(fs.readFileSync(file,'utf8'),'text/xml');
 for(const node of children(doc.documentElement)){
  const id=node.getAttribute('id'),parent=node.getAttribute('parent');if(!id)continue;
  if(/ModelData\.xml$/i.test(file)){
   const events=children(node).filter(n=>n.tagName==='Events').map(props);
   const row={id,parent,file,modelFile:children(node).find(n=>n.tagName==='Model')?.getAttribute('value'),events:events.filter(e=>/Walk|Run|Move|Turn|Fly/i.test(e.Anim??'')&&(e.Type==='Sound'||/foot|sound/i.test(e.Name??'')))};
   models.set(id,[...models.get(id)??[],row]);if(row.events.length)allMotionModels.push(row);
  }
  if(/SoundData\.xml$/i.test(file)){
   sounds.set(id,[...sounds.get(id)??[],{id,parent,file,xml:node.toString()}]);
  }
  if(/ActorData\.xml$/i.test(file)){
   const bindings=children(node).filter(n=>(n.tagName==='SoundArray'&&/Movement/.test(n.getAttribute('index')))||(n.tagName==='On'&&/Footstep|Movement|Walk|MoveStart|MoveStop|UnitMovement/i.test(n.toString())&&/Sound|Create/i.test(n.toString()))).map(n=>n.toString());
   if(bindings.length)movementActors.push({id,parent,file,bindings});
  }
 }
}
const used=[...new Map(M3_MODELS.map(([id,name])=>[id,{id,name}])).values()],cache=new Map(),rows=[];
async function embedded(name){
 if(cache.has(name))return cache.get(name);const file='assets/private/m3/'+name+'.m3';
 if(!fs.existsSync(file))return {file,missing:true};
 const s=await loadM3FromFile(file),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 const clips=get(s.model.sequences).filter(q=>/Walk|Run|Move|Fly|Turn/i.test(str(q.name))).map(q=>({name:str(q.name),duration:(q.anim_ms_end-q.anim_ms_start)/1000}));
 const events=[];
 for(const c of get(s.model.sequence_transformation_collections).filter(c=>/Walk|Run|Move|Fly|Turn/i.test(str(c.name))))for(const e of get(c.sdev))for(const[k,i]of get(e.keys).map((k,i)=>[k,i]))if(str(k.name)!=='Evt_SeqEnd')events.push({collection:str(c.name),time:get(e.frames)[i]/1000,name:str(k.name),payload:str(k.payload)});
 const r={file,clips,events};cache.set(name,r);return r;
}
for(const item of used){
 const def=EXPANSION_MODELS.find(d=>d.id===item.id),ids=new Set(def?.modelDataId?[def.modelDataId]:[]);
 for(const [id,defs]of models)if(defs.some(d=>d.modelFile&&path.basename(d.modelFile.replaceAll('\\','/')).toLowerCase()===item.name.toLowerCase()+'.m3'))ids.add(id);
 const chain=[],events=[],seen=new Set();function visit(id){if(seen.has(id))return;seen.add(id);for(const d of models.get(id)??[]){if(d.parent)visit(d.parent);chain.push({id,file:d.file});for(const e of d.events)events.push({...e,model:id,file:d.file});}}for(const id of ids)visit(id);
 const model=await embedded(item.name);rows.push({...item,modelIds:[...ids],chain,xmlEvents:events,...model});
}
const knownAudio=JSON.parse(fs.readFileSync('src/data/combat-audio.json','utf8'));
const candidates=rows.filter(r=>r.xmlEvents.length||r.events?.length);
const result={status:'source-research-only',files:files.length,models:used.length,uniqueModelFiles:cache.size,rows,candidates,movementActors,allMotionModels,sourceBanks:[...sounds].filter(([id])=>/foot|movement|walk|movestart|movestop|engine|tread|track/i.test(id)).map(([id,defs])=>({id,defs})),runtimeTopLevelKeys:Object.keys(knownAudio)};
fs.writeFileSync(out+'/research.json',JSON.stringify(result,null,2));
const cinematic=[];
for(const [id,defs]of sounds)for(const d of defs){const n=new DOMParser().parseFromString(d.xml,'text/xml').documentElement;
 const assets=Array.from(n.getElementsByTagName('AssetArray')).map(a=>a.getAttribute('File')||a.getElementsByTagName('File')[0]?.getAttribute('value')).filter(Boolean);
 if(assets.some(a=>/InteriorFootstep|fol_fs_stukov|fol_fs_kerrigan/i.test(a)))cinematic.push({id,file:d.file,assets});
}
fs.writeFileSync(out+'/cinematic-alternatives.json',JSON.stringify(cinematic,null,2));
console.log(JSON.stringify({files:files.length,models:used.length,uniqueModelFiles:cache.size,movementActors:movementActors.length,candidates:candidates.map(r=>({id:r.id,name:r.name,xmlSounds:[...new Set(r.xmlEvents.map(e=>e.Payload??e.Name))],embedded:r.events}))},null,2));
