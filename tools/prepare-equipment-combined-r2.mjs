import fs from 'node:fs/promises';import path from 'node:path';
const root='reports/local/equipment-fx-performance-20261016/prototypes',out=root+'/combined-r2',map=JSON.parse(await fs.readFile(root+'/combined-r1/overrides.json','utf8'));
async function put(file,text){const dest=out+'/'+file;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,text);map[file]=dest;}
const materialFile='src/render/materials/unit-material-batch.ts';await put(materialFile,await fs.readFile(root+'/material-slots/'+materialFile,'utf8'));
const rigidFile='src/render/effects/source/rigid-batch.ts';let rigid=await fs.readFile(map[rigidFile],'utf8');
rigid=rigid.replace('n.material.transparent||n.morphTargetInfluences',"n.material.transparent||n.geometry.hasAttribute('tangent')||n.morphTargetInfluences");await put(rigidFile,rigid);
const playerFile='src/render/effects/source/player.ts';let player=await fs.readFile(map[playerFile],'utf8');
player=player.replace('  for(const pool of this.meshPools.values()){','  for(const rigid of this.rigid.values())await rigid.prepare(compile);\n  for(const pool of this.meshPools.values()){');await put(playerFile,player);
const settingsFile='src/ui/presentation/settings-screen.ts';let settings=await fs.readFile(map[settingsFile],'utf8');
settings=settings.replace('<option value="${id}" ${id===value?', '<option value="${id}" ${key===\'combat-preset\'&&id===\'custom\'?\'disabled\':\'\'} ${id===value?');await put(settingsFile,settings);
await fs.writeFile(out+'/overrides.json',JSON.stringify(map,null,2));console.log({out,files:Object.keys(map).length});
