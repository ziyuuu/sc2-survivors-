import {Vector3} from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {BattleRenderer} from '../../render/scene/battle-renderer';
type Interaction={key:string;action:'fun-attack';kind?:string;name:string;point:Point;height:number};
/** Gameplay still validates the action. This only locates the existing action at its subject. */
export function fieldInteractionEntries(w:World):Interaction[]{
 if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision||w.specialStages.active)return [];
 const entries:Interaction[]=[];
 for(const m of [w.encounters.expanded.short,w.encounters.expanded.queen]){
  if(m?.corrupt&&!m.attackRequested&&Math.hypot(m.point.x-w.anchor.x,m.point.z-w.anchor.z)<=14){entries.push({key:m.id,action:'fun-attack',kind:m.kind,name:'攻击守军',point:m.point,height:3.6});continue;}
  if(!m||m.attackRequested||!(m.kind==='cruelQueen'&&m.kills>=300||m.kind==='infectedTerrans'&&w.expedition.race==='terran'))continue;
  const u=m.actors.map(id=>w.entities.get(id)).find(u=>u&&u.hp>0&&u.fun?.mode!=='friend');if(!u)continue;
  entries.push({key:m.id,action:'fun-attack',kind:m.kind,name:m.kind==='cruelQueen'?'攻击虫后':'攻击感染者',point:u,height:u.unitRadius*2+.8});
 }
 return entries;
}
/** World-attached buttons retain identity/focus while their projected positions move. */
export class FieldInteractions{
 private root:HTMLElement;private buttons=new Map<string,HTMLButtonElement>();private projected=new Vector3();
 constructor(parent:HTMLElement){this.root=document.createElement('div');this.root.id='field-interactions';this.root.setAttribute('aria-label','场景交互');parent.append(this.root);}
 update(w:World,view:BattleRenderer){
  const seen=new Set<string>(),width=view.canvas.clientWidth,height=view.canvas.clientHeight;
  for(const item of fieldInteractionEntries(w)){
   seen.add(item.key);let button=this.buttons.get(item.key);
   if(!button){button=document.createElement('button');button.type='button';button.className='field-interaction';button.dataset.action=item.action;if(item.kind)button.dataset.kind=item.kind;button.textContent=item.name;this.buttons.set(item.key,button);this.root.append(button);}
   const p=this.projected.set(item.point.x,view.ground(item.point)+item.height,item.point.z).project(view.camera);
   button.hidden=!!view.assetsPending||Math.abs(p.x)>.92||Math.abs(p.y)>.88||p.z>1||p.z<-1;
   if(!button.hidden){button.style.left=((p.x*.5+.5)*width)+'px';button.style.top=((.5-p.y*.5)*height)+'px';}
  }
  for(const [id,button] of this.buttons)if(!seen.has(id)){button.remove();this.buttons.delete(id);}
 }
}
