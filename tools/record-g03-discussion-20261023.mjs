import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root='reports/local/g03-farm-minor-20261023';
const reportFile='reports/qa/g03-discussion-clarification-20261023.json';
const boardFile='docs/project/performance-board.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const count=xs=>xs.reduce((o,x)=>(o[x]=(o[x]??0)+1,o),{});
const summary=read(root+'/summary-live.json');
const board=read(boardFile);assert.equal(board.revision,138);
assert(!fs.existsSync(reportFile),'Do not overwrite the recorded discussion');
const sources=[];
const loadRoute=row=>{
 assert.equal(hash(row.file),row.sha256,'Raw route differs from completed report');
 sources.push({path:row.file,sha256:row.sha256});return read(row.file);
};
const farm=summary.rows.filter(r=>r.tier==='farm').map(r=>{
 const d=loadRoute(r);
 return {id:r.id,race:r.race,difficulty:r.difficulty,seed:r.seed,map:r.map,openingQuality:r.openingQuality,finalQuality:r.finalQuality,
  stop:r.stop,stage:r.stage,notice:r.notice,finalStageElapsed:d.final.stageElapsed,
  finalUnits:r.finalAllies.length,lateStageEnds:r.stageEnds.filter(s=>Number(s.stage.split(':').at(-1))>=15).map(s=>({stage:s.stage,units:s.units})),
  deathsByUnit:count(d.deathRows.map(x=>x.type)),deathEvents:r.deathEvents,
  heroes:r.heroes.map(h=>({id:h.id,rank:h.rank})),trainingCards:r.trainingCards,actualUnitRankIncreases:r.actualUnitRankIncreases,
  finalWallet:r.wallet,repairMinerals:r.repairMinerals,repairGas:r.repairGas,
  bodyDelivered:r.deliveries['body/released']??0,bodyLost:r.deliveries['body/lost']??0,
  deliveryLossReasons:r.deliveryLossReasonsByPurpose,remainingExpansionHives:d.final.expansionHives};
});
const minorRow=summary.rows.find(r=>r.id==='after-audited-zerg-hard-minor-529');
const minor=loadRoute(minorRow),byType=count(minor.deathRows.map(d=>d.type));
assert.equal(minor.deathRows.length,48);assert.equal(byType.zergling,3);
assert.equal(new Set(minor.deathRows.map(d=>d.id)).size,48);
const hellZerg=farm.find(r=>r.id==='after-audited-zerg-hell-farm-529');
assert.equal(hellZerg.deathEvents,29);assert.equal(hellZerg.deathsByUnit.zergling??0,0);
const rules='src/simulation/zerg-brood.ts';
const prior=read('reports/local/disk-cleanup-20261023/protected-before.json').find(x=>x.path.replaceAll('\\','/').endsWith('/'+rules));
assert(prior);assert.equal(hash(rules),prior.sha256,'Mechanism source changed since prior verified source');
const report={date:'2026-10-23',scope:'Read and reclassify existing raw routes and current verified mechanism; no new simulation, game edits, builds or gameplay acceptance.',
 decisions:{simpleBullethell:'用户决定暂不调整，现有规则保持；未新增人类体验验收。',bait:'用户决定不改变当前定位；不继续要求重新定位，未改价格或触发规则。',gearAcquisitionTime:'用户决定暂不讨论配装需要刷多久，理由是已有合成；本项退出当前讨论。',lateRunSpending:'指同一局后段与无尽使用矿气进行发展、培养、补兵、修理、英雄/精英及功能购买是否仍有实际作用。是检查方向，尚未证明存在必须调整的问题。'},
 farm,failedFarm:farm.filter(r=>r.stop==='lost'),
 zergMinor:{id:minorRow.id,deathEvents:48,uniqueDeadBodyIds:48,deathsByUnit:byType,zerglingDeathEvents:3,otherUnitDeathEvents:45,heroes:minor.final.heroes,
  lateStageEnds:minor.stages.filter(s=>s.phase==='reward'&&Number(s.stage.split(':').at(-1))>=16).map(s=>({stage:s.stage,units:s.allies.map(u=>({id:u.id,type:u.type,hero:u.hero}))})),
  conclusion:'48次仅3次跳虫、其余45次为其他兵种；第16/17关末只剩利维坦。不能主要归因跳虫双生复生，也不能将48次身体死亡直接等同48个永久损失编制。原始记录未完整保存每次死亡时的pairId/双生复生链，故不虚构完整编制永久损失数。'},
 zerglingMechanism:{file:rules,sha256:hash(rules),behavior:'同一双生编制另一只仍活时可延时补回死亡身体；两只均死且无其他预留机制时，普通双生不自行补回。身体死亡事件与永久编制损失应分开。'},
 assessment:'四条farm失败的直接终止条件为两条全灭、两条第18关限时目标未完成（终局均余2单位）。后期减员、交付损失与英雄/培养差异是可观察线索，尚未进行单因子因果重放，不足以让用户决定全局加数值或统一削难度。困难farm6蓝2紫、地狱farm6紫2橙为固定合法候选，允许局内成长；每族每档只有两个种子。',
 sources,boardRevisionBefore:138,boardRevisionAfter:139,gameChanged:false,newRuns:0};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
