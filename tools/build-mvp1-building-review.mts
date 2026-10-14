import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'vite';

const arg=(key:string,fallback:string)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)??fallback;
const diagnostic=process.argv.includes('--diagnostic');
const sourceRoot=path.resolve(arg('source','.'));
const output=arg('out',diagnostic?'reports/local/mvp1-building-main-20261013/diagnostic-r1':'dist/MVP1-Building-Main-20261013-R1');
if(output.includes('..')||!(output.startsWith('reports/local/mvp1-building-main-20261013/')||output.startsWith('dist/MVP1-Building-Main-20261013-')))throw Error('Unsafe review output');
await fs.access(output).then(()=>{throw Error('Review output already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const inputs=new Map<string,{file:string;bytes:number;sha256:string}>();
const exposure='window.__SC2_REPORT__=()=>';
const result=await build({root:sourceRoot,configFile:false,publicDir:false,base:'./',build:{outDir:path.resolve(output),emptyOutDir:false,target:'es2022',sourcemap:false},plugins:[{name:'frozen-approved-opening',async transformIndexHtml(html){return html.replace('<!--SC2_OPENING-->',await fs.readFile(path.join(sourceRoot,'src/ui/presentation/opening.generated.html'),'utf8'));}},{
 name:'building-review-inputs',enforce:'pre',async transform(source,id){
  const file=id.split('?')[0],relative=path.relative(sourceRoot,file).replaceAll('\\','/');
  if(relative.startsWith('..')||path.isAbsolute(relative)||relative.includes('node_modules/')||relative.startsWith('\0'))return;
  const bytes=await fs.readFile(file).catch(()=>null);if(bytes)inputs.set(relative,{file:relative,bytes:bytes.length,sha256:sha(bytes)});
  if(diagnostic&&relative==='src/app/bootstrap.ts'){
   if(!source.includes(exposure))throw Error('Native reference hook did not bind');
   return {code:source.replace(exposure,"(window as any).__MVP1_NATIVE__={world,view,hud,session,readiness,background,controls,driver};"+exposure),map:null};
  }
 }
}]});
if(!result)throw Error('Vite build produced no result');
const base=JSON.parse(await fs.readFile('deploy/coze/public/web-release.json','utf8'));
await fs.copyFile('deploy/coze/public/'+base.manifest,output+'/'+base.manifest);
const manifest=JSON.parse(await fs.readFile(output+'/'+base.manifest,'utf8'));
const files: {file:string;bytes:number;sha256:string}[]=[];
async function walk(dir:string){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else {const bytes=await fs.readFile(file);files.push({file:path.relative(output,file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});}}}
await walk(output);files.sort((a,b)=>a.file.localeCompare(b.file));
const appBuildId=sha(JSON.stringify(files));
const payloadFiles=files.slice();
let index=await fs.readFile(output+'/index.html','utf8');index=index.replace('<head>',`<head><meta name="sc2-app-build" content="${appBuildId}"><meta name="sc2-asset-manifest" content="./${base.manifest}">`);
await fs.writeFile(output+'/index.html',index);await fs.writeFile(output+'/runtime-config.json',JSON.stringify({assetBaseUrl:''}));
await fs.writeFile(output+'/web-release.json',JSON.stringify({...base,appBuildId,diagnostic,review:true,source:'MVP1 building formal integration; existing 0.6.26 resources'},null,2));
files.length=0;await walk(output);files.sort((a,b)=>a.file.localeCompare(b.file));
const report={at:new Date().toISOString(),output,sourceRoot,appBuildId,diagnostic,method:diagnostic?'Production source with one native-reference exposure; no simulation, input, rendering or clock transforms.':'Production entry with no debug or native-reference exposure.',inputs:[...inputs.values()].sort((a,b)=>a.file.localeCompare(b.file)),payloadFiles,builtFiles:files,resources:{release:base.release,records:Object.keys(manifest.assets).length,files:base.fileCount,assetRoot:'deploy/runtime',copiedResources:0}};
await fs.writeFile(output+'/build-inputs.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({output,appBuildId,diagnostic,inputs:inputs.size,resources:report.resources}));
