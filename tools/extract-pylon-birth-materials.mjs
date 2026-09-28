import fs from 'node:fs';import crypto from 'node:crypto';
import {loadM3FromFile} from '../.cache/m3-converter/m3-loader.js';
const file='assets/private/m3/pylonwarpin.m3',s=await loadM3FromFile(file),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
const seq=get(s.model.sequences),groups=get(s.model.sequence_transformation_groups),collections=get(s.model.sequence_transformation_collections),index=seq.findIndex(a=>str(a.name)==='Stand Build End');
if(index<0)throw Error('Original birth end missing');
const fields=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'],tracks=new Map();
for(const i of get(groups[index].stc_indices)){const c=collections[i],ids=get(c.anim_ids),refs=get(c.anim_refs);ids.forEach((id,j)=>{const ref=refs[j],entry=get(c[fields[ref>>>16]])[ref&65535];if(entry)tracks.set(id,entry);});}
const plain=v=>typeof v==='number'?v:{x:v.x,y:v.y};
const curve=ref=>{const entry=tracks.get(ref.header.id);return {sourceAnimationId:ref.header.id,interpolation:ref.header.interpolation,default:plain(ref.default),times:entry?get(entry.frames).map(t=>t/1000):[],values:entry?get(entry.keys).map(plain):[]};};
const materials=get(s.model.materials_standard).map(m=>{const emissive=get(m.layer_emis1)[0],alpha=get(m.layer_alpha1)[0];return {name:str(m.name),hdr:m.hdr_emis,blend:m.blend_mode,emissive:{multiplier:curve(emissive.color_multiply),offset:curve(emissive.uv_offset)},alpha:str(alpha.color_bitmap)?{multiplier:curve(alpha.color_multiply),offset:curve(alpha.uv_offset)}:null};});
const data={source:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sequence:'Stand Build End',duration:6,materials};
fs.writeFileSync('src/render/units/pylon-birth-materials.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data));
