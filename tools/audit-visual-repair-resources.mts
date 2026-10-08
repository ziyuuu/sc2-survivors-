/** Read-only current-resource inventory; does not regenerate GLBs, DDSs or registries. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ASSETS} from '../src/assets/manifest';
import {MAP_THEMES} from '../src/data/campaign-map';
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const out='reports/local/visual-repair-research-20261008';await fs.mkdir(out,{recursive:true});
const models:any[]=[],missing:any[]=[],files=new Map<string,{bytes:number;sha256:string}>();
for(const a of ASSETS.values()){
 if(a.status!=='available')continue;
 const file='public/'+a.url.replace(/^\//,'');let b:Buffer;
 try{b=await fs.readFile(file);}catch(e){missing.push({id:a.id,file,error:String(e)});continue;}
 files.set(file,{bytes:b.length,sha256:sha(b)});
 if(!a.id.startsWith('model.')||!a.url.endsWith('.glb'))continue;
 if(b.toString('ascii',0,4)!=='glTF')throw Error('Not a binary GLB: '+a.id);
 const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),mats=j.materials??[],p=(j.meshes??[]).flatMap((m:any)=>m.primitives);
 models.push({id:a.id,sha256:sha(b),bytes:b.length,source:j.asset?.extras,primitives:p.length,withNormals:p.filter((v:any)=>v.attributes.NORMAL!==undefined).length,withTangents:p.filter((v:any)=>v.attributes.TANGENT!==undefined).length,animations:(j.animations??[]).length,materials:mats.map((m:any)=>({name:m.name,role:m.extras?.sc2?.role,blend:m.extras?.sc2?.blend,diffuse:!!m.pbrMetallicRoughness?.baseColorTexture,normal:!!m.normalTexture,specular:!!m.extensions?.KHR_materials_specular,occlusion:!!m.occlusionTexture,emissive:!!m.emissiveTexture,emissive2:!!m.extras?.sc2?.layers?.some((l:any)=>l.role==='emissive2'),unlit:!!m.extensions?.KHR_materials_unlit,roughness:m.pbrMetallicRoughness?.roughnessFactor,metalness:m.pbrMetallicRoughness?.metallicFactor,auxLayers:m.extras?.sc2?.layers??[]}))});
}
const unitModels=models.filter(m=>!m.id.endsWith('.death')&&!/^model\.(map|terrain|loot|projectile)\./.test(m.id));
const mats=unitModels.flatMap(m=>m.materials),sum=(key:string)=>mats.filter(m=>m[key]).length;
const problematic=unitModels.flatMap(m=>m.materials.filter((v:any)=>v.unlit&&!v.diffuse&&v.emissive).map((v:any)=>({model:m.id,material:v.name,blend:v.blend})));
const allProblematic=models.flatMap(m=>m.materials.filter((v:any)=>v.unlit&&!v.diffuse&&v.emissive).map((v:any)=>({model:m.id,material:v.name,blend:v.blend})));
const incompatibleExtensions=models.flatMap(m=>m.materials.filter((v:any)=>v.unlit&&v.specular).map((v:any)=>({model:m.id,material:v.name,issue:'KHR_materials_specular excludes KHR_materials_unlit on the same material'})));
const resourceCatalog=JSON.parse(await fs.readFile('deploy/coze/public/web-release.json','utf8'));
const expected=JSON.parse(await fs.readFile('deploy/coze/public/'+resourceCatalog.manifest,'utf8')).assets;
const releaseMismatches=[...ASSETS.values()].flatMap(a=>{const f=files.get('public/'+a.url.replace(/^\//,'')),e=expected[a.id];return !f||!e||f.sha256!==e.sha256||f.bytes!==e.bytes?[a.id]:[];});
if(releaseMismatches.length)throw Error('Development resources differ from protected release: '+releaseMismatches.join(','));
const unique=new Map([...files.values()].map(f=>[f.sha256,f]));
const result={date:'2026-10-08',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Read each available development resource, parse actual GLB JSON; counts exclude death/map/terrain/loot/projectile when reporting unitModels (some buildings and upgrade helpers remain included). Suspicious unlit materials are candidates, not individually proven visible defects. No native SC2 pixel-equivalence claim.',records:ASSETS.size,developmentPaths:files.size,developmentBytes:[...files.values()].reduce((n,f)=>n+f.bytes,0),uniqueContents:unique.size,uniqueBytes:[...unique.values()].reduce((n,f)=>n+f.bytes,0),missing,unitSummary:{models:unitModels.length,materials:mats.length,diffuse:sum('diffuse'),normal:sum('normal'),specular:sum('specular'),occlusion:sum('occlusion'),emissive:sum('emissive'),unlit:sum('unlit'),emissiveOnlyUnlit:problematic.length},emissiveOnlyUnlit:problematic,maps:MAP_THEMES,models,resourceCatalog,files:Object.fromEntries(files)};
await fs.writeFile(out+'/resource-audit.json',JSON.stringify(result,null,2));
await fs.writeFile(out+'/material-candidates.json',JSON.stringify({scope:'All current GLBs including deaths and helpers',modelCount:models.length,materialCount:models.reduce((n,m)=>n+m.materials.length,0),candidateCount:allProblematic.length,affectedModels:new Set(allProblematic.map(v=>v.model)).size,rows:allProblematic,interpretation:'Candidates requiring visual/source verification, not a count of proven visible defects'},null,2));
await fs.writeFile(out+'/extension-audit.json',JSON.stringify({scope:'All current GLBs including deaths and helpers',count:incompatibleExtensions.length,rows:incompatibleExtensions},null,2));
await fs.writeFile(out+'/release-verification.json',JSON.stringify({build:resourceCatalog.appBuildId,release:resourceCatalog.release,checkedRecords:ASSETS.size,uniqueContents:unique.size,uniqueBytes:result.uniqueBytes,mismatches:releaseMismatches},null,2));
console.log(JSON.stringify({records:result.records,developmentPaths:result.developmentPaths,uniqueContents:result.uniqueContents,uniqueBytes:result.uniqueBytes,missing,unitSummary:result.unitSummary,emissiveOnlyUnlit:problematic}));
if(missing.length)process.exitCode=1;
