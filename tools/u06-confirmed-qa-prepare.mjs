import fs from 'node:fs';
const old='reports/local/u06-ui-minimal-20261023',base='reports/local/u06-confirmed-20261023';
for(const name of ['build-web.mjs','assemble-offline.mjs','verify-offline.mts','serve.mjs']){let s=fs.readFileSync(old+'/'+name,'utf8').replaceAll('u06-ui-minimal-20261023','u06-confirmed-20261023').replaceAll('4493','4494');fs.writeFileSync(base+'/'+name,s);}
let qa=fs.readFileSync(old+'/qa-r4.mjs','utf8').replace("out=base+'/qa-r4'","out=base+'/qa-r1'").replace("base+'/qa-r3/profile'","'D:/星际/reports/local/u06-ui-minimal-20261023/qa-r3/profile'").replaceAll('4493','4494');
qa=qa.replace("for(const b of observed.buttons)if(b.text)assert.equal(b.icons,0,name+': '+b.text);", "if(name.startsWith('pause-')&&!name.startsWith('pause-settings')){const actions=await page.locator('.pause-actions button').allTextContents();assert.deepEqual(actions.map(s=>s.trim()),['继续','整备部队','设置','返回标题']);assert.equal(await page.locator('.pause-actions svg').count(),0);}");
const a=qa.indexOf("await page.locator('[data-action=menu-load-ready]:visible').waitFor();"),b=qa.indexOf("phase='assets';",a);if(a<0||b<0)throw Error('QA import block not found');qa=qa.slice(0,a)+qa.slice(b);
qa=qa.replace("const before=(await slots())[0];", "const before=(await slots())[0];");
fs.writeFileSync(base+'/qa-r1.mjs',qa);
console.log(base);
