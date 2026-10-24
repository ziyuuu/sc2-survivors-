import fs from 'node:fs/promises';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
const base='reports/local/integration-i03-20261022',catalog=JSON.parse(await fs.readFile(base+'/catalog-structural.json','utf8'));
const tests:any[]=[];
for(const file of (await fs.readdir('test')).filter(f=>/\.test\.(ts|mjs)$/.test(f))){const path='test/'+file,text=await fs.readFile(path,'utf8'),matches=[...text.matchAll(/^test\((['"])(.*?)\1,/gm)];
 for(const [i,m]of matches.entries())tests.push({path,line:text.slice(0,m.index).split('\n').length,title:m[2],body:text.slice(m.index,matches[i+1]?.index??text.length)});
}
const rows=catalog.consumers.map((c:any)=>{const templates=Object.values(EQUIPMENT_TEMPLATES).filter(t=>[...t.effects,...Object.values(t.tiers??{}).flatMap(v=>v.flatMap(x=>x.effects))].some(e=>e.key===c.key)).map(t=>t.id),direct=tests.filter(t=>t.body.includes("'"+c.key+"'")||t.body.includes('"'+c.key+'"')||templates.some(id=>t.body.includes("'"+id+"'")||t.body.includes('"'+id+'"'))).map(({body,...rest})=>rest);return {...c,templates,directTests:direct};});
await fs.writeFile(base+'/effect-evidence-initial.json',JSON.stringify({rows,tests:tests.map(({body,...rest})=>rest),note:'Literal references are evidence-discovery candidates, not an assertion that a test exercises every effect in a referenced template.'},null,2));console.log(JSON.stringify({effects:rows.length,withoutDirect:rows.filter(r=>!r.directTests.length).map(r=>({key:r.key,templates:r.templates,consumers:r.refs}))},null,2));
