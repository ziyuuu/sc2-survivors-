import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/t01-20261024',report=JSON.parse(await fs.readFile(root+'/card-cycles-r2/report.json','utf8')),selection=[];
const range=(a,b,step)=>Array.from({length:Math.round((b-a)/step)+1},(_,i)=>Math.round((a+i*step)*1e6)/1e6);
for(const row of report.rows){
 const e=JSON.parse(await fs.readFile(root+'/card-cycles-r2/'+row.directory+'/evidence.json','utf8'));
 if(e.case.data?.effect?.kind!=='support')continue;
 const kind=e.case.data.effect.support;
 const s={id:row.id,seconds:6,framing:{zoom:1.4,pitch:60},times:[.05,.15,.35,.7,1.2,2,3,4,6]};
 if(['mines','strategic','protoss.prism','zerg.hatch'].includes(kind))s.framing.zoom=.8;
 if(['mines','bombardment','strategic','terran.bunker','terran.missiles','terran.overdrive','zerg.evolve','protoss.prism','protoss.counter','zerg.hatch','zerg.consume','protoss.reserve'].includes(kind))s.isolateSupport=true;
 if(kind==='mines'){s.seconds=2;s.times=[.05,.15,.2,.216667,.233334,.25,.283334,.35,.5,.7,1,1.5,2];}
 else if(kind==='bombardment'){s.seconds=5;s.times=[.05,2.95,3,3.016667,3.1,3.25,3.5,3.733334,3.75,3.766667,3.85,4,4.2,4.5,5];}
 else if(kind==='strategic'){s.seconds=5;s.times=[.016667,.05,.15,.35,.7,1.5,2.5,2.95,3,3.016667,3.05,3.15,3.35,3.7,4,5];}
 else if(kind==='mutation'){s.seconds=6;s.stopAttacksAt=2;s.times=[.05,.15,.35,.7,1.2,2,2.5,3,4,4.5,5,5.05,5.5,6];}
 else if(kind==='terran.bunker'){s.seconds=32.5;s.times=[.05,.7,1.2,1.5,1.516667,1.55,2,3,6,12,30,31.5,31.516667,31.55,31.7,32,32.5];}
 else if(kind==='terran.missiles'){s.seconds=6;s.times=[.05,2.95,...range(3,5.2,.1),5.5,6];}
 else if(kind==='terran.overdrive'||kind==='zerg.evolve'){s.seconds=8.5;s.times=[.016667,.05,.15,.35,.7,2,4,6,7.9,8,8.016667,8.1,8.5];}
 else if(kind==='zerg.hatch'){s.seconds=13;s.times=[.05,.5,.516667,.55,.7,1,2,6,12.45,12.5,12.516667,12.533334,12.6,12.8,13];}
 else if(kind==='zerg.consume'){s.seconds=2;s.times=[.05,.5,...range(.55,1.5,.05),1.8,2];}
 else if(kind==='zerg.parasite'){s.seconds=8;s.stopAttacksAt=.8;s.times=[.05,.15,.233334,.35,.7,1.2,1.95,2,2.016667,2.05,2.15,2.35,2.7,3.2,4,6,8];}
 else if(kind==='protoss.reserve'){s.seconds=8;s.depleteReserveAt=6.05;s.times=[.05,.35,.7,1.2,2,3,4,5.95,6,6.016667,6.05,6.066667,6.1,6.35,6.7,7,8];}
 else if(kind==='protoss.counter'){s.seconds=2;s.times=[.016667,.033334,.05,.083334,.1,.15,.25,.35,.5,.7,1,2];}
 else if(kind==='protoss.prism'){s.seconds=4;s.times=[.016667,.05,.15,.35,.65,.7,.716667,.75,.9,1.1,1.5,2,2.45,2.5,2.516667,2.6,2.8,3,4];}
 else if(kind==='terran.ricochet'||kind==='protoss.echo'){
  s.seconds=kind==='terran.ricochet'?3:5;s.stopAttacksAt=kind==='terran.ricochet'?1:3;
  const events=e.after.events.filter(v=>/support/.test(v.kind)&&v.time<=s.stopAttacksAt+.8);
  s.times=[.05,.15,.35,.7,1.2,2,3,...events.flatMap(v=>[Math.max(1/60,v.time-1/60),v.time,v.time+1/60,v.time+.1,v.time+.3,v.time+.6,v.time+.7])].filter(t=>t<s.seconds);
 }else throw Error('Unhandled support '+kind);
 s.times=[...new Set(s.times.map(t=>Math.round(t*1e6)/1e6))].sort((a,b)=>a-b);selection.push(s);
}
assert.equal(selection.length,66);
await fs.writeFile(root+'/card-cycles-r4-selection.json',JSON.stringify(selection,null,2));
console.log(JSON.stringify({rows:selection.length,frames:selection.reduce((n,s)=>n+s.times.length+2,0),seconds:selection.reduce((n,s)=>n+s.seconds,0)}));
