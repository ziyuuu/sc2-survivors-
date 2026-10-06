import {observeRecovery} from '../observation';
import {compositeHeroDebuff,compositeEliteDebuff,teamHealingFactor} from './team-auras';
import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import {TERRAN_ELITE_RULES,isTerranEliteId,eliteFixedGrowth,terranEliteArmor} from '../../data/terran-elites';
import {SIEGE,SC2_UNITS,HEAL} from '../../data/sc2-units';
import {unitData,talentModifiers} from './expedition-combat';
import type {WeaponFlight} from './weapon-flight';
import {inWeaponArc} from './weapon-patterns';
import {PLAYER_REAPER_DAMAGE_BONUS} from '../../data/player-unit-adaptations';
import {clearLine} from '../movement/steering';
import {rankStats} from '../../data/ranks';

export interface TerranEliteCombat {cycles:number;groundCycles:number;airCycles:number;lastFire:number;started:number|null;coolUntil:number;target:number|null;lockAt:number;stacks:number;boosted:number;mode:string;modeReady:number;ready:number;charge:number;barrier:number;barrierUntil:number;absorbed:number;}
export interface EliteDebuff {source:number;target:number;until:number;armor:number;speed:number;move:number;damage:number;}
export interface EliteArea {id:number;source:Entity;point:Point;radius:number;damage:number;next:number;until:number;kind:'fire'|'radiation';target:number|null;bonuses?:{attribute:string;amount:number}[];}
export interface AbsorptionReceipt {hunter:number;id:number;born:number;rank:number;elite:string|null;contribution:number;job:number|null;passenger:number|null;paid:{minerals:number;gas:number};}
export interface TerranEliteRun {debuffs:EliteDebuff[];areas:EliteArea[];knockReady:Record<string,number>;fireGate:Record<string,number>;plague:Record<string,{maxHp:number;next:number}>;absorptions:AbsorptionReceipt[];}
export const newTerranEliteRun=():TerranEliteRun=>({debuffs:[],areas:[],knockReady:{},fireGate:{},plague:{},absorptions:[]});
export const revisedElite=(u:Entity)=>u.team==='player'&&!u.heroId&&isTerranEliteId(u.eliteId);
export const eliteCombat=(u:Entity):TerranEliteCombat=>u.eliteCombat??(u.eliteCombat={cycles:0,groundCycles:0,airCycles:0,lastFire:-1,started:null,coolUntil:0,target:null,lockAt:0,stacks:0,boosted:0,mode:u.nativeMode??u.mode,modeReady:0,ready:0,charge:0,barrier:0,barrierUntil:0,absorbed:0});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const boss=(u:Body)=>'enemyTier' in u&&(u.enemyTier==='boss'||u.enemyTier==='lord');
export function eliteEnemies(w:World,u:Entity,p:Point,r:number,plane:'ground'|'air'|'both'='both') {return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.hp>0&&b.owner!==u.owner&&(plane==='both'||b.flying===(plane==='air'))&&dist(p,b)<=r+b.unitRadius&&w.visibleTo(b,u.owner)&&w.hasAttackLine(u,b)&&(!w.terrain||w.terrain.lineOfFire(p,b,u.flying,b.flying))&&(u.flying||b.flying||clearLine(p,b,0,w.obstacles)));}
function debuff(w:World,u:Entity,b:Body,seconds:number,values:Partial<Omit<EliteDebuff,'source'|'target'|'until'>>){let d=w.terranElites.debuffs.find(d=>d.source===u.id&&d.target===b.id);if(!d){d={source:u.id,target:b.id,until:0,armor:0,speed:0,move:0,damage:0};w.terranElites.debuffs.push(d);}Object.assign(d,values,{until:w.time+seconds});}
export function eliteDebuffValue(w:World,u:Body,key:'armor'|'speed'|'move'|'damage'){let n=0;for(const d of w.terranElites.debuffs)if(d.target===u.id&&d.until>w.time)n=Math.max(n,d[key]);if(key==='armor')for(const a of w.allies())if(a.hp>0&&revisedElite(a)&&a.eliteId==='banshee.1'&&u.owner!==a.owner&&dist(a,u)<=8+u.unitRadius&&w.visibleTo(u,a.owner))n=Math.max(n,.4);return n;}
/** Reduce an existing percentage defense relatively; never remove immunity or finite barriers. */
export function eliteDefenseEffectFactor(w:World,u:Body){return 1-Math.max(w.allies().some(a=>a.hp>0&&a.eliteId==='banshee.1'&&revisedElite(a)&&u.owner!==a.owner&&dist(a,u)<=8+u.unitRadius&&w.visibleTo(u,a.owner))?.25:0,compositeHeroDebuff(w,u,'defenseReduction'),compositeEliteDebuff(w,u,'defense'));}
export function eliteDefenseReduction(w:World,u:Body){return Math.max(0,Math.min(1,u.damageReduction??0))*eliteDefenseEffectFactor(w,u);}
export function eliteFriendlyAura(w:World,u:Entity){if(u.team!=='player'||u.owner!=='terran')return {family:1,hp:1,armor:0,move:1};let family=1,hp=1,thorArmor=0,medicalArmor=0,move=1;const eligible=!u.temporary&&!u.summonKind&&!u.attributes.includes('Structure');for(const a of w.allies()){if(!a.hp||!revisedElite(a))continue;
 if(a.eliteId==='marine.3'&&u.unitType==='marine'&&!u.heroId)family=1.2;
 if(a.eliteId==='thor.1'&&eligible&&u.attributes.includes('Mechanical')&&dist(a,u)<=6+u.unitRadius)thorArmor=4;
 if(a.eliteId==='medivac.1'&&eligible&&dist(a,u)<=8+u.unitRadius){hp=1.35;medicalArmor=5;}
 if(a.eliteId==='banshee.3'&&eliteCombat(a).lastFire<w.time-2&&eligible)move=1.3;
 }return {family,hp,armor:thorArmor+medicalArmor,move};}
