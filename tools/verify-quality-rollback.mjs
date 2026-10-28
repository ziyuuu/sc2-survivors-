import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.argv[2]??'http://127.0.0.1:18883',output=process.argv[3]??'reports/local/quality-20261028/rollback.json';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const p=await b.newPage();await p.addInitScript(()=>{globalThis.__name=v=>v;localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'low',tier:'medium',texture:'low'}));});await p.goto(origin+'/quality-lab.html');await p.waitForFunction(()=>globalThis.__QUALITY_APP__,null,{timeout:180000});
 const result=await p.evaluate(async()=>{const a=__QUALITY_APP__,release=await a.hud.downloads.holdOptional();await a.view.waitForPendingAssets();a.view.entryPreparation=true;const s=a.httpStore(),before=a.view.report().graphics.textures,base=s.urlForTier.bind(s),seen=new Map();let repeats=0,failed=false;
  a.view.setGraphicsPreset('high');s.urlForTier=async(id,tier)=>{const n=(seen.get(id)||0)+1;seen.set(id,n);if(n>1&&++repeats===2)throw Error('injected mid-swap decode path failure');return base(id,tier);};
  try{await a.applyPendingTextureTier();}catch{failed=true;}finally{s.urlForTier=base;}const after=a.view.report().graphics.textures;if(!failed||s.activeTier!=='low'||after.rollbacks!==before.rollbacks+1||after.liveVariantPixels!==before.liveVariantPixels||after.swaps<before.swaps+2)throw Error('partial rollback invariant failed '+JSON.stringify({failed,repeats,tier:s.activeTier,before,after}));
  let checks=0,cancelled=false;try{await a.applyPendingTextureTier(()=>++checks>3);}catch{cancelled=true;}if(!cancelled||s.activeTier!=='low')throw Error('cancel invariant failed');const live=new Set(Object.values(s.urls));if([...s.variantUrls.values()].some(url=>!live.has(url)))throw Error('retired staged URL retained');a.view.setGraphicsPreset('low');a.view.entryPreparation=false;release();return {failed:true,cancelled,activeTier:s.activeTier,before,after,stagedUrlsReleased:true};});
 await fs.writeFile(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close();}
