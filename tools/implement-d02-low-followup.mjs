import fs from 'node:fs';
const edit=(f,fn)=>{const old=fs.readFileSync(f,'utf8'),s=fn(old);if(old===s)throw Error(f);fs.writeFileSync(f,s)};
edit('src/render/scene/battle-renderer.ts',s=>s.replace("{key:'ordinary-effects',run:()=>this.nonHeroEffects.load()}","{key:'ordinary-effects',run:async()=>{await this.nonHeroEffects.load();this.lowDanger.prepare();}}")
 .replace('this.bodyVisible(p),this.ground(p));','this.bodyVisible(p),this.ground(p),!low);')
 .replace('if(this.hiveWasAlive&&world.hive.hp<=0)','if(!low&&this.hiveWasAlive&&world.hive.hp<=0)')
 .replace('this.playHiveDeath(id,v.position,4.8);','if(!low)this.playHiveDeath(id,v.position,4.8);')
 .replace('else death.mixer.setTime(deathPoseTime(age,death.sourceDuration,death.duration));','else {death.root.visible=!low;if(!low)death.mixer.setTime(deathPoseTime(age,death.sourceDuration,death.duration));}')
 .replace('if(kind&&!(v.userData.equipmentFort','if(!low&&kind&&!(v.userData.equipmentFort')
 .replace('for(const [id,death] of this.fortDeathViews){death.mixer.update(fortDt);','for(const [id,death] of this.fortDeathViews){death.group.visible=!low;if(!low){death.mixer.update(fortDt);')
 .replace("updateFortRibbons(death.group,'Death',death.mixer.time);if(world.time>=death.until)","updateFortRibbons(death.group,'Death',death.mixer.time);}if(world.time>=death.until)")
 .replace('effects.reset();this.fx.reset();}','effects.reset();this.fx.reset();for(const id of this.hiveDeaths.keys())this.removeHiveDeath(id);for(const death of this.fortDeathViews.values())releaseBuildingView(death.group,death.mixer);this.fortDeathViews.clear();}')
);
edit('src/render/units/pod-view.ts',s=>s.replace('visible:boolean,groundY=0){','visible:boolean,groundY=0,effects=true){').replace("this.root.visible=visible&&(","this.root.visible=visible&&(effects||p.status!=='destroyed')&&(").replace("const showingBirth=state==='falling'","const showingBirth=effects&&state==='falling'").replace("showingDeath=state==='destroyed'","showingDeath=effects&&state==='destroyed'").replace("warp&&state==='opening'","effects&&warp&&state==='opening'"));
edit('src/render/units/equipment-drops.ts',s=>s.replace('for(let n=0;n<6;n++){const a=age-n*.025;','for(let n=0;effects&&n<6;n++){const a=age-n*.025;'));
edit('src/render/terrain/environment-sample-shores.ts',s=>s.replace('clock.value=frame.reducedMotion?0:frame.time','clock.value=frame.effectsEnabled===false||frame.reducedMotion?0:frame.time'));
