import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {ArmedDeployment} from '../../simulation/combat/armed-support-state';
import {PodView} from './pod-view';

/** Shares the verified Barracks body/clips, but never creates a gameplay Pod. */
export class ArmedCarrierViews {
 private views=new Map<number,PodView>();
 constructor(private scene:THREE.Scene){}
 reset(){for(const view of this.views.values())view.dispose();this.views.clear();}
 update(deployments:readonly ArmedDeployment[],tick:number,template:GLTF|undefined,death:GLTF|undefined,visible:(p:{x:number;z:number})=>boolean,ground:(p:{x:number;z:number})=>number,effects:boolean){
  const live=new Set<number>();
  for(const d of deployments){if(!['W01','W02','W05','G03','G06','B05'].includes(d.cardId)||d.phase==='ended'&&tick-(d.endedAt??tick)>=180)continue;live.add(d.id);let view=this.views.get(d.id);
   if(!view&&template){view=new PodView(template,this.scene,'terran',undefined,death,true);const original=view.adapter.clip.bind(view.adapter);view.adapter.clip=state=>state==='rescued'?template.animations.find(c=>c.name==='Fly Start'):original(state);this.views.set(d.id,view);}
   if(!view)continue;const ended=d.phase==='ended',destroyed=ended&&d.hp<=0,opening=d.doorOpened&&d.passengers.some(p=>p.entityId===null&&!p.cancelled)||d.lastExitTick!==undefined&&tick-d.lastExitTick<30,status=d.phase==='falling'?'falling':ended?destroyed?'destroyed':'rescued':opening?'opening':'active';
   const altitude=d.phase==='falling'?Math.min(9,Math.max(0,(d.landTick-tick)/60)*36):ended&&!destroyed?Math.max(0,(tick-d.endedAt!)/60)*5:0;
   view.update({x:d.point.x,z:d.point.z,status,createdAt:d.createdTick/60,landedAt:d.landTick/60,resolvedAt:ended?d.endedAt!/60:opening?(d.lastExitTick??d.openTick)/60:null},tick/60,visible(d.point),ground(d.point)+altitude,effects);
  }
  for(const [id,view]of this.views)if(!live.has(id)){view.dispose();this.views.delete(id);}
 }
 get count(){return this.views.size;}
}
