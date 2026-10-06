import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const output='reports/local/p5-backend-20261006',baseline=JSON.parse(await fs.readFile('reports/local/p4-followup-20261005/p4-final-source.json','utf8'));
const prior=JSON.parse(await fs.readFile('reports/local/p4-followup-20261005/preservation.json','utf8'));
const insertions=JSON.parse(await fs.readFile(output+'/observation-insertions.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
async function fingerprint(path){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(path)){h.update(b);bytes+=b.length;}return {path,bytes,sha256:h.digest('hex')};}
async function files(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))out.push(...(e.isDirectory()?await files(dir+'/'+e.name):[dir+'/'+e.name]));return out;}
const allowed=new Set([...insertions.map(x=>x.file),'src/app/bootstrap.ts','src/assets/http-store.ts','src/ui/hud.ts']);
const source=[],reversals=[],artifacts=[];
for(const before of baseline){const after=await fingerprint(before.path),same=after.sha256===before.sha256;assert.ok(same||allowed.has(before.path),'Unapproved change: '+before.path);source.push({...after,same});}
for(const e of insertions){let text=await fs.readFile(e.file,'utf8');if(e.file==='src/simulation/world.ts'){const getter=' get diagnosticRun(){return this.sandbox||!this.autoWaves;}\n';assert.ok(text.includes(getter));text=text.replace(getter,'');}assert.equal(hash(text),e.after,'Observation source changed unexpectedly: '+e.file);for(const [from,to]of [...e.replacements].reverse()){assert.equal(text.split(to).length,2,'Not a unique observation insertion: '+e.file);text=text.replace(to,from);}const prefix=`import {${e.imports}} from '${e.file==='src/simulation/world.ts'||e.file==='src/simulation/zerg-brood.ts'?'./observation':'../observation'}';\n`;assert.ok(text.startsWith(prefix));text=text.slice(prefix.length);assert.equal(hash(text),e.before);assert.equal(e.before,baseline.find(x=>x.path===e.file).sha256);reversals.push({path:e.file,originalSha256:e.before,simulationMathRestoredExactly:true,extraReadOnlyDiagnosticGetter:e.file==='src/simulation/world.ts'});}
for(const before of [...prior.artifacts,...prior.outputs]){const now=await fingerprint(before.path);assert.deepEqual(now,before);artifacts.push(now);}
for(const before of prior.proposals)assert.deepEqual(await fingerprint(before.path),before);
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));for(const key of ['release','runSchema','assetCount','fileCount','assetBytes','logicalBytes'])assert.equal(web[key],prior.web[key]);
const manifest=JSON.parse(await fs.readFile('dist/web/'+web.manifest,'utf8')),verified=new Map();for(const a of Object.values(manifest.assets))if(!verified.has(a.url)){const r=await fingerprint('dist/web/'+a.url);assert.equal(r.sha256,a.sha256);assert.equal(r.bytes,a.bytes);verified.set(a.url,r);}
const added=[];for(const file of await files('src'))if(!baseline.some(p=>p.path===file))added.push(await fingerprint(file));
const runtimeImport=await Promise.all((await files('src')).map(file=>fs.readFile(file,'utf8')));assert.ok(!runtimeImport.some(s=>/import[^;\n]+(?:NEXT_ITERATION_P[04].*json|TEAM_AURA_REBALANCE_VALUES.*json)/.test(s)));
const outputs=[await fingerprint('dist/SC2-Survivors-P5-20261006.html')];
const handoff='dist/P5-Coze-Application-20261006',pack=[];for(const file of await files(handoff)){const relative=file.slice(handoff.length+1);assert.ok(!relative.startsWith('node_modules/')&&!relative.includes('.cache')&&!relative.includes('reports/')&&!relative.endsWith('.jsonl'));if(relative!=='delivery.json'){const f=await fingerprint(file);pack.push({...f,path:relative});}}
await fs.writeFile(handoff+'/delivery.json',JSON.stringify({status:'local application handoff; not deployed',appBuildId:web.appBuildId,release:web.release,runSchema:web.runSchema,includesDatabase:false,includesAccounts:false,resourcesIncluded:0,files:pack},null,2)+'\n');
const report={source,added,reversals,artifacts,outputs,web,resources:{records:Object.keys(manifest.assets).length,files:verified.size,verifiedBytes:[...verified.values()].reduce((n,f)=>n+f.bytes,0),release:web.release,newBytes:0},handoff:{path:handoff,files:pack.length,bytes:pack.reduce((n,f)=>n+f.bytes,0),databaseIncluded:false,accountsIncluded:false}};
await fs.writeFile(output+'/preservation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({unchanged:source.filter(f=>f.same).length,changed:source.filter(f=>!f.same).map(f=>f.path),newSources:added.length,exactReversals:reversals.length,historicalHtml:artifacts.length,resources:report.resources,handoff:report.handoff}));
