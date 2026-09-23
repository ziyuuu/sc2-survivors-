/** Build the separately opened endless battlefield from the pinned local archive. */
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';

const run=(exe,args)=>new Promise((resolve,reject)=>{const p=spawn(exe,args,{stdio:'inherit',windowsHide:true});p.once('error',reject);p.once('exit',code=>code===0?resolve():reject(Error(`${exe} exited ${code}`)));});
const rename=(source,pairs)=>pairs.reduce((text,[from,to])=>text.replaceAll(from,to),source);
const jobs=[
 ['extract-map.py','python',[
  ['tools/map-lock.json','tools/acropolis-map-lock.json'],
  ['assets/private/maps/map-extracted.json','assets/private/maps/acropolis-extracted.json'],
  ['assets/private/maps/model-targets.json','assets/private/maps/acropolis-model-targets.json'],
  ['assets/private/maps/missing-models.json','assets/private/maps/acropolis-missing-models.json'],
  ["if not match:missing.append({'type':t,'model':m,'variation':v,'guesses':guesses});continue","if not match:missing.append({'type':t,'model':m,'variation':v,'guesses':guesses});base['footprint']=actor.get('Footprint');placements.append(base);continue"]]],
 ['compile-map.py','python',[
  ['assets/private/maps/map-extracted.json','assets/private/maps/acropolis-extracted.json'],
  ['assets/private/maps/map-runtime.json','assets/private/maps/acropolis-runtime.json'],
  ['reports/local/map-extraction.json','reports/local/acropolis-extraction.json']]],
];
for(const [source,exe,pairs] of jobs){if(source==='compile-map.py'){
  const extracted='assets/private/maps/acropolis-extracted.json',data=JSON.parse(await fs.readFile(extracted,'utf8'));data.cliffs=[];await fs.writeFile(extracted,JSON.stringify(data));
  const models=[...new Map(data.placements.filter(p=>p.assetId).map(p=>[p.assetId,[p.assetId,p.assetId.slice('model.map.'.length)]])).values()];await fs.writeFile('tools/acropolis-map-models.json',JSON.stringify(models,null,2));
 }const filename='tools/.acropolis-'+source;try{await fs.writeFile(filename,rename(await fs.readFile('tools/'+source,'utf8'),pairs));await run(exe,exe==='python'?['-X','utf8',filename]:[filename]);}finally{await fs.rm(filename,{force:true});}}
const file='assets/private/maps/acropolis-runtime.json',d=JSON.parse(await fs.readFile(file,'utf8'));
const opened=d.opening.reduce((sum,value)=>sum+(value>0?1:0),0);
d.opening=d.opening.map(value=>value>0?1:0);d.reveal=d.reveal.map(value=>value>0?1:0);d.stageAreas=Array(12).fill(opened*d.cellSize*d.cellSize);
// The pathing compiler has already incorporated missing doodad footprints.
d.missingDecorationCount=d.placements.filter(p=>!p.assetId).length;d.placements=d.placements.filter(p=>p.assetId);
await fs.writeFile(file,JSON.stringify(d));
console.log(JSON.stringify({map:d.source.name,openedCells:opened,placements:d.placements.length,missingDecorationCount:d.missingDecorationCount,cliffs:d.cliffs?.length??0}));
