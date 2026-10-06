import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/zyuu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {PNG}=require('pngjs'),sharp=require('sharp');
const root=new URL('art-r11/',import.meta.url),briefs=JSON.parse(await fs.readFile(new URL('briefs-r11.json',root),'utf8'));
const previous=JSON.parse(await fs.readFile(new URL('inspections-r11.json',root),'utf8').catch(()=>'{}'));
const requested=process.argv.slice(2),files=(await fs.readdir(root)).filter(f=>f.endsWith('.png')&&(!requested.length||requested.includes(f)));
for(const name of files){
 const raw=await fs.readFile(new URL(name,root)),png=PNG.sync.read(raw),{width:w,height:h,data}=png;
 const alpha=(x,y)=>data[(y*w+x)*4+3];
 let sceneHeight=Math.round(h*.35),gap=0;
 // Sky/space corners may legitimately be transparent. Find the actual
 // horizontal empty separator rather than treating that corner as a seam.
 for(let y=Math.floor(h*.2);y<h*.62;y++){
  let covered=0;for(let s=0;s<40;s++)covered+=alpha(Math.round((w-1)*s/39),y)>200?1:0;
  if(covered<2){gap++;if(gap===5){sceneHeight=y-4;break;}}
  else gap=0;
 }
 let minX=w,minY=h,maxX=-1,maxY=-1,opaque=0,clear=0;
 for(let y=sceneHeight+2;y<h;y++)for(let x=0;x<w;x++){
  const a=alpha(x,y);if(a>200){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);opaque++;}if(a===0)clear++;
 }
 const bounds={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},issues=[];
 if(sceneHeight<h*.2||sceneHeight>h*.62)issues.push('background divider is not a usable separate landscape');
 if(minY<=sceneHeight+7)issues.push('subject may overlap/touch landscape; inspect complete head and weapons');
 if(clear/(w*(h-sceneHeight))<.25)issues.push('lower cutout lacks sufficient genuine transparency');
 if(minX<6||maxX>w-7||maxY>h-7)issues.push('effect/body approaches edge; inspect actual subject crop');
 const key=name.replace(/(?:-v\d+)?\.png$/,''),brief=briefs.assets.find(b=>b.key===key);
 const webpName=name.replace('.png','.webp');
 // Format encoding only: same dimensions, no resize, retouch or art alteration.
 const webp=await sharp(raw).webp({quality:94,alphaQuality:100,effort:5}).toBuffer();
 await fs.writeFile(new URL(webpName,root),webp);
 previous[name]={key,file:name,webp:webpName,width:w,height:h,sceneBounds:{x:0,y:0,width:w,height:sceneHeight},bodyBounds:bounds,clearLowerFraction:clear/(w*(h-sceneHeight)),opaqueLowerFraction:opaque/(w*(h-sceneHeight)),issues,pngBytes:raw.length,webpBytes:webp.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),webpSha256:crypto.createHash('sha256').update(webp).digest('hex'),race:brief?.race,kind:brief?.kind,review:'pending visual inspection; alpha/geometry diagnostics are not art acceptance'};
 console.log(JSON.stringify({file:name,width:w,height:h,sceneHeight,bodyBounds:bounds,issues,webpBytes:webp.length}));
}
await fs.writeFile(new URL('inspections-r11.json',root),JSON.stringify(previous,null,2)+'\n');
