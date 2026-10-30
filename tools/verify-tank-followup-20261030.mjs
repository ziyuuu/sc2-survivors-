import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {build} from 'esbuild';

// Compare only the previous particle renderer, without checking out or replacing
// any production file. The source-resource catalog stays identical in both runs.
const out=path.resolve('reports/local/tank-followup-20261030');await fs.mkdir(out,{recursive:true});
const frozen=execFileSync('git',['show','94b8a3d:src/render/effects/source/particles.ts'],{encoding:'utf8'});
const plugin={name:'previous-particles',setup(b){b.onLoad({filter:/render[\\/]effects[\\/]source[\\/]particles\.ts$/},()=>({contents:frozen,loader:'ts'}));}};
const baselineTest=path.join(out,'baseline-ground.test.mjs');
await build({entryPoints:['test/source-particle-ground-motion.test.ts'],outfile:baselineTest,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[plugin]});
const test=spawnSync(process.execPath,['--test',baselineTest],{encoding:'utf8',windowsHide:true});await fs.writeFile(path.join(out,'baseline-tests.log'),test.stdout+test.stderr);
if(test.status!==1||!test.stdout.includes('native ordinary tank gravity'))throw Error('Baseline did not reproduce the intended regression assertions');
const source=`import * as T from 'three';import {sourceParticleQuads} from './src/render/effects/source/particles';import catalog from './src/render/effects/source/catalog.json';
const camera=new T.PerspectiveCamera();camera.position.set(3,20,22);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const def=structuredClone(catalog.SiegeTankAttackImpact),zero=structuredClone(def);for(const p of zero.particles)p.gravity=0;
const head=q=>{const m=q.matrix.elements;return new T.Vector3(m[12]+m[4]/2,m[13]+m[5]/2,m[14]+m[6]/2);};
const run=(d,age,y,ground)=>sourceParticleQuads(d,{model:d.id,key:'probe',age,seed:17,placement:{x:0,y,z:0,facing:.7}},camera,ground).filter(q=>q.emitter===1);
const rows=[];for(const age of [.35,.75,1.5,2]){const free=run(def,age,100,()=>-1000),control=run(zero,age,100,()=>-1000),grounded=run(def,age,.6,()=>0),deltas=free.map((q,i)=>head(q).sub(head(control[i]))),points=grounded.map(head);rows.push({age,count:free.length,gravityHorizontalDrift:Math.max(...deltas.map(p=>Math.hypot(p.x,p.z))),groundedRadius:Math.max(...points.map(p=>Math.hypot(p.x,p.z))),groundedHeight:Math.max(...points.map(p=>p.y)),finite:points.every(p=>p.toArray().every(Number.isFinite))});}console.log(JSON.stringify(rows));`;
const result={baseline:'94b8a3d',baselineRegressionExit:test.status};
for(const version of ['baseline','candidate']){
 const file=path.join(out,version+'-range.mjs');await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'tank-range.ts',loader:'ts'},outfile:file,bundle:true,platform:'node',format:'esm',packages:'external',plugins:version==='baseline'?[plugin]:[]});
 result[version+'Samples']=JSON.parse(execFileSync(process.execPath,[file],{encoding:'utf8',windowsHide:true}));
}
await fs.writeFile(path.join(out,'motion-comparison.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
