import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',root=base+'/actions-r22-r4',report=JSON.parse(await fs.readFile(root+'/report.json','utf8')),prior=JSON.parse(await fs.readFile(base+'/actions-r21-r2/visual-review.json','utf8'));
const observations=[
 [1,'enemy:boss:lurker:form:lurker:skill','36帧全部已看。身体与目标在全部采样中完整在画面内，1.25秒出土命中，6秒再次埋地，14秒再次出土，16秒仍完整；地刺漏效保持原记录。'],
 [2,'enemy:boss:lurker:mode:lurker_burrowed','38帧全部已看。0至0.2秒完整地表身体，0.3秒完成埋地，随后到4秒完整可辨，不再被HUD遮挡。'],
 [3,'enemy:boss:corruptor:skill','36帧全部已看。准备帧偏小观察保持；0.05秒后正常身体，1.55秒地面酸液，2.5秒及3.25秒等后续脉冲，4至5秒渐退，6至16秒无残留。身体包括10与12秒均完整在画面内。'],
 [4,'enemy:lord:queen:skill','36帧全部已看。完整身体和病人持续在画面中，10秒与16秒均完整；旧包治疗漏效保留，修复另见R23。'],
 [5,'enemy:lord:queen:auto-ability','36帧全部已看。0.5至1.7秒橙红输血，2秒少量尾部、2.5秒消失；身体包括10与16秒均完整。'],
 [6,'enemy:lord:queen:trait:regen:skill','36帧全部已看。身体10秒靠近HUD但完整，16秒完整；旧包治疗漏效保留，修复另见R23。'],
 [7,'enemy:lord:queen:trait:regen:auto-ability','36帧全部已看。0.5至1.7秒输血，2秒余尾、2.5秒消失；10秒接近HUD但身体完整，16秒完整。'],
 [8,'enemy:lord:lurker:form:lurker:skill','36帧全部已看。0.05秒埋地，1.25秒出土，6秒埋地、14秒出土，至16秒身体完整；地刺漏效保持旧包记录。'],
 [9,'enemy:lord:lurker:mode:lurker_burrowed','38帧全部已看。0至0.2秒完整地表形态，0.3秒埋地，至4秒身体完整无HUD遮挡。'],
 [10,'enemy:lord:lurker:trait:carapace:form:lurker:skill','36帧全部已看。0.05秒埋地、1.25秒出土，6秒再埋地、14秒出土，至16秒完整；地刺漏效保持旧包记录。'],
 [11,'enemy:lord:lurker:trait:carapace:mode:lurker_burrowed','38帧全部已看。0至0.2秒完整地表形态，0.3秒埋地，至4秒完整，无遮挡。'],
 [12,'enemy:lord:lurker:trait:regen:mode:lurker_burrowed','38帧全部已看。0至0.2秒地表形态、0.3秒埋地，至4秒完整，无HUD遮挡。'],
 [13,'enemy:lord:mutalisk:aura','32帧全部已看，另核对2秒与2.55秒原始全视口图。飞龙部分翅膀仍在视口顶部被切，取景问题未解决；3秒受益单位移出，8秒身体完整。未见独立光环。',false],
 [14,'enemy:lord:mutalisk:trait:carapace:aura','32帧全部已看。3秒受益单位移出，8秒飞龙靠近顶部但完整，持续扇翅无独立光环；准备帧偏小观察保留。'],
 [15,'enemy:lord:mutalisk:trait:regen:aura','32帧全部已看。3秒受益单位移出，6与8秒身体完整，无独立光环；准备帧偏小观察保留。'],
 [16,'enemy:lord:corruptor:skill','36帧全部已看。1.55秒地面酸液，2.5/3.25秒等脉冲，4至5秒渐退、6秒消失；10与12秒身体完整，至16秒无残留。'],
 [17,'enemy:lord:corruptor:aura','32帧全部已看。3秒受益单位移出，8秒完整身体，未见独立光环；准备帧偏小观察保持。'],
 [18,'enemy:lord:corruptor:trait:carapace:skill','36帧全部已看。1.55秒酸液、后续多轮脉冲、5秒尾部、6秒消失；10与12秒完整，至16秒无残留。'],
 [19,'enemy:lord:corruptor:trait:regen:skill','36帧全部已看。1.55秒地面酸液，2.5/3.25秒等脉冲，5秒余尾、6秒消失，10至16秒身体完整，无残留。'],
 [20,'enemy:lord:ultralisk:aura','32帧全部已看。3秒受益单位移出，8秒巨兽身体接近右侧HUD边缘，完整形态可辨；未见独立光环。'],
 [21,'enemy:lord:ultralisk:trait:carapace:aura','32帧全部已看。3秒受益单位移出，6与8秒身体完整，无独立光环。'],
 [22,'enemy:lord:ultralisk:trait:regen:aura','32帧全部已看，另查8秒原始全视口图。3秒受益单位移出，无独立光环；8秒巨兽下部仍被HUD遮挡，取景未解决。',false],
 [23,'enemy:lord:zergling:trait:regen:aura','32帧全部已看。3秒受益单位移出，6与8秒身体完整，8秒接近底部HUD；无独立光环。'],
 [24,'enemy:lord:roach:trait:regen:aura','32帧全部已看。3秒受益单位移出，至8秒身体完整可见，无独立光环。'],
 [25,'enemy:lord:hydralisk:trait:regen:aura','32帧全部已看。3秒受益单位移出，至8秒身体完整，无独立光环。'],
 [26,'enemy:lord:ravager:aura','32帧全部已看。准备帧模型小，0.05秒恢复；3秒受益单位移出，8秒接近HUD边缘，完整形态可辨，无独立光环。'],
 [27,'enemy:lord:ravager:trait:carapace:aura','32帧全部已看。准备帧模型小，0.05秒恢复；3秒受益单位移出，至8秒身体完整，无独立光环。'],
 [28,'enemy:lord:ravager:trait:regen:aura','32帧全部已看。准备帧模型小，0.05秒恢复；3秒受益单位移出，8秒身体接近HUD上沿，完整形态可辨，无独立光环。'],
];
const review={date:new Date().toISOString(),scope:'Camera-only supplement using the same frozen R21 production bundle. Every listed image was visually inspected. Effect issues remain separate.',rows:[]};
for(const [n,id,observation,resolved=true] of observations){const row=report.rows[n-1];assert.equal(row.id,id);assert.equal(row.status,'cycle-captured');const file=root+'/review-focus/'+row.directory+'.jpg';const old=prior.rows.find(r=>r.id===id);assert.ok(old.issues.includes('T01-FIXTURE-FRAMING'));
 review.rows.push({id,status:'reviewed',images:[{file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')}],observation,issues:old.issues.filter(i=>!resolved||i!=='T01-FIXTURE-FRAMING'),resolvedIssues:resolved?['T01-FIXTURE-FRAMING']:[],baseline:base+'/actions-r21-r2/visual-review.json'});
}
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2));console.log(JSON.stringify({reviewed:review.rows.length}));
