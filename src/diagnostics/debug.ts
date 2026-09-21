import {World} from '../simulation/world';
import {BattleRenderer} from '../render/scene/battle-renderer';
import {TERRAN,ZERG,type TerranType,type UnitType} from '../data/sc2-units';
declare global {interface Window {__SC2_DEBUG__?:{world:World;view:BattleRenderer;speed:number;advance:(seconds:number)=>void}}}
export function installDebug(world:World,view:BattleRenderer){
 const state={world,view,speed:1,advance:(seconds:number)=>world.advance(seconds)};window.__SC2_DEBUG__=state;
 const root=document.querySelector<HTMLElement>('#debug')!;root.innerHTML=`<strong>DEVELOPMENT ONLY / F1</strong><pre id="debug-stats"></pre><button id="debug-resources">资源 +1000</button><button id="debug-stage">结束本关</button><select id="debug-type">${[...TERRAN,...ZERG].map(t=>`<option>${t}</option>`).join('')}</select><button id="debug-spawn">生成敌人 / 救援</button><label>模拟速度 <select id="debug-speed"><option>1</option><option>2</option><option>4</option><option>10</option></select></label><button id="debug-grid">空间格子</button><button id="debug-colliders">碰撞体积</button>`;
 window.addEventListener('keydown',e=>{if(e.code==='F1'){e.preventDefault();root.hidden=!root.hidden;}});
 root.querySelector('#debug-resources')!.addEventListener('click',()=>{world.wallet.minerals+=1000;world.wallet.gas+=1000;world.changed();});
 root.querySelector('#debug-stage')!.addEventListener('click',()=>world.endStage());
 root.querySelector('#debug-spawn')!.addEventListener('click',()=>{const t=root.querySelector<HTMLSelectElement>('#debug-type')!.value as UnitType;if(TERRAN.includes(t as TerranType))world.spawnPod(t as TerranType);else world.addUnit(t,'zerg',world.anchor.x+8,world.anchor.z);world.changed();});
 root.querySelector('#debug-speed')!.addEventListener('change',e=>state.speed=Number((e.target as HTMLSelectElement).value));
 root.querySelector('#debug-grid')!.addEventListener('click',()=>view.showGrid=!view.showGrid);
 root.querySelector('#debug-colliders')!.addEventListener('click',()=>view.showColliders=!view.showColliders);
 world.listeners.add(()=>{if(!root.hidden)root.querySelector('#debug-stats')!.textContent=JSON.stringify({...view.report(),time:world.time,stage:world.stage,hashCells:world.hash.cells.size},null,1);});
 return state;
}
