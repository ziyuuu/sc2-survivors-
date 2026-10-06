import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {restoreSc2Materials,sc2BodyBounds,sc2ModelScale} from '../../src/render/loaders/sc2-materials.ts';
import {RUNTIME_ASSETS} from '../../src/assets/runtime.generated.ts';
import {configurePlatformAssetUrl} from '../../src/assets/manifest.ts';
import {campaignTerrain} from '../../src/data/campaign-map.ts';
import {createCampaignMap} from '../../src/render/terrain/campaign-map.ts';

// Authoring-only static fixtures: no World, combat clocks, game saves or gameplay RNG.
const records=new Map(RUNTIME_ASSETS.map(a=>[a.id,a]));
configurePlatformAssetUrl(id=>records.get(id)?.url?'/public/'+records.get(id).url:null);
const sizes={landscape:[1920,780],portrait:[960,1152],wide:[2200,440],minimap:[800,800]};
const roster={terran:[['marine',1.6],['marauder',2.1],['tank',2.2],['medivac',1.55],['reaper',1.7]],zerg:[['zergling',.95],['roach',1.6],['hydralisk',2],['queen',2.6],['baneling',.9]],protoss:[['zealot',1.75],['stalker',2.1],['immortal',2.25],['sentry',1.3],['colossus',4.3]]};
const heroes={terran:[['raynor',2.05],['tychus',2.5],['nova',1.9]],zerg:[['kerrigan',2.5],['zagara',2.8],['dehaka',3]],protoss:[['artanis',2.3],['zeratul',2.1],['fenix',2.6]]};
const centers={landscape:[[-4,3],[-4,-4],[-13,7],[-13,-10],[-13,-1]],portrait:[[-4,5],[2,9],[-4,15],[5,12],[-8,2]],wide:[[-17,0],[-10,1],[-4,0],[1,-3],[5,2]]};
const templates=new Map();
async function template(id){
 if(templates.has(id))return templates.get(id);
 const record=records.get('model.'+id);if(!record)throw Error('Missing original model '+id);
 const g=await restoreSc2Materials(await new GLTFLoader().loadAsync('/public/'+record.url));
 if(id==='hero.nova'){
  const gun=g.scene.getObjectByName('Bone_Gun');if(!gun)throw Error('Nova weapon bone missing');gun.position.set(0,0,0);
  g.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh&&!['M3_Mesh_6','M3_Mesh_7','M3_Mesh_15'].includes(n.name))n.visible=false;});
 }
 const rest=g.animations.find(c=>/^(Stand|Ready|Idle)( |$)/i.test(c.name));
 if(rest){const mixer=new THREE.AnimationMixer(g.scene);mixer.clipAction(rest).play();mixer.setTime(.32);g.scene.updateMatrixWorld(true);}
 const box=sc2BodyBounds(g.scene),center=box.getCenter(new THREE.Vector3());
 const item={root:g.scene,box,center,scale:sc2ModelScale(g.scene),clip:rest?.name||null};templates.set(id,item);return item;
}
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const status=document.querySelector('#render-status'),receipt=document.querySelector('#render-receipt'),preview=document.querySelector('#render-preview'),trigger=document.querySelector('#render-map');
let previousMap=null,previousScene=null;
async function make(){
 trigger.disabled=true;preview.removeAttribute('src');receipt.textContent='';status.textContent='正在读取本地地图与原始模型';
 try{
  if(previousMap)previousMap.dispose();previousMap=null;
  if(previousScene){previousScene.clear();previousScene=null;renderer.renderLists.dispose();}
  const race=document.querySelector('#map-race').value,kind=document.querySelector('#map-kind').value,[width,height]=sizes[kind];renderer.setSize(width,height,false);
  const scene=new THREE.Scene();previousScene=scene;scene.background=new THREE.Color(0x101820);scene.fog=new THREE.FogExp2(0x152535,.003);
  scene.add(new THREE.HemisphereLight(0xd6e8f5,0x202734,2.05));
  const key=new THREE.DirectionalLight(0xffeed7,2.8);key.position.set(-20,44,-14);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:.1,far:110});key.shadow.normalBias=.025;key.shadow.bias=-.00008;scene.add(key);
  const fill=new THREE.DirectionalLight(0x89b4da,.75);fill.position.set(24,18,22);scene.add(fill);
  const recipe={version:1,seed:271,theme:'industrial',layout:0},terrain=campaignTerrain(recipe);terrain.setStage(6);const map=await createCampaignMap(scene,terrain);previousMap=map;map.setVisible(true);
  scene.traverse(n=>{if(n instanceof THREE.Mesh){n.receiveShadow=true;if(n.name!=='char-traversable-ground')n.castShadow=true;else{
   // Soften the reveal edge for the still image. Runtime terrain and navigation are untouched.
   const material=n.material,compile=material.onBeforeCompile.bind(material);
   material.onBeforeCompile=shader=>{compile(shader);shader.fragmentShader=shader.fragmentShader.replace('float visibleZone=step(.5,zone)*(1.0-step(openStage+.1,zone));',`float visibleZone=0.0;for(int y=-2;y<=2;y++){for(int x=-2;x<=2;x++){float neighbour=texture2D(openMap,vec2(vMapUv.x,1.0-vMapUv.y)+vec2(float(x),float(y))*.008).r*255.0;visibleZone+=step(.5,neighbour)*(1.0-step(openStage+.1,neighbour))/25.0;}}`).replaceAll('vMapUv*32.0','vMapUv*25.0');};
   material.customProgramCacheKey=()=> 'r4-static-ground-soft-edge-v1';
  }}});
  const actualKind=kind==='minimap'?'landscape':kind,positions=centers[actualKind],units=[];
  async function actor(id,height,x,z,side='friendly',air=false){
   const t=await template(id),root=clone(t.root),size=t.box.getSize(new THREE.Vector3()),native=t.scale===undefined?height/Math.max(.001,size.y):1.4*t.scale;
   const planarCap=air?4.6:id==='tank'?3.2:id==='colossus'?4.6:id.startsWith('hero.')?3.5:2.5;
   const scale=Math.min(native*.8,planarCap/Math.max(.001,size.x,size.z));
   const footprint=Math.max(.32,Math.max(size.x,size.z)*scale*.5);
   const free=(px,pz)=>terrain.canOccupy({x:px,z:pz},footprint)&&units.filter(u=>u.air===air).every(u=>Math.hypot(px-u.x,pz-u.z)>footprint+u.footprint+.12);
   if(!free(x,z)){
    const wanted={x,z};let placed=false;
    for(let ring=1;ring<=16&&!placed;ring++)for(let k=0;k<24&&!placed;k++){
     const px=wanted.x+Math.cos(k*Math.PI/12)*ring*.55,pz=wanted.z+Math.sin(k*Math.PI/12)*ring*.55;
     if(free(px,pz)){x=px;z=pz;placed=true;}
    }
    if(!placed)throw Error('Static actor has no clear placement: '+id);
   }
   const body=new THREE.Group();root.scale.setScalar(scale);root.position.set(-t.center.x*scale,-t.box.min.y*scale,-t.center.z*scale);body.add(root);body.rotation.y=side==='enemy'?-Math.PI/2:Math.PI/2;
   body.position.set(x,air?3.2:0,z);root.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=true;n.receiveShadow=true;}});scene.add(body);units.push({id:'model.'+id,x,z,air,side,footprint,originalClip:t.clip});
  }
  for(const [j,[id,unitHeight]] of roster[race].entries()){
   const [cx,cz]=positions[j],space=id==='medivac'?4.8:['tank','queen','colossus','immortal'].includes(id)?3.4:1.8;
   for(let i=0;i<5;i++){
    const x=cx+(i%3-1)*space,z=cz+(Math.floor(i/3)-.35)*space;
    await actor(id,unitHeight,x,z,'friendly',id==='medivac');
    if(id==='zergling')await actor(id,unitHeight,x+.5,z+.65);
   }
  }
  const heroPoints=actualKind==='portrait'?[[0,0],[4,2],[-4,-1]]:actualKind==='wide'?[[8,-3],[9,1],[8,5]]:[[1,-2],[1,3],[-1,-7]];
  for(const [i,[id,h]] of heroes[race].entries())await actor('hero.'+id,h,...heroPoints[i]);
  for(let i=0;i<16;i++){
   const x=actualKind==='portrait'?5+(i%4-1.5)*1.45:actualKind==='wide'?18+(i%4)*1.4:11+(i%4)*1.65;
   const z=actualKind==='portrait'?-15+Math.floor(i/4)*1.5:-5+Math.floor(i/4)*1.65;
   await actor('zergling',.95,x,z,'enemy');
  }
  const aspect=width/height,view=kind==='portrait'?41:kind==='wide'?18:kind==='minimap'?67:32;
  const camera=new THREE.OrthographicCamera(-view*aspect/2,view*aspect/2,view/2,-view/2,.1,200);
  const aim=kind==='portrait'?new THREE.Vector3(0,0,1):new THREE.Vector3(0,0,0);
  camera.position.copy(aim).add(kind==='minimap'?new THREE.Vector3(0,80,.001):new THREE.Vector3(0,46,32));camera.lookAt(aim);camera.updateMatrixWorld();map.update(camera);
  status.textContent='正在生成静态光影';await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  preview.src=renderer.domElement.toDataURL('image/jpeg',.95);
  const note={race,kind,width,height,recipe,stage:6,map:map.report(),units,scope:'Local static authoring only; original models and original campaign terrain. No World or gameplay acceptance.'};
  receipt.textContent=JSON.stringify(note);status.textContent=`完成 · ${race} · ${kind} · ${width} × ${height}`;
 }catch(error){status.textContent='失败：'+error;console.error(error);}
 finally{trigger.disabled=false;}
}
trigger.addEventListener('click',make);make();
