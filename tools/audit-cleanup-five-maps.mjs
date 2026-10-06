import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// This produces a reviewed file allowlist. Removal is a separate PowerShell step.
const root=process.cwd(),out='reports/local/cleanup-five-maps-20261006';
const catalog=JSON.parse(await fs.readFile('deploy/runtime/source-assets.json','utf8'));
const runtime=new Set(catalog.entries.map(r=>r.packedFile));
const sha=b=>createHash('sha256').update(b).digest('hex');
const ui=p=>p.startsWith('preview/')||/(^|\/)(ui|ui-[^/]*|hud-[^/]*|[^/]*-ui)(\/|$)/.test(p)||p.includes('/preview/')||p.startsWith('public/assets/icons/');
const protectedRoots=['src','preview','reports/local/ui-redesign-20261003','public/assets/icons'];
const files=[],links=[],dirs=[];
async function scan(p){for(const d of await fs.readdir(p,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){const file=p+'/'+d.name,s=await fs.lstat(file);if(s.isSymbolicLink())links.push({path:file,target:await fs.readlink(file)});else if(s.isDirectory()){dirs.push(file);await scan(file);}else files.push({path:file,bytes:s.size});}}
for(const p of ['.cache','dist','reports/local','public/assets','src','preview','test-results','playwright-report'])await scan(p);
const protectedFiles=files.filter(f=>ui(f.path)||protectedRoots.some(p=>f.path===p||f.path.startsWith(p+'/')));
const hashes=[];for(const f of protectedFiles)hashes.push({...f,sha256:sha(await fs.readFile(f.path))});
const candidates=[];
for(const f of files){const p=f.path;if(ui(p)||p.startsWith(out+'/'))continue;let reason='';
 if(p.startsWith('.cache/')&&!/^\.cache\/(sc2-data|casc-data|sc2-campaign-data|casclib)(\/|$)/.test(p))reason='Disposable build, conversion, test database or inactive update cache';
 else if(p.startsWith('dist/')&&!/^dist\/(web\/|SC2-Survivors-Current-20261006\.html$|Current-Coze-Application-20261006(?:\/|\.zip$))/.test(p))reason='Superseded local game/demo/deployment package';
 else if(p.startsWith('public/assets/')&&!runtime.has(p))reason='Unused local asset outside the verified current and UI runtime catalog';
 else if(p.startsWith('reports/local/')&&!/^reports\/local\/(p6-20261006|current-logic-20261006|natural-checkpoints|git-baseline-20261006)(\/|$)/.test(p)&&/\.(png|jpe?g|webp|gif|mp4|webm|html|zip|glb|bin|dds|sqlite|db)$/i.test(p))reason='Superseded non-UI test capture or binary material; text evidence retained';
 else if(p.startsWith('test-results/')||p.startsWith('playwright-report/'))reason='Generated browser test cache';
 if(reason)candidates.push({...f,reason});
}
const groups={};for(const f of candidates){const key=f.path.startsWith('.cache/')?'cache':f.path.startsWith('dist/')?'old-packages':f.path.startsWith('public/')?'unused-assets':'old-test-materials';const row=groups[key]??={files:0,bytes:0};row.files++;row.bytes+=f.bytes;}
const plan={root:path.resolve(root),at:new Date().toISOString(),authorization:'User explicitly requested local garbage/old-package/test/cache/unused-asset cleanup, preserving UI files.',excluded:['All UI files and previews','Current source and runtime catalog','P6 open-finding reproduction and natural checkpoints','Current packages until replacement is verified','Original source inputs and Git history'],groups,files:candidates,links:links.filter(f=>f.path.startsWith('.cache/')&&!ui(f.path)),directories:dirs.sort((a,b)=>b.length-a.length)};
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/cleanup-plan.json',JSON.stringify(plan,null,2));await fs.writeFile(out+'/protected-before.json',JSON.stringify(hashes,null,2));
console.log(JSON.stringify({groups,files:candidates.length,logicalBytes:candidates.reduce((n,f)=>n+f.bytes,0),protectedFiles:hashes.length,links:plan.links}));
