/** Finite local comparison, using the same packed resources. No publish step. */
import {build} from 'vite';import fs from 'node:fs/promises';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {packedLauncher} from './packed-startup.mjs';
const root='dist/safari-stage-20261029',packed='sites/size-optimized-site/public',raw='dist/runtime-lifecycle-20261028/final/web';
const rawInfo=JSON.parse(await fs.readFile(raw+'/web-release.json','utf8')),packedInfo=JSON.parse(await fs.readFile(packed+'/web-release.json','utf8'));
const original=JSON.parse(await fs.readFile(raw+'/'+rawInfo.manifest,'utf8')),compressed=JSON.parse(await fs.readFile(packed+'/'+packedInfo.manifest,'utf8'));
const worker=await fs.readFile(packed+'/sites-sw.js','utf8'),index=(await fs.readdir(packed)).find(f=>/^sites-pack-index\.[a-f0-9]+\.js$/.test(f)&&worker.includes(f));if(!index)throw Error('Missing packed index');
for(const variant of process.argv.slice(2).length?process.argv.slice(2):['baseline','candidate']){
 if(!['baseline','candidate'].includes(variant))throw Error('Unknown variant');
 const out=root+'/'+variant,buildDir=out+'/build';await fs.mkdir(out+'/assets',{recursive:true});
 const baseline=variant==='baseline'?execFileSync('git',['show','ac053e218de163c8c25fddc9e3e65aeca0d20bfa:src/render/scene/battle-renderer.ts'],{encoding:'utf8',maxBuffer:1024*1024}):null;
 await build({base:'./',publicDir:false,plugins:[{name:'safari-local-diagnostic',enforce:'pre',transform(code,id){const file=id.replaceAll('\\','/');
  if(baseline&&file.endsWith('/src/render/scene/battle-renderer.ts'))return baseline;
  if(file.endsWith('/src/platform/graphics-profile.ts'))return code.replace('export function deviceHints():DeviceHints {','export function deviceHints():DeviceHints { return {coarse:true,cores:6,dpr:1}; /* local diagnostic budget */').replace("if(typeof navigator==='undefined')return {};return", "/* existing hints kept unreachable */ if(typeof navigator==='undefined')return {};return");
  if(file.endsWith('/src/main.ts'))return `import {installSafariTrace,attachSafariDiagnostic} from '../tools/safari-stage-diagnostic.mjs';installSafariTrace();localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'}));\n`+code.replace('startGame().catch(','startGame(529).then(attachSafariDiagnostic).catch(');
 }}],build:{outDir:buildDir,emptyOutDir:true,minify:true,target:'es2022'}});
 const html=await fs.readFile(buildDir+'/index.html','utf8'),entry=html.match(/src="\.\/([^" ]+\.js)"/)[1];let code=await fs.readFile(buildDir+'/'+entry,'utf8');
 for(const [id,row]of Object.entries(original.assets))if(row.mime==='model/gltf-binary')code=code.replaceAll(row.sha256,compressed.assets[id].sha256);
 const bytes=gzipSync(code),sha=createHash('sha256').update(bytes).digest('hex'),name='safari-'+variant+'.'+sha.slice(0,16)+'.js.gz';await fs.writeFile(out+'/assets/'+name,bytes);await fs.writeFile(out+'/assets/safari-launcher.js',packedLauncher(name,index).replace("scope:'../'","scope:new URL('../',import.meta.url).href"));
 const production=await fs.readFile(packed+'/index.html','utf8');await fs.writeFile(out+'/index.html',production.replace(/src="\.\/assets\/index-[^"]+\.js"/,'src="./assets/safari-launcher.js"'));await fs.writeFile(out+'/diagnostic-build.json',JSON.stringify({variant,sha,rawApp:rawInfo.appBuildId,packedManifest:packedInfo.manifest},null,2));console.log(variant+' '+sha);
}
