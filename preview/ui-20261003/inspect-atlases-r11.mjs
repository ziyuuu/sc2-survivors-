import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/zyuu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {PNG}=require('pngjs'),sharp=require('sharp');
const root=new URL('art-r11/',import.meta.url),briefs=JSON.parse(await fs.readFile(new URL('atlas-briefs-r11.json',root),'utf8'));
const previous=JSON.parse(await fs.readFile(new URL('atlas-inspections-r11.json',root),'utf8').catch(()=>'{}'));
const regionOverrides=JSON.parse(await fs.readFile(new URL('regions-r11.json',root),'utf8').catch(()=>'{}'));
const selected=process.argv.slice(2),files=(await fs.readdir(root)).filter(f=>/-atlas(?:-v\d+)?\.png$/.test(f)&&(!selected.length||selected.includes(f)));
for(const name of files){
 const raw=await fs.readFile(new URL(name,root)),png=PNG.sync.read(raw),{width:w,height:h,data}=png,alpha=(x,y)=>data[(y*w+x)*4+3];
 const family=name.replace(/-atlas(?:-v\d+)?\.png$/,''),brief=briefs.atlases.find(a=>a.family===family),entries=[];
 for(let i=0;i<4;i++){
  const left=Math.round(i*w/4)+6,right=Math.round((i+1)*w/4)-6;
  const bodyLeft=regionOverrides[name]?.[i]?.left??left,bodyRight=regionOverrides[name]?.[i]?.right??right;
  let sceneHeight=Math.round(h*.3),gap=0;
  // Transparent sky corners are legitimate scenery, not the layer separator.
  for(let y=Math.floor(h*.2);y<h*.45;y++){
   let count=0;for(let s=0;s<32;s++)count+=alpha(Math.round(left+(right-left)*s/31),y)>200?1:0;
   if(count<3){gap++;if(gap===5){sceneHeight=y-4;break;}}
   else gap=0;
  }
  let minX=w,minY=h,maxX=-1,maxY=-1,clear=0;
  for(let y=sceneHeight+4;y<h-6;y++)for(let x=bodyLeft;x<=bodyRight;x++){
   const a=alpha(x,y);if(a>200){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}if(a===0)clear++;
  }
  const issues=[];
  if(sceneHeight<h*.18||sceneHeight>h*.45)issues.push('inspect independent scene boundary');
  if(minY<=sceneHeight+8)issues.push('inspect body/head overlap with scene');
  if(minX<=bodyLeft||maxX>=bodyRight)issues.push('inspect column edge: body/effect may touch');
  if(maxY>h-12)issues.push('inspect feet/tail/wing at bottom edge');
  entries.push({key:brief.keys[i],family,race:brief.race,kind:i?'elite':'ordinary',column:i,sceneBounds:{x:left,y:0,width:right-left,height:sceneHeight},bodyBounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},bodyHeight:224,bodyWidth:i?300:220,air:['viking','banshee','medivac','science_vessel','mutalisk','corruptor','phoenix','void_ray','carrier'].includes(family),issues,clearLowerFraction:clear/((bodyRight-bodyLeft+1)*(h-sceneHeight)),review:'pending actual art/identity inspection'});
 }
 const webpName=name.replace('.png','.webp'),webp=await sharp(raw).webp({quality:94,alphaQuality:100,effort:5}).toBuffer();
 await fs.writeFile(new URL(webpName,root),webp);
 previous[name]={file:name,webp:webpName,assetKey:name.replace('.png',''),width:w,height:h,pngBytes:raw.length,webpBytes:webp.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),webpSha256:crypto.createHash('sha256').update(webp).digest('hex'),entries};
 console.log(JSON.stringify({file:name,width:w,height:h,entries:entries.map(e=>({key:e.key,sceneBounds:e.sceneBounds,bodyBounds:e.bodyBounds,issues:e.issues}))}));
}
await fs.writeFile(new URL('atlas-inspections-r11.json',root),JSON.stringify(previous,null,2)+'\n');
