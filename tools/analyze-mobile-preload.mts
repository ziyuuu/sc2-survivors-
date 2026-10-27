import fs from 'node:fs';import path from 'node:path';
import {World} from '../src/simulation/world';import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';import {planFirstBossLoot} from '../src/simulation/boss-loot';
import {modelPreloadAssets} from '../src/app/race-preload';import {unitMaterialDependencies} from '../src/render/materials/unit-material-loader';import {displayAssetModelKey} from '../src/render/materials/elite-visual';
const root=path.resolve('sites/size-optimized-site/public'),release=JSON.parse(fs.readFileSync(root+'/web-release.json','utf8')),manifest=JSON.parse(fs.readFileSync(root+'/'+release.manifest,'utf8'));
function resources(models:Map<string,any>){const ids=new Set<string>();for(const [key,type]of models)for(const id of modelPreloadAssets([[displayAssetModelKey(key),type]])){ids.add(id);for(const texture of unitMaterialDependencies(id.slice(6)))ids.add(texture);}const unique=new Map<string,number>();for(const id of ids){const a=manifest.assets[id];if(a)unique.set(a.sha256,a.bytes);}return {models:models.size,resourceIds:ids.size,uniqueFiles:unique.size,decodedResourceBytes:[...unique.values()].reduce((n,b)=>n+b,0)};}
const rows=[];
for(const race of ['terran','zerg','protoss'] as const){const world=new World({race,seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});world.start();const view=Object.assign(Object.create(BattleRenderer.prototype),{world,memoryConstrainedPreload:true});
 for(let stage=1;stage<=3;stage++){world.stage=stage;if(stage===3)planFirstBossLoot(world);rows.push({race,stage,previous:resources(view.completePreloadModels()),mobile:resources(view.backgroundPreloadModels())});}}
const output={scope:'optional preload plans only; resource bytes are manifest decoded file sizes, not measured device RAM or VRAM',rows};
fs.mkdirSync('reports/local/sites-mobile-20261028',{recursive:true});fs.writeFileSync('reports/local/sites-mobile-20261028/preload-plan.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output));
