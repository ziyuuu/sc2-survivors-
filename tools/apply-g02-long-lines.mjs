import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const edits={
 'src/simulation/combat/expedition-combat.ts':[['1+teamCardEffects(w.expedition).damage+compositeHeroBuff(w,u).damage','1+teamCardEffects(w.expedition).damage+uniqueActiveStats(w,u).damage+compositeHeroBuff(w,u).damage'],['1+team.damage+aura.damage','1+team.damage+uniqueActiveStats(w,u).damage+aura.damage']],
 'src/simulation/combat/expedition-heroes.ts':[['1+team.damage+aura.damage','1+team.damage+uniqueActiveStats(w,u).damage+aura.damage']],
 'src/simulation/combat/carriers.ts':[['card=team.damage+aura.damage','card=team.damage+uniqueActiveStats(w,u).damage+aura.damage']],
 'src/ui/presentation/intermission.ts':[["import {UNIQUE_SUPPORT} from '../../data/unique-support';","import {UNIQUE_SUPPORT} from '../../data/unique-support';\nimport {STRATEGIC_BASE_DAMAGE} from '../../data/shop-support';"],["copy:'每 20 / 15 / 10 秒轰炸可见敌军，最多三层；预警 0.75 秒，伤害 180，半径 2.5。'","copy:'首次购入3秒后就绪，此后每 20 / 15 / 10 秒轰炸可见敌军，最多三层；预警 0.75 秒，基础伤害 180，半径 2.5。'"],["copy:'获得一枚战略打击弹药。指定落点，3 秒后造成 3000 伤害，半径 8。'","copy:`获得一枚战略打击弹药。指定落点，3 秒后造成 ${STRATEGIC_BASE_DAMAGE} 基础伤害，半径 8；伤害随全局舰装成长。`"]],
 'src/ui/intermission-skin/presentation.ts':[["'terran.overdrive':'主动提高射速与移动速度'","'terran.overdrive':'主动提高武器伤害、射速与移动速度'"]],
};
for(const [file,changes] of Object.entries(edits)){let s=await fs.readFile(file,'utf8');for(const [from,to] of changes){assert.equal(s.split(from).length-1,1,file+': '+from);s=s.replace(from,to);}await fs.writeFile(file,s);}
console.log(JSON.stringify({files:Object.keys(edits)}));
