import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {catalogueCards} from '../../src/ui/presentation/intermission';
import {isolatedCardWorld} from './card-fixture';
import {supplyTier} from '../../src/simulation/progression/supply-cards';
import type {FamilyId} from '../../src/data/races';
import cards from './native-cards.generated.json';
import development from './development.generated.json';

const rows=catalogueCards(isolatedCardWorld('marine')).map(c=>{
 const local=c.id.slice(c.id.indexOf(':')+1),native=cards.filter(n=>n.race===c.race&&n.actor===local);
 let classification='',reason='',mapped:string[]=[];
 if(native.length){classification='native-quote';mapped=native.map(n=>n.id);reason='Actual quote and purchase entries exist; rendered follow-up is separately tracked.';}
 else if(c.group==='ordinary'){classification='unit-reference';mapped=['actor:'+local+':1:spawn',...development.filter(d=>d.race===c.race&&d.actor==='unlock.'+local).map(d=>d.id)];reason='Reference for a unit and its development unlock, not a standalone reinforcement quote.';}
 else if(c.group==='elite'){classification='native-choice-alias';mapped=cards.filter(n=>n.race===c.race&&(n.data as any).variant===local).map(n=>n.id);reason='Native family offer requires choosing this explicit elite variant.';}
 else if(c.group==='hero'){classification='native-quote-alias';mapped=cards.filter(n=>n.race===c.race&&n.actor==='hero.'+local).map(n=>n.id);reason='UI id omits the native hero prefix.';}
 else if(c.group==='support'){classification='native-quote-alias';mapped=cards.filter(n=>n.race===c.race&&n.actor==='support.'+local).map(n=>n.id);reason='UI id omits the native support prefix.';}
 else if(c.group==='development'){classification='development-project';mapped=development.filter(d=>d.race===c.race&&d.actor===local).map(d=>d.id);reason='Uses the separate production building quote/purchase path, with native opening unlocks recorded explicitly.';}
 else if(c.group==='efficiency'&&!local.startsWith('card.')){classification='effect-overview';mapped=cards.filter(n=>n.race===c.race&&(n.data.effect as any).kind==='card'&&(n.data.effect as any).effect===local).map(n=>n.id);reason='Explanatory all-rarity overview. Core weapon/vitality/armor/cultivation descriptions remain in UI but are explicitly excluded from the current reinforcement pool.';}
 else if(c.group==='efficiency'&&/^card\.(weapon|vitality|armor|cultivation)\./.test(local)){classification='ui-only-excluded-core-card';reason='reinforcementPool explicitly excludes these four core family effects. The UI still enumerates their definitions; not a current purchasable card and not marked tested.';}
 else if(c.group==='supply'){
  const match=/^supply\.(pod|direct)\.(.+)\.([1-3])$/.exec(local)!;const tier=supplyTier(match[2] as FamilyId),count=+match[3];
  if(tier>count-1){classification='ui-only-ineligible-supply-count';reason=`Native supplyEligibility requires tier ${tier} <= count-1 (${count-1}), regardless of research. This UI combination cannot enter the current legal pool.`;}
 }
 return {id:c.id,name:c.name,group:c.group,classification:classification||'unresolved',reason,mapped,visualStatus:'not inferred from catalogue classification'};
});
const files=['src/ui/presentation/intermission.ts','src/simulation/progression/expedition-drafts.ts','src/simulation/progression/supply-cards.ts','tools/t01/native-cards.generated.json','tools/t01/development.generated.json'];
const sources=await Promise.all(files.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const counts=Object.fromEntries([...new Set(rows.map(r=>r.classification))].map(k=>[k,rows.filter(r=>r.classification===k).length]));
const unmapped=rows.filter(r=>['native-choice-alias','native-quote-alias','development-project'].includes(r.classification)&&!r.mapped.length);
await fs.writeFile('reports/local/t01-20261024/ui-catalogue-applicability.json',JSON.stringify({scope:'Every current UI catalogue entry reconciled with actual native routes; classification is not visual acceptance.',sources,counts,unresolved:rows.filter(r=>r.classification==='unresolved'),unmapped,rows},null,2));
console.log(JSON.stringify({total:rows.length,counts,unmapped:unmapped.map(r=>r.id)}));
