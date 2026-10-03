import type {World} from '../../simulation/world';
import {icon} from '../../assets/manifest';
import {hudGlyph} from './glyphs';

/** Final-stage objectives are read-only views of the existing victory receipts. */
export function finalObjectives(w:World){
 if(w.endless||w.stage!==18)return '';
 const boss=w.campaign18Runtime?.finalBossId?w.entities.get(w.campaign18Runtime.finalBossId):undefined;
 const goals=[
  {id:'hive',name:'摧毁主巢',image:hudGlyph('hive'),complete:!!w.hive&&w.hive.hp<=0,value:w.hive?Math.max(0,w.hive.hp)/Math.max(1,w.hive.maxHp):1},
  {id:'boss',name:'击杀雷兽首领',image:icon('unit.ultralisk',''),complete:!!w.campaign18Runtime?.finalBossKilled,value:boss?Math.max(0,boss.hp)/Math.max(1,boss.maxHp):1},
  {id:'survive',name:'存活至撤离',image:hudGlyph('survive'),complete:w.stageElapsed+1e-8>=w.duration,value:Math.min(1,w.stageElapsed/Math.max(1,w.duration))},
 ];
 return `<div class="mission-objectives" role="group" aria-label="终关撤离目标">${goals.map(g=>`<span class="objective ${g.complete?'complete':''}" data-objective="${g.id}" role="img" title="${g.name}${g.complete?' · 已完成':''}" aria-label="${g.name} · ${g.complete?'已完成':'未完成'}">${g.image}${g.complete?'<b aria-hidden="true">✓</b>':''}<i class="goal-bar" aria-hidden="true"><i style="width:${g.complete?100:Math.round(g.value*100)}%"></i></i></span>`).join('')}</div>`;
}
