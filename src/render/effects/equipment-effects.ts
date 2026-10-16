import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import {equipmentBurnAge,equipmentPresentationId,equipmentPresentationReceipts,type EquipmentPresentationReceipt} from '../../simulation/starship/presentation';
import {equipmentControlBoost} from '../../simulation/starship/controls';
import {SOURCE_EFFECTS,type SourceEffectPlayer} from './source/player';
import {sourceLife,sourceSeed} from './source/timeline';
import type {SourceEffectRequest} from './source/types';
import {combatFxProfile} from './combat-fx-profile';
import {permanentEquipmentBody} from '../../simulation/starship/eligibility';
import {equipmentParsedTarget} from '../../simulation/starship/combat';

const modelFor=(e:EquipmentPresentationReceipt)=>{
 const large=e.source.unitType==='colossus';
 switch(e.kind){
  case 'projection-birth':return large?'HallucinationColossusBirth':'HallucinationBirth';
  case 'projection-end':return large?'HallucinationColossusDeath':'HallucinationDeath';
  case 'expiry':case 'recall-from':return 'BlinkOriginModel';
  case 'boost-start':return 'StimpackStartImpact';
  case 'boost-end':return 'StimpackEndImpact';
  case 'capture':return 'NeuralParasiteModel';
  case 'heal':return e.source.race==='zerg'?'SquibTransfusion':'MedicHealModel';
  case 'fort-deploy':case 'reinforcement':return e.source.race==='zerg'?(e.source.radius>1?'BurrowFXLarge':'BurrowFXSmall'):e.source.race==='protoss'?'WarpTrainModel':'DropPodLand';
  case 'evolve':case 'rewind':case 'recall-to':case 'growth':case 'cooldown-reset':return 'WarpTrainModel';
  default:return undefined;
 }
};
/** Frozen one-shot positions; continuous geometry comes directly from live state. */
type Mount=(e:EquipmentPresentationReceipt)=>{x:number;y:number;z:number}|undefined;
export function equipmentEffectRequests(w:World,ground:(p:Point)=>number,mount?:Mount):SourceEffectRequest[]{
 const requests:SourceEffectRequest[]=[];
 const add=(model:string,key:string,age:number,p:Point&{flying?:boolean;y?:number},height=0,scale=1,loop=false,options:Partial<SourceEffectRequest>={})=>{
  if(age<0||!loop&&age>sourceLife(SOURCE_EFFECTS[model]))return;
  requests.push({model,key,age,seed:sourceSeed(key),placement:{x:p.x,y:p.y??((p.flying?5.6:ground(p))+height),z:p.z,facing:0,scale},loop,clip:model==='ImpactModelFlames'?SOURCE_EFFECTS[model].materialProfile.clips[0]?.name:model.startsWith('BurrowFX')?'Unburrow':undefined,...options});
 };
 for(const e of equipmentPresentationReceipts(w)){
  const model=modelFor(e),age=w.time-e.time,key='equipment:'+e.serial+':'+e.kind;
  if(model)add(model,key,age,e.kind.startsWith('boost')?mount?.(e)??e.source:e.source,e.kind.startsWith('boost')?1.4:0);
  if(e.kind==='fort-shot'&&e.target){const from=mount?.(e)??{...e.source,y:ground(e.source)+1},target=e.target;
   if(e.detail==='turret_terran'||e.detail==='bunker'){add(e.detail==='bunker'?'MarineAttackLaunch':'AutoTurretAttackLaunch',key+':launch',age,from);add(e.detail==='bunker'?'MarineAttackImpact':'AutoTurretAttackImpact',key+':impact',age,target,.6);}
   else if(e.detail==='turret_protoss'){add('PhotonCannonAttackImpact',key+':impact',age,target,.6);if(age<.16){const t=age/.16,to={...target,y:(target.flying?5.6:ground(target))+.6};add('PhotonCannonWeapon',key+':bolt',age,{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t},0,1,true);}}
   else if(e.detail==='turret_zerg')add('SpineCrawlerAttackImpactReactionFlesh',key+':impact',age,target,.5);
  }
  // The existing impact adapter owns damage feedback. Add only the committed
  // derived route, with no delayed damage or extra native attack event.
  if(e.kind==='derived-hit'&&e.target&&age<.16){const profile=combatFxProfile(e.source),from={...e.source,y:(e.source.flying?5.6:ground(e.source))+.6},to={...e.target,y:(e.target.flying?5.6:ground(e.target))+.6},facing=Math.atan2(to.x-from.x,to.z-from.z);
   for(const id of profile?.models.flight??[])add(id,key+':route:'+id,age,{x:from.x+(to.x-from.x)*age/.16,y:from.y+(to.y-from.y)*age/.16,z:from.z+(to.z-from.z)*age/.16},0,1,true);
   for(const id of profile?.models.beam??[])add(id,key+':route:'+id,age,from,0,1,true,{hostedBeam:true,placement:{...from,facing,end:to}});
  }
 }
 for(const e of w.visualEvents)if(e.kind==='death'&&w.starship.projections.has(e.entityId))add(e.unitType==='colossus'?'HallucinationColossusDeath':'HallucinationDeath','equipment-death:'+e.serial,w.time-e.time,e);
 for(const zone of w.starship.burnZones){if(zone.until<w.time)continue;
  // Fire points stay within the actual circle; the separate edge is authoritative.
  // Stable placement hash does not consume the equipment or combat random stream.
  const key=`equipment-fire:${equipmentPresentationId(zone)}:${zone.source}:${zone.x}:${zone.z}:${zone.until}`,count=Math.max(1,Math.ceil(zone.radius*zone.radius/2));
  for(let i=0;i<count;i++){const a=i*2.399963229728653,r=zone.radius*.78*Math.sqrt(i/count),p={x:zone.x+Math.sin(a)*r,z:zone.z+Math.cos(a)*r};add('ImpactModelFlames',key+':'+i,equipmentBurnAge(w,zone),p,0,Math.min(1,zone.radius*.6),true,{stopTime:zone.until});}
 }
 for(const burn of w.starship.combat.burns){const u=w.entities.get(burn.target);if(u&&u.hp>0&&u.bornAt===burn.bornAt&&burn.remaining>0)add('ImpactModelFlames','equipment-burning:'+equipmentPresentationId(burn),equipmentBurnAge(w,burn),u,.2,.35,true,{stopTime:burn.next+burn.remaining-1});}
 return requests;
}

