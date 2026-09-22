import fs from 'node:fs/promises';
export const revision = 'fbbd6429b1eb6978c78a092dc68ba09029d03171';
const base = `https://raw.githubusercontent.com/Joshua-Leibold/SC2Data/${revision}/`;
await fs.mkdir('.cache/sc2-data', {recursive:true});
const layers=['core','liberty','libertymulti','swarm','swarmmulti','void','voidmulti','balancemulti'];
const files=['unitdata','weapondata','effectdata','abildata','behaviordata'];
for (const layer of layers) {
 await Promise.all(files.map(async name => {
  const url=base+`mods/${layer}.sc2mod/base.sc2data/gamedata/${name}.xml`;
  const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!r.ok) throw Error(`${r.status} ${url}`);
  await fs.writeFile(`.cache/sc2-data/${layer}-${name}.xml`,await r.text());
 }));
 console.log(`Read ${layer} data at ${revision}`);
}
const readme=await fetch(base+'README.md');console.log(await readme.text());
