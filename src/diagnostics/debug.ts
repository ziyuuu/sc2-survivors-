import {setDiagnosticHealthLock,diagnosticHealthLock,setDiagnosticOneHit} from './combat-lock';
import {World} from '../simulation/world';
import {BattleRenderer} from '../render/scene/battle-renderer';
import {TERRAN,ZERG,type TerranType,type UnitType} from '../data/sc2-units';
import {installShotDiagnostics} from './shot-diagnostics';
declare global {interface Window {__SC2_DEBUG__?:{world:World;view:BattleRenderer;shots:ReturnType<typeof installShotDiagnostics>;speed:number;healthLock:(enabled:boolean)=>boolean;oneHit:(enabled:boolean)=>boolean;advance:(seconds:number)=>void}}}
export function installDebug(world:World,view:BattleRenderer){
 const shots=installShotDiagnostics(world);
 const state={world,view,shots,speed:1,oneHit:(enabled:boolean)=>setDiagnosticOneHit(world,enabled),healthLock:(enabled:boolean)=>setDiagnosticHealthLock(world,enabled),advance:(seconds:number)=>world.advance(seconds)};window.__SC2_DEBUG__=state;
 const root=document.querySelector<HTMLElement>('#debug')!;root.innerHTML=`<strong>DEVELOPMENT ONLY / F1</strong><pre id="debug-stats"></pre><button id="debug-resources">资源 +1000</button><button id="debug-stage">结束本关</button><select id="debug-type">${[...TERRAN,...ZERG].map(t=>`<option>${t}</option>`).join('')}</select><button id="debug-spawn">生成敌人 / 救援</button><label>模拟速度 <select id="debug-speed"><option>1</option><option>2</option><option>4</option><option>10</option></select></label><button id="debug-grid">空间格子</button><button id="debug-colliders">碰撞体积</button>`;
 window.addEventListener('keydown',e=>{if(e.code==='F1'){e.preventDefault();root.hidden=!root.hidden;}});
 const lockButton=document.createElement('button');lockButton.textContent='内容诊断：锁血关闭';root.append(lockButton);lockButton.addEventListener('click',()=>{const enabled=!diagnosticHealthLock(world).enabled;setDiagnosticHealthLock(world,enabled);lockButton.textContent=enabled?'内容诊断：锁血开启':'内容诊断：锁血关闭';});
 const shotButton=document.createElement('button');shotButton.textContent='开始死神／枪兵射击诊断';root.append(shotButton);let sampling=false;
 shotButton.addEventListener('click',()=>{sampling=!sampling;shots.setEnabled(sampling);shotButton.textContent=sampling?'停止射击诊断（保留记录）':'开始死神／枪兵射击诊断';});
 root.querySelector('#debug-resources')!.addEventListener('click',()=>{world.wallet.minerals+=1000;world.wallet.gas+=1000;world.changed();});
 root.querySelector('#debug-stage')!.addEventListener('click',()=>world.endStage());
 root.querySelector('#debug-spawn')!.addEventListener('click',()=>{const t=root.querySelector<HTMLSelectElement>('#debug-type')!.value as UnitType;if(TERRAN.includes(t as TerranType))world.spawnPod(t as TerranType);else world.addUnit(t,'zerg',world.anchor.x+8,world.anchor.z);world.changed();});
 root.querySelector('#debug-speed')!.addEventListener('change',e=>state.speed=Number((e.target as HTMLSelectElement).value));
 root.querySelector('#debug-grid')!.addEventListener('click',()=>view.showGrid=!view.showGrid);
 root.querySelector('#debug-colliders')!.addEventListener('click',()=>view.showColliders=!view.showColliders);
 world.listeners.add(()=>{if(!root.hidden){const shotReport=shots.report();root.querySelector('#debug-stats')!.textContent=JSON.stringify({...view.report(),time:world.time,stage:world.stage,hashCells:world.hash.cells.size,shots:{enabled:shotReport.enabled,units:shotReport.units,recent:shotReport.rows.slice(-6)}},null,1);}});
 return state;
}
