import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain,MAP_THEMES,type CampaignTheme} from '../src/data/campaign-map';
import {MISSION_KINDS} from '../src/simulation/missions/state';
import {spawnMission,missionPointLegal} from '../src/simulation/missions/runtime';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {tickSpecialEntrance} from '../src/simulation/special-stages/runtime';
const rows:any[]=[],failures:any[]=[];
for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[]){const terrain=campaignTerrain({version:3,theme,seed:529});
 for(const kind of [...MISSION_KINDS,'portal'] as const){let result;
  for(let trial=1;trial<=64&&!result;trial++){const seed=Math.imul(trial,0x9e3779b9)>>>0,w=new World({seed,waves:true,terrain,obstacles:[],equipmentAccount:newEquipmentAccount(seed)});assert.ok(w.start());w.stage=12;w.stageElapsed=20;w.prepareStage();w.pods=[];const egg=w.spawnEconomic('egg',{x:0,z:3});w.hit(egg,1e12,[],1,'terran',0,1,w.allies()[0].id);assert.ok(w.workers>0);
   if(kind==='portal'){tickSpecialEntrance(w);if(w.specialStages.portal){const p=w.specialStages.portal.point;assert.ok(terrain.isOpen(p)&&terrain.canOccupy(p,1));assert.ok(terrain.walkLine(w.anchor,p,.8));result={kind:w.specialStages.portal.kind,point:p};}}
   else if(spawnMission(w,kind)){const m=w.missions.active!,bodies=m.bodyIds.map(id=>w.missions.bodies.get(id)!);assert.ok(bodies.length);for(const b of bodies){assert.ok(terrain.isOpen(b),kind);assert.ok(terrain.canOccupy(b,b.unitRadius),kind);}result={phase:m.phase,bodies:bodies.map(b=>({role:b.role,x:b.x,z:b.z,radius:b.unitRadius})),reward:m.reward};}
   if(result)rows.push({theme,stage:12,seed,kind,trial,result});else failures.push({theme,kind,seed,trial});
  }assert.ok(result,theme+'/'+kind);
 }console.log(JSON.stringify({theme,rows:rows.filter(r=>r.theme===theme).length}));
}
await fs.writeFile('reports/local/integration-i03-20261022/map-paths.json',JSON.stringify({at:new Date().toISOString(),scope:'Five production map geometries; controlled stage/funding/combat. Task kind is directly requested solely for geometry/admission verification; automatic kind/probability reachability is separate in event-sources.json. Portals use native random trial.',rows,failedAdmissions:failures},null,2));