/** Supplemental game-rule markers. These are not claimed to be SC2 source art. */
export function equipmentMarkers(w:World){
 const markers:{p:Point;radius:number;color:number}[]=[],s=w.starship;
 if(!s.enabled)return markers;
 for(const zone of s.burnZones)if(zone.until>=w.time)markers.push({p:zone,radius:zone.radius,color:0xe87c31});
 for(const job of s.hero.jobs)if(job.kind==='area'&&job.next&&job.until!>w.time&&job.radius)markers.push({p:job.cast.point,radius:job.radius,color:0xb2dd54});
 for(const e of equipmentPresentationReceipts(w))if(e.kind==='hero-extra'&&e.target&&e.radius&&w.time-e.time<.35)markers.push({p:e.target,radius:e.radius,color:e.source.race==='zerg'?0xb2dd54:e.source.race==='protoss'?0x70cfff:0xffae62});
 for(const u of w.entities.values())if(u.hp>0){
  const timed=(key:string)=>(s.numbers.get(key)??0)>w.time,boost=equipmentControlBoost(w,u);
  if(boost)markers.push({p:u,radius:u.unitRadius*1.2,color:(boost.quality??3)>=4?0xb477ff:0x45b4ff});
  // Distinct concentric radii keep simultaneous states independently visible.
  if((s.hero.seals.get(u.id)??0)>w.time)markers.push({p:u,radius:u.unitRadius*1.35,color:0xce65ff});
  if((s.hero.devour.get(u.id)?.until??0)>w.time||timed('rage-until:'+u.id))markers.push({p:u,radius:u.unitRadius*1.5,color:0xef6650});
  if(timed('assault-until:'+u.id)||s.combat.movement.get(u.id)?.assaultReady)markers.push({p:u,radius:u.unitRadius*1.65,color:0x5bdca5});
  if(s.hero.veilReady.has(u.id)||s.combat.precision.get(u.id)?.ready)markers.push({p:u,radius:u.unitRadius*1.8,color:0xf2dd76});
  if(permanentEquipmentBody(w,u)&&(timed('dominance-phase')||timed('dominance-fire')))markers.push({p:u,radius:u.unitRadius*1.95,color:timed('dominance-phase')?0x73b5ff:0xffbb65});
  if((s.hero.carriers.get(u.summonOwnerId??u.id)?.until??0)>w.time)markers.push({p:u,radius:u.unitRadius*1.15,color:0x5ee5ff});
  if((s.barriers.get(u.id)??[]).some(b=>b.amount>0&&b.until>w.time))markers.push({p:u,radius:u.unitRadius*1.08,color:0x87d9e8});
  if(s.numbers.has('bounty-mark:'+u.id))markers.push({p:u,radius:u.unitRadius*1.25,color:0xf3c451});
  if(s.combat.weakness.has(u.id)&&equipmentParsedTarget(w,u))markers.push({p:u,radius:u.unitRadius*1.4,color:0xf77d74});
 }
 return markers;
}
export function equipmentFallbackRoutes(w:World,ground:(p:Point)=>number){
 return equipmentPresentationReceipts(w).filter(e=>e.kind==='derived-hit'&&e.target&&w.time-e.time<.12&&!combatFxProfile(e.source)?.models.flight?.length&&!combatFxProfile(e.source)?.models.beam?.length).map(e=>({from:{x:e.source.x,y:(e.source.flying?5.6:ground(e.source))+.6,z:e.source.z},to:{x:e.target!.x,y:(e.target!.flying?5.6:ground(e.target!))+.6,z:e.target!.z}}));
}

