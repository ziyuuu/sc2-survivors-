import fs from 'node:fs';
const legacy=JSON.parse(fs.readFileSync(new URL('../assets/manifest.json',import.meta.url)));
const used=['unit.marine','unit.hellion','unit.tank','unit.medivac','unit.zergling','unit.roach','unit.baneling','unit.ravager','building.barracks','building.factory','building.starport','tech.stim','tech.shield','tech.infernal','tech.heal','tech.bile','tech.attack','tech.armor'];
export const RUNTIME_ASSETS=legacy.assets.filter(a=>a.kind==='model'&&a.id!=='model.droppod'||used.includes(a.id)).map(a=>({...a,required:true}));
RUNTIME_ASSETS.find(a=>a.id==='tech.infernal').names=['btn-techupgrade-terran-infernalpreigniter'];
RUNTIME_ASSETS.push(
 {id:'tech.vehicle',kind:'icon',category:'buttons',names:['btn-upgrade-terran-vehicleweaponslevel1'],required:true},
 {id:'tech.siege',kind:'icon',category:'buttons',names:['btn-unit-terran-siegetank'],required:true},
 {id:'tech.boost',kind:'icon',category:'buttons',names:['btn-unit-terran-medivac'],required:true},
 {id:'ui.minerals',kind:'icon',category:'ui',names:['ui_emoticons_minerals'],required:true},
 {id:'ui.gas',kind:'icon',category:'icons',names:['icon-vespene'],required:true},
 {id:'terrain.char',kind:'texture',category:'terrain-tilesets',names:['Char Dirt'],required:true},
 {id:'terrain.rock',kind:'texture',category:'terrain-tilesets',names:['Char Rock'],required:true},
 {id:'model.hive',kind:'model',category:'models',names:['hatcheryex1mp'],required:true,note:'Original hatchery used as the stage-12 Zerg nest objective, not a Hive-tier model.'},
 {id:'model.droppod',kind:'model',category:'models',names:['droppod','terrandroppod'],required:true,note:'Original falling M3 with Birth, Stand and Death; opening is a documented local bone adaptation.'},
 ...['scv','drone','egg'].map(name=>({id:'model.'+name,kind:'model',category:'models',names:[name==='egg'?'banelingegg':name],required:true})),
); 
export function filename(a,ext){return a.id.startsWith('model.')?`public/assets/models/${a.names[0]}.glb`:`public/assets/${a.kind==='icon'?'icons':'terrain'}/${a.id}${ext}`;}
