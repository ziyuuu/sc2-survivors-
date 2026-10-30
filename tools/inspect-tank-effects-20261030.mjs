import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

// Bounded diagnostic: four existing native tank layers, three source ages each.
// No World, player archive, production bundle or live service is modified.
const baseline=process.argv.includes('--baseline'),followup=process.argv.includes('--followup');
const baselineRevision=followup?'94b8a3d':'2737b9f';
const out=path.resolve(followup?'reports/local/tank-followup-20261030':'reports/local/tank-effects-20261030',baseline?'baseline':'candidate');
await fs.mkdir(out,{recursive:true});
const models=['SiegeTankAttackLaunch','SiegeTankAttackImpact','SiegeTankSiegedAttackLaunch','SiegeTankSiegedAttackImpact'];
const source=`
import * as THREE from 'three';
import {SourceEffectPlayer,SOURCE_EFFECTS} from './src/render/effects/source/player';
import {configurePlatformAssetUrl} from './src/assets/manifest';
configurePlatformAssetUrl(id=>'/resource/'+encodeURIComponent(id));
const canvas=document.createElement('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(350,275);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1c2629);scene.add(new THREE.AmbientLight(0xffffff,1.2));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(5,12,7);scene.add(light);
const camera=new THREE.OrthographicCamera(-13,13,10.2,-10.2,.1,100);camera.position.set(0,20,22);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const player=new SourceEffectPlayer(scene,camera),models=${JSON.stringify(models)},ages=[.12,.35,.75];
const isolated=[['SiegeTankAttackImpact',1],['SiegeTankAttackImpact',2],['SiegeTankSiegedAttackImpact',9]];
for(const [model,index]of isolated){const alias=model+'__emitter'+index,def=structuredClone(SOURCE_EFFECTS[model]),zero={id:0,interpolation:0,default:0};def.id=alias;def.particles=def.particles.map((p,i)=>({...p,copy_indices:[],...(i===index?{}:{emit_rate:zero,emit_count:zero})}));def.copies=[];SOURCE_EFFECTS[alias]=def;}
await player.load([...models,...isolated.map(([model,index])=>model+'__emitter'+index)]);window.results=[];
window.sample=async(model,age,onlyEmitter)=>{
 player.reset();const renderedModel=onlyEmitter===undefined?model:model+'__emitter'+onlyEmitter;
 player.begin(age);player.add({model:renderedModel,key:'tank-inspection:'+renderedModel,age,seed:17,mesh:onlyEmitter===undefined?undefined:false,projections:onlyEmitter===undefined,placement:{x:0,y:model.includes('Launch')?1.5:.6,z:0,facing:.7}},()=>0);player.end();renderer.render(scene,camera);return {image:canvas.toDataURL(),report:player.report()};
};
for(const model of models)for(const age of ages){const sample=await window.sample(model,age);window.results.push({model,age,report:sample.report});const figure=document.createElement('figure');figure.innerHTML='<figcaption>'+model+' / '+age+'s</figcaption><img src="'+sample.image+'">';document.body.append(figure);}
window.ready=true;
`;
const plugins=baseline?[{name:'frozen-particle-baseline',setup(b){b.onLoad({filter:/render[\\/]effects[\\/]source[\\/]particles\.ts$/},()=>({contents:execFileSync('git',['show',baselineRevision+':src/render/effects/source/particles.ts'],{encoding:'utf8'}),loader:'ts'}));}}]:[];
await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'tank-inspection.ts',loader:'ts'},outfile:path.join(out,'main.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',plugins});
const records=JSON.parse(await fs.readFile('deploy/runtime/combat-effects.json','utf8')).records,assets=new Map(records.map(r=>[r.id,r]));
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#101619;color:#e5edf1;display:grid;grid-template-columns:repeat(3,350px);font:12px sans-serif}figure{margin:0;border:1px solid #456}figcaption{height:24px;padding:6px}img{display:block;width:350px;height:275px}</style><script type="module" src="/main.js"></script>';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(url.pathname==='/main.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(out,'main.js')));return;}if(url.pathname.startsWith('/resource/')){const row=assets.get(decodeURIComponent(url.pathname.slice(10)));if(!row)throw Error('Unknown diagnostic resource');res.setHeader('Content-Type',row.url.endsWith('.png')?'image/png':'model/gltf-binary');res.end(await fs.readFile(row.packedFile));return;}res.writeHead(404).end();}catch(e){res.writeHead(500).end(String(e));}});
let browser;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1056,height:1260},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready,{timeout:60000});
 await page.screenshot({path:path.join(out,'four-layers.png'),fullPage:true});
 await page.evaluate(async()=>{document.body.replaceChildren();for(const [model,emitter] of [['SiegeTankAttackImpact',1],['SiegeTankAttackImpact',2],['SiegeTankSiegedAttackImpact',9]])for(const age of [.35,.75,1.1]){const sample=await window.sample(model,age,emitter);const figure=document.createElement('figure');figure.innerHTML='<figcaption>'+model+' emitter '+emitter+' / '+age+'s</figcaption><img src="'+sample.image+'">';document.body.append(figure);}});
 await page.screenshot({path:path.join(out,'isolated-tails.png'),fullPage:true});
 const summary=await page.evaluate(()=>window.results.map(r=>({model:r.model,age:r.age,draws:r.report.modelDraws,missing:r.report.missing})));
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({errors,samples:summary},null,2)+'\n');
 console.log(JSON.stringify({out,errors,samples:summary.length}));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
