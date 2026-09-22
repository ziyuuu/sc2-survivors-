import fs from 'node:fs/promises';
await fs.mkdir('.cache/catalogs',{recursive:true});
for(const category of ['models','buttons','ui','icons','terrain-tilesets','terrain-doodads','terrain-cliffs']){
 const r=await fetch(`https://raw.githubusercontent.com/sc2-arcade-watcher/asset-explorer/main/site/list/${category}.json`,{signal:AbortSignal.timeout(25000)});
 if(!r.ok){console.log(category,r.status);continue;}const catalog=await r.json();await fs.writeFile(`.cache/catalogs/${category}.json`,JSON.stringify(catalog));
 const pattern=category==='models'?/droppod|drop.pod|zerg.*hive|^hive$|rock.*char|char.*rock|debris|siegetank/i:category==='buttons'?/siege|preigniter|vehicleweaponslevel1|medivac.*boost/i:category==='terrain-tilesets'?/Char|Korhal Concrete/i:category.startsWith('terrain')?/Char|Rock|Cliff/i:/mineral|vespene|gas/i;
 console.log(category,JSON.stringify(catalog.items.filter(i=>pattern.test(i.name)).slice(0,35)));
}
