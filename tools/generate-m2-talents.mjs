import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const document=readFileSync(resolve(root,'docs/MVP10_TALENTS.md'),'utf8');
const historical=readFileSync(resolve(root,'src/data/talents.ts'),'utf8');
const lines=['resources','soldiers','army','micro'];
const prefixes={resources:'R',soldiers:'S',army:'A',micro:'M'};
const semantics=Object.fromEntries(lines.map(line=>[line,[...historical.matchAll(new RegExp(`n\\('${line}',\\d+,\\d+,'([^']+)'`,'g'))].map(match=>match[1])]));
for(const line of lines)if(semantics[line].length!==(line==='micro'?7:16))throw Error(`Historical semantic ID count for ${line} is ${semantics[line].length}`);
const rows=[];
for(const raw of document.split(/\r?\n/)){
 const cells=raw.split('|').map(value=>value.trim());
 if(cells.length<10||!/^([TZP])-([RSAM])\d\d$/.test(cells[1]))continue;
 const id=cells[1],match=/^([TZP])-([RSAM])(\d\d)$/.exec(id),race={T:'terran',Z:'zerg',P:'protoss'}[match[1]],line=lines.find(value=>prefixes[value]===match[2]);
 if(!line)throw Error(`Unknown line ${id}`);
 const number=Number(match[3]),semanticId=semantics[line][number-1];
 if(!semanticId)throw Error(`Missing semantic ID ${id}`);
 const [tier,name,maxRank,resourceCost]=[Number(cells[2]),cells[3],Number(cells[4]),Number(cells[5])];
 if(!Number.isInteger(tier)||!Number.isInteger(maxRank)||!Number.isInteger(resourceCost))throw Error(`Invalid numbers ${id}`);
 rows.push({id,race,line,tier,name,maxRank,allocationCost:1,resourceCost,semanticId,description:cells[6],prerequisiteText:cells[7]});
}
if(rows.length!==165||new Set(rows.map(row=>row.id)).size!==165)throw Error(`Expected 165 unique approved definitions, got ${rows.length}`);
for(const race of ['terran','zerg','protoss']){
 const subset=rows.filter(row=>row.race===race);
 if(subset.length!==55)throw Error(`${race} must have 55 nodes`);
 for(const line of lines){const group=subset.filter(row=>row.line===line),expectedCount=line==='micro'?7:16,expectedRanks=line==='micro'?17:41,expectedPrice=line==='micro'?64:59;
  if(group.length!==expectedCount||group.reduce((sum,row)=>sum+row.maxRank,0)!==expectedRanks||group.reduce((sum,row)=>sum+row.maxRank*row.resourceCost,0)!==expectedPrice)throw Error(`${race}/${line} totals do not match M0 r6`);
 }
}
const output=`/** Generated from the approved M0 r6 design by tools/generate-m2-talents.mjs. Do not hand-edit. */\n`+
 `export const MVP_TALENT_ROWS = ${JSON.stringify(rows,null,2)} as const;\n`;
writeFileSync(resolve(root,'src/data/mvp-talents.generated.ts'),output);
console.log(`Generated ${rows.length} approved talent definitions`);
