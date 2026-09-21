import {decodeDds,rgbaToPng} from './dds-png.mjs';
// SC2 tangent normals store X in alpha and inverted Y in green.
// Format reference: SC2Mapster/m3addon shared.py createNormalMapNode.
export function convertMaterialPixels(image,{normal=false,channel=0}={}){
 const rgba=Buffer.from(image.rgba);
 for(let i=0;i<rgba.length;i+=4){
  if(normal){let x=rgba[i+3]/127.5-1,y=1-rgba[i+1]/127.5,z=Math.sqrt(Math.max(0,1-x*x-y*y));const length=Math.hypot(x,y,z)||1;
   rgba[i]=Math.round((x/length+1)*127.5);rgba[i+1]=Math.round((y/length+1)*127.5);rgba[i+2]=Math.round((z/length+1)*127.5);rgba[i+3]=255;
  }else if(channel>=2&&channel<=5){const value=rgba[i+[3,0,1,2][channel-2]];rgba[i]=rgba[i+1]=rgba[i+2]=value;rgba[i+3]=255;}
 }
 return {width:image.width,height:image.height,rgba};
}
export function materialDdsToPng(bytes,options){return rgbaToPng(convertMaterialPixels(decodeDds(bytes),options));}
export function materialSources(sections){
 const text=ref=>{const chars=sections.getSectionByReference(ref)?.content;return chars?String.fromCharCode(...chars).replace(/\0/g,''):'';};
 return new Map((sections.getSectionByReference(sections.model.materials_standard)?.content??[]).map(mat=>{
  const layers={};for(const [role,key] of Object.entries({diffuse:'layer_diff',normal:'layer_norm',specular:'layer_spec',emissive:'layer_emis1'})){
   const l=sections.getSectionByReference(mat[key])?.content?.[0],filename=l?text(l.color_bitmap):'';
   if(filename)layers[role]={filename:filename.replaceAll('\\','/').split('/').at(-1),channel:l.color_channels??0,uv:l.uv_source??0,multiplier:l.color_multiply?.default??1};
  }
  return [text(mat.name),{layers,specularity:mat.specularity??20,emissiveStrength:mat.hdr_emis??1}];
 }));
}
