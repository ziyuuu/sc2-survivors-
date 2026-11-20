import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import {observeRecovery} from '../observation';
import {bioFormal} from './bio-state';
import {unitData} from './expedition-combat';
import {bioBody,bioEligible,bioHealingFactor,level,value,heroPower,reserve,isBoss,near,fleshMachine,type BioPoison,type BioField} from './bio-runtime';

export const stableDps=(u:Entity)=>u.weaponDamage*(u.bio?.stableDamageShare??1)*unitData(u).attacks/Math.max(1/60,u.attackPeriod*(u.bio?.transientRate??1));
const poisonPower=(p:BioPoison,at:number)=>p.power*(p.kind==='strain'?1+Math.min(5,Math.floor(Math.max(0,at-p.start)/2))*.2:1);
const hurt=(u:Entity)=>u.hp>0&&u.hp<u.maxHp;
function growthOwner(w:World,u:Entity){
 if(u.bio?.role!=='twin')return u;
 const owner=w.entities.get(u.bio.host!);
 if(owner&&owner.hp>0)return owner;
 return w.expedition.bio?.appointments?.find(a=>a.kind==='twin'&&a.carrier===u.id)?.body;
}
const injured=(w:World,origin:Point,r:number)=>w.allies().filter(a=>bioFormal(a)&&hurt(a)&&near(a,origin,r)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);
export function bioActivity(w:World,sourceId:Entity|number|string|undefined,target:Body,amount:number,healing=false){
 if(!w.expedition?.bio||amount<=0)return;
 const id=typeof sourceId==='object'?sourceId.id:sourceId,u=typeof id==='number'?w.entities.get(id):undefined;
 if(!u||u.hp<=0||!bioEligible(w,u)||healing&&w.time-((target as Entity).bio?.lastCombat??-Infinity)>3)return;
 bioBody(u).lastCombat=w.time;
}
export function bioHeal(w:World,u:Entity,amount:number,source=u.id,pulse=false){
 if(!hurt(u)||u.bio?.rushEnd!==undefined||u.bio?.role==='cocoon'||amount<=0)return 0;
 const actual=Math.min(u.maxHp-u.hp,amount*bioHealingFactor(w,u));
 u.hp+=actual;w.stats.healed+=actual;observeRecovery(w,source,u,actual,0,pulse);return actual;
}
export function bioRecovered(w:World,u:Entity,amount:number,pulse:boolean){
 if(!w.expedition?.bio||!bioEligible(w,u)||amount<=0||u.hp<=0)return;
 const c=bioBody(u);
 if(level(w,'BIO-B08')){c.healFraction=Math.min(.2,(c.healFraction??0)+amount/u.maxHp);if(c.healFraction>=.2-1e-9&&w.time>=(c.barrierReady??0)){c.healFraction=0;c.barrier=u.maxHp*value(w,'BIO-B08',.08,.12,.16)*heroPower(u);c.barrierEnd=w.time+6;c.barrierReady=w.time+10;w.visual('barrier-start',u);}}
 if(pulse||!bioFormal(u)||!level(w,'BIO-N05'))return;
 c.pulseFraction=Math.min(.3,(c.pulseFraction??0)+amount/u.maxHp);if(c.pulseFraction<.3-1e-9||w.time<(c.pulseReady??0))return;
 const allies=injured(w,u,4).slice(0,4);if(!allies.length)return;
 c.pulseFraction=0;c.pulseReady=w.time+12;const amountPct=reserve(w,'BIO-N05')?.12:.08;
 for(const a of allies){if(bioHeal(w,a,amountPct*a.maxHp,u.id,true)>0)w.visual('skill-heal',u,a,undefined,undefined,{bioResponse:'metabolism'});}
}
export function bioLeech(w:World,u:Entity,loss:number,poison=false){
 if(!bioEligible(w,u)||loss<=0)return;
 const c=bioBody(u),second=Math.floor(w.time);
 if(c.leechSecond!==second){c.leechSecond=second;c.leeched=c.shareLeeched=0;}
 const p=heroPower(u),shared=!poison&&(c.shareEnd??0)>w.time;
 const rate=Math.max((poison?1/3:1)*value(w,'BIO-P03',.1,.15,.2)*p,shared?.08:0);
 const cap=u.maxHp*Math.max(value(w,'BIO-P03',.03,.04,.05)*p,shared?.03:0);
 // Older checkpoints may contain two counters; both count against the one recovery budget.
 const gain=Math.max(0,Math.min(loss*rate,cap-(c.leeched??0)-(c.shareLeeched??0)));
 c.leeched=(c.leeched??0)+bioHeal(w,u,gain);
}
export function bioNativeFactor(w:World,u:Entity,t:Body){
 if(!w.expedition?.bio||!bioEligible(w,u)&&u.bio?.role!=='twin')return 1;
 const e=w.entities.get(t.id);const finish=bioEligible(w,u)&&t.hp<=.4*t.maxHp?value(w,'BIO-P04',.25,.35,.45)*heroPower(u):0;
 if(!level(w,'BIO-N06'))return 1+finish;
 const body=bioBody(w.entities.get(u.id)??u),sequence=u.shotSequence??0;
 const rounds=body.relayRounds=(body.relayRounds??[]).filter(r=>r.end>w.time),round=rounds.find(r=>r.sequence===sequence&&r.target===t.id);
 const relay=e?.bio&&e.bio.relayBy!==undefined&&e.bio.relayBy!==u.id&&w.time-(e.bio.relayAt??-5)<=2&&(e.bio.relayReady??0)<=w.time;
 const factor=round?.factor??(relay?(w.expedition.bio!.nodeReserves['BIO-N06']?1.6:1.3):1);
 if(!round)rounds.push({sequence,target:t.id,factor,end:w.time+8});
 return (1+finish)*factor;
}
function armorStack(w:World,e:Entity){
 const pct=value(w,'BIO-B09',.05,.075,.1);if(!pct)return;
 const c=bioBody(e),list=(c.armorLayers??[]).filter(a=>a.end>w.time);if(list.length>=4)list.shift();list.push({end:w.time+5,fraction:pct});c.armorLayers=list;
}
export function bioNativeHit(w:World,source:Entity,t:Body,budget:number,health:number,vital:number,primary=true){
 if(!w.expedition?.bio||vital<=0||source.owner!=='terran'||t.owner!=='zerg')return;
 const u=w.entities.get(source.id)??source,e=w.entities.get(t.id);
 if(!e||!bioEligible(w,u)&&u.bio?.role!=='twin')return;
 const c=bioBody(u),eState=bioBody(e);
 bioLeech(w,u,health);c.lastCombat=w.time;
 if(!primary)return;
 if(level(w,'BIO-N06')&&(bioFormal(u)||c.role==='twin')){
  if(eState.relayBy!==undefined&&eState.relayBy!==u.id&&w.time-(eState.relayAt??-5)<=2&&(eState.relayReady??0)<=w.time){reserve(w,'BIO-N06');eState.relayReady=w.time+3;w.visual('bio-response',u,e,undefined,undefined,{bioResponse:'relay'});}
  eState.relayBy=u.id;eState.relayAt=w.time;
 }
 if(!bioEligible(w,u))return;
 if(level(w,'BIO-P04')&&t.hp+health<=.4*t.maxHp)w.visual('bio-response',u,t,undefined,undefined,{bioResponse:'predator'});
 if(c.focus!==t.id||(c.lastRound??-4)<w.time-3){c.focus=t.id;c.focusStart=w.time;}
 c.lastCombat=c.lastRound=w.time;const rounds=c.rounds=(c.rounds??0)+1;
 if(e.hp<=0)return;
 const dps=stableDps(source)*heroPower(u)*(level(w,'BIO-N02')?1.5:1),duration=1+value(w,'BIO-W08',.15,.25,.35);
 const add=(kind:BioPoison['kind'],power:number,seconds:number,cap:number)=>{
  if(!power)return;const poisons=eState.poisons??=[],same=poisons.filter(p=>p.source===u.id&&p.kind===kind);
  if(same.length>=cap){const old=same.sort((a,b)=>a.end-b.end)[0];old.end=w.time+seconds*duration;old.power=power*dps;if(kind==='venom')old.refreshedAt=w.time;}
  else poisons.push({kind,source:u.id,start:w.time,power:power*dps,next:w.time+1,end:w.time+seconds*duration});
  eState.poisons=poisons;
 };
 add('venom',value(w,'BIO-W02',.03,.045,.06),4,3);add('weak',value(w,'BIO-G09',.02,.03,.04),4,1);add('strain',value(w,'BIO-P05',.06,.08,.1),5,1);
 if(rounds%4===0)armorStack(w,e);
 if(rounds%5===0&&level(w,'BIO-G07')){e.moveSlowFactor=Math.max((e.moveSlowUntil??0)>w.time?e.moveSlowFactor??0:0,value(w,'BIO-G07',.2,.3,.4)*(isBoss(e)?.5:1));e.moveSlowUntil=w.time+2;w.visual('bio-response',u,e,undefined,undefined,{bioResponse:'snare'});}
 if(level(w,'BIO-N04')){const marks=(eState.plague??[]).filter(m=>m.end>w.time);if(marks.length>=5)marks.shift();marks.push({end:w.time+4,source:u.id});eState.plague=marks;eState.nextPlague??=w.time+1;if(reserve(w,'BIO-N04'))eState.strongPlague=w.time+4;}
 if(rounds%3===0&&level(w,'BIO-G02')){const state=w.expedition.bio!;(state.acid??=[]).push({source:u.id,target:e.id,due:w.time+Math.max(.06,Math.hypot(u.x-e.x,u.z-e.z)/18),damage:budget*value(w,'BIO-G02',.3,.45,.6)*heroPower(u)});w.visual('skill-line',u,e,undefined,undefined,{bioEffect:'acid'});}
}
export function bioAfterDamage(w:World,u:Entity,attacker:Entity|undefined,loss:number,direct:boolean){
 if(!w.expedition?.bio||!bioEligible(w,u)||loss<=0)return;
 const c=bioBody(u);c.lastCombat=w.time;
 if(u.hp>0){
  if(loss>=.08*u.maxHp&&level(w,'BIO-W09')&&w.time>=(c.clotReady??0)){c.clotEnd=w.time+3;c.clotReady=w.time+12;w.visual('support-pulse',u);}
  if(loss>=.08*u.maxHp&&level(w,'BIO-N09')&&w.time>=(c.shareReady??0)){
   const target=injured(w,u,5).find(a=>a.id!==u.id);
   if(target){
    bioBody(target).shareEnd=w.time+(reserve(w,'BIO-N09')?10:6);
    c.shareReady=w.time+10;w.refreshStats(target);w.visual('bio-response',u,target,undefined,undefined,{bioResponse:'share'});
   }
  }
  if(u.hp<=.35*u.maxHp&&level(w,'BIO-P06')&&w.time>=(c.moltReady??0)){c.moltEnd=w.time+3;c.moltReady=w.time+25;w.visual('support-pulse',u);}
 }
 if(direct&&attacker&&attacker.hp>0&&level(w,'BIO-B02')){
  const reflect=Math.min(1,heroPower(u)*value(w,'BIO-B02',.2,.3,.4)*(level(w,'BIO-N01')?1.5:1));
  const vitality=attacker.hp+(attacker.shield??0);
  w.hit(attacker,loss*reflect,[],1,'terran',0,1,u.id,false,false,0,false,false,false,{trueDamage:true,derived:true});
  if(attacker.hp+(attacker.shield??0)<vitality)w.visual('bio-response',u,attacker,undefined,undefined,{bioResponse:'reflect'});
 }
}
export function bioOnEnemyDeath(w:World,e:Entity,source:number|undefined){
 const a=w.expedition?.bio;if(!a)return;
 const u=source===undefined?undefined:w.entities.get(source);
 if(u&&u.hp>0&&bioEligible(w,u)){
  const c=bioBody(u);c.lastCombat=w.time;
  const owner=growthOwner(w,u);
  if(owner&&bioFormal(owner)&&level(w,'BIO-N01')&&(level(w,'BIO-B02')||level(w,'BIO-G03'))){
   const growth=bioBody(owner),before=growth.kills??0,ordinary=Math.min(30,before+1);
   growth.kills=Math.min(30,ordinary+(ordinary<30&&reserve(w,'BIO-N01')?5:0));
   if(owner.hp>0)w.refreshStats(owner);
   if(growth.kills>before)w.visual('bio-response',u,u,undefined,undefined,{bioResponse:'grow'});
  }
  if(level(w,'BIO-P04')&&w.time>=(c.feedAt??0)){if(bioHeal(w,u,u.maxHp*value(w,'BIO-P04',.03,.04,.05)*heroPower(u))>0)w.visual('bio-response',e,u,undefined,undefined,{bioResponse:'feed'});c.feedAt=w.time+2;}
  if((bioFormal(u)||u.heroId)&&level(w,'BIO-G06')&&w.time>=(a.nextResidue??0)){(a.fields??=[]).push({kind:'residue',source:u.id,x:e.x,z:e.z,radius:4,power:value(w,'BIO-G06',.02,.03,.04),next:w.time,end:w.time+10});a.nextResidue=w.time+1;}
 }
 if(level(w,'BIO-G09')){const strongest=e.bio?.poisons?.filter(p=>p.kind!=='spread'&&p.end>w.time).sort((a,b)=>poisonPower(b,w.time)-poisonPower(a,w.time))[0];if(strongest){const others=[...w.entities.values()].filter(t=>t.id!==e.id&&t.owner===e.owner&&t.hp>0&&t.flying===e.flying&&near(t,e,2.5)).sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z)||a.id-b.id).slice(0,3);for(const t of others){w.visual('bio-response',e,t,undefined,undefined,{bioResponse:'spread'});(bioBody(t).poisons??=[]).push({...strongest,kind:'spread',power:poisonPower(strongest,w.time)*.6,start:w.time,next:w.time+1,end:Math.min(w.time+3,strongest.end)});}}}
}
export function bioTickCombat(w:World,dt:number){
 const state=w.expedition.bio;if(!state)return;
 for(const shot of state.acid??[])if(shot.due<=w.time){const e=w.entities.get(shot.target);if(e&&e.hp>0){w.hit(e,shot.damage,[],1,'terran',.5,0,shot.source);w.visual('skill-impact',e,e,undefined,undefined,{bioEffect:'acid-hit'});}}
 if(state.acid?.length)state.acid=state.acid.filter(s=>s.due>w.time);
 for(const u of w.entities.values()){
  if(u.hp<=0||u.heldBy)continue;
  if(u.owner==='zerg'){const c=u.bio;if(!c)continue;
   for(const p of c.poisons??[]){if(Math.min(p.next,p.end)>w.time+1e-7)continue;
    const before=u.hp,power=poisonPower(p,p.next)*Math.max(0,Math.min(1,p.end-(p.next-1)));p.next++;
    w.hitOverTime(u,power,[],1,'terran',0,0,p.source);const src=w.entities.get(p.source);if(src&&src.hp>0)bioLeech(w,src,before-u.hp,true);}
   if(c.poisons?.length){if(w.time>=(c.nextArmor??w.time+1)){armorStack(w,u);c.nextArmor=w.time+1;}else c.nextArmor??=w.time+1;c.poisons=c.poisons.filter(p=>p.end>w.time+1e-7);}else c.nextArmor=undefined;
   if(c.plague?.length){if((c.nextPlague??0)<=w.time+1e-7){const f=isBoss(u)?.0004:u.enemyTier==='elite'?.0015:.005;
    w.hit(u,u.maxHp*f*c.plague.length*((c.strongPlague??0)>=w.time?1.5:1),[],1,'terran',0,1,c.plague[0].source,false,false,0,false,false,false,{trueDamage:true,dot:true});c.nextPlague=w.time+1;}
    c.plague=c.plague.filter(m=>m.end>w.time+1e-7);if(!c.plague.length)c.nextPlague=undefined;}
   continue;
  }
  if(level(w,'BIO-B04')&&fleshMachine(u)){bioHeal(w,u,u.maxHp*dt*value(w,'BIO-B04',.004,.006,.008));const c=bioBody(u);c.cloudAt??=w.time+6;if(w.time>=c.cloudAt){const e=[...w.entities.values()].find(e=>e.owner==='zerg'&&e.hp>0&&!e.flying&&near(u,e,6)&&w.visibleTo(e,'terran'));if(e){const boost=reserve(w,'BIO-N08')?1.5:1;c.cloudAt=w.time+6;(state.fields??=[]).push({kind:'cloud',source:u.id,x:e.x,z:e.z,radius:2*boost,power:(u.weaponDamage?stableDps(u):.05*u.maxHp)*value(w,'BIO-B04',.1,.15,.2)*(1+(level(w,'BIO-N02')?.5:0)+(level(w,'BIO-N08')?.25:0)),start:w.time,next:w.time+1,end:w.time+(4+value(w,'BIO-W08',.5,1,1.5))*boost});}}}
  if(!bioEligible(w,u))continue;const c=bioBody(u);
  if(c.rushEnd!==undefined){u.hp=1;continue;}
  if((c.barrierEnd??0)<=w.time)c.barrier=0;
  if(c.stimEnd!==undefined&&w.time>=c.stimEnd){if(u.stimUntil===c.stimEnd&&c.paid){c.refund=c.paid*value(w,'BIO-G08',.3,.45,.6);c.refundEnd=w.time+4;}c.stimEnd=c.paid=undefined;}
  if(c.refund&&c.refundEnd!==undefined){
   const elapsed=Math.max(0,Math.min(w.time,c.refundEnd)-Math.max(w.time-dt,c.refundEnd-4));
   bioHeal(w,u,c.refund*elapsed/4);
   if(w.time>=c.refundEnd){c.refund=undefined;c.refundEnd=undefined;}
  }
  if((c.moltEnd??0)>w.time)bioHeal(w,u,u.maxHp*value(w,'BIO-P06',.06,.08,.1)*heroPower(u)*dt/3);
  if(level(w,'BIO-P03'))u.hp=Math.max(1,u.hp-u.maxHp*value(w,'BIO-P03',.01,.0125,.015)*dt);
  if(level(w,'BIO-W03'))bioHeal(w,u,u.maxHp*dt*value(w,'BIO-W03',.0025,.0045,.0065)*heroPower(u)*(w.time-(c.lastCombat??u.bornAt)>=4?2:1));
  if(level(w,'BIO-B06')&&(!c.low&&u.hp<=u.maxHp*.4||c.low&&u.hp>=u.maxHp*.5)){c.low=!c.low;w.refreshStats(u);}
  if(level(w,'BIO-P02')){
   const owner=growthOwner(w,u);
   if(owner&&(owner===u||owner.hp<=0)){
    const growth=bioBody(owner),partner=w.entities.get(growth.twin??-1);
    const last=Math.max(growth.lastCombat??-Infinity,partner?.bio?.lastCombat??-Infinity);
    if(w.time-last<=3&&(growth.survival??0)<10){
     growth.surviveTime=(growth.surviveTime??0)+dt;
     if(growth.surviveTime>=20){growth.surviveTime-=20;growth.survival=(growth.survival??0)+1;w.visual('bio-response',u,u,undefined,undefined,{bioResponse:'grow'});if(owner.hp>0)w.refreshStats(owner);}
    }
   }
  }
  if(c.focus!==undefined&&w.time-(c.lastRound??0)>=3){c.focus=undefined;if(level(w,'BIO-W05'))w.refreshStats(u);}else if(level(w,'BIO-W05')&&c.focus!==undefined&&w.tick%30===0)w.refreshStats(u);
  if(c.shareEnd&&c.shareEnd<=w.time){c.shareEnd=undefined;w.refreshStats(u);}
 }
 tickBioFields(w);
}

