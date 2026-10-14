import {loadIntermissionAssets} from './intermission-assets.mjs';
import {loadNativeHudAssets} from './native-hud-assets.mjs';
import {loadMaterialTextures} from './material-textures.mjs';
import {loadEnvironmentTextures} from './environment-textures.mjs';
import {loadEnvironmentScenery} from './environment-scenery.mjs';
import {loadCombatEffects} from './combat-effects-assets.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Assemble a new immutable application package. Never deploys, installs or overwrites a release.
const arg=process.argv.indexOf('--out');
const destination=path.resolve(arg>=0?process.argv[arg+1]:'dist/Current-Coze-Application-20261006');
const performanceStage=process.argv.includes('--performance');
const fidelityStage=process.argv.includes('--ui-fidelity');
const cozeStage=process.argv.includes('--coze');
const openingStage=process.argv.includes('--opening');
const battleUiStage=process.argv.includes('--battle-ui');
const mvp5Stage=process.argv.includes('--mvp5-lifecycle');
const mvp7aStage=process.argv.includes('--mvp7a')||mvp5Stage;
const refractionScienceStage=process.argv.includes('--refraction-science')||mvp7aStage;
const combatStage=process.argv.includes('--combat-effects')||refractionScienceStage;
const cinematicStage=process.argv.includes('--cinematic-preload')||combatStage;
const loadingStage=process.argv.includes('--loading-optimization')||cinematicStage;
const cameraControlStage=process.argv.includes('--camera-control')||loadingStage;
const cameraStage=process.argv.includes('--camera-calibration')||cameraControlStage;
const terrainBatch4Stage=process.argv.includes('--terrain-batch4')||cameraStage;
const lightingBatch3Stage=process.argv.includes('--lighting-batch3')||terrainBatch4Stage;
const materialBatch2Stage=process.argv.includes('--material-batch2')||lightingBatch3Stage;
const materialBatchStage=process.argv.includes('--material-batch1')||materialBatch2Stage;
const nativeHudStage=process.argv.includes('--native-hud')||materialBatchStage;
const entryStage=process.argv.includes('--entry-fixes')||nativeHudStage;
const feedbackStage=process.argv.includes('--ui-battle-feedback')||entryStage;
const intermissionStage=process.argv.includes('--intermission-ui')||feedbackStage;
const repairs459Stage=process.argv.includes('--repairs-459')||nativeHudStage;
const maintenanceStage=process.argv.includes('--maintenance')||repairs459Stage||intermissionStage;
const baselineArg=process.argv.indexOf('--baseline');
const webArg=process.argv.indexOf('--web'),resourceArg=process.argv.indexOf('--resources');
const web=path.resolve(webArg>=0?process.argv[webArg+1]:'dist/web'),resourceRoot=path.resolve(resourceArg>=0?process.argv[resourceArg+1]:web),baseline=path.resolve(baselineArg>=0?process.argv[baselineArg+1]:'deploy/coze');
const relative=path.relative(path.resolve('dist'),destination);
if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Output must be a new folder inside dist');
await fs.mkdir(destination,{recursive:false});
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(web,release.manifest),'utf8'));
const resources=new Set<string>(Object.values(manifest.assets).map((a:any)=>a.url));
async function copy(from:string,to:string,exclude=new Set<string>(),prefix=''){
 for(const e of await fs.readdir(from,{withFileTypes:true})){
  const name=prefix+e.name;if(exclude.has(name))continue;const dest=path.join(to,e.name);
  if(e.isDirectory()){await fs.mkdir(dest,{recursive:true});await copy(path.join(from,e.name),dest,exclude,name+'/');}
  else{await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(from,e.name),dest);}
 }
}
await copy(web,path.join(destination,'public'),resources);
await copy('tools/backend',path.join(destination,'backend'));
for(const [from,to] of [
 ['tools/coze-web-server.mjs','coze-web-server.mjs'],['tools/apply-coze-update.mjs','apply-update.mjs'],
 ['tools/start-coze.mjs','start-coze.mjs'],['tools/fetch-coze-resources.mjs','fetch-resources.mjs'],
 ['docs/project/CURRENT_COZE_HANDOFF_20261006.md','README.md'],
 ['docs/project/UI_INTEGRATION_20261006.md','UI_INTEGRATION_20261006.md'],
 ['docs/project/UI_INTEGRATION_VALIDATION_20261006.md','UI_INTEGRATION_VALIDATION_20261006.md'],
 ['docs/project/P6_COZE_DEPLOY_20261006.md','P6_COZE_DEPLOY_20261006.md'],
 ['docs/project/P5_BACKEND_HANDOFF_20261006.md','P5_BACKEND_HANDOFF_20261006.md'],
 ['docs/project/P5_PLAYER_DATA_NOTICE_20261006.md','PLAYER-DATA.md'],
 ['deploy/coze/.env.example','.env.example']
])await fs.copyFile(from,path.join(destination,to));
if(performanceStage)for(const name of ['FIXED_SCENE_PERFORMANCE_20261006.md','FIXED_SCENE_PERFORMANCE_VALIDATION_20261006.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
if(fidelityStage)for(const name of ['UI_FIDELITY_ROUND_20261006.md','UI_FIDELITY_ROUND_VALIDATION_20261006.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
if(cozeStage){
 // Runtime JS/WASM/data and licenses remain byte-identical. Development-only
 // maps and declarations are unnecessary on the deployed Node server.
 const vendorFiles=await list(path.join(baseline,'vendor'));
 const omitted=maintenanceStage?new Set(vendorFiles.filter(name=>/\.(?:map|d\.(?:ts|cts|mts))$/.test(name))):new Set<string>();
 await copy(path.join(baseline,'vendor'),path.join(destination,'vendor'),omitted);
 for(const name of ['sc2-backend.conf','BACKEND_DEPLOY_LOGIC_20261007.md'])await fs.copyFile(path.join(baseline,name),path.join(destination,name));
 await fs.copyFile('docs/project/UI_COZE_MAIN_20261007.md',path.join(destination,'UI_COZE_MAIN_20261007.md'));
}
if(openingStage)for(const name of ['OPENING_COVER_FLAME_20261007.md','UI_FLOW_ART_AUDIT_20261007.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
if(battleUiStage)for(const name of ['BATTLE_UI_INTEGRATION_20261008.md','BATTLE_UI_INTEGRATION_VALIDATION_20261008.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
if(repairs459Stage)await fs.copyFile('docs/project/REPAIRS_459_20261009.md',path.join(destination,'REPAIRS_459_20261009.md'));
if(intermissionStage)await fs.copyFile('docs/project/INTERMISSION_INTEGRATION_20261009.md',path.join(destination,'INTERMISSION_INTEGRATION_20261009.md'));
if(feedbackStage)await fs.copyFile('docs/project/UI_BATTLE_FEEDBACK_20261009.md',path.join(destination,'UI_BATTLE_FEEDBACK_20261009.md'));
if(nativeHudStage)for(const name of ['NATIVE_HUD_INTEGRATION_20261010.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
if(materialBatchStage)await fs.copyFile('docs/project/MATERIAL_BATCH1_20261010.md',path.join(destination,'MATERIAL_BATCH1_20261010.md'));
if(materialBatch2Stage)await fs.copyFile('docs/project/MATERIAL_BATCH2_20261010.md',path.join(destination,'MATERIAL_BATCH2_20261010.md'));
if(lightingBatch3Stage)await fs.copyFile('docs/project/LIGHTING_BATCH3_20261010.md',path.join(destination,'LIGHTING_BATCH3_20261010.md'));
if(cameraControlStage)await fs.copyFile('docs/project/CAMERA_CONTROL_20261011.md',path.join(destination,'CAMERA_CONTROL_20261011.md'));
if(cinematicStage)await fs.copyFile('docs/project/CINEMATIC_PRELOAD_20261012.md',path.join(destination,'CINEMATIC_PRELOAD_20261012.md'));
if(combatStage)for(const name of ['COMBAT_EFFECTS_20261012.md','COMBAT_EFFECTS_SOURCES_20261012.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
if(refractionScienceStage){
 for(const name of ['REFRACTION_SCIENCE_20261013.md','REFRACTION_SCIENCE_SOURCES_20261013.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
 if(!mvp7aStage){
 const historical=await fs.readFile(path.join(destination,'README.md'),'utf8');
 await fs.writeFile(path.join(destination,'README.md'),`# 本包：原版折射与科学球修复 · 应用 0.6.25\n\n本包的 Web 构建为 \`${release.appBuildId}\`，资源版本为 \`${release.release}\`，共 ${release.assetCount} 条资源记录／${release.fileCount} 个文件。准确应用清单以同目录 \`delivery.json\` 为准。\n\n本輪接入 14 种实际可绘制的原版屏幕折射定义，以及三档全息科学球的原版皮肤死亡替换。详情见 [本轮说明](REFRACTION_SCIENCE_20261013.md) 和 [来源链](REFRACTION_SCIENCE_SOURCES_20261013.md)。折射幅度的实际客户端校准、人工与完整性能验收仍开放；密集遮挡后移。\n\n包内不含数据库和账号。既有启动、配置保留、资源校验和回滚流程不变；资源按清单复用与补齐。本地交付不表示已执行线上 Coze、数据库或后台操作。\n\n## 历史运行与部署参考\n\n以下是此前交接文档的快照，其中 R3／0.6.24 等旧构建号、旧文件名及“当前”均指原记录。它们不替代上面的本包构建号，也不代表本包已完成线上验收。\n\n${historical}`);
 }
}
if(mvp7aStage){
 await fs.copyFile('docs/project/MVP7A_LOADING_20261013.md',path.join(destination,'MVP7A_LOADING_20261013.md'));
 await fs.copyFile('docs/project/MVP7A_LOADING_VALIDATION_20261013.md',path.join(destination,'MVP7A_LOADING_VALIDATION_20261013.md'));
 const historical=await fs.readFile(path.join(destination,'README.md'),'utf8');
 await fs.writeFile(path.join(destination,'README.md'),`# 本包：MVP 7A 加载与准备优化 · 应用 0.6.26\n\nWeb 构建为 \`${release.appBuildId}\`，资源版本为 \`${release.release}\`，共 ${release.assetCount} 条资源记录／${release.fileCount} 个文件。准确应用清单见 \`delivery.json\`。\n\n本批优化原始动画准备并核验加载调度，保留原素材、战斗规则、效果、画质、相机和存档格式。实验选择、实测收益与限制见 [7A 说明](MVP7A_LOADING_20261013.md)。完整内容的 60 FPS、最终画质档及跨设备验收仍在 7B。\n\n包内不含数据库或账号；既有启动、配置保留、资源校验和回滚流程保持。此为本地交付，没有执行线上 Coze、数据库或后台操作。\n\n## 历史运行与部署参考\n\n下面保留此前批次的原始记录；其中旧版本号和“当前”指当时批次，不替代上面的本包身份。\n\n${historical}`);
}
if(loadingStage)await fs.copyFile('docs/project/LOADING_OPTIMIZATION_20261012.md',path.join(destination,'LOADING_OPTIMIZATION_20261012.md'));
if(mvp5Stage){
 for(const name of ['MVP5_FULL_MAP_20261014.md','MVP5_FULL_MAP_PLAN_20261014.md','MVP1_BUILDING_INTEGRATION_20261013.md'])await fs.copyFile('docs/project/'+name,path.join(destination,name));
 const historical=await fs.readFile(path.join(destination,'README.md'),'utf8');
 await fs.writeFile(path.join(destination,'README.md'),`# 五图环境生命周期验证候选 · 0.6.27-rc.1\n\nWeb 构建 \`${release.appBuildId}\`，资源版本 \`${release.release}\`，${release.assetCount} 条记录／${release.fileCount} 个文件。本包用于步骤3、4的隔离资源更新与运行验证，尚未作为步骤5正式交付，也未同步Current或应用镜像。\n\n包含已核验的建筑新局接入和五图完整环境。详情见 [五图实施记录](MVP5_FULL_MAP_20261014.md)。旧档转换、完整MVP、7B及生产/B4仍按原约定保留。应用依赖外部资源；来源与校验见resource-groups.json及delivery.json。\n\n## 历史交付参考\n\n以下为此前交付记录，版本号和“当前”均指当时批次。\n\n${historical}`);
}
if(cameraStage)await fs.copyFile('docs/project/CAMERA_CALIBRATION_20261011.md',path.join(destination,'CAMERA_CALIBRATION_20261011.md'));
if(terrainBatch4Stage)await fs.copyFile('docs/project/TERRAIN_BATCH4_20261011.md',path.join(destination,'TERRAIN_BATCH4_20261011.md'));
if(entryStage)await fs.copyFile('docs/project/ENTRY_FIXES_20261009.md',path.join(destination,'ENTRY_FIXES_20261009.md'));
if(maintenanceStage)await fs.copyFile('docs/project/MAINTENANCE_SCOPE_20261008.md',path.join(destination,'MAINTENANCE_SCOPE_20261008.md'));
const pkg=JSON.parse(await fs.readFile(path.join(baseline,'package.json'),'utf8'));
const lock=JSON.parse(await fs.readFile(path.join(baseline,'package-lock.json'),'utf8'));
pkg.name=lock.name=lock.packages[''].name='sc2-survivors-current-application';
pkg.version=lock.version=lock.packages[''].version=mvp7aStage?'0.6.26':refractionScienceStage?'0.6.25':combatStage?'0.6.24':cinematicStage?'0.6.23':loadingStage?'0.6.22':cameraControlStage?'0.6.21':cameraStage?'0.6.20':terrainBatch4Stage?'0.6.19':lightingBatch3Stage?'0.6.18':materialBatch2Stage?'0.6.17':materialBatchStage?'0.6.16':nativeHudStage?'0.6.15':entryStage?'0.6.14':feedbackStage?'0.6.13':intermissionStage?'0.6.12':repairs459Stage?'0.6.11':maintenanceStage?'0.6.10':battleUiStage?'0.6.9':openingStage?'0.6.8':cozeStage?'0.6.7':fidelityStage?'0.6.6':performanceStage?'0.6.5':'0.6.4';
if(mvp5Stage)pkg.version=lock.version=lock.packages[''].version='0.6.27-rc.1';
for(const [name,data]of [['package.json',pkg],['package-lock.json',lock]]as const)await fs.writeFile(path.join(destination,name),JSON.stringify(data,null,2)+'\n');
const priorGroups=JSON.parse(await fs.readFile(path.join(baseline,'resource-groups.json'),'utf8'));
const priorByUrl=new Map<string,any>(priorGroups.files.map((row:any)=>[row.url,row]));
const sourceCatalog=JSON.parse(await fs.readFile('deploy/runtime/source-assets.json','utf8'));
const sources=new Map<string,any>(sourceCatalog.entries.map((row:any)=>[row.sha256,row]));
const uiCatalog=JSON.parse(await fs.readFile('deploy/runtime/ui-assets.json','utf8'));
uiCatalog.records.push(...await loadIntermissionAssets());
uiCatalog.records.push(...await loadNativeHudAssets());
const uiSources=new Map<string,any>(uiCatalog.records.map((r:any)=>[r.packedSha256,r]));
const materialSources=new Map<string,any>((await loadMaterialTextures()).map((r:any)=>[r.packedSha256,r]));
const environmentSources=new Map<string,any>((await loadEnvironmentTextures()).map((r:any)=>[r.packedSha256,r]));
const scenerySources=new Map<string,any>((mvp5Stage?await loadEnvironmentScenery():[]).map((r:any)=>[r.packedSha256,r]));
const combatSources=new Map<string,any>((await loadCombatEffects()).map((r:any)=>[r.packedSha256,r]));
for(const row of uiCatalog.records){const b=await fs.readFile(row.sourceFile);if(b.length!==row.bytes||sha(b)!==row.sourceSha256||row.sourceSha256!==row.packedSha256||row.gitPath!=='deploy/runtime/assets/'+row.packedSha256+path.extname(row.sourceFile)||sha(await fs.readFile(row.gitPath))!==row.packedSha256)throw Error('UI source mismatch: '+row.id);}
const currentByUrl=new Map<string,any>();
for(const [id,asset]of Object.entries<any>(manifest.assets)){
 let row=currentByUrl.get(asset.url);
 if(!row){
  const old=priorByUrl.get(asset.url),source=sources.get(asset.sha256),ui=uiSources.get(asset.sha256),material=materialSources.get(asset.sha256),environment=environmentSources.get(asset.sha256),combat=combatSources.get(asset.sha256);
  const scenery=scenerySources.get(asset.sha256),derived=ui??material??environment??combat??scenery,verified=source??(derived&&{bytes:derived.bytes,gitPath:derived.gitPath});
  if(!verified||verified.bytes!==asset.bytes)throw Error('Resource is not in the verified original catalog: '+id);
  if(old&&(old.bytes!==asset.bytes||old.sha256!==asset.sha256))throw Error('Preserved resource changed: '+id);
  if(!old&&!id.startsWith('model.map.')&&!(id.startsWith('ui.')&&ui?.id===id)&&!(materialBatch2Stage&&id.startsWith('material.')&&material)&&!(terrainBatch4Stage&&id.startsWith('terrain.visual.')&&environment?.id===id)&&!(combatStage&&id.startsWith('combat-fx.')&&combat)&&!(mvp5Stage&&id.startsWith('environment.sample.')&&scenery?.id===id))throw Error('Unexpected non-map resource addition: '+id);
  row={...asset,groups:old?.groups??(ui||material||combat?['common']:['campaign']),ids:[],gitPath:verified.gitPath};currentByUrl.set(asset.url,row);
 }
 row.ids.push(id);
}
for(const row of priorGroups.files)if(!currentByUrl.has(row.url))throw Error('Preserved resource removed: '+row.url);
const groups={version:priorGroups.version,release:release.release,groups:priorGroups.groups,files:[...currentByUrl.values()].sort((a,b)=>a.url.localeCompare(b.url))};
for(const row of groups.files){const b=await fs.readFile(path.join(resourceRoot,row.url));if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('Resource mismatch: '+row.url);}
const added=groups.files.filter(row=>!priorByUrl.has(row.url));
await fs.writeFile(path.join(destination,'resource-groups.json'),JSON.stringify(groups,null,2));
await fs.writeFile(path.join(destination,'resource-delta.json'),JSON.stringify({from:priorGroups.release,to:release.release,appBuildId:release.appBuildId,files:added,reused:groups.files.length-added.length,newResourceBytes:added.reduce((n,row)=>n+row.bytes,0),retainedOldResources:true},null,2));
async function list(dir:string,prefix=''):Promise<string[]>{const out:string[]=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))out.push(...(e.isDirectory()?await list(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]));return out;}
const appFiles=[];for(const file of await list(destination)){const b=await fs.readFile(path.join(destination,file));appFiles.push({path:file,bytes:b.length,sha256:sha(b)});}
const packageBuildId=sha(JSON.stringify([...appFiles].sort((a,b)=>a.path.localeCompare(b.path))));
await fs.writeFile(path.join(destination,'delivery.json'),JSON.stringify({status:mvp7aStage?'Measured animation preparation improvements; loading scheduling alternatives evaluated and rejected; original assets, rules, camera, effects and saves retained; full-content performance remains 7B; local validation only; no live deployment':refractionScienceStage?'Original M3 screen refraction and verified PurifierHologram Science Vessel death replacement; unchanged gameplay, camera and save schemas; client amplitude calibration and human acceptance remain open; local validation only; no live deployment':combatStage?'Source-bound per-weapon combat meshes, emitters, ribbons and impacts; actual native trajectories, saved continuous state, approved elites and heroes retained; original camera, lighting, gameplay, loading flow and save schemas unchanged; local validation only; no live deployment':loadingStage?'Shared original texture decoding, exact generated shader reuse, bounded screen prewarming and optional common opening warmup; original camera, gameplay, assets and saves retained; local validation only; no live deployment':cameraStage?'Calibrated team-following perspective camera, independent orientation zoom preferences, native wheel/keyboard/canvas pinch controls and settings; original gameplay/resources/save schemas retained; local validation only; no live deployment':terrainBatch4Stage?'Source-bound five-map terrain layers, environmental material repairs, grounded rocks and bounded native-time atmosphere; unchanged map geometry, simulation, saves and lighting; local validation only; no live deployment':lightingBatch3Stage?'Approved auxiliary-marker cleanup, native acid surfaces, five-map lighting, posed PCF shadows and ambient contact; gameplay, original resources and output chain retained; local validation only; no live deployment':materialBatch2Stage?'All roster source-bound material channels and timelines, original team masks, calibrated elite bodies and native mechanism feedback; original gameplay and resource bytes retained; local validation only; no live deployment':materialBatchStage?'Original Immortal barrier and Zealot death material tracks, per-instance clocks and fixed linear HDR/Bloom/ACES/sRGB output; original gameplay and resources retained; local validation only; no live deployment':nativeHudStage?'Approved native HUD, original six skin frames, per-race hard campaign cosmetic unlock and retained battle actions; local validation only; no live deployment':entryStage?'Ordered entrance loading and cancellation, pod health, responsive menu/card layout and formal save notice; original gameplay/resources retained; no live deployment':feedbackStage?'Unified UI actions, grouped purchased enhancements, minimap telegraphs and casualty/Boss presentation; no gameplay rule change or live deployment':intermissionStage?'Approved shop/development UI, four peer services, two settings categories, unified arrival cards, approved full-roster supply promotion; no live deployment':repairs459Stage?'Items 4/5/9: automatic pickup arrivals, approved R4 reveal, closed player catalogue, first-facility baseline unlocks; no live deployment':maintenanceStage?'Maintenance: unreachable UI removed and deployment-only development files omitted; twelve reported repairs are audited and planned, not applied; live deployment not performed':battleUiStage?'Approved battle HUD and card presentation integration; local validation; live deployment not performed':cozeStage?'UI fidelity and Coze v10 deployment integration; local validation; live deployment not performed':fidelityStage?'local UI fidelity and intangible continuous control-point candidate; not deployed':performanceStage?'local fixed-scene performance candidate; natural performance gate open; not deployed':'local formal UI candidate; not deployed',appBuildId:release.appBuildId,packageBuildId,runSchema:release.runSchema,profileVersion:6,release:release.release,appFiles,assets:groups.files.length,resourceBytes:release.assetBytes,includesDatabase:false,includesAccounts:false,resourcesIncluded:0,...(cozeStage?{coze:{baseline:'ed70fe4',configurationIncluded:true,vendoredPglite:true,privateBundleIncluded:false}}:{})},null,2));
if(mvp5Stage){const file=path.join(destination,'delivery.json'),delivery=JSON.parse(await fs.readFile(file,'utf8'));delivery.status='MVP5 steps 3 and 4 isolated lifecycle/update candidate; building new-run integration and full five-map environments; not step 5 delivery, no Current/mirror synchronization or live deployment';await fs.writeFile(file,JSON.stringify(delivery,null,2));}
console.log(JSON.stringify({destination,packageBuildId,appBuildId:release.appBuildId,runSchema:release.runSchema,appFiles:appFiles.length,resourceAdditions:added.length,deployed:false}));
