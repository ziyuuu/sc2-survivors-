import fs from 'node:fs/promises';
const base='reports/local/integration-i03-20261022',catalog=JSON.parse(await fs.readFile(base+'/catalog-structural.json','utf8')),tests=[];
for(const file of (await fs.readdir('test')).filter(f=>/\.test\.(ts|mjs)$/.test(f))){const path='test/'+file,text=await fs.readFile(path,'utf8'),matches=[...text.matchAll(/^test\((['"])(.*?)\1,/gm)];for(const [i,m] of matches.entries())tests.push({path,line:text.slice(0,m.index).split('\n').length,title:m[2],body:text.slice(m.index,matches[i+1]?.index??text.length),text});}
const talents=[...new Set(catalog.talents.map(t=>t.semantic))].map(key=>({key,tests:tests.filter(t=>t.body.includes("'"+key+"'")||t.body.includes('"'+key+'"')||t.title.includes(key)||catalog.talents.filter(n=>n.semantic===key).some(n=>t.body.includes(n.id)||t.title.includes(n.id.slice(2)))).map(({body,text,...t})=>t)}));
await fs.writeFile(base+'/talent-test-discovery.json',JSON.stringify(talents,null,2));
console.log(JSON.stringify({talents:talents.map(t=>({key:t.key,tests:t.tests.length,files:[...new Set(t.tests.map(r=>r.path))]})),testFiles:[...new Set(tests.filter(t=>/hero|elite|m2-/.test(t.path)).map(t=>t.path))]},null,2));
