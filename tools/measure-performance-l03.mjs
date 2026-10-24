import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
const rep=process.argv[2]??'1',root=path.resolve('reports/local/performance-l03-20261020','paired-'+rep);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const code=`import {MapPreview as Before} from './reports/local/performance-l03-20261020/baseline-inputs/src/ui/presentation/map-preview';import {MapPreview as After} from './src/ui/presentation/map-preview';window.Previews={Before,After};`;
const built=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',platform:'browser',write:false,metafile:true});
const bundle=built.outputFiles[0].text;await fs.writeFile(root+'/components.js',bundle);
const report={bundleSha256:createHash('sha256').update(bundle).digest('hex'),inputs:built.metafile.inputs,scope:'Both production preview implementations in one fresh browser, identical deterministic 1440x900 2D image and 640x360 output; alternating pairs. Not a whole game FPS measure.',pairs:[],errors:[]};
let ctx;
try{
 ctx=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});const page=ctx.pages()[0];
 // Use only the component bundle; no game boot runs alongside the timed samples.
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><p>Preview measurement</p></body></html>'}));
 await page.goto('http://127.0.0.1:4439/l03-components.html');await page.addScriptTag({content:bundle});
 page.on('pageerror',e=>report.errors.push(e.message));
 report.pairs=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=900;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(1440,900);
  for(let i=0;i<1440*900;i++){const x=i%1440,y=Math.floor(i/1440),j=i*4;pixels.data[j]=(x*7+y*3)%256;pixels.data[j+1]=(x+y*5)%256;pixels.data[j+2]=(x^y)%256;pixels.data[j+3]=255;}ctx.putImageData(pixels,0,0);
  const images={},results=[],before=new Previews.Before(),after=new Previews.After(),w={phase:'battle',paused:true,runId:'pair',tick:0,battlefield:{mapHash:'pair'}};
  let frames=0;function frame(){frames++;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  for(let round=0;round<10;round++){const row={round,order:round%2?['after','before']:['before','after']};
   for(const side of row.order){const p=side==='before'?before:after;w.tick++;const f=frames,t=performance.now();p.capture(w,canvas);const synchronousMs=performance.now()-t;while(p.encoding)await new Promise(r=>setTimeout(r,1));row[side]={synchronousMs,totalMs:performance.now()-t,frames:frames-f};const url=p.cached.url;if(images[side]&&images[side]!==url)throw Error('Capture changed');images[side]=url;}
   results.push(row);
  }
  if(images.before!==images.after)throw Error('Asynchronous output differs');window.pairImage=images.after;return results;
 });
 const image=await page.evaluate(()=>pairImage);await fs.writeFile(root+'/paired.webp',Buffer.from(image.split(',')[1],'base64'));report.imageSha256=createHash('sha256').update(image).digest('hex');assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await ctx?.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,pairs:report.pairs.length,failure:report.failure}));}