/** Dynamic effects derive from saved clocks; stat refresh never spends energy or causes hits. */
export function eliteStatModifiers(w:World,u:Entity){let damage=1,speed=1,move=1,armor=0,hp=1;if(!revisedElite(u))return {damage,speed,move,armor,hp};const s=eliteCombat(u),id=u.eliteId!,p=TERRAN_ELITE_RULES[id as keyof typeof TERRAN_ELITE_RULES].parameters as Record<string,unknown>;
 move=typeof p.moveFactor==='number'?p.moveFactor:1;armor=terranEliteArmor(id as keyof typeof TERRAN_ELITE_RULES,u.rank);
 if(id==='marine.1'&&s.started!==null&&w.time>=s.coolUntil)speed=1+3*Math.min(1,(w.time-s.started)/5);
 if(id==='reaper.3'){const n=s.absorbed/(s.absorbed+20);damage*=1+3*n;hp*=1+4*n;armor+=10*n;}
 if(id==='tank.2'&&u.mode==='siege'){damage*=2;speed*=2;}
 if(id==='thor.2'&&s.target!==null&&w.time-s.lockAt>=3&&unitData(u).targetType==='air')speed*=2;
 if(id==='thor.3'&&s.started!==null){const phase=(w.time-s.started)%16;if(phase>=4&&phase<12)damage*=3;}
 if(id==='viking.2'&&u.nativeMode==='viking_assault'){damage*=2;armor+=5;}
 if(id==='viking.3'&&s.boosted>0)damage*=2.5;
 return {damage,speed,move,armor,hp};}
