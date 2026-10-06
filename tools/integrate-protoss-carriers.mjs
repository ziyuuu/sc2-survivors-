import fs from 'node:fs';const p='src/simulation/combat/carriers.ts';let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const edit=(a,b)=>{if(!s.includes(a))throw Error(a);s=s.replace(a,b);};
s="import {revisedProtossElite,fireProtossEliteChild} from './protoss-elite-runtime';\nimport {compositeEliteBuff,preserveTeamWounds,teamHealingFactor} from './team-auras';\n"+s;
edit(' const ea=eliteFriendlyAura(w,carrier),',' const oldPools={hp:u.hp,maxHp:u.maxHp,shield:u.shield??0,maxShield:u.maxShield??0,factor:u.teamAuraFactors},za=compositeEliteBuff(w,carrier),modern=revisedProtossElite(carrier);const ea=eliteFriendlyAura(w,carrier),');
edit('BASE.maxHp*(1+team.health)*(friendly?PLAYER_COMBAT_FACTOR:1)*ea.hp','BASE.maxHp*(1+team.health+aura.health)*(friendly?PLAYER_COMBAT_FACTOR:1)*Math.max(ea.hp,1+za.maxHp)*(modern&&carrier.eliteId===\'carrier.3\'?2.5:1)');
edit('u.armor+=aura.armor+ea.armor;','u.armor=(u.armor+ea.armor)*(1+aura.armorPct)+aura.armor+za.armorFlat;');
edit('BASE.maxShields*(1+team.health)*(friendly?PLAYER_COMBAT_FACTOR:1)','BASE.maxShields*(1+team.health+aura.shield)*(friendly?PLAYER_COMBAT_FACTOR:1)*(1+za.maxShield)');
edit('u.shieldArmor+=protossShieldArmor(w,carrier);','u.shieldArmor=u.shieldArmor*(1+aura.shieldArmorPct)+protossShieldArmor(w,carrier)+za.shieldArmorFlat;');
edit('(1+uniqueActiveStats(w,u).move)*ea.move','(1+uniqueActiveStats(w,u).move+aura.move)*ea.move*(1+za.move)');
edit("*eliteEffect(carrier,'interceptorDamageMultiplier')","*eliteEffect(carrier,'interceptorDamageMultiplier')*(modern?(carrier.eliteId==='carrier.2'?2.5:carrier.eliteId==='carrier.3'?1.5:1):1)");
edit('u.shotInterval=u.attackPeriod;','u.attackPeriod/=(1+za.speed)*(modern&&carrier.eliteId===\'carrier.1\'&&(carrier.protossEliteCombat?.overdriveUntil??0)>w.time?2:1);u.shotInterval=u.attackPeriod;');
edit(' u.maxEnergy=0;u.energy=0;',' preserveTeamWounds(u,oldPools,{hp:(1+team.health+aura.health)/(1+team.health)*Math.max(ea.hp,1+za.maxHp),shield:(1+team.health+aura.shield)/(1+team.health)*(1+za.maxShield)},fill);\n u.maxEnergy=0;u.energy=0;');
edit('protossCombat:undefined,heroCombat:undefined,','protossEliteCombat:undefined,eliteCombat:undefined,zergEliteCombat:undefined,teamAuraFactors:undefined,carrierEliteCycles:0,protossCombat:undefined,heroCombat:undefined,');
edit("P.purifier_flagship.children:HANGAR.initialCount","P.purifier_flagship.children:revisedProtossElite(carrier)&&carrier.eliteId==='carrier.1'?8:HANGAR.initialCount");
edit("P.purifier_flagship.children:HANGAR.maxCount","P.purifier_flagship.children:revisedProtossElite(carrier)&&carrier.eliteId==='carrier.2'?4:HANGAR.maxCount");
// Already paid children remain real reserve bodies after conversion to the four-slot variant.
edit("launchProtossChildAttack(w,u,mother,target);return true;}w.hit","launchProtossChildAttack(w,u,mother,target);return true;}if(fireProtossEliteChild(w,u,mother,target))return true;w.hit");
edit(' const target=carrier.attackTarget===null?undefined:w.body(carrier.attackTarget),active=target&&',' const reserve=revisedProtossElite(carrier)&&carrier.eliteId===\'carrier.2\'&&ownedInterceptors(w,carrier.id).sort((a,b)=>a.id-b.id).findIndex(b=>b.id===u.id)>=4;\n const target=carrier.attackTarget===null?undefined:w.body(carrier.attackTarget),active=!reserve&&target&&');
edit("}else {u.attackTarget=null;const angle=","}else {u.attackTarget=null;if(revisedProtossElite(carrier)&&carrier.eliteId==='carrier.3'&&distance(u,carrier)<=3&&u.pendingTarget===null){const gain=Math.min(u.maxHp-u.hp,u.maxHp*.15*dt*teamHealingFactor(w,u,false));u.hp+=gain;w.stats.healed+=gain;if(gain>0)w.visual('support-impact',carrier,u);}const angle=");
fs.writeFileSync(p,s);
