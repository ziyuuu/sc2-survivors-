import * as THREE from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {restoreSc2Materials,sc2BodyBounds} from '/src/render/loaders/sc2-materials.ts';
import {RUNTIME_ASSETS} from '/src/assets/runtime.generated.ts';
const params=new URLSearchParams(location.search),id=params.get('id')||'model.hero.raynor';
const assets=new Map(RUNTIME_ASSETS.map(a=>[a.id,a]));
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc5e6ff,0x192633,2.6));
for(const [color,intensity,x,y,z] of [[0xc8e5ff,4,4,7,6],[0x238dbd,6,-4,4,-3],[0xdbb77b,3,3,3,-4]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);}
const manager=new THREE.LoadingManager();manager.setURLModifier(v=>v.includes('sc2asset:')?'/'+assets.get(v.split('sc2asset:').pop()).url:v);
try {
 const g=await restoreSc2Materials(await new GLTFLoader(manager).loadAsync('/'+assets.get(id).url));
 const root=g.scene,clip=g.animations.find(c=>/^(Stand|Ready|Idle)( |$)/i.test(c.name));
 if(clip){const mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).play();mixer.update(.4);}
 root.updateMatrixWorld(true);const box=sc2BodyBounds(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const holder=new THREE.Group();root.position.sub(center);holder.add(root);holder.rotation.y=params.has('angle')?Number(params.get('angle')):.22;scene.add(holder);
 const aspect=innerWidth/innerHeight,view=Math.max(size.y*1.12,size.x/aspect*1.1),camera=new THREE.OrthographicCamera(-view*aspect/2,view*aspect/2,view/2,-view/2,.01,200);
 camera.position.set(size.y*.12,size.y*.075,size.y*3);camera.lookAt(0,0,0);renderer.render(scene,camera);
 window.__ART_READY__={id,size:size.toArray(),animations:g.animations.map(c=>c.name)};
}catch(e){window.__ART_ERROR__=String(e);console.error(e);}
