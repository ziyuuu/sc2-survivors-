/** Package the locally compiled Acropolis pathing and original terrain blend masks. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeDds,rgbaToPng} from './dds-png.mjs';
import {convertMaterialPixels} from './m3-materials.mjs';

const data=JSON.parse(await fs.readFile('assets/private/maps/acropolis-runtime.json','utf8'));
const folder='public/assets/map-acropolis';await fs.mkdir(folder,{recursive:true});
const manifest=[],hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function asset(id,kind,name,bytes){const packedFile=folder+'/'+name;await fs.writeFile(packedFile,bytes);manifest.push({id,kind,packedFile,required:true,source:data.source.source,sourceSha256:data.source.sha256,sha256:hash(bytes)});}
await asset('map.acropolis','map-data','acropolis.json',Buffer.from(JSON.stringify(data)));
const extracted=JSON.parse(await fs.readFile('assets/private/maps/acropolis-extracted.json','utf8'));
for(const role of ['diffuse','normal']){const images=[];for(const layer of extracted.textures.slice(0,8)){const name=layer[role].replaceAll('\\','/').split('/').at(-1).toLowerCase(),decoded=decodeDds(await fs.readFile('assets/private/dds/'+name));images.push(role==='normal'?convertMaterialPixels(decoded,{normal:true}):decoded);}
 const side=Math.max(...images.map(i=>Math.max(i.width,i.height))),width=side*2,height=side*4,rgba=Buffer.alloc(width*height*4);
 for(let layer=0;layer<8;layer++){const im=images[layer];for(let y=0;y<side;y++)for(let x=0;x<side;x++){const src=(Math.floor(y/side*im.height)*im.width+Math.floor(x/side*im.width))*4,dst=((Math.floor(layer/2)*side+y)*width+layer%2*side+x)*4;im.rgba.copy(rgba,dst,src,src+4);}}
 await asset('map.acropolis.terrain.'+role,'texture','terrain-'+role+'.png',rgbaToPng({width,height,rgba}));
}
const mask=await fs.readFile('assets/private/maps/AcropolisLE/t3TextureMasks');
if(mask.subarray(0,4).toString()!=='MASK'||mask.readUInt32LE(4)!==102)throw Error('Unsupported Acropolis terrain mask');
const mw=mask.readUInt32LE(12),mh=mask.readUInt32LE(16),tx=mw/64,layerBytes=mw*mh/2;if(mask.length!==64+8*layerBytes)throw Error('Truncated Acropolis mask');
for(let group=0;group<2;group++){const rgba=Buffer.alloc(mw*mh*4);for(let layer=0;layer<4;layer++)for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const offset=64+(group*4+layer)*layerBytes+(Math.floor(y/64)*tx+Math.floor(x/64))*2048+(y%64)*32+Math.floor((x%64)/2),v=(mask[offset]>>(x%2?0:4))&15;rgba[(y*mw+x)*4+layer]=v*17;}await asset('map.acropolis.terrain.mask'+group,'texture','mask'+group+'.png',rgbaToPng({width:mw,height:mh,rgba}));}
await fs.writeFile('assets/private/acropolis-map-pack.json',JSON.stringify({manifest,terrainTextures:'original',reusedMapModels:16,missingDecorativePlacements:data.missingDecorationCount??0},null,2));
console.log(JSON.stringify({map:data.source.name,assets:manifest.length,walkable:data.opening.filter(Boolean).length,missingDecorativePlacements:data.missingDecorationCount??0}));