/** Small, batched state markers. Radius and lifetime are never inferred from FX. */
export class EquipmentEffects {
 private rings:THREE.InstancedMesh;private capacity=64;
 private routes:THREE.InstancedMesh;private routeCapacity=64;private up=new THREE.Vector3(0,1,0);private direction=new THREE.Vector3();private routeRotation=new THREE.Quaternion();
 private mounts=new Map<number,{x:number;y:number;z:number}>();private time=-Infinity;private run='';
 private matrix=new THREE.Matrix4();private rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 private position=new THREE.Vector3();private scale=new THREE.Vector3();private color=new THREE.Color();
 constructor(private scene:THREE.Scene){this.rings=this.create();this.routes=this.createRoutes();}
 private createRoutes(){const mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.025,1,4),new THREE.MeshBasicMaterial({color:0xf6c57d,transparent:true,opacity:.65,depthWrite:false}),this.routeCapacity);mesh.count=0;mesh.frustumCulled=false;mesh.userData.visualRole='effect';this.scene.add(mesh);return mesh;}
 private create(){const rings=new THREE.InstancedMesh(new THREE.RingGeometry(.992,1,64),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}),this.capacity);rings.count=0;rings.frustumCulled=false;rings.userData.visualRole='effect';this.scene.add(rings);return rings;}
 render(w:World,player:SourceEffectPlayer,ground:(p:Point)=>number,mount?:Mount){
  if(w.time<this.time||this.run!==(w.runId??''))this.reset();this.time=w.time;this.run=w.runId??'';
  const markers=equipmentMarkers(w);
  if(markers.length>this.capacity){this.rings.geometry.dispose();(this.rings.material as THREE.Material).dispose();this.rings.removeFromParent();this.capacity=2**Math.ceil(Math.log2(markers.length));this.rings=this.create();}
  for(let i=0;i<markers.length;i++){const {p,radius,color}=markers[i];this.matrix.compose(this.position.set(p.x,ground(p)+.045,p.z),this.rotation,this.scale.set(radius,radius,1));this.rings.setMatrixAt(i,this.matrix);this.rings.setColorAt(i,this.color.setHex(color));}
  this.rings.count=markers.length;this.rings.instanceMatrix.needsUpdate=true;if(this.rings.instanceColor)this.rings.instanceColor.needsUpdate=true;
  const routes=equipmentFallbackRoutes(w,ground);
  if(routes.length>this.routeCapacity){this.routes.geometry.dispose();(this.routes.material as THREE.Material).dispose();this.routes.dispose();this.routes.removeFromParent();this.routeCapacity=2**Math.ceil(Math.log2(routes.length));this.routes=this.createRoutes();}
  for(let i=0;i<routes.length;i++){const {from,to}=routes[i];this.direction.set(to.x-from.x,to.y-from.y,to.z-from.z);const length=this.direction.length();this.routeRotation.setFromUnitVectors(this.up,this.direction.normalize());this.matrix.compose(this.position.set((from.x+to.x)/2,(from.y+to.y)/2,(from.z+to.z)/2),this.routeRotation,this.scale.set(1,length,1));this.routes.setMatrixAt(i,this.matrix);}
  this.routes.count=routes.length;if(routes.length)this.routes.instanceMatrix.needsUpdate=true;
  const receipts=equipmentPresentationReceipts(w),live=new Set(receipts.map(e=>e.serial));for(const serial of this.mounts.keys())if(!live.has(serial))this.mounts.delete(serial);
  for(const request of equipmentEffectRequests(w,ground,e=>{let p=this.mounts.get(e.serial);if(!p){p=mount?.(e);if(p)this.mounts.set(e.serial,{...p});}return p;}))player.add(request,ground);
 }
 reset(){this.rings.count=0;this.routes.count=0;this.mounts.clear();}
}
