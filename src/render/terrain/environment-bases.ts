import * as THREE from 'three';
import {landscapeNoise,type CampaignTheme} from '../../data/campaign-landscape';
import type {RadialTerrain} from '../../data/campaign-map';
import type {MapPlacement} from '../../data/map-definition';
import type {LandscapeResources} from './campaign-ground';

/** An irregular solid skirt joins tapered rock models to the true terrain, entirely inside their existing blocker. */
export function rockBaseGeometry(terrain:RadialTerrain,placement:MapPlacement,bodyHeight:number){
 const x=placement.position[0]-80,z=80-placement.position[1],radius=placement.blockerSize!;
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],segments=16,height=Math.min(radius*.76,bodyHeight*.46),ground=terrain.height({x,z});
 const put=(px:number,pz:number,y:number)=>{positions.push(px,y,pz);uv.push((px+80)/160,(80-pz)/160);};put(x,z,ground+height);
 for(let ring=0;ring<3;ring++)for(let i=0;i<segments;i++){
  const angle=i/segments*Math.PI*2,noise=landscapeNoise(x*.4+Math.cos(angle)*2,z*.4+Math.sin(angle)*2,terrain.recipe.seed+11),r=radius*(.68+noise*.29)*[.64,.85,1][ring],px=x+Math.cos(angle)*r,pz=z+Math.sin(angle)*r;
  const surface=terrain.height({x:px,z:pz}),up=ring===0?height*(.83+noise*.13):ring===1?height*(.18+noise*.16):-.022;
  put(px,pz,ring===0?Math.max(surface-.022,ground+up):surface+up);
 }
 for(let i=0;i<segments;i++){const j=(i+1)%segments;indices.push(0,1+j,1+i);for(let ring=0;ring<2;ring++){const a=1+ring*segments+i,b=1+ring*segments+j,c=a+segments,d=b+segments;indices.push(a,d,c,a,b,d);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const normals=geometry.getAttribute('normal'),normal=new THREE.Vector3();for(let i=1+segments*2;i<1+segments*3;i++){const px=positions[i*3],pz=positions[i*3+2];normal.set(terrain.height({x:px-.5,z:pz})-terrain.height({x:px+.5,z:pz}),1,terrain.height({x:px,z:pz-.5})-terrain.height({x:px,z:pz+.5})).normalize();normals.setXYZ(i,normal.x,normal.y,normal.z);}
 geometry.computeBoundingSphere();return geometry;
}
export function createEnvironmentBases(root:THREE.Group,terrain:RadialTerrain,theme:CampaignTheme,bodyHeights:ReadonlyMap<string,number>,material:THREE.Material,resources:LandscapeResources){
 const places=terrain.definition.placements.filter(p=>p.type==='landmark'&&p.blockerSize&&p.assetId?.includes('rock')),group=new THREE.Group();group.name='original-rock-grounding';root.add(group);
 let triangles=0;const meshes:THREE.Mesh[]=[];
 for(const p of places){const height=(bodyHeights.get(p.assetId!)??1)*p.scale[0]*(p.modelScale?.[1]??1),geometry=rockBaseGeometry(terrain,p,height);resources.geometries.push(geometry);triangles+=geometry.index!.count/3;
  const mesh=new THREE.Mesh(geometry,material);mesh.name='grounded:'+p.assetId;mesh.raycast=()=>{};group.add(mesh);meshes.push(mesh);
 }
 return {setVisible:(v:boolean)=>{group.visible=v;},setMaterial:(m:THREE.Material)=>{for(const mesh of meshes)mesh.material=m;},report:()=>({count:places.length,triangles,insideOriginalBlockers:true,source:theme,continuousGroundSampling:true,modelVerticesChanged:false,footprintsChanged:false})};
}
