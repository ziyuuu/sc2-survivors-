import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {restoreSc2Materials,sc2BodyBounds} from '../loaders/sc2-materials';
import {commitInstances} from '../units/instance-updates';
import type {World} from '../../simulation/world';
import type {Entity,VisualEvent} from '../../simulation/types';
import {revisedZergElite} from '../../simulation/combat/zerg-elite-runtime';
import type {BattleEffects} from './battle-effects';
import {ZergEliteMaterials} from './zerg-elite-materials';
type P={x:number;y:number;z:number};
type Batch={mesh:THREE.InstancedMesh;count:number};
type Echo={event:VisualEvent;life:number};
const obj=new THREE.Object3D(),tint=new THREE.Color(),mix=(a:P,b:P,t:number):P=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
/** Visuals read authoritative bodies, flights, finite capsules and contact receipts. They never deal damage. */
export class ZergEliteEffects {
 quality:'full'|'balanced'|'low'='full';ready=false;private material:ZergEliteMaterials;private sacs:Batch[]=[];private bones:Batch[]=[];private thorns:Batch[]=[];private echoes:Echo[]=[];private serial=0;private time=0;
 private counts={flights:0,biles:0,spines:0,healStreams:0,poisonHosts:0,claws:0,fields:0};
 constructor(private scene:THREE.Scene,private fx:BattleEffects,camera:THREE.Camera){this.material=new ZergEliteMaterials(scene,camera,fx);}
 async load(){if(this.ready)return;await prepareEmbeddedAssetIds(['model.baneling']);this.material.prepare();const scene=this.scene;
  const url=assetUrl('model.baneling');if(!url)throw Error('Missing original acid-sac body');const g=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));g.scene.updateMatrixWorld(true);const box=sc2BodyBounds(g.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),scale=.55/Math.max(size.x,size.y,size.z);
  g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh)||n.userData.sc2Role!=='body')return;const geom=n.geometry.clone(),attr=geom.getAttribute('position'),p=new THREE.Vector3();for(let i=0;i<attr.count;i++){n.getVertexPosition(i,p).applyMatrix4(n.matrixWorld).sub(center).multiplyScalar(scale);attr.setXYZ(i,p.x,p.y,p.z);}geom.deleteAttribute('skinIndex');geom.deleteAttribute('skinWeight');geom.computeVertexNormals();const mesh=new THREE.InstancedMesh(geom,n.material,256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.sacs.push({mesh,count:0});});
  for(const b of this.fx.projectiles.batches.get('hydralisk')??[]){const geometry=b.geometry.clone();geometry.computeBoundingBox();const extent=geometry.boundingBox!.getSize(new THREE.Vector3());if(extent.x>extent.y&&extent.x>extent.z)geometry.rotateY(Math.PI/2);else if(extent.y>extent.z)geometry.rotateX(Math.PI/2);const mesh=new THREE.InstancedMesh(geometry,b.material,1024);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.bones.push({mesh,count:0});}if(!this.sacs.length||!this.bones.length)throw Error('Original Zerg weapon mesh unavailable');
  // Authored curved ground thorn, using the original bone surface. Its world-Y shaft is independent of missile orientation.
  const vertices:number[]=[],uvs:number[]=[],indices:number[]=[],rings=14,sides=16;for(let r=0;r<=rings;r++){const t=r/rings,radius=.25*Math.pow(1-t,.7)*(1+.09*Math.sin(t*21)),bend=.19*Math.sin(t*Math.PI*.85);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;vertices.push(Math.cos(a)*radius,bend+t*2.2-.12,Math.sin(a)*radius+bend*.7);uvs.push(j/sides,t);if(r<rings&&j<sides){const n=r*(sides+1)+j;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}}}
  const thornGeometry=new THREE.BufferGeometry();thornGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));thornGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));thornGeometry.setIndex(indices);thornGeometry.computeVertexNormals();const boneMaterial=(Array.isArray(this.bones[0].mesh.material)?this.bones[0].mesh.material[0]:this.bones[0].mesh.material) as THREE.MeshStandardMaterial;
  const thornMaterial=new THREE.MeshStandardMaterial({map:boneMaterial.map,normalMap:boneMaterial.normalMap,color:0xb8ad8b,roughness:.8,metalness:0});const thorns=new THREE.InstancedMesh(thornGeometry,thornMaterial,512);thorns.count=0;thorns.frustumCulled=false;thorns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(thorns);this.thorns.push({mesh:thorns,count:0});this.ready=true;
 }
 reset(){this.echoes=[];this.serial=0;this.time=0;this.material.reset();for(const b of [...this.sacs,...this.bones,...this.thorns])commitInstances(b.mesh,b.count=0);}
 report(){return {ready:this.ready,quality:this.quality,...this.counts,materials:this.material.report(),originalAcidSacMeshes:this.sacs.length,originalBoneMeshes:this.bones.length,authoredThornSurface:'original Hydralisk bone texture',echoes:this.echoes.length};}
 private body(batch:Batch[],p:P,scale:P,facing=0,pitch=0,roll=0){for(const b of batch){if(b.count>=b.mesh.instanceMatrix.count)continue;obj.position.set(p.x,p.y,p.z);obj.rotation.set(pitch,facing,roll);obj.scale.set(scale.x,scale.y,scale.z);obj.updateMatrix();b.mesh.setMatrixAt(b.count++,obj.matrix);}}
 render(w:World,camera:THREE.Camera,visible:(p:{x:number;z:number})=>boolean,muzzle:(e:VisualEvent)=>P){if(!this.ready)return;this.material.begin(w.time);for(const b of [...this.sacs,...this.bones,...this.thorns])b.count=0;this.counts={flights:0,biles:0,spines:0,healStreams:0,poisonHosts:0,claws:0,fields:0};
  if(w.time<this.time){this.echoes=[];this.serial=0;}this.time=w.time;const density=this.quality==='full'?1:this.quality==='balanced'?.65:.35;
  const point=(p:{x:number;z:number;flying?:boolean},height=.6):P=>({x:p.x,y:(p.flying?5.6:w.terrain?.height(p)??0)+height,z:p.z});
  const sprite=(key:Parameters<ZergEliteMaterials['sprite']>[0],p:P,size:number,color:number,opacity=.7,ground=false,phase=0)=>this.material.sprite(key,p,size,color,opacity,Math.floor((w.time*23+phase)%16),ground,w.time*.12+phase);
  for(const p of w.weaponFlights){const u=p.source;if(!revisedZergElite(u)||w.time<p.start||!visible(p.point))continue;const target=w.body(p.target),r=Math.max(.01,Math.hypot(p.lastSeen.x-p.from.x,p.lastSeen.z-p.from.z)),t=Math.min(1,Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z)/r),from=point({...p.from,flying:u.flying},.8),to=point({...p.point,flying:target?.flying},.65),angle=Math.atan2(p.lastSeen.x-p.point.x,p.lastSeen.z-p.point.z),head={...to,y:from.y+(to.y-from.y)*t};
   const launch=w.visualEvents.find(e=>e.attackId===p.attackId),mount=p.hop===0&&launch?muzzle(launch):from,blend=Math.max(0,1-Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z)/1.2);head.x+=(mount.x-p.from.x)*blend;head.z+=(mount.z-p.from.z)*blend;head.y+=(mount.y-from.y)*blend;
   const tail={x:head.x-Math.sin(angle)*.5,y:head.y,z:head.z-Math.cos(angle)*.5};const acidColor=u.eliteId==='corruptor.1'?0xc8e27b:u.eliteId==='roach.2'?0xe3be67:0x9ddd72;
   if(u.unitType==='mutalisk'){
    // Three textured original bone splinters form the spinning living glaive; not a flat geometric triangle.
    for(let i=0;i<3;i++){const spin=w.time*19+i*Math.PI*2/3;this.body(this.bones,{x:head.x+Math.sin(spin)*.15,y:head.y+Math.cos(spin)*.09,z:head.z+Math.cos(spin)*.15},{x:1.1,y:1.1,z:1.3},angle+spin,.15);}
    sprite('tissue',head,.6,u.eliteId==='mutalisk.3'?0xe58e8b:0xb8db8f,.45);this.material.ribbon('fluid',tail,head,.11,0xa6d890,.55);this.counts.flights++;
   }else if(u.unitType==='hydralisk'){
    if(u.eliteId==='hydralisk.2')this.body(this.bones,head,{x:1,y:1,z:2.1},angle); // Other hydras retain the shared original needle renderer.
    this.material.ribbon('fluid',tail,head,u.eliteId==='hydralisk.2'?.075:.04,u.eliteId==='hydralisk.3'?0xb091e0:0xc5d19e,.5);this.counts.flights++;
   }else {const power=u.eliteId==='roach.2'&&u.zergEliteCombat?.stacks===0?1.9:u.eliteId==='corruptor.1'?1+.6*Math.min(1,((u.zergEliteCombat?.lastFire??0)-(u.zergEliteCombat?.lockAt??0))/4):1;
    this.body(this.sacs,head,{x:power*.75,y:power*.75,z:power},angle,w.time*2);sprite('acid',head,.48*power,acidColor,.65);this.material.ribbon('fluid',tail,head,.13*power,acidColor,.65);sprite('mist',{...tail,y:tail.y+.05},.4*power,0x739971,.23);this.counts.flights++;}
  }
  for(const b of w.zergElites.biles){if(!b.launched||w.time<b.launchAt||w.time>=b.impactAt||!visible(b.point)&&!visible(b.source))continue;const t=Math.min(1,(w.time-b.launchAt)/(b.impactAt-b.launchAt)),origin=point(b.source,1.25),end=point(b.point,.3),head=mix(origin,end,t);head.y+=Math.sin(t*Math.PI)*7;const giant=b.source.eliteId==='ravager.2',s=giant?2.4:1.35;this.body(this.sacs,head,{x:s,y:s,z:s},w.time*2);sprite('acid',head,s*.65,giant?0xf1b762:0xd5cf82,.7);sprite('mist',{...head,y:head.y+.15},s*.8,0x99966b,.27);
   // Textured impact soil and descending spores convey the actual fixed landing footprint.
   sprite('venom',point(b.point,.035),b.radius*3.2,0xd0b174,.33,true,b.id);for(let i=0;i<Math.ceil(6*density);i++){const a=i*2.399,r=b.radius*.7;this.material.ribbon('fluid',{x:end.x+Math.sin(a)*r,y:end.y+.6+(1-t)*.8,z:end.z+Math.cos(a)*r},{x:end.x+Math.sin(a)*r,y:end.y+.08,z:end.z+Math.cos(a)*r},.045,0xcab86d,.35);}this.counts.biles++;
  }
  for(const l of w.zergElites.lines){if(!visible(l.point))continue;if(l.kind==='spear'){const p=point({...l.point,flying:l.air},.7);this.body(this.bones,p,{x:1,y:1,z:2.1},l.facing);this.counts.flights++;continue;}
   for(let d=Math.max(.5,l.progress-3.5);d<=l.progress;d+=.65){const p=point({x:l.from.x+Math.sin(l.facing)*d,z:l.from.z+Math.cos(l.facing)*d},.06),giant=l.length>12||l.damage>l.source.weaponDamage*2,s=giant?2.3:1.25;this.body(this.thorns,p,{x:s*.75,y:s*.9,z:s*.75},l.facing);sprite('tissue',{...p,y:p.y-.26},s*.8,0x7a8561,.42,true);sprite('dust',{...p,y:p.y+.15},s*.7,0x776958,.3);this.counts.spines++;}
  }
  for(const a of w.zergElites.areas){if(!visible(a.point))continue;const n=Math.ceil(11*density);for(let i=0;i<n;i++){const angle=i*2.399,r=a.radius*Math.sqrt((i+.5)/n)*.78,p=point({x:a.point.x+Math.sin(angle)*r,z:a.point.z+Math.cos(angle)*r},.035);sprite('tissue',p,1.35, a.kind==='rain'?0x938f69:0x8e9c57,.48,true,i);sprite('mist',{...p,y:p.y+.28},.8,0x8da270,.2,false,i);if(a.kind==='rain'){const head={...p,y:p.y+.95+(i%3)*.4};this.material.ribbon('fluid',head,{...p,y:p.y+.06},.045,0xc7ce91,.48);}}this.counts.fields++;}
  for(const p of w.zergElites.poisons){const b=w.body(p.target);if(!b||b.hp<=0||!visible(b))continue;const head=point(b,b.flying?.6:.55),s=.4+Math.sqrt(b.unitRadius)*.4;this.body(this.sacs,{...head,y:head.y+.15},{x:s*.7,y:s*.7,z:s*.7},w.time*.4);this.material.skin(head,{x:b.unitRadius*1.15,y:.6,z:b.unitRadius*1.1},p.kind==='hydra'?0x9c82c4:0xa3c276);for(let i=0;i<Math.ceil(p.layers*2*density);i++)sprite('venom',{x:head.x+Math.sin(i*2.399+w.time)*.25,y:head.y+.3+i*.05,z:head.z+Math.cos(i*2.399)*.25},.3,0xa0c97b,.36,false,i);this.counts.poisonHosts++;}
  for(const h of w.zergElites.heals){const u=w.entities.get(h.source.id);if(!u?.hp||!visible(u))continue;for(const id of h.targets){const b=w.entities.get(id);if(!b?.hp||b.hp>=b.maxHp||Math.hypot(b.x-u.x,b.z-u.z)>8+b.unitRadius||!visible(b))continue;const from=point(u,2.2),to=point(b,b.unitType==='ultralisk'?4:Math.max(1.6,b.unitRadius*2));from.y+=.2;let prev=from;
    for(let i=1;i<=18;i++){const t=i/18,p=mix(from,to,t),wave=Math.sin(t*Math.PI);p.y+=wave*(.55+Math.sin(t*11-w.time*3.5)*.08);p.x+=Math.cos(t*9-w.time*3)*wave*.18;const width=.29+.065*Math.sin(t*15-w.time*6);this.material.ribbon('fluid',prev,p,width*1.7,0x718958,.23);this.material.ribbon('fluid',prev,p,width,0xd4d5a7,.7);prev=p;}
    this.material.skin(point(b,b.flying?.7:1.35),{x:Math.max(.6,b.unitRadius*1.5),y:b.unitType==='ultralisk'?1.6:1,z:Math.max(.6,b.unitRadius*1.4)},0xb9c9a3);sprite('glow',to,.7,0xe1e4be,.64);sprite('mist',{...to,y:to.y+.15},1,0xa0c6a0,.29);for(let i=0;i<6;i++){const t=(w.time*.7+i/6)%1,p=mix(from,to,t);p.y+=Math.sin(t*Math.PI)*.55;sprite('acid',p,.18,0xe8e2b7,.8);} this.counts.healStreams++;}}
  for(const u of w.allies()){if(!revisedZergElite(u)||!visible(u))continue;const s=u.zergEliteCombat,p=point(u,.7),r=Math.max(.5,u.unitRadius);
   if(s?.barrier&&s.barrierUntil>w.time)this.material.skin(p,{x:r*1.35,y:u.flying?.9:r*1.2,z:r*1.2},u.eliteId==='mutalisk.3'?0xc59d9b:0xb4c89a,u.facing);
   if(s?.stored||s?.charge){const amount=s.stored?Math.min(1,s.stored/(u.maxHp*(u.unitType==='baneling'?2:.8))):s.charge;sprite('tissue',p,r*1.5,0xcbda78,.18+amount*.3,false,u.id);sprite('glow',p,r*.6,0xdccb8c,.15+amount*.3);}
   if(s?.regenUntil!>w.time||u.eliteId==='queen.1'){sprite('mist',{...p,y:p.y+.4},r*1.8,0xa0be87,.19);if(u.eliteId==='queen.1'){for(let i=0;i<6;i++){const a=i*2.399,rr=r*(.8+.2*Math.sin(w.time+i));sprite('tissue',point({x:u.x+Math.sin(a)*rr,z:u.z+Math.cos(a)*rr},.025),r*.9,0x938969,.4,true,i);}this.counts.fields++;}}
  }
  for(const e of w.visualEvents){if(e.serial<=this.serial||e.heroId||!e.eliteId||!revisedZergElite(w.entities.get(e.entityId)??({team:'player',eliteId:e.eliteId} as Entity))||w.time-e.time>.25)continue;
   if(['attack','projectile-impact','bile-impact','baneling-recover','weapon-area','strategic-impact','support-flight','support-impact','support-pulse'].includes(e.kind))this.echoes.push({event:structuredClone(e),life:e.kind==='baneling-recover'?.85:e.kind==='bile-impact'?.75:e.kind==='attack'?.48:.55});
  }this.serial=w.visualEvents.at(-1)?.serial??this.serial;this.echoes=this.echoes.filter(e=>w.time-e.event.time<e.life).slice(-320);
  for(const {event:e,life} of this.echoes){if(!visible(e.end)&&!visible(e))continue;const age=w.time-e.time,fade=Math.max(0,1-age/life),u=w.entities.get(e.entityId),id=e.eliteId!,end={x:e.end.x,y:e.endY,z:e.end.z};
   if(e.kind==='attack'&&['zergling','ultralisk'].includes(e.unitType!)){
    const large=e.unitType==='ultralisk',third=large&&id==='ultralisk.1'&&(e.shotSequence??0)%3===0,reach=large?(third?2.4:1.4):.72,power=third?1.65:1,colors=id==='zergling.1'?0xe0a392:0xe0dcb9;
    for(let blade=0;blade<(large?2:3);blade++){let prev:P|undefined;for(let j=0;j<=16;j++){const t=j/16,a=e.facing+(t-.5)*(large?2.7:1.3)+(blade-1)*.12,r=reach*power*(.6+.4*Math.sin(t*Math.PI)),p={x:e.x+Math.sin(a)*r,y:e.y+.08+Math.sin(t*Math.PI)*.38+blade*.05,z:e.z+Math.cos(a)*r};if(prev)this.material.ribbon('claw',prev,p,(large?.36:.19)*power,colors,fade*.55,j);prev=p;}}this.counts.claws++;continue;
   }
   if(e.kind==='support-flight'||e.kind==='support-pulse'||e.kind==='support-impact'){
    if(e.kind==='support-flight'){const p=mix({x:e.x,y:e.y,z:e.z},end,Math.min(1,age/.35));this.body(this.sacs,p,{x:.35,y:.35,z:.35});sprite('acid',p,.35,0xb8cf85,fade*.6);}else {sprite('mist',end,.6,0xcdb693,fade*.25);sprite('glow',end,.25,0xe6d6b2,fade*.45);}continue;
   }
   if(e.kind==='projectile-impact'||e.kind==='bile-impact'||e.kind==='baneling-recover'||e.kind==='strategic-impact'||e.kind==='weapon-area'&&e.unitType==='roach'){
    const blast=e.kind==='baneling-recover'?id==='baneling.1'?3.6:2.2:e.kind==='strategic-impact'?3:e.kind==='bile-impact'?id==='ravager.2'?2.3:1.3:.35,s=blast*(.65+age*.8);sprite('burst',end,s*1.8,0xd5cf8c,fade*.75);sprite('tissue',{...end,y:(w.terrain?.height(e.end)??0)+.04},s*2,0x9d9a60,fade*.48,true,e.serial);for(let i=0;i<Math.ceil(9*density);i++){const a=i*2.399,r=s*age*2,p={x:end.x+Math.sin(a)*r,y:end.y+.3+age*(i%3),z:end.z+Math.cos(a)*r};sprite('acid',p,.13+blast*.07,0xcddb94,fade*.65,false,i);sprite('mist',{...p,y:p.y+.1},.3+blast*.13,0x8e926a,fade*.22,false,i);}
   }
  }
  this.material.end();for(const b of [...this.sacs,...this.bones,...this.thorns])commitInstances(b.mesh,b.count);
 }
}
