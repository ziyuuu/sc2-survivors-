import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {assetUrl} from '../../src/assets/manifest';
import {readTerrainPixels} from '../../src/render/terrain/campaign-textures';
import {splitTerrainLayers} from '../../src/render/terrain/map-surface';
import {loadSemanticGltf} from '../../src/render/loaders/semantic-gltf';
import {sc2BodyBounds} from '../../src/render/loaders/sc2-materials';
import {repairStaticEmission} from './material-repair';
import {sampleTextureUrl} from './sample-data';

/** Authored diagnostic deck; its outer wall footprints are supplied by scenario.ts. */
export async function createIndustrialStage(scene:THREE.Scene,onProgress:(s:string)=>void){
 const root=new THREE.Group();root.name='quality-industrial-deck';scene.add(root);
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 const add=(source:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,ry=0)=>{const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();g.rotateY(ry);g.translate(x,y,z);const list=batches.get(m)??[];list.push(g);batches.set(m,list);};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,r=.04,ry=0)=>add(r?new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d),m,x,y,z,ry);
 onProgress('读取原始甲板与法线');
 const atlas=await readTerrainPixels(assetUrl('map.terrain.diffuse')!),normalAtlas=await readTerrainPixels(assetUrl('map.terrain.normal')!);
 const color=splitTerrainLayers(atlas.pixels,atlas.width,atlas.height),normal=splitTerrainLayers(normalAtlas.pixels,normalAtlas.width,normalAtlas.height);
 const layer=(index:number,data:typeof color,linear=false)=>{const length=data.side*data.side*4,t=new THREE.DataTexture(data.pixels.slice(index*length,(index+1)*length),data.side,data.side);t.colorSpace=linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;return t;};
 const originalTexture=async(name:string,linear=false)=>{const t=await new THREE.TextureLoader().loadAsync(sampleTextureUrl('./source-textures/'+name+'.png'));t.colorSpace=linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;};
 const floorMap=await originalTexture('castanarex2_panels.dds'),floorNormal=await originalTexture('castanarex2_panelsnormal.dds',true),detailMap=layer(3,color),detailNormal=layer(3,normal,true);
 floorMap.center.set(.5,.5);floorNormal.center.set(.5,.5);floorMap.rotation=floorNormal.rotation=Math.PI/4;
 const steel=new THREE.MeshStandardMaterial({color:0x5b7075,roughness:.53,metalness:.62});
 const edge=new THREE.MeshStandardMaterial({color:0x627478,roughness:.5,metalness:.60,map:detailMap,normalMap:detailNormal,normalScale:new THREE.Vector2(.35,.35)});
 const dark=new THREE.MeshStandardMaterial({color:0x172528,roughness:.68,metalness:.4});
 const frame=new THREE.MeshStandardMaterial({color:0x829090,roughness:.62,metalness:.18,map:floorMap,normalMap:floorNormal,normalScale:new THREE.Vector2(.3,.3)});
 const paint=new THREE.MeshStandardMaterial({color:0x9e8040,roughness:.63,metalness:.18});
 const floor=new THREE.MeshStandardMaterial({color:0xffffff,map:floorMap,normalMap:floorNormal,normalScale:new THREE.Vector2(.7,.7),roughness:.70,metalness:.28});
 const fine=new THREE.MeshStandardMaterial({color:0xa4adae,map:floorMap,normalMap:floorNormal,normalScale:new THREE.Vector2(.8,.8),roughness:.67,metalness:.1});
 const grime=new THREE.MeshStandardMaterial({color:0x162326,roughness:1,metalness:0});
 const lamp=new THREE.MeshBasicMaterial({color:new THREE.Color(.18,.52,.65),toneMapped:false});
 box(0,-4.6,0,65,.3,70,new THREE.MeshStandardMaterial({color:0x16262b,roughness:.93,metalness:.08}),0);
 box(0,-1.75,0,24,3.35,40,dark,.15);box(0,-.24,0,22.9,.38,39.9,frame,.1);
 const deck=new THREE.PlaneGeometry(22.8,39.9);deck.rotateX(-Math.PI/2);const uv=deck.getAttribute('uv'),positions=deck.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/4.8,positions.getZ(i)/4.8);add(deck,floor,0,.003,0);
 const drains:[number,number][]=[...[-12,-8,8,12].map(z=>[-7.9,z] as [number,number]),...[0,8,12,16].map(z=>[7.9,z] as [number,number])];
 box(6.7,.006,-8.5,3.6,.035,5.6,frame,.015);for(const x of [5.9,7.5])for(const z of [-10.1,-8.5,-6.9])drains.push([x,z]);
 for(const [x,z] of drains){const r=.64;add(new THREE.CylinderGeometry(r,r,.025,32),dark,x,.017,z);
  const rim=new THREE.TorusGeometry(r+.045,.055,6,40);rim.rotateX(-Math.PI/2);add(rim,edge,x,.048,z);
  for(let d=-.51;d<=.52;d+=.17){const length=2*Math.sqrt(Math.max(0,r*r-d*d));box(x,.061,z+d,length,.035,.034,steel,0);box(x+d,.062,z,.034,.036,length,steel,0);}
 }
 for(const x of [-8.9,8.9]){
  box(x,-.03,0,.84,.11,39.9,grime,0);
  for(let z=-19.7;z<20;z+=.22)box(x,.025,z,.74,.045,.05,steel,0);
  box(x-.47,.025,0,.11,.095,39.9,edge,.02);box(x+.47,.025,0,.11,.095,39.9,edge,.02);
 }
 for(const z of [-15.5,-5.5,6,15.5]){box(0,.006,z,17.25,.035,.23,frame,.01);box(0,.03,z+.105,17.25,.02,.032,edge,0);}
 for(const x of [-9.65,9.65])for(let z=-18;z<20;z+=2.8)box(x,.015,z,.065,.017,1.45,paint,0);
 for(const z of [-11.6,-5.4]){box(6.7,.029,z,3.6,.017,.09,edge,0);for(let x=5.3;x<=8.4;x+=.38)box(x,.04,z,.18,.014,.075,paint,0,-.4);}
 for(const [x,z,ry] of [[-4,-9,.1],[6,6,-.12],[-6,9,.08]]){box(x,.025,z,2.4,.055,1.35,frame,.03,ry);box(x,.06,z,2.22,.012,1.17,fine,.02,ry);}
 for(const x of [-11.2,11.2])for(let z=-19;z<20;z+=3.8){
  box(x,.30,z,.44,.64,3.72,frame,.065);box(x,.65,z,.58,.10,3.82,edge,.035);box(x,.2,z,.71,.42,.42,steel,.05);
  if(z<-6||z>10){box(x,1.1,z,.42,1.0,.42,steel,.065);box(x,1.58,z,.52,.14,3.8,frame,.04);}
  box(x+(x>0?-.29:.29),.30,z,.018,.13,.55,lamp,0);
 }
 for(const side of [-1,1])for(let z=-22;z<17;z+=4.4){const x=side*13.6;box(x,.15,z,3.8,.35,4.4,dark,.03);box(x,-1.5,z,1.8,3.1,1.1,frame,.07);}
 box(0,1.6,-21.8,28,3.0,4.4,frame,.13);
 for(let x=-12;x<=12;x+=3.2){box(x,3.13,-22.4,2.9,.12,3.2,fine,.04);box(x,1.7,-19.53,2.8,2.45,.20,steel,.06);box(x,1.7,-19.39,2.46,2.09,.06,dark,.02);}
 for(let i=0;i<42;i++){const x=Math.sin(i*23.713)*7.5,z=Math.cos(i*7.193)*18;box(x,.003,z,.02,.007,.2+(i%5)*.075,grime,0,i*.8);}
 for(const [material,parts] of batches){const geometry=mergeGeometries(parts);if(!geometry)throw Error('Industrial batch geometry mismatch');for(const g of parts)g.dispose();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
 onProgress('摆放原始工业设备');
 const placements:[string,number,number,number,number,number?][]=[['model.map.compoundsewers_exhaustpipes_00',-12,-11,4.4,0],['model.map.supplytanks',13,-8,3.5,Math.PI/2],['model.map.barrels_00',-10,7,1.5,.2],['model.map.crate_00',10,8,1.7,.4],['model.map.dom_crate_00',-10,-4,1.8,0],['model.map.floodlight_01',13,-12,2.8,Math.PI],['model.map.halfstructureplates_00',-15,7,5.6,.2],['model.map.dom_labconsoles_00',-9.8,-7,2.5,Math.PI/2],['model.map.dom_labwallscreens_01',-10,0,3.8,Math.PI/2],['model.map.dom_labstasistubewalls_02',10,-8,3.5,-Math.PI/2],['model.map.spaceplatformbarrier_00',10.7,4.4,2.5,Math.PI/2],['model.map.dom_labstasistubewalls_02',10.8,4.6,4.2,-Math.PI/2],['model.map.halfstructureplates_01',-12,10,4.5,0,-2.5]];
 // Broad wall masses and service bays break the repeated bridge silhouette.
 for(let z=-17;z<=15;z+=5.8)placements.push(['model.map.cliffmade13_bbcc_00',-12.1,z,6.0,-Math.PI/2,-.5]);
 for(let z=-14;z<=14;z+=4.8)placements.push(['model.map.cliffmade13_bbcc_00',12,z,4.9,Math.PI/2,-2.4]);
 placements.push(['model.map.dom_labstasistubewalls_02',-11,-3.8,4.1,Math.PI/2],['model.map.compoundsewers_exhaustpipes_00',12.2,2.4,5.2,Math.PI/2],['model.map.supplytanks',12.6,11.3,5.8,Math.PI/2],['model.map.halfstructureplates_00',-15.1,-8,7.5,-Math.PI/2,-2.1]);
 const grouped=new Map<string,typeof placements>();for(const p of placements){const list=grouped.get(p[0])??[];list.push(p);grouped.set(p[0],list);}
 const v=new THREE.Vector3();
 for(const [id,list] of grouped){const g=await loadSemanticGltf(id);await repairStaticEmission(g);const body=g.scene,mixer=new THREE.AnimationMixer(body),idle=g.animations.find(a=>/^stand|idle/i.test(a.name));if(idle){mixer.clipAction(idle).play();mixer.setTime(0);}body.updateMatrixWorld(true);const b=sc2BodyBounds(body),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
  if(id.includes('cliffmade')){const seen=new Set<THREE.Material>();body.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(!seen.has(m)){seen.add(m);if(m instanceof THREE.MeshStandardMaterial){m.color.multiplyScalar(.8);m.emissiveIntensity*=.18;m.transparent=false;m.depthWrite=true;m.alphaTest=.1;m.needsUpdate=true;}}});}
  const matrices=list.map(([,x,z,width,ry,y=0])=>{const scale=width/Math.max(size.x,size.z);return new THREE.Matrix4().makeTranslation(x,y,z).multiply(new THREE.Matrix4().makeRotationY(ry)).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-b.min.y,-center.z));});
  body.traverse(n=>{if(!(n instanceof THREE.Mesh)||!n.visible)return;const geometry=n.geometry.clone(),p=geometry.getAttribute('position');for(let i=0;i<p.count;i++){n.getVertexPosition(i,v).applyMatrix4(n.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);}geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();const mesh=new THREE.InstancedMesh(geometry,n.material,list.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.name=id;root.add(mesh);});mixer.stopAllAction();mixer.uncacheRoot(body);
 }
 return {root,materials:{floor,steel,edge,dark,frame},report:()=>({authoredGeometry:true,sourceProps:placements.map(p=>p[0]),visualOnly:true,sourceTextures:['map.terrain.diffuse','map.terrain.normal','castanarex2_panels.dds','castanarex2_panelsnormal.dds'],meshes:root.children.length})};
}
