import fs from 'node:fs/promises';
async function edit(path,changes){let s=await fs.readFile(path,'utf8');for(const [old,next] of changes){if(!s.includes(old))throw Error(path+' missing '+old.slice(0,70));s=s.replace(old,next);}await fs.writeFile(path,s);}
await edit('src/simulation/combat/expedition-combat.ts',[
 ["*(1+(talentModifiers(w,u).weaponDamagePct??0))*(1+teamCardEffects(w.expedition).damage)","*zergEliteStatModifiers(w,u).damage*(1+(talentModifiers(w,u).weaponDamagePct??0))*(1+teamCardEffects(w.expedition).damage)"],
 ["return d.attackRange*rangeFactor*(1+(t.rangePct??0))", "return (d.attackRange*rangeFactor+(revisedZergElite(u)&&u.eliteId==='hydralisk.1'?2:0))*(1+(t.rangePct??0))"],
 ["/elite.speed/ea.family;","/elite.speed/ea.family/ze.speed;"],
 ["eliteModeCompleted(w,u,previous);","eliteModeCompleted(w,u,previous);zergEliteModeCompleted(w,u,previous);"],
 ["(transformSeconds(u,u.desiredNativeMode)-research)","(transformSeconds(u,u.desiredNativeMode)*(revisedZergElite(u)&&u.eliteId==='lurker.3'?.4:1)-research)"],
 ["(u.shieldArmor??0)*(1-eliteDebuffValue(w,u,'armor'))", "(u.shieldArmor??0)*(1-Math.max(eliteDebuffValue(w,u,'armor'),zergEliteDebuff(w,u,'armor')))"],
]);
await edit('src/simulation/world.ts',[
 ["import {revisedElite,","import {revisedZergElite,zergEliteMainFactor,zergEliteAfterHit,zergEliteCanFire,fireZergElite,tickZergElite,tickZergEliteState,zergEliteDebuff,zergEliteDefense,zergEliteRedirect,zergEliteAfterDamage,zergEliteDeath,zergEliteBile} from './combat/zerg-elite-runtime';\nimport {revisedElite,"],
 ["*eliteMainFactor(u,target)*", "*eliteMainFactor(u,target)*zergEliteMainFactor(u,target)*"],
 ["  if(primary){recordMutation", "  zergEliteAfterHit(this,u,target,primary,Math.max(0,before-target.hp));\n  if(primary){recordMutation"],
 ["private updateElite(u:Entity,dt:number){if(revisedElite(u))return;", "private updateElite(u:Entity,dt:number){if(revisedElite(u)||revisedZergElite(u))return;"],
 ["&&(!revisedElite(u)||u.flying", "&&(!(revisedElite(u)||revisedZergElite(u))||u.flying"],
 ["return eliteCanFire(this,u)&&", "return eliteCanFire(this,u)&&zergEliteCanFire(this,u)&&"],
 ["if(u.hp<=0||target.hp<=0||!eliteCanFire(this,u))return;", "if(u.hp<=0||target.hp<=0||!eliteCanFire(this,u)||!zergEliteCanFire(this,u))return;"],
 ["  if(fireTerranElite(this,u,target,bonus,nativeBonus.shieldBonus,crit))return;", "  if(fireTerranElite(this,u,target,bonus,nativeBonus.shieldBonus,crit))return;\n  if(fireZergElite(this,u,target,bonus,nativeBonus.shieldBonus,crit))return;"],
 ["updateBile(u:Entity,dt:number){u.bileCooldown-=dt;", "updateBile(u:Entity,dt:number){if(zergEliteBile(this,u,dt))return;u.bileCooldown-=dt;"],
 ["tickExpeditionRecovery(this,u,dt);", "tickExpeditionRecovery(this,u,dt);if(tickZergElite(this,u,dt))return;"],
 ["tickTerranEliteState(this);", "tickTerranEliteState(this);tickZergEliteState(this,dt);"],
 ["-heroGroundSlow(this,u)-eliteDebuffValue(this,u,'speed')", "-heroGroundSlow(this,u)-Math.max(eliteDebuffValue(this,u,'speed'),zergEliteDebuff(this,u,'speed'))"],
 ["u.moveSpeed*(1-eliteDebuffValue(this,u,'move'))", "u.moveSpeed*(1-Math.max(eliteDebuffValue(this,u,'move'),zergEliteDebuff(this,u,'move')))"],
 ["const defenseFactor=1-eliteDefenseReduction(this,target);", "const defenseFactor=(1-eliteDefenseReduction(this,target))*(transferred?1:1-zergEliteDefense(this,target));"],
 ["target.armor*(1-eliteDebuffValue(this,target,'armor'))", "target.armor*(1-Math.max(eliteDebuffValue(this,target,'armor'),zergEliteDebuff(this,target,'armor')))"],
 ["  target.hp=Math.max(0,target.hp-total);", "  if(friendly)total=zergEliteRedirect(this,friendly,total,sourceOwner,transferred);\n  target.hp=Math.max(0,target.hp-total);"],
 ["  if(beforeShield>0&&'shield' in target&&Number(target.shield)<=0&&friendly)", "  if(friendly)zergEliteAfterDamage(this,friendly,attacker,Math.max(0,before-target.hp),forced,transferred);\n  if(beforeShield>0&&'shield' in target&&Number(target.shield)<=0&&friendly)"],
 ["this.visual('death',e);protossDeath", "this.visual('death',e);zergEliteDeath(this,e);protossDeath"],
 ["   if(u.guardianPod&&b.id===u.guardianPod)", "   if(revisedZergElite(u)&&u.eliteId==='queen.3'&&this.allies().some(a=>a.hp>0&&a.hp<a.maxHp&&distance(a,b)<=3+b.unitRadius))s-=6;\n   if(u.guardianPod&&b.id===u.guardianPod)"],
]);
