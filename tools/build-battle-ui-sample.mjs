import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadBuildAssets} from './load-build-assets.mjs';
import {createAssetPack} from './offline-pack.mjs';

const root='preview/battle-ui-feedback-20261008',out='reports/local/battle-ui-sample-20261008/revision-3';
await fs.mkdir(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=await loadBuildAssets(),byId=new Map(records.map(r=>[r.id,r]));
const families=['marine','marauder','hellion','tank','medivac','roach','zergling'],heroes=['raynor','tychus','nova'];
const artIdentities=['marine','marauder','reaper','hellion','tank','thor','medivac','viking','banshee','science_vessel',...heroes];
const ids=new Set(['terrain.rock','terrain.rock.normal','model.hero-upgrade.vikingfightermissile','model.scv','model.scv.death','model.barracks','model.barracks.death','model.support.mine','ui.minerals','ui.gas','building.barracks','building.factory','building.starport','tech.attack','tech.armor','tech.stim','tech.boost']);
for(const f of families){ids.add('model.'+f);ids.add('unit.'+f);for(const r of records)if(r.id.startsWith('model.'+f+'.'))ids.add(r.id);}
for(const h of heroes){ids.add('model.hero.'+h);ids.add('hero.'+h);ids.add('ui.cover.'+h);}
for(const r of records)if(r.kind==='icon'||r.kind==='effect-texture'||r.id.startsWith('model.projectile.')||r.id.startsWith('model.hero-upgrade.'))ids.add(r.id);
const meta=JSON.parse(await fs.readFile('deploy/runtime/ui-assets.json','utf8'));
// Pack original Terran plates for the native offers; other artwork remains untouched.
for(const r of meta.records)if(r.id.startsWith('ui.paint.')&&artIdentities.some(id=>r.id==='ui.paint.'+id))ids.add(r.id);
// Shared plate names are declared in the immutable generated registry.
const generated=await fs.readFile('src/assets/ui-art.generated.ts','utf8');
for(const id of artIdentities){
 const key=new RegExp('"'+id+'"\\s*:\\s*\\{[\\s\\S]*?"assetKey"\\s*:\\s*"([^"]+)"').exec(generated)?.[1];
 if(key)ids.add('ui.paint.'+key);
}
const resources=[],provenance=[];
for(const id of ids){const r=byId.get(id);if(!r||r.status!=='available')throw Error('Missing sample asset '+id);const bytes=await fs.readFile(r.packedFile);resources.push({id,bytes,mime:r.kind==='model'?'model/gltf-binary':r.packedFile.endsWith('.webp')?'image/webp':r.packedFile.endsWith('.svg')?'image/svg+xml':'image/png'});provenance.push({id,file:r.packedFile,bytes:bytes.length,sha256:sha(bytes)});}
const {pack,stats}=createAssetPack(resources);
const result=await build({entryPoints:[root+'/app.ts'],bundle:true,write:false,outfile:'sample.js',format:'iife',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js'))?.text,css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text;
if(!js||!css)throw Error('Sample JS/CSS output missing');
const html=(await fs.readFile(root+'/shell.html','utf8')).replace('__CSS__',()=>css).replace('__IDS__',()=>JSON.stringify([...ids])).replace('__PACK__',()=>JSON.stringify(pack)).replace('__JS__',()=>js.replace(/<\/script/gi,'<\\/script'));
const output='dist/Battle-UI-Feedback-Sample-20261008.html';await fs.writeFile(output,html);
const protectedPaths=execFileSync('git',['ls-files','src','deploy','backend','vendor','start-coze.mjs','sc2-backend.conf','index.html','vite.config.ts','package.json','package-lock.json'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean),protectedFiles=[];
for(const file of protectedPaths)protectedFiles.push({file,sha256:sha(await fs.readFile(file))});
const report={at:new Date().toISOString(),baseline:'ed215df3e0b50ccf7c5bc04d06b99114514db43a',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),output,bytes:Buffer.byteLength(html),sha256:sha(html),sampleBuildId:sha(js+'\n'+css),assets:provenance.length,provenance,pack:stats,protectedFiles,productionWeb:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')).appBuildId,
 revision:3,scope:'Independent diagnostic sample, actual unchanged World/skills/renderer/approved artwork. Upper row has five independent families, without shared-skill merging. Owned heroes precede global commands in the lower row; no empty hero placeholders. Independent enhancements and facilities retained. No production entry, run/profile storage, backend or balance edits.'};
await fs.writeFile(out+'/build.json',JSON.stringify(report,null,2));console.log(JSON.stringify({output,bytes:report.bytes,build:report.sampleBuildId,assets:report.assets,protected:protectedFiles.length}));
