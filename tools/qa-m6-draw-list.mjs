import {chromium} from '@playwright/test';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.evaluate(()=>window.__SC2_DEBUG__.view.mapView.setVisible(false));
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForTimeout(1000);
 const value=await page.evaluate(()=>{const v=window.__SC2_DEBUG__.view,visible=[];
  v.scene.traverseVisible(x=>{if(!x.isMesh)return;const materials=Array.isArray(x.material)?x.material:[x.material];visible.push({name:x.name||x.parent?.name||'',type:x.type,materials:materials.map(m=>({type:m.type,name:m.name,transparent:m.transparent})),vertices:x.geometry?.getAttribute('position')?.count,instances:x.count??1,drawRange:x.geometry?.drawRange});});
  return {drawCalls:v.renderer.info.render.calls,visible,sceneChildren:v.scene.children.map(x=>({name:x.name,type:x.type,visible:x.visible}))};
 });
 console.log(JSON.stringify(value));
}finally{await browser.close();}
