import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const label=process.argv[2],baseline=process.argv.includes('--baseline'),root='reports/local/7a-20261013',out=root+'/'+label,base='preview/camera-control-20261011';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');await fs.mkdir(out);
const frozen=path.resolve(root,'baseline/source'),extra=`
function resources7A(){const cache=sharedMaterialTextures as any;let objects=0,meshes=0;r.scene.traverse(node=>{objects++;if((node as any).isMesh)meshes++;});return {...mapCacheState(),objects,meshes,programs:r.renderer.info.programs?.length,models:r.gpu.size,textureDecodeReferences:{images:cache.images.size,cubes:cache.cubes.size},poseBytes:[...r.gpu.values()].reduce((sum,b)=>sum+b.textureBytes,0)};}
(window as any).materialLab.resources7A=resources7A;
(window as any).materialLab.clearMapWatch7A=()=>{watchedMap=null;};
function poseValues7A(){const rows:any[]=[];for(const [key,batch]of r.gpu)for(const [index,mesh]of batch.meshes.entries()){if(!mesh.visible||mesh.count===0)continue;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,r.renderer);const values=Object.fromEntries(['unitBind','unitAsset','turretPivot','unitAccentRange'].map(name=>[name,(shader.uniforms as any)[name]?.value.toArray()]));rows.push({key,index,material:material.name,count:mesh.count,values});}}return rows;}
(window as any).materialLab.poseValues7A=poseValues7A;
`;
const plugins=[{name:'seven-a-fixtures',setup(b){
 if(baseline)b.onResolve({filter:/^\./},args=>{const file=path.resolve(args.resolveDir,args.path),relative=path.relative(path.resolve('src'),file);if(!relative.startsWith('..')&&!path.isAbsolute(relative)){const target=path.join(frozen,'src',relative);return {path:path.extname(target)?target:target+'.ts'};}});
 b.onLoad({filter:/preview[\\/]camera-control-20261011[\\/]main\.ts$/},async args=>({contents:"import {sharedMaterialTextures} from '../../src/render/materials/shared-textures';\n"+await fs.readFile(args.path,'utf8')+extra,loader:'ts',resolveDir:path.dirname(args.path)}));
}}];
const result=await build({entryPoints:[base+'/main.ts'],bundle:true,write:false,metafile:true,format:'esm',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'},plugins});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),inputs=[];
for(const file of Object.keys(result.metafile.inputs).sort()){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:sha(bytes)});}
const js=result.outputFiles[0].contents,html=(await fs.readFile(base+'/index.html','utf8')).replace('./main.ts','./main.js'),release=JSON.parse(await fs.readFile(root+'/baseline/web/web-release.json','utf8')),manifest=await fs.readFile(root+'/baseline/web/'+release.manifest);
await fs.writeFile(out+'/main.js',js);await fs.writeFile(out+'/index.html',html);await fs.writeFile(out+'/asset-manifest.json',manifest);
await fs.writeFile(out+'/diagnostic-extra.ts',extra);await fs.copyFile(new URL(import.meta.url),out+'/builder.mjs');
await fs.writeFile(out+'/build.json',JSON.stringify({label,baseline,jsSha256:sha(js),htmlSha256:sha(html),manifestSha256:sha(manifest),extraSha256:sha(extra),inputs,method:'Identical native fixed-input fixtures. Baseline imports frozen actual 0.6.25 sources. Resource counters and disposal listeners are diagnostic only.'},null,2));
console.log(JSON.stringify({out,baseline,inputs:inputs.length,jsSha256:sha(js)}));