/** Integrate the strongest same-source field in one damage interval, including fractional tails. */
function fieldBudget(fields:BioField[],from:number,to:number,power:boolean){
 const points=[...new Set([from,to,...fields.flatMap(f=>[Math.max(from,f.start!),Math.min(to,f.end)])])].filter(t=>t>=from&&t<=to).sort((a,b)=>a-b);
 let total=0;
 for(let i=1;i<points.length;i++){
  const start=points[i-1],end=points[i],middle=(start+end)/2;
  const active=fields.filter(f=>f.start!<=middle&&f.end>middle);
  if(active.length)total+=(end-start)*(power?Math.max(...active.map(f=>f.power)):1);
 }
 return total;
}
function tickBioFields(w:World){
 const state=w.expedition.bio!;if(!state.fields?.length)return;
 const finished=new Set<BioField>(),groups=new Map<number,BioField[]>(),heals=new Map<number,{fraction:number;source:number}>();
 for(const f of state.fields){
  if(f.kind==='residue'){
   if(f.end<=w.time){finished.add(f);continue;}
   const u=w.allies().filter(a=>bioEligible(w,a)&&hurt(a)&&near(a,f,4)).sort((a,b)=>Math.hypot(a.x-f.x,a.z-f.z)-Math.hypot(b.x-f.x,b.z-f.z)||a.id-b.id)[0];
   if(u){bioHeal(w,u,u.maxHp*f.power*heroPower(u),f.source);w.visual('skill-heal',u);finished.add(f);}continue;
  }
  f.start??=f.next-1;const group=groups.get(f.source)??[];group.push(f);groups.set(f.source,group);
 }
 for(const [source,initial] of groups){
  let fields=initial;
  while(fields.length){
   const next=Math.min(...fields.map(f=>f.next)),last=Math.max(...fields.map(f=>f.end)),until=Math.min(next,last),from=next-1;
   if(until>w.time+1e-7)break;
   const src=w.entities.get(source);
   for(const e of w.entities.values())if(e.owner==='zerg'&&e.hp>0&&!e.flying){
    const power=fieldBudget(fields.filter(f=>near(e,f,f.radius)),from,until,true);if(power<=0)continue;
    const hp=e.hp;w.hitOverTime(e,power,[],1,'terran',0,0,source);if(src)bioLeech(w,src,hp-e.hp,true);
   }
   if(level(w,'BIO-N08')){
    const patients=new Map<number,BioField[]>();
    for(const f of fields)for(const u of injured(w,f,f.radius).slice(0,4)){const list=patients.get(u.id)??[];list.push(f);patients.set(u.id,list);}
    for(const [id,list] of patients){const fraction=fieldBudget(list,from,until,false);if(fraction>(heals.get(id)?.fraction??0))heals.set(id,{fraction,source});}
   }
   for(const f of fields){f.next=next+1;if(f.end<=until+1e-7)finished.add(f);}
   fields=fields.filter(f=>!finished.has(f));
  }
 }
 for(const [id,{fraction,source}] of heals){const u=w.entities.get(id);if(u&&(u.bio?.cloudHealAt??-1)<=w.time){if(bioHeal(w,u,.006*u.maxHp*fraction,source)>0)w.visual('bio-response',u,u,undefined,undefined,{bioResponse:'recover'});bioBody(u).cloudHealAt=w.time+1;}}
 state.fields=state.fields.filter(f=>!finished.has(f));
}
