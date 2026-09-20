import fs from 'node:fs/promises';
await import('./prepare-assets.mjs');
const rows=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
if(rows.some(r=>r.required&&r.status==='missing')){
 console.log('First run: fetching required public catalog assets into ignored local files.');
 try{await import('./download-runtime.mjs');await import('./prepare-assets.mjs?refresh=1');}
 catch(error){console.error('Asset fetch incomplete. See docs/ASSET_DOWNLOAD_REQUIRED.md; the development loader will show missing IDs.',error.message);}
 process.exitCode=0;
}
