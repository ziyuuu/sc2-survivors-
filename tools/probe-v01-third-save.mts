import fs from 'node:fs/promises';
import {validateRunData,RUN_FIELDS} from '../src/simulation/persistence/run-fields';
import {RunState} from '../src/simulation/run-state';
import {validateEquipmentAccount} from '../src/simulation/persistence/starship-snapshot';
import {validateExpedition} from '../src/simulation/expedition-state';
const source='reports/local/v01-20261024/baseline-terran-r2/report.json',report=JSON.parse(await fs.readFile(source,'utf8')),out:any={source,rows:[]};
for(const stage of report.cycles[0].stages){const s=JSON.parse(stage.final,(_k,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&Array.isArray(v.map)?new Map(v.map):v&&typeof v==='object'&&Object.keys(v).length===1&&Array.isArray(v.set)?new Set(v.set):v),defaults=new RunState(),missing=RUN_FIELDS.filter(k=>!Object.hasOwn(s.run,k)),row:any={stage:stage.counts.stage,diagnosticRestoredDefaults:missing};for(const k of missing)s.run[k]=structuredClone(defaults[k]);for(const [name,check]of [['run',()=>validateRunData(s.run,defaults)],['expedition',()=>validateExpedition(s.run.expedition)],['equipment',()=>validateEquipmentAccount(s.account)]] as const){try{check();row[name]={valid:true};}catch(e){row[name]={valid:false,error:String((e as Error).stack)};}}out.rows.push(row);}
await fs.writeFile('reports/local/v01-20261024/third-save-validation.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
