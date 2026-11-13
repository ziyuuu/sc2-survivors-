import {armedTargetAllowed} from './armed-targets';
import {armedControl} from './armed-nodes';
import {ARMED_CARD_BY_ID as C} from '../../data/terran-armed-support';
import {armedRank,type ArmedId} from '../progression/build-progress';
import {hitFrom,observeRecovery} from '../observation';
import {equipmentCardDamage} from '../starship/card-effects';
import type {ArmedField} from './armed-support-state';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';

type FieldCard=ArmedField['cardId'];
export const armedFieldCard=(id:string):id is FieldCard=>['W06','W08','W09','G04','G09','B02','P03'].includes(id);
const gap=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const enemies=(w:World)=>[...w.entities.values()].filter(u=>armedTargetAllowed(w,u)&&w.visibleTo(u,'terran')).sort((a,b)=>gap(a,w.anchor)-gap(b,w.anchor)||a.id-b.id);
const allies=(w:World)=>w.allies().filter(u=>!u.summonKind&&!u.fun&&!u.encounter&&!u.mission);
const injured=(a:Body,b:Body)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id;
export function armedItemModifiers(w:World){const a=w.expedition.support.armed!,enhanced=armedRank(w.expedition.support,'N04')>0,reserve=enhanced&&(a.nodeReserves.N04??0)>0;return {enhanced,radius:reserve?C.N04.params.reserveRadius:1,commit(){if(reserve)a.nodeReserves.N04!--;}};}
/** All fallible targeting precedes the caller's CD/cast receipt. */
export function prepareArmedField(w:World,id:FieldCard,stageKey:string):ArmedField[]|null{
 const a=w.expedition.support.armed!,rank=armedRank(w.expedition.support,id),item=armedItemModifiers(w),foes=enemies(w),target=foes[0];
 if(a.fields?.some(f=>f.cardId===id&&w.tick<f.endTick)&&(id==='G09'||id==='B02'))return null;
 const make=(point:Point,active:number,life:number,radius:number,damage=0):ArmedField=>({id:0,cardId:id,stageKey,point:{x:point.x,z:point.z},createdTick:w.tick,activeTick:w.tick+active,endTick:w.tick+active+life,nextTick:w.tick+active,radius,damage,rank});
 let result:ArmedField[];
 if(id==='W06'){const p=C.W06.params;
  const patients=allies(w).filter(u=>u.attributes.includes('Biological')&&u.hp<u.maxHp&&gap(u,w.anchor)<=p.search);
  if(!patients.length)return null;const point=patients.sort((a,b)=>patients.filter(u=>gap(u,b)<=p.radius*item.radius).length-patients.filter(u=>gap(u,a)<=p.radius*item.radius).length||injured(a,b))[0];
  result=[{...make(point,p.open,45,p.radius*item.radius),count:item.enhanced?C.N04.params.healCount:p.count}];
 }else if(id==='G09'){const p=C.G09.params;
  const patients:Body[]=[...allies(w).filter(u=>u.attributes.includes('Mechanical')),...[...w.fortifications.values()].filter(f=>f.supportUntil&&f.supportUntil>w.time)].filter(u=>u.hp>0&&u.hp<u.maxHp&&gap(u,w.anchor)<=p.range).sort(injured);
  if(!patients.length)return null;const t=patients[0];result=[{...make(t,Math.ceil(p.arrive*60),p.interval*p.ticks*60+1,0),target:{id:t.id,generation:'bornAt'in t?Number(t.bornAt):-1},ticksLeft:p.ticks,nextTick:w.tick+Math.ceil((p.arrive+p.interval)*60)}];
 }else if(id==='W09'){const p=C.W09.params;
  if(!target){a.rear=undefined;return null;}const old=a.rear;
  if(!old){a.rear={point:{x:w.anchor.x,z:w.anchor.z},threat:{x:target.x,z:target.z}};return null;}
  const dx=w.anchor.x-old.point.x,dz=w.anchor.z-old.point.z,d=gap(w.anchor,old.point),tx=old.threat.x-old.point.x,tz=old.threat.z-old.point.z;
  if(d<p.move||-(dx*tx+dz*tz)/Math.max(.001,Math.hypot(tx,tz))<p.move)return null;result=[make(old.point,p.delay,1,p.radius,equipmentCardDamage(w,p.damage[rank-1]))];a.rear=undefined;
 }else{
  if(!target&&id!=='W08')return null;const point=target??w.anchor;
  if(id==='W08'){const p=C.W08.params;result=[make(point,p.arrive,p.lifetime*60,p.blast,equipmentCardDamage(w,p.damage[rank-1]))];}
  else if(id==='G04'){const p=C.G04.params;
   const dx=point.x-w.anchor.x,dz=point.z-w.anchor.z,length=Math.hypot(dx,dz)||1;
   result=[{...make(point,Math.ceil(p.full*60),p.lifetime*60,0,equipmentCardDamage(w,p.damage)),direction:{x:dx/length,z:dz/length},width:p.width,length:p.length,nextTick:w.tick+Math.ceil(p.full*60)+60}];
  }else if(id==='B02'){const p=C.B02.params;result=[{...make(point,Math.ceil(p.arrive*60),(item.enhanced?C.N04.params.root:p.duration)*60,(item.enhanced?C.N04.params.trapRadius:p.radius)*item.radius),rootTicks:(item.enhanced?C.N04.params.root:p.duration)*60,damage:p.damagePercent,nextTick:w.tick+Math.ceil(p.arrive*60)+p.interval*60}];}
  else {const p=C.P03.params;
   const cluster=foes.filter(u=>!u.flying).sort((a,b)=>foes.filter(u=>!u.flying&&gap(u,b)<=p.radius*2).length-foes.filter(u=>!u.flying&&gap(u,a)<=p.radius*2).length||b.weaponDamage/b.attackPeriod-a.weaponDamage/a.attackPeriod||a.id-b.id)[0];if(!cluster)return null;
   const picked=foes.filter(u=>!u.flying&&gap(u,cluster)<=p.radius*2).sort((a,b)=>gap(a,cluster)-gap(b,cluster)||a.id-b.id).slice(0,p.count);
   result=picked.map(t=>({...make(t,Math.ceil(p.oil*60),p.oilLife*60,p.radius,equipmentCardDamage(w,p.oilDamage)),target:{id:t.id,generation:t.bornAt},attachTick:w.tick+Math.ceil(p.attach*60),attachEndTick:w.tick+Math.ceil((p.attach+p.attachLife)*60),nextAttachTick:w.tick+Math.ceil(p.attach*60)+60,nextTick:w.tick+Math.ceil(p.oil*60)+60}));
  }
 }
 if(['W06','B02'].includes(id))item.commit();return result;
}
function inField(f:ArmedField,u:Body){if(!f.direction)return gap(f.point,u)<=f.radius+u.unitRadius;const dx=u.x-f.point.x,dz=u.z-f.point.z;return Math.abs(dx*f.direction.x+dz*f.direction.z)<=f.length!/2+u.unitRadius&&Math.abs(dx*f.direction.z-dz*f.direction.x)<=f.width!/2+u.unitRadius;}
function fieldBody(f:ArmedField):Body{return {id:f.id,...f.point,hp:1,maxHp:1,armor:0,unitRadius:f.radius,owner:'terran',race:'terran',flying:false,attributes:[]};}
/** Saved cursors are advanced before each recovery/hit; visuals never settle gameplay. */
export function tickArmedFields(w:World,stageKey:string){
 const a=w.expedition.support.armed!;if(!a.fields)return;
 const oilHits=new Set<string>();
 for(const f of a.fields){if(f.stageKey!==stageKey)continue;
  if(f.cardId==='P03'&&w.tick<=f.activeTick&&!f.captured){const t=w.entities.get(f.target!.id);if(t&&t.hp>0&&t.bornAt===f.target!.generation)f.point={x:t.x,z:t.z};if(w.tick===f.activeTick)f.captured=true;}
  if(f.cardId==='P03'&&f.attachTick!<=w.tick&&w.tick<=f.attachEndTick!){
   const u=w.entities.get(f.target!.id);
   if(u&&u.hp>0&&u.bornAt===f.target!.generation){
    if(w.tick<f.attachEndTick!){const s=a.unitStatus[u.id]??={};s.tarUntil=f.attachEndTick!;s.armorLoss={amount:C.P03.params.armorLoss,untilTick:f.attachEndTick!};}
    while(u.hp>0&&f.nextAttachTick!<=w.tick){f.nextAttachTick!+=60;hitFrom(w,'armed.P03',u,equipmentCardDamage(w,C.P03.params.attachDamage),[],1,'terran',0);}
   }
  }
  if(w.tick<f.activeTick||w.tick>f.endTick||w.tick===f.endTick&&!['G04','P03','B02'].includes(f.cardId))continue;
  if(f.cardId==='W06'){
   if(f.captured)continue;f.captured=true;const patients=allies(w).filter(u=>u.attributes.includes('Biological')&&u.hp<u.maxHp&&inField(f,u)).sort(injured).slice(0,f.count);
   for(const u of patients){const amount=Math.min(u.maxHp-u.hp,C.W06.params.heal[f.rank-1]);u.hp+=amount;w.stats.healed+=amount;observeRecovery(w,'armed.W06',u,amount);w.effect('heal',fieldBody(f),u,.4,.5);}w.visual('support-pulse',fieldBody(f),f.point,f.id);
  }else if(f.cardId==='G09'){
   const u=w.body(f.target!.id),generation=u&&'bornAt'in u?Number(u.bornAt):-1;
   if(!u||u.hp<=0||u.hp>=u.maxHp||generation!==f.target!.generation){f.endTick=w.tick;continue;}f.point={x:u.x,z:u.z};
   while(f.nextTick<=w.tick&&f.ticksLeft!>0){f.nextTick+=C.G09.params.interval*60;f.ticksLeft!--;const amount=Math.min(u.maxHp-u.hp,u.maxHp*C.G09.params.healFactor,C.G09.params.cap);u.hp+=amount;w.stats.healed+=amount;observeRecovery(w,'armed.G09',u,amount);w.effect('heal',fieldBody(f),u,.5,.6);}if(f.ticksLeft===0||u.hp>=u.maxHp)f.endTick=w.tick;
  }else if(f.cardId==='B02'){
   if(!f.captured){f.captured=true;armedControl(w,fieldBody(f),f.point,f.endTick);f.targets=enemies(w).filter(u=>inField(f,u)).map(u=>({id:u.id,generation:u.bornAt,point:{x:u.x,z:u.z}}));for(const t of f.targets){const s=a.unitStatus[t.id]??={};s.root={generation:t.generation,point:t.point,untilTick:f.endTick};}}
   while(f.nextTick<=w.tick&&f.nextTick<=f.endTick){f.nextTick+=C.B02.params.interval*60;for(const t of f.targets??[]){const u=w.entities.get(t.id);if(u?.hp&&u.bornAt===t.generation)hitFrom(w,'armed.B02',u,u.maxHp*f.damage,[],1,'terran',0);}}
  }else if(f.cardId==='W08'||f.cardId==='W09'){
   if(!f.captured){f.captured=true;for(const u of enemies(w))if((f.cardId==='W08'||!u.flying)&&inField(f,u))hitFrom(w,'armed.'+f.cardId,u,f.damage,[],1,'terran',0);w.visual('support-impact',fieldBody(f),f.point,f.id,undefined,{supportVisual:f.cardId==='W09'?'rear-blast':undefined,supportRadius:f.radius,supportSound:f.cardId==='W09'?'bombardTerran':'hero-missile'});}
  }else{
   for(const u of enemies(w))if(!u.flying&&inField(f,u)&&f.cardId==='G04'){const s=a.unitStatus[u.id]??={};s.oilUntil=w.tick+Math.ceil(C.G04.params.linger*60);}
   while(f.nextTick<=w.tick&&f.nextTick<=f.endTick){const tick=f.nextTick;f.nextTick+=60;for(const u of enemies(w))if(!u.flying&&inField(f,u)){const key=f.cardId+':'+u.id+':'+tick;if(oilHits.has(key))continue;oilHits.add(key);hitFrom(w,'armed.'+f.cardId,u,f.damage,[],1,'terran',0);}}
  }
 }
 a.fields=a.fields.filter(f=>f.stageKey===stageKey&&w.tick<f.endTick);
}
export function armedDetection(w:World,target:Body,owner:Body['owner']){return owner==='terran'&&!!w.expedition.support.armed?.fields?.some(f=>f.cardId==='W08'&&f.activeTick<=w.tick&&w.tick<f.endTick&&gap(f.point,target)<=C.W08.params.detect+target.unitRadius);}
export function armedRootPosition(w:World,u:Entity){const root=w.expedition.support.armed?.unitStatus[u.id]?.root;return root&&root.generation===u.bornAt&&w.tick<root.untilTick?root.point:undefined;}
export function armedDebuff(w:World,u:Body){const s=w.expedition.support.armed?.unitStatus[u.id],tar=(s?.tarUntil??0)>w.tick;return {armor:(s?.armorLoss?.untilTick??0)>w.tick?s!.armorLoss!.amount:0,move:tar?1-C.P03.params.slow:(s?.oilUntil??0)>w.tick?1-C.G04.params.slow:1,damage:tar?1-C.P03.params.weaponLoss:1};}
export function armedPounce(w:World,u:Entity,target:Body){if(u.armed?.cardId!=='G06'||target.hp<=0)return;const a=w.expedition.support.armed!,self=a.unitStatus[u.id]??={};if(self.pounced)return;self.pounced=true;const s=a.unitStatus[target.id]??={};if(!s.armorLoss||s.armorLoss.amount<=C.G06.params.armorLoss||s.armorLoss.untilTick<=w.tick)s.armorLoss={amount:C.G06.params.armorLoss,untilTick:w.tick+C.G06.params.debuff*60};}
export function grantArmedShield(w:World,u:Entity,source:'P04'|'O01',amount:number,untilTick:number){
 const status=w.expedition.support.armed!.unitStatus[u.id]??={};
 const shields=status.cardShields=status.cardShields?.filter(s=>s.untilTick>w.tick&&s.amount>0)??[];
 const old=shields.find(s=>s.source===source);
 if(old){old.amount=Math.max(old.amount,amount);old.untilTick=Math.max(old.untilTick,untilTick);}
 else shields.push({source,amount,untilTick});
 w.visual('barrier-start',u);
}
export function absorbArmedShield(w:World,u:Entity,amount:number){const s=w.expedition.support.armed?.unitStatus[u.id];if(!s?.cardShields)return amount;s.cardShields=s.cardShields.filter(s=>s.untilTick>w.tick&&s.amount>0).sort((a,b)=>a.untilTick-b.untilTick);for(const shield of s.cardShields){const used=Math.min(amount,shield.amount);shield.amount-=used;amount-=used;if(used>0)w.visual(shield.amount>0?'shield-hit':'shield-break',u,u,undefined,undefined,{shieldDamage:used,targetSurface:'shield'});if(amount<=0)break;}return amount;}
