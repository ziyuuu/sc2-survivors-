import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/zyuu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {PNG}=require('pngjs');
const root=new URL('art-r11/',import.meta.url),briefs=JSON.parse(await fs.readFile(new URL('briefs-r11.json',root),'utf8'));
const atlases=JSON.parse(await fs.readFile(new URL('atlas-inspections-r11.json',root),'utf8').catch(()=>'{}'));
const singles=JSON.parse(await fs.readFile(new URL('inspections-r11.json',root),'utf8').catch(()=>'{}'));
const entries={},plates={};
for(const record of Object.values(atlases)){
 plates[record.assetKey]={file:record.webp,width:record.width,height:record.height,sha256:record.webpSha256,png:record.file,pngSha256:record.sha256};
 for(const e of record.entries)entries[e.key]={...e,bodyWidth:e.kind==='ordinary'?220:300,width:record.width,height:record.height,assetKey:record.assetKey};
}
// Retain the larger calibration paintings where those were inspected in detail.
const preferred=['marine.png','hydralisk-v2.png','zealot-v2.png','marine.2-v2.png','carrier.png','carrier.1.png','carrier.2.png','carrier.3.png'];
for(const hero of briefs.assets.filter(a=>a.kind==='hero'))preferred.push(hero.key+'.png');
preferred.push('niadra-v2.png','stukov-v2.png','purifier_flagship-v2.png');
for(const file of preferred){
 const r=singles[file];if(!r)continue;const key=r.key;
 plates[key+'-single']={file:r.webp,width:r.width,height:r.height,sha256:r.webpSha256,png:r.file,pngSha256:r.sha256};
 entries[key]={key,race:r.race,kind:r.kind,family:briefs.assets.find(a=>a.key===key)?.family,width:r.width,height:r.height,assetKey:key+'-single',sceneBounds:r.sceneBounds,bodyBounds:r.bodyBounds,bodyHeight:224,bodyWidth:r.kind==='elite'?300:r.kind==='hero'?310:220,air:['yamato_battlecruiser','hots_leviathan','purifier_flagship','carrier','carrier.1','carrier.2','carrier.3'].includes(key),issues:r.issues,review:r.review};
}
const required=briefs.assets.map(a=>a.key),missing=required.filter(k=>!entries[k]);
if(missing.length&&!process.argv.includes('--partial'))throw new Error('Unfinished painted identities: '+missing.join(', '));
// Ship only the plates consumed by the selected entries. Older PNG/WebP
// revisions stay on disk as review evidence; no artwork is removed.
const usedPlates=new Set(Object.values(entries).map(e=>e.assetKey));
for(const key of Object.keys(plates))if(!usedPlates.has(key))delete plates[key];
// Continue each scene's own sky light behind transparent distant corners.
// The painted landscape and alpha subject remain unchanged.
const pixels=new Map();
for(const [key,p] of Object.entries(plates))pixels.set(key,PNG.sync.read(await fs.readFile(new URL(p.png,root))));
const median=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)]??60;
const hex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
for(const e of Object.values(entries)){
 const p=pixels.get(e.assetKey),r=e.sceneBounds,colors=[[],[],[]];
 for(let y=2;y<r.height*.45;y+=3)for(let x=r.x+3;x<r.x+r.width-3;x+=4){
  const i=(y*p.width+x)*4,d=p.data,l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
  if(d[i+3]>230&&l>28&&l<215)for(let c=0;c<3;c++)colors[c].push(d[i+c]);
 }
 const sky=colors.map(median);
 e.skyTop=hex(sky);e.skyBottom=hex(sky.map(v=>v*.7));
 e.atmosphere=hex(sky.map(v=>Math.min(220,v+36)));
}
const reviews=JSON.parse(await fs.readFile(new URL('reviews-r11.json',root),'utf8').catch(()=>'{}'));
const unchecked=[];
for(const e of Object.values(entries)){
 const p=plates[e.assetKey],review=reviews.plates?.[e.assetKey];
 if(!review||review.pngSha256!==p.pngSha256||review.webpSha256!==p.sha256){unchecked.push(e.key);continue;}
 e.review=review.status;e.reviewNote=review.note;
}
if(unchecked.length&&!process.argv.includes('--partial'))throw new Error('Artwork lacks current explicit visual review: '+unchecked.join(', '));
const result={revision:'r11',status:missing.length?'partial-internal-review':'all-required-painted-identities-present',counts:{identities:Object.keys(entries).length,ordinary:Object.values(entries).filter(e=>e.kind==='ordinary').length,elite:Object.values(entries).filter(e=>e.kind==='elite').length,additionalHeroes:Object.values(entries).filter(e=>e.kind==='hero').length,plates:Object.keys(plates).length},missing,plates,entries,method:'Built-in image_gen, new text prompts and edits of these new generated plates only. Family atlases and independent paintings contain separately painted scenes/body layers. Frontend crops explicit regions and translates same-size alpha bodies for real quantities. Original full-resolution PNGs are retained; WebP encoding preserves dimensions. Geometry diagnostics are not human art acceptance.'};
await fs.writeFile(new URL('manifest-r11.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,counts:result.counts,missing:missing.length}));