const g=board.tasks.find(t=>t.id==='G03');
g.steps=g.steps.map(s=>s
 .replace('简单弹幕的弹速、密度、通路与容错仍需单独评估。','简单弹幕按2026-10-23用户决定暂不调整，现规则保持；后续人类体验验证不冒称已完成。')
 .replace('简单弹幕的人类操作负担及容错取舍。','简单弹幕按2026-10-23用户决定暂不调整；撤下当前容错调整决策，人类体验验收保留。')
 .replace('诱饵有效价值、减少内容后的整局经济成长和最终平衡收口。','诱饵按2026-10-23用户决定保持当前定位；整局经济与最终平衡继续核验，不再要求用户重新选择诱饵定位。')
 .replace('工坊成本、目标配装成长时间、','工坊成本（配装获取耗时按2026-10-23用户决定暂不讨论）、'));
g.steps.push('2026-10-23讨论澄清：farm须先提供具体失败过程和可归因依据，不以5/6、3/6直接要求用户调平衡；虫族死亡须区分身体死亡、双生复生和永久编制损失。现有48次死亡仅3次跳虫、45次其他兵种；地狱虫族farm失败的29次中跳虫为0。');
g.steps.push('后期消费仅指同一局后段/无尽的矿气购买、培养、补兵、修理及功能选择是否有实际作用，目前没有已确认必须调整的缺陷；配装刷取耗时暂不讨论。');
const change='用户决定简单弹幕暂不调整、诱饵当前定位保持、配装获取耗时暂不讨论。复核原始记录：困难虫族小毕业529的48死亡中3跳虫、45其他兵种，关末独存利维坦；地狱虫族farm529的29死亡中跳虫0。farm四失败分为两全灭、两限时目标失败，先补可判断的原因依据，当前数值保持；只做现有证据复核，没有新游戏修改或运行。';
g.result=change+' '+g.result;g.updated='2026-10-23';g.evidence.push('../../'+reportFile);
board.revision=139;board.updated='2026-10-23';board.updates.push({date:'2026-10-23',tasks:['G03'],change,evidence:['../../'+reportFile]});
fs.writeFileSync(boardFile,JSON.stringify(board,null,2)+'\n');
execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'pipe'});
const entry=`## G03讨论收窄与虫族死亡口径核对 · 2026-10-23\n\n- 用户决定简单弹幕暂不调整、诱饵保持当前定位；配装获取耗时暂不讨论，理由为已有合成。保留现规则，没有改游戏数值、价格或概率；人类体验验收不因此自动完成。\n- farm需要具体失败过程和可归因依据，不能只给困难5/6、地狱3/6让用户决定调平衡。原四失败直接终止为两条全灭、两条第18关限时目标失败且各余2单位；交付、成长和目标执行仍未做因果隔离。\n- 复核原始死亡记录：困难虫族小毕业529的48次中，跳虫3、虫后14、破坏者9、刺蛇9、潜伏者7、蟑螂6，48个不同身体ID；第16/17关末均只剩利维坦。地狱虫族farm529的29次中跳虫0。不能主要归因跳虫复生；身体死亡次数不等于永久编制损失，原记录未完整保存双生复生链，不虚构该数。\n- “后期消费”仅指同一局后段/无尽的矿气购买、培养、补兵、修理与功能选择是否仍有效，是检查方向，尚无必须调整的已确认问题。看板139、62项状态保持；本次只复核旧证据并记录决定，无新路线/回归/构建/发布。证据reports/qa/g03-discussion-clarification-20261023.json。\n\n`;
fs.writeFileSync('AGENTS.md',entry+fs.readFileSync('AGENTS.md','utf8'));
for(const s of sources)assert.equal(hash(s.path),s.sha256);
assert.equal(hash(rules),prior.sha256);
const b=read(boardFile);assert.equal(b.revision,139);assert.equal(b.tasks.length,62);
console.log(JSON.stringify({report:reportFile,boardRevision:139,states:count(b.tasks.map(t=>t.status)),rawSourcesExact:sources.length,zergMinor:byType,newRuns:0}));
