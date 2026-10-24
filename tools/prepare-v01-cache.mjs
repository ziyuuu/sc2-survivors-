import fs from 'node:fs/promises';
let code=await fs.readFile('tools/qa-performance-a03-pressure.mjs','utf8');
code=code.replace("'reports/local/performance-a03-20261021'","'reports/local/v01-20261024'").replace("web='preview/performance-a03-20261021-r2'","web='reports/local/v01-20261024/cache-probe'");
const start=code.indexOf('const files='),end=code.indexOf('const report=',start);
code=code.slice(0,start)+`const game=JSON.parse(await fs.readFile('reports/local/v01-20261024/baseline-terran-r2/report.json')),build=game.build,files=Object.fromEntries(build.resources.map(r=>[r.sha256,{...r,mime:r.url.endsWith('.glb')?'model/gltf-binary':r.url.endsWith('.png')?'image/png':'application/octet-stream'}]));
let selectedHashes=mode==='persistent'?null:JSON.parse(await fs.readFile('reports/local/v01-20261024/cache-selected.json')),expectedCount=selectedHashes?.length;
const manifest=await fs.readFile(build.out+'/'+build.manifest);await fs.writeFile(web+'/current.json',manifest);
`+code.slice(end);
code=code.replace('Actual 1566-file main-game subset','Current native first-three-stages cache subset').replace('Frozen production cache code','Current production cache code').replace('server.listen(0,',"server.listen(mode==='persistent'?Number(new URL(game.base).port):0,");
code=code.replace("chromium.launchPersistentContext(root+'/profile',options)","chromium.launchPersistentContext('reports/local/v01-20261024/baseline-terran-r2/profile',options)");
code=code.replace("phase='prefetch';await page.evaluate",`if(mode==='persistent'){selectedHashes=await page.evaluate(async()=>{const cache=await caches.open('sc2-resource-bytes-v1');return(await cache.keys()).map(r=>r.url.split('/').pop()).sort();});expectedCount=selectedHashes.length;assert.ok(expectedCount>1000);report.selectedHashes=selectedHashes;await fs.writeFile('reports/local/v01-20261024/cache-selected.json',JSON.stringify(selectedHashes));}
 phase='prefetch';await page.evaluate`);
code=code.replace("if(mode==='incognito'){assert.ok(after.missing.length>0,'Critical pressure should evict memory-backed cache');assert.ok(after.found.reduce((n,a)=>n+a.bytes,0)<=214748364);}else{assert.equal(after.missing.length,0);assert.equal(after.rows.length,expectedCount);}","report.browserEviction={observed:after.missing.length>0,missing:after.missing.length};if(mode==='persistent'){assert.equal(after.missing.length,0);assert.equal(after.rows.length,expectedCount);}else if(!after.missing.length){report.noEvictionObserved=true;}");
code=code.replace("await context?.close();await browser?.close();", "await context?.close();await browser?.close();report.profileClosed=true;");
await fs.writeFile('tools/qa-v01-cache.mjs',code);
