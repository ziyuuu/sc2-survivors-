import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/render/scene/battle-distress.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import {startGame} from '../../src/app/start-game';
import {grantEquipment,itemsAt} from '../../src/simulation/starship/inventory';
import type {EquipmentSlot,Quality} from '../../src/simulation/starship/types';
import {registerEquipmentDrop,equipmentGroundDrops} from '../../src/simulation/starship/loot-presentation';
import {finishOpening} from '../../src/ui/presentation/opening';

// Same production entrance, normal enemies, no automatic grants or world edits.
// Explicit fixtures are exposed only in this separately built diagnostic entry.
startGame(529).then(app=>{
 const w=app.world,a=w.starship.account;let serial=0;
 const grant=(template:string,slot:EquipmentSlot,location:'ground'|'backpack'|'warehouse',polluted=false)=>{
  if(location!=='warehouse'&&(!a.run||a.run.ended))throw Error('No active expedition');
  const loc=location==='warehouse'?{kind:'warehouse' as const}:location==='ground'?{kind:'ground' as const,run:a.run!.id,x:w.anchor.x,z:w.anchor.z}:{kind:'backpack' as const,run:a.run!.id};
  const result=grantEquipment(a,{template,race:w.expedition.race,slot,polluted},'integration-fixture-'+(++serial),loc);
  if(!result.ok)throw Error(result.error);
  if(location==='ground')registerEquipmentDrop(w,result.value);
  w.changed();return result.value.id;
 };
 const drops=()=>[1,2,3,4].map((quality,index)=>grant('attribute.'+quality,['offense1','defense1','offense2','defense2'][index] as EquipmentSlot,'ground'));
 const summary=()=>({phase:w.phase,time:w.time,tick:w.tick,paused:w.paused,stage:w.stage,enemies:w.enemyCount(),autoWaves:w.autoWaves,anchor:{...w.anchor},ground:equipmentGroundDrops(w).map(d=>({id:d.item.id,x:d.x,z:d.z})),backpack:itemsAt(a,'backpack').map(i=>i.id),open:app.starship?.isOpen,route:app.hud.intermission.current.page,renderer:app.view.equipmentDrops.report()});
 (window as any).__STARSHIP_INTEGRATION__={...app,account:a,grant,drops,summary,endStage:()=>{app.starship?.close();w.endStage();}};
}).catch(error=>{finishOpening();document.querySelector('#interface')!.textContent=String(error);console.error(error);});
