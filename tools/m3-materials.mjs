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
export function materialEntries(sections,reference=sections.model.materials_standard){
 const text=ref=>{const chars=sections.getSectionByReference(ref)?.content;return chars?String.fromCharCode(...chars).replace(/\0/g,''):'';};
 return (sections.getSectionByReference(reference)?.content??[]).map((mat,index)=>{
  const layers={};for(const [role,key] of Object.entries({diffuse:'layer_diff',normal:'layer_norm',specular:'layer_spec',emissive:'layer_emis1',emissive2:'layer_emis2',alpha:'layer_alpha1',alpha2:'layer_alpha2'})){
   const l=sections.getSectionByReference(mat[key])?.content?.[0];if(!l)continue;const filename=text(l.color_bitmap);
   layers[role]={filename:filename.replaceAll('\\','/').split('/').at(-1),channel:l.color_channels??0,uv:l.uv_source??0,multiplier:l.color_multiply?.default??1,add:l.color_add?.default??0,flags:l.flags??0,color:l.color_value?.default,animated:!!l.color_multiply?.header?.flags};
  }
  return {index,name:text(mat.name),layers,flags:mat.flags,blend:mat.blend_mode??0,alphaTest:(mat.alpha_test_threshold??0)/255,specularity:mat.specularity??20,emissiveStrength:mat.hdr_emis??1};
 });
}
export function materialSources(sections){return new Map(materialEntries(sections).map(m=>[m.name,m]));}
/** Diffuse alpha in an opaque RGBA M3 layer is the team-color mask, not opacity. */
export function applyTeamColor(image,color){const rgba=Buffer.from(image.rgba);for(let i=0;i<rgba.length;i+=4){const a=rgba[i+3]/255;for(let k=0;k<3;k++)rgba[i+k]=Math.round(rgba[i+k]*a+color[k]*(1-a));rgba[i+3]=255;}return {...image,rgba};}
export function applyOpacity(image,masks){const rgba=Buffer.from(image.rgba);for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){let a=1;for(const {image:m,multiplier=1,add=0,invert=false} of masks){const px=Math.min(m.width-1,Math.floor(x*m.width/image.width)),py=Math.min(m.height-1,Math.floor(y*m.height/image.height));let v=m.rgba[(py*m.width+px)*4]/255;if(invert)v=1-v;a*=Math.max(0,Math.min(1,v*multiplier+add));}rgba[(y*image.width+x)*4+3]=Math.round(a*255);}return {...image,rgba};}