export function eliteCanFire(w:World,u:Entity){if(!revisedElite(u))return true;return !(u.eliteId==='marine.1'&&eliteCombat(u).coolUntil>w.time)&&!(u.unitType==='tank'&&u.eliteId!=='tank.1'&&(u.mode!=='siege'||Math.hypot(u.velocity.x,u.velocity.z)>.05));}
export function eliteMainFactor(u:Entity,target:Body){if(!revisedElite(u))return 1;const id=u.eliteId;let f=1;if(id==='marine.2')f=boss(target)?5:'enemyTier' in target&&target.enemyTier==='elite'?3:1;
 if(target.attributes.includes('Light')&&['marine.1','reaper.1','hellion.1','hellion.2'].includes(id!))f*=id==='marine.1'?1.6:1.8;
 if(id==='reaper.2'&&target.attributes.includes('Armored'))f*=1.5;
 if(id==='thor.2'&&target.flying&&target.attributes.includes('Armored'))f*=3;
 return f;}
function shot(w:World,u:Entity,target:Body,bonuses:{attribute:string;amount:number}[],shieldBonus:number,crit:number,hits:number,fraction=1,delay=0,primary=true){const speed=['marine','reaper','tank','thor'].includes(u.unitType)?u.unitType==='tank'?32:u.unitType==='thor'&&unitData(u).targetType==='air'?28:52:u.unitType==='marauder'?28:u.unitType==='viking'?39.2:70;const p:WeaponFlight={id:w.nextId++,attackId:`${u.id}:${u.shotSequence}`,source:structuredClone(u),target:target.id,from:{x:u.x,z:u.z},point:{x:u.x,z:u.z},lastSeen:{x:target.x,z:target.z},start:w.time+delay,expires:w.time+delay+8,speed,lost:false,damage:u.weaponDamage*fraction,bonuses:bonuses.map(b=>({...b,amount:b.amount*fraction})),hits,shieldBonus:shieldBonus*fraction,crit,enemyFactor:w.enemyDamageFactor(u),apm:primary&&(talentModifiers(w,u).apmDuplicate??0)>0,hop:0,seen:[],primary};w.weaponFlights.push(p);}
/** Each accepted weapon cycle freezes its real payload before subsequent rank/target changes. */
export function fireTerranElite(w:World,u:Entity,target:Body,bonuses:{attribute:string;amount:number}[],shieldBonus:number,crit:number){if(!revisedElite(u))return false;const s=eliteCombat(u),id=u.eliteId!;
 if(s.lastFire<0||w.time-s.lastFire>=2){s.cycles=0;s.groundCycles=0;s.airCycles=0;s.started=w.time;s.stacks=0;s.target=null;}
 s.lastFire=w.time;s.cycles++;if(target.flying)s.airCycles++;else s.groundCycles++;s.started??=w.time;
 if(s.target!==target.id){s.target=target.id;s.stacks=0;s.lockAt=w.time;}
 const packet=structuredClone(u);
 if(id==='reaper.2'&&s.cycles<=10){packet.weaponDamage*=3;bonuses=bonuses.map(b=>({...b,amount:b.amount*3}));shieldBonus*=3;}
 if(id==='viking.1'&&u.nativeMode!=='viking_assault'){packet.weaponDamage*=1+.35*s.stacks;bonuses=bonuses.map(b=>({...b,amount:b.amount*(1+.35*s.stacks)}));const opening=s.stacks===0;s.stacks=Math.min(5,s.stacks+1);if(opening){shot(w,packet,target,bonuses,shieldBonus,crit,1,.75,0,false);shot(w,packet,target,bonuses,shieldBonus,crit,1,.75,.12,false);}}
 if(id==='viking.3'&&s.boosted>0)s.boosted--;
 if(id==='banshee.3'&&s.charge>0){const amount=s.charge;s.charge=0;for(const b of eliteEnemies(w,u,u,5))w.hit(b,amount,[],1,u.owner,0,0,u.id,false,false,0,false);w.visual('strategic-impact',u);}
 if(u.unitType==='hellion'){
  const base=u.nativeMode==='hellbat'?unitData(u).attackRange:6.5,knight=id==='hellion.2',length=knight?u.attackRange:base*(id==='hellion.1'?4:1),facing=u.attackFacing;
  // Weapon ranges are measured from body edges. Start the fan at the front edge,
  // then use that same frozen origin/radius for both hits and presentation.
  const origin=knight?{x:u.x+Math.sin(facing)*u.unitRadius,z:u.z+Math.cos(facing)*u.unitRadius}:u;
  for(const b of eliteEnemies(w,u,origin,length,'ground')){const along=(b.x-u.x)*Math.sin(facing)+(b.z-u.z)*Math.cos(facing),across=Math.abs((b.x-u.x)*Math.cos(facing)-(b.z-u.z)*Math.sin(facing));if(knight?inWeaponArc(origin,facing,b,length,150):along>=0&&along<=length+b.unitRadius&&across<=.15+b.unitRadius)w.attackHit(packet,b,packet.weaponDamage,bonuses,1,0,b.id===target.id,b.id===target.id?crit:1);}
  w.effect('flame',knight?{...u,...origin}:u,{x:origin.x+Math.sin(facing)*length,z:origin.z+Math.cos(facing)*length},knight?length:.35,.35);return true;
 }
 if(id==='reaper.1')for(let i=0;i<6;i++)shot(w,packet,target,bonuses,shieldBonus,crit,1,1,i*.055,i===0);
 else if(id==='marauder.3')for(let i=0;i<3;i++)shot(w,packet,target,bonuses,shieldBonus,crit,1,.65,i*.12,i===0);
 else shot(w,packet,target,bonuses,shieldBonus,crit,unitData(u).attacks);
 return true;
}
export function eliteAfterHit(w:World,u:Entity,target:Body,damage:number,hits:number,primary:boolean,bonuses:{attribute:string;amount:number}[]=[]){if(!revisedElite(u))return;const id=u.eliteId!,plane=target.flying?'air':'ground';
 if(id==='marauder.1'||id==='marauder.2')for(const b of eliteEnemies(w,u,target,id==='marauder.1'?3.2:3,plane)){
  if(id==='marauder.1'){const k=boss(b)?.5:1;debuff(w,u,b,3,{speed:.35*k,move:.45*k,damage:.3*k});}else debuff(w,u,b,5,{armor:[.4,.45,.5,.55,.6][u.rank-1]});
 }
 if(id==='reaper.2')for(const b of eliteEnemies(w,u,target,2.6,plane))if(b.id!==target.id)w.hit(b,damage*.5*eliteMainFactor(u,b),bonuses.map(a=>({...a,amount:a.amount*.5*eliteMainFactor(u,b)})),hits,u.owner,.5,0,u.id,false,false,0,true);
 if(id==='marauder.3'){
  for(const b of eliteEnemies(w,u,target,2,plane))if(b.id!==target.id)w.hit(b,damage,bonuses,hits,u.owner,.5,0,u.id,false,false,0,true);
  const key=u.id+':'+target.id;if(w.time>=(w.terranElites.knockReady[key]??0)&&w.random()<.35){w.terranElites.knockReady[key]=w.time+1;if(boss(target))debuff(w,u,target,1,{move:.2});else if(!target.flying&&!target.attributes.includes('Structure')){const d=dist(u,target)||1,dx=(target.x-u.x)/d,dz=(target.z-u.z)/d;let last={x:target.x,z:target.z};for(let n=1;n<=20;n++){const p={x:target.x+dx*n*.1,z:target.z+dz*n*.1};if(!clearLine(last,p,target.unitRadius,w.obstacles,w.terrain)||Math.abs(p.x)+target.unitRadius>=w.mapHalf||Math.abs(p.z)+target.unitRadius>=w.mapHalf||[...w.entities.values()].some(b=>b.id!==target.id&&b.hp>0&&!b.flying&&dist(b,p)<b.unitRadius+target.unitRadius))break;last=p;}target.x=last.x;target.z=last.z;}}
 }
 if(id==='thor.1'&&!target.flying&&primary&&eliteCombat(u).groundCycles%3===0){for(const b of eliteEnemies(w,u,target,4,'ground')){w.hit(b,damage*hits*2,bonuses.map(a=>({...a,amount:a.amount*hits*2})),1,u.owner,.5,0,u.id,false,false,0,false);debuff(w,u,b,2,{move:boss(b)?.2:.4});}w.visual('weapon-area',u,target);}
 if(id==='thor.2'&&target.flying)for(const b of eliteEnemies(w,u,target,3,'air'))if(b.id!==target.id)w.hit(b,damage*.6*eliteMainFactor(u,b),bonuses.map(a=>({...a,amount:a.amount*.6*eliteMainFactor(u,b)})),hits,u.owner,.5,0,u.id,false,false,0,true);
}
/** Siege shell arrivals share the same real flight/save pipeline as every other gun. */
export function eliteFlightImpact(w:World,p:WeaponFlight,target:Body){if(!revisedElite(p.source)||p.source.unitType!=='tank')return false;const u=p.source,m=u.eliteId==='tank.3'?Math.sqrt(5):1,radius=Math.max(...SIEGE.splash.map(b=>b.radius))*m;
 for(const b of eliteEnemies(w,u,target,radius,'ground')){const band=SIEGE.splash.find(s=>dist(target,b)<=s.radius*m+b.unitRadius*.25);if(b.id!==target.id&&!band)continue;const f=b.id===target.id?1:band!.fraction;w.attackHit(u,b,p.damage*f,p.bonuses.map(a=>({...a,amount:a.amount*f})),1,0,b.id===target.id,b.id===target.id?p.crit:1,{enemyFactor:p.enemyFactor,apm:b.id===target.id&&p.apm});}
 if(u.eliteId==='tank.3')w.terranElites.areas.push({id:w.nextId++,source:structuredClone(u),point:{x:target.x,z:target.z},radius,damage:p.damage*.5,bonuses:p.bonuses.map(b=>({...b,amount:b.amount*.5})),next:w.time+1,until:w.time+1,kind:'fire',target:null});w.visual('projectile-impact',u,target,p.id);w.effect('explosion',u,target,radius,.5);return true;
}
export function eliteModeCompleted(w:World,u:Entity,previous:string){if(!revisedElite(u)||u.unitType!=='viking')return;const s=eliteCombat(u),mode=u.nativeMode??'viking';if(mode===previous)return;s.mode=mode;
 if(u.eliteId==='viking.2'&&mode==='viking_assault'&&w.time>=s.modeReady){s.modeReady=w.time+12;for(const b of eliteEnemies(w,u,u,4,'ground'))w.hit(b,1600*eliteFixedGrowth(u.rank),[],1,u.owner,0,0,u.id);w.visual('weapon-area',u);}
 if(u.eliteId==='viking.3'&&w.time>=s.modeReady){s.modeReady=w.time+14;s.boosted=10;s.barrier=u.maxHp*.35;s.barrierUntil=w.time+6;w.visual('barrier-start',u);}
}
export function tickTerranElite(w:World,u:Entity,dt:number){if(!revisedElite(u))return;const s=eliteCombat(u),id=u.eliteId!;
 if(s.barrierUntil<=w.time)s.barrier=0;
 if(id==='marine.1'){if(s.started!==null&&w.time>=s.started+15){s.coolUntil=Math.max(s.coolUntil,s.started+17);s.started=null;}if(s.coolUntil<=w.time&&s.lastFire>=0&&w.time-s.lastFire>=2)s.started=null;}
 if(id==='banshee.3'&&w.time-s.lastFire>=2)s.charge=Math.min(2600*eliteFixedGrowth(u.rank),s.charge+2600*eliteFixedGrowth(u.rank)*dt/8);
 if(!['science_vessel.2','science_vessel.3'].includes(id)||w.time<s.ready)return;
 const target=eliteEnemies(w,u,u,8).filter(b=>!b.attributes.includes('Structure')&&(id==='science_vessel.3'||b.attributes.includes('Biological'))).sort((a,b)=>dist(u,a)-dist(u,b)||a.id-b.id)[0];if(!target)return;
 s.ready=w.time+(id==='science_vessel.2'?10:14);u.lastSkillAt=w.time;w.visual('skill-impact',u,target);
 if(id==='science_vessel.2'){w.terranElites.areas.push({id:w.nextId++,source:structuredClone(u),point:{x:target.x,z:target.z},radius:3,damage:380*eliteFixedGrowth(u.rank),next:w.time+1,until:w.time+6,kind:'radiation',target:target.id});}
 else for(const b of eliteEnemies(w,u,target,5)){const e=w.entities.get(b.id);if(!e)continue;if((e.shield??0)>0)w.hit(e,2400*eliteFixedGrowth(u.rank),[],1,u.owner,0,0,u.id,false,false,0,false,true);e.energy*=.4;debuff(w,u,e,4,{speed:boss(e)?.15:.3});}
}
export function tickTerranEliteState(w:World){
 w.terranElites.debuffs=w.terranElites.debuffs.filter(d=>d.until>w.time&&!!w.body(d.target)?.hp);
 const fireDue=new Map<string,{source:Entity;target:Body;amount:number;bonuses:{attribute:string;amount:number}[]}>();for(const a of w.terranElites.areas){if(a.kind==='radiation'){const host=w.entities.get(a.target!);if(!host?.hp){a.until=-1;continue;}a.point={x:host.x,z:host.z};}while(a.next<=w.time+1e-8&&a.next<=a.until+1e-8){for(const b of eliteEnemies(w,a.source,a.point,a.radius,a.kind==='fire'?'ground':'both'))if(a.kind==='radiation'){if(b.attributes.includes('Biological'))w.hit(b,a.damage,[],1,a.source.owner,0,0,a.source.id);}else {const key=a.source.id+':'+b.id,old=fireDue.get(key);if((w.terranElites.fireGate[key]??0)<=w.time+1e-8&&(!old||a.damage>old.amount))fireDue.set(key,{source:a.source,target:b,amount:a.damage,bonuses:a.bonuses??[]});}a.next+=1;}}
 for(const [key,p]of fireDue){w.terranElites.fireGate[key]=w.time+1;w.hit(p.target,p.amount,p.bonuses,1,p.source.owner,0,0,p.source.id);}for(const [key,until]of Object.entries(w.terranElites.fireGate))if(until<w.time-1)delete w.terranElites.fireGate[key];
 w.terranElites.areas=w.terranElites.areas.filter(a=>a.until>w.time+1e-8);
 const liveKeys=new Set<string>();for(const u of w.allies())if(revisedElite(u)&&u.eliteId==='banshee.2'){for(const b of eliteEnemies(w,u,u,7)){if(b.attributes.includes('Structure'))continue;const key=u.id+':'+b.id;liveKeys.add(key);const gate=w.terranElites.plague[key]??(w.terranElites.plague[key]={maxHp:b.maxHp,next:w.time+1});if(w.time+1e-8>=gate.next){gate.next=w.time+1;const f=[.03,.035,.04,.045,.05][u.rank-1]*(boss(b)?.2:'enemyTier' in b&&b.enemyTier==='elite'?.5:1);w.hit(b,gate.maxHp*f,[],1,u.owner,0,0,u.id);w.visual('skill-dot',u,b);}}}
 for(const key of Object.keys(w.terranElites.plague))if(!liveKeys.has(key))delete w.terranElites.plague[key];
 for(const key of Object.keys(w.terranElites.knockReady))if(w.terranElites.knockReady[key]<w.time-8)delete w.terranElites.knockReady[key];
}
export function terranMedical(w:World,u:Entity,dt:number){if(!revisedElite(u)||!['medivac','science_vessel'].includes(u.unitType))return false;const mechanical=u.unitType==='science_vessel',limit=u.eliteId==='medivac.2'?5:u.eliteId==='science_vessel.2'?2:mechanical?3:1;u.healTarget=null;u.healTargets=[];
 const targets=[...w.entities.values()].filter(p=>p.owner===u.owner&&p.id!==u.id&&p.hp>0&&p.hp<p.maxHp&&!p.attributes.includes('Structure')&&(p.attributes.includes('Biological')||p.attributes.includes('Mechanical'))&&w.edgeDistance(u,p)<=8&&w.hasAttackLine(u,p)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,limit);
 for(const p of targets){const primary=p.attributes.includes(mechanical?'Mechanical':'Biological'),suppression=Math.min(.5,Math.max(w.statuses.value(p.id,'bleed',w.time),w.statuses.value(p.id,'corruption',w.time))),gain=Math.min(p.maxHp-p.hp,u.healRate*(primary?1:1/3)*(1-suppression)*dt*teamHealingFactor(w,p),u.energy/HEAL.energyPerHp);if(gain<=0)continue;p.hp+=gain;u.energy-=gain*HEAL.energyPerHp;w.stats.healed+=gain;observeRecovery(w,u,p,gain);u.healTarget??=p.id;u.healTargets.push(p.id);u.action='heal';
  const shield=u.eliteId==='medivac.3'&&(w.time-p.lastShotAt<=2||w.time-(p.lastDamagedAt??-1e6)<=2),matrix=u.eliteId==='science_vessel.1';if(shield||matrix){let b=w.eliteSupport.barriers.find(b=>b.source===u.id&&b.target===p.id);if(!b){b={source:u.id,target:p.id,amount:0,until:0,cap:matrix?.6:.5};w.eliteSupport.barriers.push(b);}if(b.until<=w.time)b.amount=0;b.amount=Math.min(p.maxHp*(matrix?.6:.5),b.amount+gain*(matrix?1.5:1.2));b.until=w.time+(matrix?7:6);}
 }return true;
}
export function reaperContribution(rank:number,elite:string|null){const g=elite&&isTerranEliteId(elite)?TERRAN_ELITE_RULES[elite].body:null,base=rankStats(rank),dps=g?({assault:1.6,precision:1.8,bulwark:1.5,mobile:1.6,support:1.5}[g])*eliteFixedGrowth(rank)*5:base.rank,hp=g?({assault:1.8,precision:1.7,bulwark:3,mobile:1.9,support:2.4}[g])*4.2*(1+.3*(rank-1)):base.health;return (dps+hp)/2;}
/** Absorbed bodies retire atomically without an enemy-death/revival event. */
export function absorbReaper(w:World,hunter:Entity,u:Entity,job:number|null=null,passenger:number|null=null,paid={minerals:0,gas:0}){if(hunter.id===u.id||hunter.eliteId!=='reaper.3'||!revisedElite(hunter)||u.unitType!=='reaper'||u.heroId||u.temporary||u.hp<=0||w.terranElites.absorptions.some(r=>r.id===u.id&&r.born===u.bornAt))return false;
 const contribution=reaperContribution(u.rank,u.eliteId??null);
 eliteCombat(hunter).absorbed+=contribution;w.terranElites.absorptions.push({hunter:hunter.id,id:u.id,born:u.bornAt,rank:u.rank,elite:u.eliteId??null,contribution,job,passenger,paid:{...paid}});u.hp=0;w.entities.delete(u.id);w.statuses.removeTarget(u.id);for(const r of w.zergHeroes.revivals)r.seats=r.seats.filter(seat=>!seat.members.some(b=>b.id===u.id));w.refreshStats(hunter);w.visual('support-pulse',hunter);return true;
}
export function absorbCurrentReapers(w:World,hunter:Entity){for(const u of [...w.familyUnits('reaper')]){const job=w.expedition.ledger.find(j=>j.passengers.some(p=>p.entityId===u.id&&p.status==='released')),index=job?.passengers.findIndex(p=>p.entityId===u.id)??-1;absorbReaper(w,hunter,u,job?.id??null,index<0?null:index,index<0?undefined:job!.passengers[index].paid);}}
export function validateTerranEliteRun(s:TerranEliteRun){const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v),id=(v:unknown)=>num(v)&&Number.isSafeInteger(v)&&Number(v)>0;if(!s||!Array.isArray(s.debuffs)||!Array.isArray(s.areas)||!Array.isArray(s.absorptions)||!s.plague||!s.knockReady||!s.fireGate)throw Error('人族精英状态缺失');
 for(const d of s.debuffs)if(!id(d.source)||!id(d.target)||!num(d.until)||![d.armor,d.speed,d.move,d.damage].every(n=>num(n)&&n>=0&&n<=1))throw Error('精英减益无效');
 const seen=new Set<number>();for(const a of s.areas){if(!id(a.id)||seen.has(a.id)||!a.source||!revisedElite(a.source)||![a.point?.x,a.point?.z,a.radius,a.damage,a.next,a.until].every(num)||a.radius<=0||a.damage<0||!['fire','radiation'].includes(a.kind)||a.kind==='radiation'&&!id(a.target))throw Error('精英区域无效');seen.add(a.id);if(a.source.eliteCombat)validateTerranEliteCombat(a.source.eliteCombat);if(a.bonuses&&(!Array.isArray(a.bonuses)||a.bonuses.some(b=>typeof b.attribute!=='string'||!num(b.amount)||b.amount<0)))throw Error('精英区域附加伤害无效');}
 for(const [key,value]of Object.entries(s.plague))if(!/^[1-9]\d*:[1-9]\d*$/.test(key)||!num(value.next)||!num(value.maxHp)||value.maxHp<=0)throw Error('污染时钟无效');
 for(const [key,value]of Object.entries({...s.knockReady,...s.fireGate}))if(!/^[1-9]\d*:[1-9]\d*$/.test(key)||!num(value))throw Error('击退时钟无效');
 const receipts=new Set<string>();for(const r of s.absorptions){const key=r.id+':'+r.born;if(!id(r.id)||!id(r.hunter)||receipts.has(key)||![r.born,r.rank,r.contribution,r.paid?.minerals,r.paid?.gas].every(n=>num(n)&&n>=0)||r.hunter===r.id||!Number.isSafeInteger(r.rank)||r.rank<1||r.rank>7||r.elite!==null&&(!isTerranEliteId(r.elite)||!r.elite.startsWith('reaper.'))||Math.abs(r.contribution-reaperContribution(r.rank,r.elite))>1e-6||r.job!==null&&!id(r.job)||r.passenger!==null&&(!Number.isSafeInteger(r.passenger)||r.passenger<0))throw Error('吸收收据无效');receipts.add(key);}
}
export function validateTerranEliteCombat(s:TerranEliteCombat){if(!s||![s.cycles,s.groundCycles,s.airCycles,s.lastFire,s.coolUntil,s.lockAt,s.stacks,s.boosted,s.modeReady,s.ready,s.charge,s.barrier,s.barrierUntil,s.absorbed].every(Number.isFinite)||![s.cycles,s.groundCycles,s.airCycles,s.stacks,s.boosted].every(n=>Number.isSafeInteger(n)&&n>=0)||s.stacks>5||s.boosted>10||s.started!==null&&!Number.isFinite(s.started)||s.target!==null&&(!Number.isSafeInteger(s.target)||s.target<1)||typeof s.mode!=='string'||[s.charge,s.barrier,s.absorbed].some(n=>n<0))throw Error('精英循环无效');}
