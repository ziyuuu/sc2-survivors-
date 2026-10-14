import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root='reports/local/mvp1-building-main-20261013',out=root+'/frozen-source-r1';
await fs.access(out).then(()=>{throw Error('Frozen source already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const baseline=JSON.parse(await fs.readFile(root+'/baseline-inputs.json','utf8'));
const own=new Set(['src/data/expedition-buildings.ts','src/main.ts','src/render/scene/battle-renderer.ts','src/simulation/expedition-economy.ts','src/simulation/expedition-production.ts','src/simulation/expedition-state.ts','src/simulation/progression/expedition-drafts.ts','src/simulation/world.ts','src/ui/hud.ts','src/ui/hud/expedition-panel.ts','src/ui/intermission-skin/skin.ts','src/ui/presentation/base-panels.ts','src/ui/presentation/facility-controls.ts','src/ui/presentation/intermission.ts','src/ui/presentation/reference-card.ts']);
const terrain=new Set(['campaign-map','environment-atmosphere','environment-materials','layered-ground'].map(n=>'src/render/terrain/'+n+'.ts'));
const additions=['src/simulation/building/rules.ts','src/simulation/building/expedition.ts','src/ui/presentation/building-view.ts','src/ui/presentation/building-technology.ts','src/ui/presentation/building-panel.ts','src/ui/presentation/building-panel.css'];
const sha=b=>createHash('sha256').update(b).digest('hex'),rows=[];
async function write(file,bytes){const destination=path.resolve(out,file);if(!destination.startsWith(path.resolve(out)+path.sep))throw Error('Source destination escapes snapshot');await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,bytes,{flag:'wx'});}
for(const row of baseline.files.filter(r=>r.file.startsWith('src/'))){
 const current=await fs.readFile(row.file),source=terrain.has(row.file)?'reports/local/7a-20261013/baseline/source/'+row.file:row.file,bytes=await fs.readFile(source),hash=sha(bytes);
 if(!own.has(row.file)&&hash!==row.sha256)throw Error('Unapproved source delta: '+row.file);
 await write(row.file,bytes);rows.push({file:row.file,source,bytes:bytes.length,sha256:hash,baselineSha256:row.sha256,workspaceSha256:sha(current),mode:terrain.has(row.file)?'verified accepted baseline; external environment edits retained in workspace':own.has(row.file)?'building integration':'unchanged baseline'});
}
for(const file of additions){const bytes=await fs.readFile(file);await write(file,bytes);rows.push({file,source:file,bytes:bytes.length,sha256:sha(bytes),mode:'new shared building source'});}
for(const file of ['index.html','package.json','tsconfig.json','tools/backend/contracts.mjs'])await write(file,await fs.readFile(file));
async function copyTree(source,destination){for(const entry of await fs.readdir(source,{withFileTypes:true})){const from=path.join(source,entry.name),to=path.join(destination,entry.name);if(entry.isDirectory())await copyTree(from,to);else await write(to,await fs.readFile(from));}}
await copyTree('test','test');
await copyTree('preview/building-workbench/connection','preview/building-workbench/connection');
// These read-only presentation adapters are imported by the existing focused UI tests.
await copyTree('preview/battle-ui-feedback-20261008','preview/battle-ui-feedback-20261008');
await fs.writeFile(out+'/freeze.json',JSON.stringify({at:new Date().toISOString(),out,method:'Accepted 0.6.26 source baseline plus owned building integration, with four environment files recovered from an existing hash-identical 7A baseline. Workspace external edits are never reverted.',rows},null,2));
console.log(JSON.stringify({out,sourceFiles:rows.length,acceptedTerrain:[...terrain],workspaceUntouched:true}));
