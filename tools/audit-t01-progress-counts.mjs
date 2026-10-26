import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',read=async f=>JSON.parse(await fs.readFile(f,'utf8')),catalogue=await read(base+'/catalogue-current.json'),byId=new Map(catalogue.dynamic.map(c=>[c.id,c]));
const reviewed=new Map(),evidence=[];
for(const d of await fs.readdir(base,{withFileTypes:true})){
 if(!d.isDirectory())continue;const file=base+'/'+d.name+'/visual-review.json';let bytes;try{bytes=await fs.readFile(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}
 const data=JSON.parse(bytes);let count=0;
 for(const row of data.rows??[]){if(!byId.has(row.id)||!['reviewed','reviewed-supplement','issue'].includes(row.status))continue;count++;const refs=reviewed.get(row.id)??[];refs.push({file,status:row.status});reviewed.set(row.id,refs);}
 if(count)evidence.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),rows:count});
}
const applicable=catalogue.dynamic.filter(c=>!c.applicability),groups={};
for(const c of applicable){const g=groups[c.runner]??={total:0,reviewed:0};g.total++;if(reviewed.has(c.id))g.reviewed++;}
const staticProof=await read(base+'/progress-20261025-r8.json');assert.equal(staticProof.static.uniqueReviewed,332);
const ids=applicable.filter(c=>reviewed.has(c.id)).map(c=>({id:c.id,evidence:reviewed.get(c.id)}));
const result={date:new Date().toISOString(),scope:'Unique catalogue entries with explicit visual review records, including reviewed findings that remain open. Repeated captures and repair reruns count once. This measures inspection coverage, not final acceptance or effort completion. State-only tests and purchase receipts are not counted as visual review.',static:{total:catalogue.static.length,reviewed:332,evidence:base+'/progress-20261025-r8.json'},dynamic:{listed:catalogue.dynamic.length,notApplicable:catalogue.dynamic.length-applicable.length,applicable:applicable.length,reviewed:ids.length,remaining:applicable.length-ids.length,percent:100*ids.length/applicable.length,groups},combined:{total:applicable.length+catalogue.static.length,reviewed:ids.length+332,percent:100*(ids.length+332)/(applicable.length+catalogue.static.length)},finalOfflineDelivery:{required:2,delivered:0,previousPrototypeControlsPassed:true},ids,evidence};
await fs.writeFile(base+'/coverage-counts-20261025-r1.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({static:result.static,dynamic:result.dynamic,combined:result.combined,delivery:result.finalOfflineDelivery}));
