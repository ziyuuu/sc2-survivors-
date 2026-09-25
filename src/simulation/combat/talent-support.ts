import type {World} from '../world';
import type {Entity,Point} from '../types';

export interface TalentSupportImpact {id:number;race:'terran'|'zerg'|'protoss';at:number;point:Point;direction:Point;packet:0|1;}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);

function attackCandidates(w:World){return [...w.entities.values()].filter(unit=>unit.owner==='zerg'&&unit.hp>0&&!unit.flying&&distance(unit,w.anchor)<=14&&w.visibleTo(unit,'terran')).sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor)||a.id-b.id);}
function healCandidates(w:World,race:'terran'|'zerg'|'protoss'){
 return w.allies().filter(unit=>unit.hp>0&&!unit.temporary&&!unit.summonKind&&!(unit.lastStandUntil&&unit.lastStandUntil>w.time)&&(
  race==='protoss'?(unit.maxShield??0)>(unit.shield??0):unit.hp<unit.maxHp&&(race==='terran'?unit.attributes.includes('Biological')||unit.attributes.includes('Mechanical'):unit.attributes.includes('Biological'))
 )).sort((a,b)=>{const ratio=(unit:Entity)=>race==='protoss'?(unit.shield??0)/Math.max(1,unit.maxShield??0):unit.hp/unit.maxHp;return ratio(a)-ratio(b)||a.id-b.id;});
}
function scheduleRound(w:World,rank:number){const race=w.expedition.race,targets=attackCandidates(w);
 for(const target of targets.slice(0,rank)){
  const dx=target.x-w.anchor.x,dz=target.z-w.anchor.z,length=Math.max(.001,Math.hypot(dx,dz)),direction={x:dx/length,z:dz/length},point={x:target.x,z:target.z};
  w.talentSupportImpacts.push({id:w.nextId++,race,at:w.time+(race==='zerg'?.75:race==='protoss'?.35:.35),point,direction,packet:0});
  if(race==='protoss')w.talentSupportImpacts.push({id:w.nextId++,race,at:w.time+.45,point,direction,packet:1});
 }
 for(const patient of healCandidates(w,race).slice(0,rank)){
  if(race==='protoss')patient.shield=Math.min(patient.maxShield??0,(patient.shield??0)+63);
  else {const amount=race==='terran'&&!patient.attributes.includes('Biological')?21:63;patient.hp=Math.min(patient.maxHp,patient.hp+amount);}
  w.visual('hit',patient);w.stats.healed++;
 }
}
function resolveImpact(w:World,impact:TalentSupportImpact){const targets=[...w.entities.values()].filter(unit=>unit.owner==='zerg'&&unit.hp>0&&!unit.flying);
 for(const target of targets){const dx=target.x-impact.point.x,dz=target.z-impact.point.z,d=Math.hypot(dx,dz),radius=target.unitRadius;
  if(impact.race==='terran'){
   if(d>1.25+radius)continue;const fraction=d<=.4+radius?1:d<=.8+radius?.5:.25;
   w.hit(target,(125+(target.attributes.includes('Armored')?93.75:0))*fraction,[],1,'terran',0,0);w.effect('explosion',target,target,1.25,.22);
  }else if(impact.race==='zerg'){
   if(d>1.5+radius)continue;w.hit(target,187.5,[],1,'terran',0,0);w.visual('bile-impact',target);
  }else {
   const along=dx*impact.direction.x+dz*impact.direction.z,across=Math.abs(dx*impact.direction.z-dz*impact.direction.x);
   if(along< -2-radius||along>4+radius||across>.6+radius)continue;w.hit(target,62.5,[],1,'terran',0,0);w.effect('shot',target,target,.2,.12);
  }
 }
}
/** One fixed-step authority for A13; state and delayed impacts live in the run snapshot. */
export function tickTalentSupport(w:World){const rank=w.talent('tank_support');if(rank<=0)return;
 if(w.time+1e-8>=w.nextTankSupportAt){w.supportUntil=w.time+8;w.nextSupportTick=w.time;w.nextTankSupportAt=w.time+[Infinity,90,60,45][rank];w.announce((w.expedition.race==='terran'?'坦克与医疗艇':w.expedition.race==='zerg'?'胆汁与哺育':'热能与护盾')+'支援 · 8 秒');}
 while(w.nextSupportTick<w.supportUntil-1e-8&&w.time+1e-8>=w.nextSupportTick){scheduleRound(w,rank);w.nextSupportTick+=1;}
 const due=w.talentSupportImpacts.filter(impact=>impact.at<=w.time+1e-8).sort((a,b)=>a.at-b.at||a.id-b.id);if(!due.length)return;
 w.talentSupportImpacts=w.talentSupportImpacts.filter(impact=>impact.at>w.time+1e-8);for(const impact of due)resolveImpact(w,impact);
}
