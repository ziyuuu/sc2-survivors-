import fs from 'node:fs';
const f='tools/qa-performance-d02-low-functional.mjs';let s=fs.readFileSync(f,'utf8');const point=s.indexOf(" for(const preset of ['low','medium','full'])");if(point<0)throw Error('insert');
const hazards=`
 setPhase('native-danger-footprints');
 for(const kinds of [['charge','spikes'],['cone','fan'],['bile','acid']]){
  const setup=await page.evaluate(kinds=>{const w=A03.app.world;w.enemySpecials.casts=kinds.map((kind,i)=>{const origin={x:w.anchor.x+(i?5:-5),z:w.anchor.z-3},point={x:origin.x,z:origin.z+5};return {id:900+i,kind,source:999999,tier:'boss',origin,point,points:kind==='bile'?[point,{x:point.x-2,z:point.z+2},{x:point.x+2,z:point.z+2}]:[point],angle:0,at:w.time+1,damage:30,count:3,range:8,radius:kind==='acid'?3:kind==='spikes'?.6:1,level:1,percent:0};});w.revision++;return {casts:structuredClone(w.enemySpecials.casts),state:D02Functional.snapshot()};},kinds);
  const before=await page.evaluate(()=>({...D02Functional.effectCalls}));const low=await page.evaluate(()=>D02Functional.preset('low'));assert.deepEqual(low.effectCalls,before);assert.ok(low.danger.patches.length>=2);assert.equal(low.danger.geometryMarkers,0);assert.equal(await page.evaluate(()=>D02Functional.snapshot()),setup.state);await shot('danger-'+kinds.join('-'),true);report.checks.push({kind:'danger',kinds,casts:setup.casts,low,stateSha256:hash(setup.state)});await save();
 }
 const expired=await page.evaluate(()=>{const w=A03.app.world;w.enemySpecials.casts=[];w.revision++;D02Functional.draw();return A03.app.view.lowDanger.report();});assert.equal(expired.patches.length,0);report.checks.push({kind:'danger-expired',expired});
`;
s=s.slice(0,point)+hazards+s.slice(point);fs.writeFileSync(f,s);
