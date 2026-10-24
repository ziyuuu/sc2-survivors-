import fs from 'node:fs/promises';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {equipmentDropPolicy,categoryTemplates,categorySlots} from '../src/simulation/starship/drops';
import {PURPLE_INHERITANCE,ORANGE_INHERITANCE,inheritancePool} from '../src/simulation/starship/inheritance';
import {MVP_TALENTS,nextTalentPurchase,validateTalentAllocation,allocationPoints,allocationCost} from '../src/data/mvp-talents';
const out='reports/local/integration-i03-20261022';
async function walk(dir:string):Promise<string[]>{return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]))).flat();}
const runtime=await Promise.all((await walk('src/simulation')).filter(p=>p.endsWith('.ts')&&!/\/catalog[^/]*\.ts$|\/inheritance\.ts$/.test(p)).map(async p=>({p,lines:(await fs.readFile(p,'utf8')).split(/\r?\n/)})));
const effects=new Set<string>();
const templates=Object.values(EQUIPMENT_TEMPLATES).map(t=>{for(const e of [...t.effects,...Object.values(t.tiers??{}).flatMap(tiers=>tiers.flatMap(t=>t.effects))])effects.add(e.key);return {id:t.id,kind:t.kind,quality:t.quality,pollution:t.pollution,slots:t.slots,binding:t.binding??null,sources:[] as any[]};});
const pools:any[]=[];
for(const difficulty of ['easy','normal','hard','hell'] as const)for(const stage of [1,7,13,18])for(const endlessRound of [undefined,1,7,37])for(const tier of ['regular','elite','boss'] as const){
 const ctx={difficulty,stage,endlessRound,tier},policy=equipmentDropPolicy(ctx);
 for(const [layer,chance,pool] of [['base',policy.baseChance,policy.base],['guaranteed',tier==='regular'?0:1,policy.guaranteed],['endless',policy.additionalChance,policy.additional]] as const)if(chance>0)for(const row of pool)if(row.weight>0){
  const slots=categorySlots(row.category,row.quality);
  for(const slot of slots){const legal=categoryTemplates(row.category,row.quality).filter(t=>t.slots.includes(slot)),normal=legal.filter(t=>t.pollution!=='required'),pollutable=normal.some(t=>t.pollution==='allowed');
   pools.push({ctx,layer,chance,row,slot,normal:normal.length,pollutable});
   for(const t of legal)if(t.pollution!=='required'||pollutable&&policy.pollutionChance>0){const entry=templates.find(e=>e.id===t.id)!;if(!entry.sources.some(s=>s.slot===slot))entry.sources.push({ctx,layer,row,slot,requiresPollution:t.pollution==='required'});}
  }
 }
}
const inherited=[...PURPLE_INHERITANCE,...ORANGE_INHERITANCE].map(row=>{for(const e of row.effects)effects.add(e.key);return {...row,hosts:Object.values(EQUIPMENT_TEMPLATES).filter(t=>inheritancePool(t,true).some(r=>r.id===row.id)).map(t=>t.id)};});
const consumers=[...effects].sort().map(key=>({key,refs:runtime.flatMap(({p,lines})=>lines.flatMap((line,i)=>line.includes("'"+key+"'")||line.includes('"'+key+'"')?[{path:p,line:i+1}]:[]))}));
const talents=MVP_TALENTS.map(target=>{
 const levels:Record<string,number>={},path:string[]=[];let balance=100000;
 const candidates=MVP_TALENTS.filter(n=>n.race===target.race&&n.line===target.line);
 for(let step=0;step<80&&(levels[target.id]??0)<target.maxRank;step++){
  const next=[target,...candidates.filter(n=>n.id!==target.id)].find(n=>nextTalentPurchase(target.race,levels,n.id,balance)===null);if(!next)break;
  levels[next.id]=(levels[next.id]??0)+1;balance-=next.resourceCost;path.push(next.id);
 }
 return {id:target.id,semantic:target.semanticId,race:target.race,max:target.maxRank,rank:levels[target.id]??0,levels,points:allocationPoints(levels),cost:allocationCost(levels),error:validateTalentAllocation(target.race,levels),path,refs:runtime.flatMap(({p,lines})=>lines.flatMap((line,i)=>line.includes("'"+target.semanticId+"'")||line.includes('"'+target.semanticId+'"')?[{path:p,line:i+1}]:[]))};
});
const report={at:new Date().toISOString(),templates,inherited,consumers,pools,talents,limits:['Structural positive-probability reachability is not a human campaign completion or measured appearance frequency.','Literal consumer links require semantic review, including dynamic stat/binding prefixes.']};
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/catalog-structural.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({templates:templates.length,unreachable:templates.filter(t=>!t.sources.length),emptyPools:pools.filter(p=>!p.normal),inheritance:inherited.length,noHosts:inherited.filter(r=>!r.hosts.length),effects:consumers.length,noLiteralConsumer:consumers.filter(c=>!c.refs.length).map(c=>c.key),talents:talents.length,unreachableTalents:talents.filter(t=>t.rank!==t.max||t.error),talentsWithoutLiteralConsumer:talents.filter(t=>!t.refs.length).map(t=>({id:t.id,semantic:t.semantic}))},null,2));
