import fs from 'node:fs/promises';
const root='reports/local/7a-20261013',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),base=await read(root+'/release-cache-matrix.json'),baseline=await read(root+'/baseline/baseline.json'),extra=[];
for(const format of ['web','offline'])for(const dwell of [15000,30000])for(const cache of ['warm','reuse'])for(const variant of dwell===15000?['baseline','final']:['final','baseline']){
 const source=format==='web'?'--web='+(variant==='baseline'?root+'/baseline/web':root+'/final-r1/timing-web'):'--html='+(variant==='baseline'?baseline.html.path:'dist/SC2-Survivors-MVP7A-Final-R1-20261013.html');
 extra.push({name:variant+'-'+format+'-'+cache+'-'+dwell/1000,args:[source,'--cache='+cache,'--dwell='+dwell,'--seconds=10']});
}
await fs.writeFile(root+'/release-cache-full-matrix.json',JSON.stringify([...base,...extra],null,2),{flag:'wx'});
await fs.writeFile(root+'/final-r1/measurement-design-extension.json',JSON.stringify({at:new Date().toISOString(),replacesCoverageLimitationIn:'measurement-design.json',coverage:'All three cache conditions at each 0/15/30 s dwell for both actual Web and actual offline files. Immediate fresh Web Terran is supplied by the native matrix; cache series first passes provide the other two fresh-immediate repetitions. Each warm/reuse test includes an explicitly recorded fresh first pass at the same dwell. Profiling remains separate.',additional:extra},null,2),{flag:'wx'});
console.log(JSON.stringify({cacheTests:base.length+extra.length,additional:extra.length}));
