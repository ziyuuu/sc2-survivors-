// One-time guarded, reversible insertion of read-only observation calls. No amount/timer is replaced.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const edits=new Map(),hash=s=>createHash('sha256').update(s).digest('hex');
async function edit(file,imports,replacements){const original=await fs.readFile(file,'utf8');if(original.includes("from '../observation'")||original.includes("from './observation'"))throw Error('Already instrumented: '+file);let text=original;for(const [from,to]of replacements){if(text.split(from).length!==2)throw Error('Expected unique fragment in '+file+': '+from);text=text.replace(from,to);}text=`import {${imports}} from '${file==='src/simulation/world.ts'||file==='src/simulation/zerg-brood.ts'?'./observation':'../observation'}';\n`+text;edits.set(file,{before:hash(original),after:hash(text),replacements,imports,original,text});}
await edit('src/simulation/world.ts','rememberObservationSource,observeDamage,observeAmount,observeRecovery',[
 ['){const factor=(primary?heroMainFactor','){rememberObservationSource(this,u);const factor=(primary?heroMainFactor'],
 ['preventDiagnosticDeath(this,target,before,total);if(sourceOwner!==target.owner)','preventDiagnosticDeath(this,target,before,total);observeDamage(this,target,sourceOwner,sourceId,before-target.hp,beforeShield-(\'shield\' in target?Number(target.shield??0):0));if(sourceOwner!==target.owner)'],
 ["this.visual('death',e);zergEliteDeath(this,e);","if(e.owner==='terran'&&!e.temporary&&!e.summonKind)observeAmount(this,e,'deaths',1);this.visual('death',e);zergEliteDeath(this,e);"],
 ['patient.hp+=healed;this.stats.healed+=healed;','patient.hp+=healed;this.stats.healed+=healed;observeRecovery(this,undefined,patient,healed);']
]);
await edit('src/simulation/combat/expedition-combat.ts','observeRecovery',[
 ['uniqueShieldTick(w,u,dt);','uniqueShieldTick(w,u,dt);const observedHp=u.hp,observedShield=u.shield??0;'],
 ['*recovery*dt*teamHealingFactor(w,u,false));','*recovery*dt*teamHealingFactor(w,u,false));observeRecovery(w,\'natural_regeneration\',u,u.hp-observedHp,(u.shield??0)-observedShield);'],
 ["w.stats.healed+=gain;w.effect('heal',u,p,.4,.5);","w.stats.healed+=gain;observeRecovery(w,u,p,gain);w.effect('heal',u,p,.4,.5);"],
 ['target.hp+=gain;w.stats.healed+=gain;','target.hp+=gain;w.stats.healed+=gain;observeRecovery(w,spell.source,target,gain);'],
 ["u.action='heal';w.stats.healed+=amount;","u.action='heal';w.stats.healed+=amount;observeRecovery(w,u,patient,amount);"]
]);
await edit('src/simulation/combat/expedition-heroes.ts','observeRecovery,observeAmount',[
 ['if(revival)record.skillReady=w.time+data.cooldown;','if(revival){record.skillReady=w.time+data.cooldown;observeAmount(w,u,\'revivals\',1);}'],
 ['target.hp+=restored;w.stats.healed+=restored;','target.hp+=restored;w.stats.healed+=restored;observeRecovery(w,source,target,restored);']
]);
await edit('src/simulation/combat/terran-hero-passives.ts','observeRecovery',[["a.hp+=gain;w.stats.healed+=gain;u.healTargets.push(a.id);","a.hp+=gain;w.stats.healed+=gain;observeRecovery(w,u,a,gain);u.healTargets.push(a.id);"]]);
await edit('src/simulation/combat/zerg-hero-passives.ts','observeRecovery',[["target.hp+=gain;w.stats.healed+=gain;if(active)","target.hp+=gain;w.stats.healed+=gain;observeRecovery(w,source,target,gain);if(active)"]]);
await edit('src/simulation/combat/protoss-hero-passives.ts','observeRecovery',[
 ['a.shield=(a.shield??0)+gain;w.stats.healed+=gain;','a.shield=(a.shield??0)+gain;w.stats.healed+=gain;observeRecovery(w,source,a,0,gain);'],
 ['u.shield=u.maxShield!*R.fenix.restore;','u.shield=u.maxShield!*R.fenix.restore;observeRecovery(w,u,u,0,u.shield);']
]);
await edit('src/simulation/combat/terran-elite-runtime.ts','observeRecovery',[["u.energy-=gain*HEAL.energyPerHp;w.stats.healed+=gain;","u.energy-=gain*HEAL.energyPerHp;w.stats.healed+=gain;observeRecovery(w,u,p,gain);"]]);
await edit('src/simulation/combat/p4-samples.ts','observeRecovery',[["p.hp+=gain;u.energy-=gain*.33;w.stats.healed+=gain;","p.hp+=gain;u.energy-=gain*.33;w.stats.healed+=gain;observeRecovery(w,u,p,gain);"]]);
await edit('src/simulation/combat/zerg-elite-runtime.ts','observeRecovery',[
 ['b.hp+=gain;w.stats.healed+=gain;return gain;','b.hp+=gain;w.stats.healed+=gain;observeRecovery(w,b,b,gain);return gain;'],
 ['w.stats.healed+=gain;recordTeamTransfusion(w,live,b,gain);','w.stats.healed+=gain;observeRecovery(w,live,b,gain);recordTeamTransfusion(w,live,b,gain);']
]);
await edit('src/simulation/combat/protoss-elite-runtime.ts','observeRecovery',[
 ['function restoreShield(w:World,u:Entity,amount:number){','function restoreShield(w:World,u:Entity,amount:number,observedSource:Entity=u){'],
 ['u.shield=(u.shield??0)+gain;w.stats.healed+=gain;return gain;','u.shield=(u.shield??0)+gain;w.stats.healed+=gain;observeRecovery(w,observedSource,u,0,gain);return gain;'],
 ['restoreShield(w,b,f.amount)','restoreShield(w,b,f.amount,live!)']
]);
await edit('src/simulation/combat/team-auras.ts','observeRecovery',[
 ['source.hp+=gain;b.spent+=gain;w.stats.healed+=gain;','source.hp+=gain;b.spent+=gain;w.stats.healed+=gain;observeRecovery(w,b.source,source,gain);'],
 ['u.hp+=gain;w.stats.healed+=gain;','u.hp+=gain;w.stats.healed+=gain;observeRecovery(w,undefined,u,gain);']
]);
await edit('src/simulation/combat/carriers.ts','observeRecovery',[
 ['refreshInterceptorStats(w,u);if(w.time','refreshInterceptorStats(w,u);const observedShield=u.shield??0;if(w.time'],
 ['u.weaponCooldown=Math.max(0,u.nextShotAt-w.time);','observeRecovery(w,\'natural_regeneration\',u,0,(u.shield??0)-observedShield);u.weaponCooldown=Math.max(0,u.nextShotAt-w.time);'],
 ['u.hp+=gain;w.stats.healed+=gain;','u.hp+=gain;w.stats.healed+=gain;observeRecovery(w,carrier,u,gain);']
]);
await edit('src/simulation/combat/zerg-hero-revival.ts','observeAmount',[["w.visual('hero-revive',source??u,u,r.id);","observeAmount(w,'niadra','revivals',1);w.visual('hero-revive',source??u,u,r.id);"]]);
await edit('src/simulation/zerg-brood.ts','observeAmount',[["p.regrowAt=null;p.birthPending=false;w.changed();","if(!p.birthPending)observeAmount(w,u,'revivals',1);p.regrowAt=null;p.birthPending=false;w.changed();"]]);
await edit('src/simulation/combat/shop-support.ts','hitFrom',[
 ['function areaHit(w:World,p:Point,damage:number,radius:number){','function areaHit(w:World,p:Point,damage:number,radius:number,observedSource:string){'],
 ["w.hit(b,damage,[],1,'terran',0);supportImpact","hitFrom(w,observedSource,b,damage,[],1,'terran',0);supportImpact"],
 ['areaHit(w,mine.point,120,2);',"areaHit(w,mine.point,120,2,w.expedition.race+'.mines');"],
 ["i.kind==='strategic'?8:2.5);","i.kind==='strategic'?8:2.5,w.expedition.race+'.'+i.kind);"],
 ["w.hit(target,b.damage,[],1,'terran',0,0,b.source);","hitFrom(w,w.expedition.race+'.mutation',target,b.damage,[],1,'terran',0,0,b.source);"]
]);
await edit('src/simulation/combat/unique-support.ts','hitFrom,observeRecovery',[
 ['function area(w:World,p:Point,damage:number,radius:number,slow=0){','function area(w:World,p:Point,damage:number,radius:number,slow=0,observedSource=\'unattributed\'){'],
 ["w.hit(e,damage,[],1,'terran',0);if(slow","hitFrom(w,observedSource,e,damage,[],1,'terran',0);if(slow"],
 ['area(w,victim,mark.damage,2.5);',"area(w,victim,mark.damage,2.5,0,'zerg.parasite');"],
 ['area(w,u,[0,120,180,240][rank],3,.25);',"area(w,u,[0,120,180,240][rank],3,.25,'protoss.counter');"],
 ["if(race==='zerg'&&u.attributes.includes('Biological'))u.hp=Math.min(u.maxHp,u.hp+u.maxHp*[0,.15,.225,.3][rank]);","if(race==='zerg'&&u.attributes.includes('Biological')){const observedHp=u.hp;u.hp=Math.min(u.maxHp,u.hp+u.maxHp*[0,.15,.225,.3][rank]);observeRecovery(w,'zerg.evolve',u,u.hp-observedHp);}"],
 ['area(w,p.point,p.damage,1.2);',"area(w,p.point,p.damage,1.2,0,'terran.missiles');"],
 ["w.hit(target,p.damage,[],1,'terran',0);","hitFrom(w,p.kind==='echo'?'protoss.echo':'terran.'+p.kind,target,p.damage,[],1,'terran',0);"],
 ['target.hp+=gain;w.stats.healed+=gain;orb.until=0;',"target.hp+=gain;w.stats.healed+=gain;observeRecovery(w,'zerg.consume',target,gain);orb.until=0;"],
 ["w.hit(target,damage,[],1,'terran',0);event(w,'support-flight'","hitFrom(w,'terran.bunker',target,damage,[],1,'terran',0);event(w,'support-flight'"],
 ["w.hit(e,beam.damage,[],1,'terran',0);","hitFrom(w,'protoss.prism',e,beam.damage,[],1,'terran',0);"]
]);
await edit('src/simulation/combat/talent-support.ts','observeRecovery',[
 ["if(race==='protoss')patient.shield=","const observedHp=patient.hp,observedShield=patient.shield??0;if(race==='protoss')patient.shield="],
 ["w.visual('hit',patient);w.stats.healed++;","observeRecovery(w,undefined,patient,patient.hp-observedHp,(patient.shield??0)-observedShield);w.visual('hit',patient);w.stats.healed++;"]
]);
await fs.mkdir('reports/local/p5-backend-20261006',{recursive:true});
await fs.writeFile('reports/local/p5-backend-20261006/observation-insertions.json',JSON.stringify([...edits].map(([file,{text,original,...data}])=>({file,...data})),null,2),{flag:'wx'});
for(const[file,{text}]of edits)await fs.writeFile(file,text);
console.log('Inserted guarded observations into '+edits.size+' files. Each original fragment and both hashes are recorded.');
