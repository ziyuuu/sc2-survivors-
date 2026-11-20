// Design-only probes; no card, combat, save, or production-renderer changes.
// Run: node tools/qa-bio-feasibility-20261117.mjs
// Outputs are disposable and must be removed after review.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';

const out='reports/local/bio-feasibility-20261117';
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:0;background:#182329}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>';
async function prepare(){
 const {THREE:T,GLTFLoader}=await import('/tools/bio-feasibility-entry-20261117.mts');
 const {SourceEffectPlayer}=await import('/src/render/effects/source/player.ts');
 const {EliteSupportEffects}=await import('/src/render/effects/elite-support-effects.ts');
 const {assetUrl}=await import('/src/assets/manifest.ts');
 const scene=new T.Scene();scene.background=new T.Color(0x182329);
 const camera=new T.PerspectiveCamera(36,1280/800,.1,200);camera.position.set(0,12,18);camera.lookAt(0,0,0);
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);
 scene.add(new T.HemisphereLight(0xc4edff,0x29302a,3));const sun=new T.DirectionalLight(0xffefd5,3);sun.position.set(4,12,7);scene.add(sun);
 const ground=new T.Mesh(new T.PlaneGeometry(22,16),new T.MeshStandardMaterial({color:0x353c3b,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;scene.add(ground);
 const grid=new T.GridHelper(20,20,0x586466,0x424c4d);scene.add(grid);
 const fx=new SourceEffectPlayer(scene,camera);fx.displacementEnabled=false;
 await fx.load(['AcidSalivaWeapon','RoachMissileImpact','BanelingDeath','FunCocoonDeath','StimpackStartImpact','StimpackEndImpact','SquibTransfusion']);
 const loader=new GLTFLoader(),cocoon=await loader.loadAsync(assetUrl('model.fun-cocoon'));
 const cocoonRoot=new T.Group();cocoonRoot.add(cocoon.scene);scene.add(cocoonRoot);
 const mixer=new T.AnimationMixer(cocoon.scene),clips=Object.fromEntries(cocoon.animations.map(c=>[c.name,c.duration]));
 // This source's bind pose is a tiny buried egg. Frame its real Stand pose,
 // keeping that one scale through Birth/Stand instead of reframing each clip.
 mixer.clipAction(cocoon.animations.find(c=>c.name==='Stand')).play();mixer.setTime(.7);cocoon.scene.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(cocoon.scene,true),size=box.getSize(new T.Vector3());cocoonRoot.scale.setScalar(2.1/size.y);cocoonRoot.position.y=-box.min.y*cocoonRoot.scale.y;
 cocoon.scene.traverse(n=>{if(n.isMesh)n.frustumCulled=false;});mixer.stopAllAction();
 const marine=await loader.loadAsync(assetUrl('model.marine')),marineRoot=new T.Group();marineRoot.add(marine.scene);scene.add(marineRoot);
 const mb=new T.Box3().setFromObject(marine.scene),ms=mb.getSize(new T.Vector3());marineRoot.scale.setScalar(1.8/ms.y);marineRoot.position.y=-mb.min.y*marineRoot.scale.y;
 // Clone the already-used project fog shader, then recolor only this probe's copy.
 const medical=new EliteSupportEffects(scene,{}),originalFog=medical.fogMaterial;
 const fog=originalFog.clone();const marker='mix(vec3(.16,.60,.29),vec3(.60,1.,.70),cloud)';
 if(!fog.fragmentShader.includes(marker))throw Error('Medical fog shader changed');
 fog.fragmentShader=fog.fragmentShader.replace(marker,'mix(vec3(.42,.34,.035),vec3(1.,.83,.22),cloud)');
 const fogGroup=new T.Group();scene.add(fogGroup);
 for(let i=0;i<3;i++){const m=new T.Mesh(new T.PlaneGeometry(1,1),fog);m.position.set(0,.35+i*.35,0);m.quaternion.copy(camera.quaternion);m.scale.set(4.2-i*.45,2.5-i*.25,1);m.renderOrder=3;fogGroup.add(m);}
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 function base(){fx.reset();cocoonRoot.visible=false;marineRoot.visible=false;fogGroup.visible=false;mixer.stopAllAction();camera.position.set(0,12,18);camera.lookAt(0,0,0);}
 function request(model,key,x,age,colorize,extra={}){fx.add({model,key,age,seed:171117,placement:{x,y:.65,z:0,facing:0},colorize,...extra},()=>0);}
 function frame(kind,age){
  base();fx.begin(age);
  if(kind==='acid'){request('AcidSalivaWeapon','native',-3,age);request('AcidSalivaWeapon','red',3,age,[1,.06,.018]);}
  if(kind==='impact'){request('RoachMissileImpact','native',-3,age);request('RoachMissileImpact','red',3,age,[1,.06,.018]);}
  if(kind==='blast'){camera.position.set(0,20,30);camera.lookAt(0,0,0);request('BanelingDeath','native',-5,age,undefined,{mesh:false});request('BanelingDeath','red',5,age,[1,.06,.018],{mesh:false});}
  if(kind==='fog'){fogGroup.visible=true;fog.uniforms.clock.value=age;marineRoot.visible=true;check(originalFog.fragmentShader.includes(marker),'Shared fog material was changed');}
  if(kind==='cocoon-birth'||kind==='cocoon-stand'){
   cocoonRoot.visible=true;const name=kind==='cocoon-birth'?'Birth':'Stand',clip=cocoon.animations.find(c=>c.name===name);check(!!clip,'Missing cocoon clip');
   const action=mixer.clipAction(clip).reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(age);
  }
  if(kind==='cocoon-end')request('FunCocoonDeath','cocoon-end',0,age,undefined,{placement:{x:0,y:.1,z:0,facing:0,scale:.8}});
  if(kind==='stim-start'||kind==='stim-end'||kind==='heal'){
   marineRoot.visible=true;request(kind==='stim-start'?'StimpackStartImpact':kind==='stim-end'?'StimpackEndImpact':'SquibTransfusion',kind,0,age,kind==='heal'?[.12,.9,.42]:undefined,{placement:{x:0,y:kind==='heal'?.65:1.9,z:0,facing:0}});
  }
  fx.end();renderer.render(scene,camera);check(!renderer.getContext().isContextLost(),'WebGL context lost');
  const bounds=cocoonRoot.visible?new T.Box3().setFromObject(cocoonRoot,true):null;
  return {kind,age,draws:fx.report().modelDraws,counts:{particles:fx.report().particles,meshes:fx.report().meshes,missing:fx.report().missing},fogLayers:fogGroup.visible?3:0,cocoon:cocoonRoot.visible,cocoonBounds:bounds?{min:bounds.min.toArray(),max:bounds.max.toArray()}:null,marine:marineRoot.visible};
 }
 window.bioProbe={frame,clips,reset(){base();fx.begin(0);fx.end();renderer.render(scene,camera);return {effects:fx.report().effects,particles:fx.report().particles,cocoon:cocoonRoot.visible,fog:fogGroup.visible};}};
}

const selected=new Set(process.argv.slice(2));
await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false},cacheDir:out+'/vite',logLevel:'error',optimizeDeps:{entries:['src/render/effects/source/player.ts']}});
let browser;const result={scope:'Isolated original-asset and project-fog design probes; no bio gameplay, production integration, audio, refraction or performance acceptance',cases:[],errors:[]};
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-proxy-server']});result.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)result.errors.push(r.status()+' '+r.url());});
 await page.route(origin+'/bio-probe.html',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(origin+'/bio-probe.html');await page.evaluate(prepare);
 result.cocoonClips=await page.evaluate(()=>window.bioProbe.clips);
 for(const [kind,age] of [['acid',.45],['impact',.18],['blast',.45],['fog',1.2],['cocoon-birth',.45],['cocoon-stand',.7],['cocoon-end',.35],['stim-start',.5],['stim-end',.5],['heal',.5]].filter(([kind])=>!selected.size||selected.has(kind))){
  const row=await page.evaluate(([kind,age])=>window.bioProbe.frame(kind,age),[kind,age]);
  assert.equal(row.counts.missing,0);if(!kind.startsWith('cocoon-')&&kind!=='fog')assert.ok(row.counts.particles>0,kind+' has no particles');
  result.cases.push(row);await page.screenshot({path:out+'/'+kind+'.png'});console.log(JSON.stringify(row));
 }
 const tail=await page.evaluate(()=>window.bioProbe.frame('cocoon-end',10));assert.equal(tail.counts.particles,0);assert.equal(tail.cocoon,false);result.tail=tail;
 result.reset=await page.evaluate(()=>window.bioProbe.reset());assert.deepEqual(result.reset,{effects:0,particles:0,cocoon:false,fog:false});assert.deepEqual(result.errors,[]);
 result.sourceHashes={};for(const path of ['src/render/effects/source/player.ts','src/render/effects/source/materials.ts','src/render/effects/source/catalog.json','src/render/effects/elite-support-effects.ts'])result.sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
}catch(e){result.failure=String(e.stack??e);process.exitCode=1;console.error(result.failure);}
finally{await browser?.close();await server.close();await writeFile(out+(selected.size?'/focused.json':'/result.json'),JSON.stringify(result,null,2)+'\n');}
