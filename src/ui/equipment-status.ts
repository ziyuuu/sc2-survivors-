import type {World} from '../simulation/world';
import type {Entity} from '../simulation/types';
import {equipmentControlBoost} from '../simulation/starship/controls';
import {permanentEquipmentBody} from '../simulation/starship/eligibility';
import {activeEquipmentEffects,equipmentValue} from '../simulation/starship/modules';
import {equipmentParsedTarget} from '../simulation/starship/combat';

/** Existing inspector/status surfaces consume current rules, never a UI timer. */
export function equipmentStatus(w:World,u:Entity):string[]{
 if(!w.starship.enabled||u.hp<=0)return [];
 const s=w.starship,shown:string[]=[],timed=(name:string,until:number|undefined)=>{if(until!==undefined&&until>w.time)shown.push(`${name} ${Math.ceil(until-w.time)}s`);};
 const projection=s.projections.get(u.id);if(projection)timed({phantom:'幻影',phase:'相位投影',recall:'召回残像'}[projection.kind],projection.until);
 if(equipmentControlBoost(w,u))timed('康斯坦威强化',s.numbers.get('konstant-until'));
 if(permanentEquipmentBody(w,u)){timed('相位移动',s.numbers.get('dominance-phase'));timed('到位火力',s.numbers.get('dominance-fire'));}
 timed('绝境',s.numbers.get('rage-until:'+u.id));timed('轻装突击',s.numbers.get('assault-until:'+u.id));timed('技能封锁',s.hero.seals.get(u.id));timed('吞噬强化',s.hero.devour.get(u.id)?.until);
 const carrier=s.hero.carriers.get(u.summonOwnerId??u.id);if(carrier)timed('截击机过载',carrier.until);
 const barrier=(s.barriers.get(u.id)??[]).filter(b=>b.amount>0&&b.until>w.time).reduce((n,b)=>n+b.amount,0);if(barrier)shown.push('装备护障 '+Math.ceil(barrier));
 if(s.hero.veilReady.has(u.id))shown.push('影袭就绪');if(s.combat.precision.get(u.id)?.ready)shown.push('精准打击就绪');if(s.combat.movement.get(u.id)?.assaultReady)shown.push('轻装突击就绪');
 if(s.numbers.has('bounty-mark:'+u.id))shown.push('悬赏目标');if(s.captured.has(u.id))shown.push('已捕获');
 if(s.combat.weakness.has(u.id)&&equipmentParsedTarget(w,u))shown.push('弱点已解析');
 if(permanentEquipmentBody(w,u)){
  const hold=equipmentValue(w,'hold');if(hold&&w.time-(s.numbers.get('last-command')??0)>=hold)shown.push('坚守火力');
  if(equipmentValue(w,'adrenaline'))shown.push(u.hp/u.maxHp<.5?'肾上腺素 · 高速':'肾上腺素 · 稳态');
  const growth=s.numbers.get('devour-growth')??0;if(growth)shown.push(`吞星成长 ${Math.round(growth*100)}%`);
  for(const e of activeEquipmentEffects(w)){
   if(e.key==='hero_growth'&&e.binding?.hero===u.heroId){const gains=s.numbers.get(e.source+':hero-gains')??0;shown.push(`军衔培养 ${s.numbers.get(e.source+':hero-points')??0}/${e.values[0]+e.values[1]*gains}`);}
   if(e.key==='reactor')shown.push(`反应堆库存 ${s.numbers.get('reactor-stock')??0}/${e.values[1]}`);
   if(e.key==='manual_reset'){const remaining=Math.max(0,(s.numbers.get('manual-reset-ready')??0)-w.time);shown.push(remaining?`装备重置冷却 ${Math.ceil(remaining)}s`:'装备重置就绪');}
  }
 }
 return shown;
}
