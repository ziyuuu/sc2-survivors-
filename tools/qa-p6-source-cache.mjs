import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const revision='fbbd6429b1eb6978c78a092dc68ba09029d03171',rows=[];
for(const layer of ['core','liberty','swarm','void','voidmulti','balancemulti'])for(const kind of ['mover','validator']){
 const file=`.cache/sc2-data/${layer}-${kind}data.xml`,url=`https://raw.githubusercontent.com/Joshua-Leibold/SC2Data/${revision}/mods/${layer}.sc2mod/base.sc2data/gamedata/${kind}data.xml`;
 let bytes=await fs.readFile(file).catch(()=>null),status='existing';if(!bytes){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(r.status===404){rows.push({file,url,status:404});continue;}if(!r.ok)throw Error(`${r.status} ${url}`);bytes=Buffer.from(await r.arrayBuffer());if(!bytes.toString('utf8').includes('<Catalog'))throw Error('Invalid pinned XML');await fs.writeFile(file,bytes);status='restored';}
 rows.push({file,url,status,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile('reports/local/p6-20261006/source-cache-restoration.json',JSON.stringify({at:new Date().toISOString(),revision,rows},null,2));console.log(JSON.stringify({restored:rows.filter(r=>r.status==='restored').length,absent:rows.filter(r=>r.status===404).length}));
