import fs from 'node:fs/promises';
const revision='fbbd6429b1eb6978c78a092dc68ba09029d03171';
for(const layer of ['core','liberty','swarm','void','voidmulti','balancemulti']){
 const file=`.cache/sc2-data/${layer}-upgradedata.xml`;
 try {if((await fs.readFile(file,'utf8')).includes('<Catalog'))continue;}catch{}
 const url=`https://raw.githubusercontent.com/Joshua-Leibold/SC2Data/${revision}/mods/${layer}.sc2mod/base.sc2data/gamedata/upgradedata.xml`;
 const response=await fetch(url);if(response.status===404){console.log(`${layer}: no source upgrade catalog`);continue;}if(!response.ok)throw Error(`${response.status}: ${url}`);
 const value=await response.text();if(!value.includes('<Catalog'))throw Error(`Invalid XML ${layer}`);
 await fs.writeFile(file,value);console.log(`${layer}: ${value.length} characters`);
}
