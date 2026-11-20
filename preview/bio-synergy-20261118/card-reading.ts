import type {BioId} from '../../src/data/terran-bio';
import type {World} from '../../src/simulation/world';
import {bioFormal} from '../../src/simulation/combat/bio-state';

export function cardReading(w:World,id:BioId){
 const allies=w.allies(),lead=allies.find(bioFormal);
 const foes=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0);
 const fields=w.expedition.bio?.fields??[],state=lead?.bio;
 const highest=(values:number[])=>Math.max(0,...values);
 const remaining=(until=0)=>Math.max(0,until-w.time).toFixed(1)+' 秒';
 const companions=allies.filter(u=>u.bio?.role);
 switch(id){
  case 'BIO-W01':case 'BIO-G05':case 'BIO-B01':case 'BIO-B03':case 'BIO-N03':case 'BIO-N07':{
   const find=({ 'BIO-W01':'hound','BIO-G05':'twin','BIO-B01':'hatchling','BIO-B03':'cocoon','BIO-N03':'hound','BIO-N07':'cocoon' } as const)[id];
   const name=({hound:'猎犬',twin:'双生副体',hatchling:'小爆虫',cocoon:'虫茧'})[find];
   const members=companions.filter(u=>u.bio?.role===find),app=w.expedition.bio?.appointments?.[0];
   return name+' '+members.length+(members[0]?' · 生命 '+Math.ceil(members[0].hp)+' / '+Math.ceil(members[0].maxHp):'')+(app?' · 复生倒计时 '+remaining(app.at):'');
  }
  case 'BIO-W02':case 'BIO-W08':case 'BIO-G09':case 'BIO-P05':{
   const toxins=foes.flatMap(u=>u.bio?.poisons??[]);
   return '中毒目标 '+foes.filter(u=>u.bio?.poisons?.length).length+' · 最长余时 '+remaining(highest(toxins.map(p=>p.end)));
  }
  case 'BIO-W06':return lead?'移动速度 '+lead.moveSpeed.toFixed(2):'';
  case 'BIO-W07':return lead?'射程 '+lead.attackRange.toFixed(2)+' 码':'';
  case 'BIO-W04':case 'BIO-G08':return '兴奋剂余时 '+remaining(lead?.stimUntil)+' · 本次付血 '+Math.round(state?.paid??0);
  case 'BIO-W05':case 'BIO-B06':return lead?'射击周期 '+lead.attackPeriod.toFixed(2)+' 秒 · 武器伤害 '+lead.weaponDamage.toFixed(1):'';
  case 'BIO-W09':return '凝血余时 '+remaining(state?.clotEnd);
  case 'BIO-G03':return '体型 ×'+(state?.scale??1).toFixed(2);
  case 'BIO-G04':return '扫描余时 '+remaining(highest(w.expedition.detectionFields.map(f=>f.until)));
  case 'BIO-G07':return '减速目标 '+foes.filter(e=>(e.moveSlowUntil??0)>w.time).length;
  case 'BIO-B04':case 'BIO-N08':return '黄色毒雾 '+fields.filter(f=>f.kind==='cloud').length+' · 最长余时 '+remaining(highest(fields.filter(f=>f.kind==='cloud').map(f=>f.end)));
  case 'BIO-B05':return '在场王虫 '+companions.filter(u=>u.bio?.role==='overlord').length;
  case 'BIO-B08':return '在场护膜 '+Math.ceil(allies.reduce((n,u)=>n+(u.bio?.barrier??0),0));
  case 'BIO-B09':return '最高腐蚀 '+highest(foes.map(e=>e.bio?.armorLayers?.filter(a=>a.end>w.time).length??0))+' 层';
  case 'BIO-P02':case 'BIO-N01':return '生存成长 '+(state?.survival??0)+' 层 · 击杀成长 '+(state?.kills??0)+' 层';
  case 'BIO-P06':return '蜕壳余时 '+remaining(state?.moltEnd);
  case 'BIO-N04':return '最高灾疫 '+highest(foes.map(e=>e.bio?.plague?.length??0))+' 层';
  case 'BIO-N09':return '共享余时 '+remaining(highest(allies.map(a=>a.bio?.shareEnd??0)));
  case 'BIO-O03':return '正式本体 '+allies.filter(bioFormal).length+' · 最高军衔 '+highest(allies.filter(bioFormal).map(u=>u.rank))+' · 双生副体 '+companions.filter(u=>u.bio?.role==='twin').length;
  default:return '';
 }
}
