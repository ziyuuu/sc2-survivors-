import fs from 'node:fs/promises';
import inspector from 'node:inspector/promises';
import * as THREE from 'three';
import * as api from '../reports/local/performance-x01-x02-20261020/candidate-r2-numeric.mjs';
const root='reports/local/performance-x03-20261020',input=JSON.parse(await fs.readFile('reports/local/performance-x01-x02-20261020/native-cpu-1/report.json'));
const camera=new THREE.PerspectiveCamera();camera.position.set(2,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
const ground=p=>Math.sin(p.x*.2)*.1+Math.cos(p.z*.3)*.1;
const session=new inspector.Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:200});
const result={method:'CPU sampling replay of captured native requests against frozen X01/X02 R2; diagnostic camera and analytic ground, not whole-game FPS.',cases:[]};
for(const c of input.cases){const cache=new api.SourceParticleCache();let particles=0;const frame=()=>{particles=0;cache.begin(c.time);for(const {request:r}of c.requests)particles+=api.sourceParticleQuads(api.SOURCE_EFFECTS[r.model],r,camera,ground,cache).length;cache.end();};for(let i=0;i<16;i++)frame();await session.post('Profiler.start');const start=performance.now();for(let i=0;i<100;i++)frame();const ms=(performance.now()-start)/100,{profile}=await session.post('Profiler.stop');await fs.writeFile(root+'/'+c.name+'.cpuprofile',JSON.stringify(profile));const weights=new Map();for(let i=0;i<profile.samples.length;i++)weights.set(profile.samples[i],(weights.get(profile.samples[i])??0)+profile.timeDeltas[i]);const top=profile.nodes.map(n=>({name:n.callFrame.functionName,file:n.callFrame.url,line:n.callFrame.lineNumber+1,ms:(weights.get(n.id)??0)/1000})).sort((a,b)=>b.ms-a.ms).slice(0,18);result.cases.push({name:c.name,requests:c.requests.length,particles,msPerFrame:ms,top});console.log(JSON.stringify(result.cases.at(-1)));}
session.disconnect();await fs.writeFile(root+'/profile-baseline.json',JSON.stringify(result,null,2));
