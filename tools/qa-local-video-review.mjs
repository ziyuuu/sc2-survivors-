import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const source=process.env.QA_SOURCE??'reports/local/hero-iteration/playback';
const out=process.env.QA_OUT??'reports/local/hero-iteration/film-review';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:800}});
try{for(const id of process.argv.slice(2)){
 await page.goto('http://127.0.0.1:5181');
 await page.setContent('<style>body{margin:0;background:#12191e;color:#fff;font:16px sans-serif}canvas{display:block;width:1200px}</style><canvas width="1200" height="800"></canvas>');
 await page.evaluate(async({id,source})=>{const v=document.createElement('video');v.muted=true;v.src='/'+source+'/'+id+'.webm';await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject});
  if(!Number.isFinite(v.duration)){v.currentTime=1e8;await new Promise(resolve=>v.onseeked=resolve);}const duration=v.duration;
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d');for(const [index,t] of [.06,['yamato_battlecruiser','purifier_flagship'].includes(id)?1.92:1.03,['yamato_battlecruiser','purifier_flagship'].includes(id)?2.15:1.15,Math.max(0,duration-.7)].entries()){v.currentTime=t;await new Promise(resolve=>v.onseeked=resolve);const x=index%2*600,y=Math.floor(index/2)*400;c.drawImage(v,380,120,680,480,x,y+24,600,370);c.fillStyle='#fff';c.font='16px sans-serif';c.fillText(`${id} · ${t.toFixed(2)}s`,x+8,y+18);}
 },{id,source});
 await page.screenshot({path:out+'/'+id+'.png'});
}}finally{await browser.close();}
