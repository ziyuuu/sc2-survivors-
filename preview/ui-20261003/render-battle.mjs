import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {restoreSc2Materials} from '/src/render/loaders/sc2-materials.ts';
import {AnimatedBatch} from '/src/render/units/animated-batch.ts';
import {RUNTIME_ASSETS} from '/src/assets/runtime.generated.ts';
import {configurePlatformAssetUrl} from '/src/assets/manifest.ts';
import {campaignTerrain} from '/src/data/campaign-map.ts';
import {createCampaignMap} from '/src/render/terrain/campaign-map.ts';
const assets=new Map(RUNTIME_ASSETS.map(a=>[a.id,a]));configurePlatformAssetUrl(id=>assets.get(id)?.url?'/'+assets.get(id).url:null);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setClearColor(0x171d20);document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x202326,.009);scene.add(new THREE.HemisphereLight(0xc1d9e3,0x473320,1.4));const key=new THREE.DirectionalLight(0xffe0bd,2.4);key.position.set(-15,25,10);scene.add(key);
const aspect=innerWidth/innerHeight,view=29,camera=new THREE.OrthographicCamera(-view*aspect/2,view*aspect/2,view/2,-view/2,.1,200);camera.position.set(0,34,26);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const notes={method:'Static illustration only. Actual prepared original Protoss GLB models, original idle clips and the existing industrial campaign-map renderer. No World or gameplay simulation.',models:[],map:{version:1,seed:271,theme:'industrial',layout:0,stage:6}};
try{
 const terrain=campaignTerrain({version:1,seed:271,theme:'industrial',layout:0});terrain.setStage(6);const map=await createCampaignMap(scene,terrain);map.setVisible(true);
 const roster=[['zealot',1.6,-3,-1],['stalker',2.15,1,1],['immortal',2.45,-3,4],['sentry',1.35,4,3],['colossus',4.5,-1,-5],['hero.artanis',2.3,-1,0],['hero.zeratul',2.1,1,-1],['hero.fenix',2.5,2,2],['zergling',.85,9,-6]];
 const entries=await Promise.all(roster.map(async([id,height,cx,cz])=>{const idKey='model.'+id,record=assets.get(idKey);if(!record)throw Error('Missing authentic model '+idKey);const g=await restoreSc2Materials(await new GLTFLoader().loadAsync('/'+record.url));return {id,height,cx,cz,g};}));
 for(const {id,height,cx,cz,g} of entries){const clip=g.animations.find(c=>/^(Stand|Ready|Idle)( |$)/i.test(c.name));const count=id.startsWith('hero.')?1:id==='zergling'?12:5;
  const batch=new AnimatedBatch(g,scene,height,undefined,.8,id);batch.begin();for(let i=0;i<count;i++)batch.add(cx+(i%3-1)*1.55,0,cz+Math.floor(i/3)*1.9,id==='zergling'?Math.PI*.9:Math.PI,'idle',.2);batch.end();
  notes.models.push({id:'model.'+id,count,clip:clip?.name});
 }
 map.update(camera);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);window.__BATTLE_ART_READY__=notes;
}catch(e){window.__BATTLE_ART_ERROR__=String(e);console.error(e);}
