import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {newBuildingState,linesFor,setDirection,getOffers,purchase,nextPhase,nextWindow,type BuildingState} from '../../src/simulation/building/rules';
import {DEVELOPMENT} from '../../src/data/expedition-buildings';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {purchaseOffer} from '../../src/simulation/expedition-economy';
import {prepareDevelopment} from './development-fixture';
const base='reports/local/t01-20261024',file='reports/local/integration-i03-20261022/development-paths.json',raw=await fs.readFile(file),prior=JSON.parse(raw.toString()),cases=[],rows=[];
for(const key of prior.expected as string[]){
 const witness=prior.witnesses[key],p=witness.path??[],last=p.at(-1);let b=newBuildingState(witness.race,{minerals:100000,gas:100000},witness.seed),before:BuildingState|undefined;
 for(let stage=1;stage<=(last?.stage??0);stage++){
  const choices=p.find((s:any)=>s.stage===stage);for(const line of linesFor(witness.race)){if(!setDirection(b,line).ok)throw Error('Direction replay failed');getOffers(b);}
  if(choices){setDirection(b,choices.line);const q=getOffers(b).find(q=>q.id===choices.quote.id&&q.projectId===choices.project);if(!q)throw Error('Current quote differs from recorded path '+key);if(stage===last.stage){before=structuredClone(b);break;}const r=purchase(b,q,choices.target);if(!r.ok)throw Error('Current prerequisite replay failed '+key+': '+r.reason);}
  if(!nextPhase(b).ok||!nextPhase(b).ok||!nextWindow(b).ok)throw Error('Window replay failed');
 }
 before??=b;const id=key.slice(0,key.lastIndexOf(':')),definition=DEVELOPMENT.find(d=>d.id===id);if(!definition)throw Error('Unknown development key '+key);
 const data={state:before,project:last?.project??null,target:last?.target,expected:key,provenance:{path:file,pathSha256:createHash('sha256').update(raw).digest('hex'),seed:witness.seed,steps:p.length,automatic:witness.source??null}};
 const w=new World({sandbox:true,waves:false,terrain:false,equipmentAccount:newEquipmentAccount(529)}),quote=prepareDevelopment(w,data);const ok=quote?purchaseOffer(w,quote.offerId):true;
 rows.push({id:key,project:data.project,ok,automatic:!quote,quote:quote?.id,source:witness.source??'native paid purchase'});
 cases.push({id:'development:'+key,group:'发展卡牌',name:definition.name+' · '+key.split(':').at(-1)+(witness.source?' · 随开局/前置生效':''),runner:'development',race:definition.race,actor:id,seconds:2,data,source:['src/data/expedition-buildings.ts','src/simulation/building/rules.ts','src/simulation/building/expedition.ts','src/simulation/progression/expedition-drafts.ts']});
}
await fs.writeFile('tools/t01/development.generated.json',JSON.stringify(cases));await fs.writeFile(base+'/development-fixture-audit.json',JSON.stringify({scope:'Replayed recorded prerequisite paths under current rules; native current quote and purchase. Separate from visual inspection.',count:rows.length,failed:rows.filter(r=>!r.ok),rows},null,2));console.log(JSON.stringify({count:rows.length,failed:rows.filter(r=>!r.ok).length}));
