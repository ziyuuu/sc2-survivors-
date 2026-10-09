import fs from 'node:fs/promises';
const out='reports/local/maintenance-audit-20261008';
const inventory=JSON.parse(await fs.readFile(out+'/inventory.json','utf8'));
const now=Date.now(),day=86400000;
const files=[];
for(const f of inventory.files){let reason='';
 if(f.root==='D:/星际'&&/^\.cache\/(p5-tests|current-update-[^/]+|ui-coze-main-[^/]+|ui-offline-final-[^/]+|p6-update-[^/]+|coze-update-test-[^/]+|ui-lfs-[^/]+|git-baseline-20261006|fixed-performance-vite|wasm-individual-vite|wasm-test-npm)(\/|$)/.test(f.relative))reason='Completed local QA fixture/cache; source and recorded evidence are retained';
 if(f.root==='C:/Users/zyuu/AppData/Local/pip/Cache'&&now-f.mtime>7*day)reason='Re-downloadable pip cache older than seven days';
 if(f.root==='C:/Users/zyuu/AppData/Local/Temp'&&/^(playwright_[^/]+|chromium_chrome_BITS_[^/]+)(\/|$)/.test(f.relative)&&now-f.mtime>day)reason='Old temporary browser test/download cache';
 if(f.root==='C:/Users/zyuu/AppData/Local/Temp'&&/^(tsx-zyuu|node-compile-cache)(\/|$)/.test(f.relative)&&now-f.mtime>7*day)reason='Old reproducible script compilation cache';
 if(f.root==='C:/Users/zyuu/AppData/Local/Temp'&&!f.relative.includes('/')&&/\.(tmp|tmp\.js|log)$/i.test(f.relative)&&!f.relative.startsWith('codex-')&&now-f.mtime>7*day)reason='Stale temporary file older than seven days';
 if(reason)files.push({...f,reason});
}
const groups={};for(const f of files){const key=f.root==='D:/星际'?'project-cache':'c-cache';const g=groups[key]??={files:0,logicalBytes:0,hardlinkedBytes:0};g.files++;g.logicalBytes+=f.bytes;if(f.links>1)g.hardlinkedBytes+=f.bytes;}
await fs.writeFile(out+'/cleanup-plan.json',JSON.stringify({at:new Date().toISOString(),roots:['D:/星际/.cache','C:/Users/zyuu/AppData/Local/Temp','C:/Users/zyuu/AppData/Local/pip/Cache'],groups,files,excluded:['All source and artwork, UI previews and active other-thread artifacts','Original SC2 source caches','Git history/LFS, installed dependencies/runtimes','Recorded QA screenshots/evidence and current releases','User attachments, saves and production databases','Any candidate referenced by a live process or changed after inventory']},null,2));
console.log(JSON.stringify(groups));
