import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const root='reports/local/performance-b03-20261019/visibility-probe-2';await fs.mkdir(root,{recursive:true});
const c=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false}),p=c.pages()[0],cdp=await c.newCDPSession(p),w=await cdp.send('Browser.getWindowForTarget'),rows=[];
try{await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});for(const state of ['normal','minimized','normal'] as const){await cdp.send('Browser.setWindowBounds',{windowId:w.windowId,bounds:{windowState:state}});await p.waitForTimeout(500);rows.push({state,bounds:await cdp.send('Browser.getWindowBounds',{windowId:w.windowId}),actual:await p.evaluate(()=>({hidden:document.hidden,visibility:document.visibilityState,focus:document.hasFocus()}))});}}finally{await c.close();}
await fs.writeFile(root+'/report.json',JSON.stringify({rows},null,2));console.log(JSON.stringify(rows));
