import fs from 'node:fs';
const dir='D:/星际/reports/local/integration-i01-20261022';
const read=(side,p)=>fs.readFileSync(dir+'/'+side+'/'+p,'utf8');
const write=(p,s)=>fs.writeFileSync(dir+'/draft/'+p,s);
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Missing merge anchor: '+a);return s.replace(a,b);};
const changes=[];
function resolve(p,handlers){let n=0;let s=read('draft',p).replace(/<<<<<<< MAIN_ACCEPTED\n([\s\S]*?)\|\|\|\|\|\|\| COMMON_ANCESTOR\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> FUN_LATEST\n?/g,(_,m,b,f)=>{const h=handlers[n++];if(!h)throw Error('Unhandled '+p+' '+n);return h(m,f,b);});if(n!==handlers.length)throw Error('Conflict count '+p);write(p,s);changes.push({path:p,conflicts:n});}
resolve('src/render/effects/source-combat-effects.ts',[(m,f)=>m+f]);
resolve('src/render/scene/battle-renderer.ts',[
 (m,f)=>m.replace('rescueEggMaterial}', 'rescueEggMaterial,nightmareEggMaterial}')+f.slice(0,f.indexOf('import {rescueEggMaterial')),
 (m,f)=>m+f.slice(f.indexOf('  for(const v')),
 m=>replace(m,'await this.prepareRescueAssets(race);','await this.prepareRescueAssets(race);await this.prepareMissionAssets();'),
 m=>replace(m,'const world=this.world;this.frames++','const world=this.world;const sceneKey=world.specialStages.active?.id??null;if(sceneKey!==this.specialSceneKey){this.specialSceneKey=sceneKey;this.resetRun();}this.frames++'),
 (m,f)=>replace(f,'p=>this.visible(p));\n','p=>this.visible(p));\n').replace('this.equipmentDrops.render(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),p=>this.visible(p));','this.equipmentDrops.render(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),p=>this.visible(p),!low);')
]);
resolve('src/simulation/combat/carriers.ts',[(m)=>replace(m,"carrier.owner==='terran'&&","carrier.owner==='terran'&&!carrier.mission?.holdout&&!w.missions.fleet.ceasefire&&")]);
resolve('src/simulation/combat/enemy-specials.ts',[(m,f)=>f+m.slice(m.indexOf(' /** Read-only'))]);
resolve('src/simulation/combat/expedition-combat.ts',[m=>replace(m,'observeRecovery(w,u,patient,amount);','observeRecovery(w,u,patient,amount);commitFunMedical(w,u,patient,amount);')]);
resolve('src/simulation/combat/expedition-heroes.ts',[m=>replace(m,'if(!w.expedition','if(w.missions.fleet.ceasefire||!w.expedition')]);
resolve('src/simulation/combat/team-auras.ts',[m=>replace(m,'return u.hp>0','return !u.heldBy&&u.hp>0'),m=>replace(m,'if(source?.hp)','if(source?.hp&&!w.missions.fleet.ceasefire)')]);
resolve('src/simulation/combat/terran-elite-runtime.ts',[m=>replace(m,'observeRecovery(w,u,p,gain);','observeRecovery(w,u,p,gain);commitFunMedical(w,u,p,gain);')]);
resolve('src/simulation/combat/zerg-elite-runtime.ts',[m=>replace(m,'w.hit(b,damage','missionDamage(w,a.source,b,damage')]);
resolve('src/simulation/expedition-production.ts',[m=>replace(m,'old===q.r.family)','old===q.r.family||w.familyBodies(old).some(u=>u.heldBy))')]);
resolve('src/simulation/types.ts',[m=>replace(m,'interface VisualSnapshot {',"interface VisualSnapshot {missionDeath?:string;rescueModel?:'scv'|'drone'|'probe';")]);
resolve('src/simulation/world.ts',[
 (m,f)=>m+f,
 m=>"  cancelExpandedEncounters(this,'success');cancelMissions(this);"+m.trimStart(),
 (m,f)=>f,
 m=>replace(replace(m,'collectRewardDrop(id:number){','collectRewardDrop(id:number){const special=specialCardPickup(this,id);if(special!==undefined)return special;'),'heroId:e?.heroId',"heroId:e?.mission?.fleet?'yamato_battlecruiser':e?.heroId"),
 (m,f)=>{
  const wrapper=f.slice(0,f.indexOf(' private updateUnitNative'));
  let s=replace(m,' updateUnit(u:Entity,dt:number){',wrapper+' private updateUnitNative(u:Entity,dt:number){');
  s=replace(s,'if(u.hp<=0||expireAdvancedEquipmentBody(this,u))return;','if(u.hp<=0||expireAdvancedEquipmentBody(this,u))return;if(tickCrossingGuard(this,u,dt)||tickArenaHero(this,u,dt))return;if(tickFunUnit(this,u,dt)||tickEncounterUnit(this,u,dt)||tickMissionUnit(this,u,dt))return;');
  // Preserve accepted recovery-before-zerg update order; only ceasefire gates combat.
  s=replace(s,'tickTerranElite(this,u,dt);',"if(u.owner!=='terran'||!this.missions.fleet.ceasefire){tickTerranElite(this,u,dt);");
  return replace(s,'tickExpeditionRecovery(this,u,dt);if(tickZergElite(this,u,dt))return;',"}tickExpeditionRecovery(this,u,dt);if((u.owner!=='terran'||!this.missions.fleet.ceasefire)&&tickZergElite(this,u,dt))return;");
 },
 m=>replace(m,'tickAutoAbilities(this,u);',"if(u.owner!=='terran'||!this.missions.fleet.ceasefire||u.unitType==='queen'||u.unitType==='sentry')tickAutoAbilities(this,u);"),
 m=>replace(m,'this.sandbox?TUNING.worldHalf','this.sandbox&&!this.specialStages.active?TUNING.worldHalf'),
 (m,f)=>replace(m,'private releaseAmbient(){',f.slice(0,f.indexOf('let slots')).trimStart()),
 m=>replace(m,"this.rerolls=0;this.prepareStage();","this.rerolls=0;missionStage(this);this.prepareStage();"),
 m=>replace(m,'tickQueenInjection(this);this.updatePods();',"if(!this.specialStages.active){tickMissions(this);tickEncounters(this);tickQueenInjection(this);this.updatePods();}")
]);
resolve('src/simulation/zerg-brood.ts',[m=>replace(m,'if(pending||','if(alive.some(u=>u.heldBy)||pending||')]);
resolve('src/ui/hud.ts',[
 (m,f)=>m+f,
 m=>replace(m,'afterRender(){','afterRender(){this.fieldInteractions.update(this.world,this.view);'),
 m=>replace(m,"const action=button.dataset.action!;","const action=button.dataset.action!;if(action==='fun-attack'){requestFunAttack(world,button.dataset.kind??'');this.update();return;}")
]);
resolve('src/ui/mobile/input.ts',[(m,f)=>m.slice(0,m.indexOf('  const confirmTarget'))+f.slice(f.indexOf('  const confirmTarget'))]);
// The user explicitly requires current main camera and established input behavior.
for(const p of ['src/render/scene/camera-controller.ts','test/camera-control.test.ts'])write(p,read('before/main',p));
{
 const p='src/render/scene/battle-renderer.ts';let s=read('draft',p),m=read('before/main',p);
 const start=' private cameraFrame():AutoFrame|undefined{',end='\n render(dt:number,alpha:number)';
 s=s.slice(0,s.indexOf(start))+m.slice(m.indexOf(start),m.indexOf(end,m.indexOf(start)))+s.slice(s.indexOf(end,s.indexOf(start)));write(p,s);
}
// Keep top-N selection and add the new mission/infection eligibility rules locally.
{
 const p='src/simulation/combat/support-targets.ts';let s=read('draft',p);
 s="import {funMedicalPatient} from '../encounters/relations';\nimport {missionSupportAllowed} from '../missions/combat';\n"+s;
 s=replace(s,'p.owner===u.owner&&', '(funMedicalPatient(w,u,p)??(p.owner===u.owner))&&missionSupportAllowed(u,p)&&');write(p,s);
}
// The branch's private M3 manifest contains only its six new models; retain all
// accepted main metadata and append them instead of replacing the full catalog.
{
 const p='assets/private/m3-pack.json',m=JSON.parse(read('before/main',p)),f=JSON.parse(read('before/fun',p));
 const ids=new Set(m.manifest.map(r=>r.id));for(const r of f.manifest){if(ids.has(r.id))throw Error('Unexpected duplicate M3 '+r.id);m.manifest.push(r);}m.failures.push(...f.failures);write(p,JSON.stringify(m,null,2)+'\n');
}
fs.writeFileSync(dir+'/conflict-resolutions.json',JSON.stringify({at:new Date().toISOString(),changes,camera:'main exact controller and cameraFrame; latest user instruction',metadata:'append six fun model records to full main catalog'},null,2));
console.log(JSON.stringify(changes));
