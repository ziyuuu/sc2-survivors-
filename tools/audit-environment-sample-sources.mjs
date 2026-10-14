import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const parser=await import(pathToFileURL(path.resolve('.cache/visual-restoration-reader/m3-loader.js'))),out='reports/local/mvp5-environment-samples-20261013';fs.mkdirSync(out,{recursive:true});
const audit=JSON.parse(fs.readFileSync('reports/local/mvp5-environment-audit-20261013/audit.json')),models=[];
for(const m of audit.models.filter(m=>m.selected)){
 const s=await parser.loadM3FromFile(path.resolve(m.original.path)),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 const refs=get(s.model.material_references),divisions=get(s.model.divisions),batches=divisions.flatMap(d=>get(d.batches));
 const materials=get(s.model.materials_standard).map((mat,index)=>({index,name:str(mat.name),blend:mat.blend_mode,flags:mat.flags,meshBatches:batches.filter(b=>{const r=refs[b.material_reference_index];return r?.type===1&&r.material_index===index}).length,layers:Object.fromEntries(Object.entries(mat).filter(([k])=>k.startsWith('layer_')).map(([k,r])=>{const l=get(r)[0];return[k,l?{filename:str(l.color_bitmap),uv:l.uv_source,channel:l.color_channels,multiply:l.color_multiply,add:l.color_add,flags:l.flags,color:l.color_value}:null]}))}));
 const other={};for(const [key,value]of Object.entries(s.model))if(/particle|projection|ribbon|material/.test(key))other[key]=get(value).map(x=>Object.fromEntries(Object.entries(x).filter(([k])=>/material|texture|layer|flag|name/.test(k))));
 models.push({id:m.id,original:m.original,refs,batches,materials,other});
}
fs.writeFileSync(out+'/source-structure.json',JSON.stringify({models},(k,v)=>k==='desc'?undefined:v,2));
console.log(JSON.stringify(models.filter(m=>/cliffnatural|cargotruck|cranepart|medium_rock_group|miningbot/.test(m.id)).map(m=>({id:m.id,materials:m.materials.map(t=>({name:t.name,blend:t.blend,meshBatches:t.meshBatches,layers:Object.fromEntries(Object.entries(t.layers).filter(([k,v])=>v?.filename).map(([k,v])=>[k,v.filename]))}))})),null,2));
