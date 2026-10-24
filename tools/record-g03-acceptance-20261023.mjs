import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const evidenceDir = 'reports/local/g03-acceptance-20261023';
const note = 'G03_ACCEPTANCE_CLARIFICATION_20261023.md';
const boardPath = 'docs/project/performance-board.json';
const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
assert.equal(board.revision, 135, 'Apply this clarification once, from revision 135');
assert(!fs.existsSync(`${evidenceDir}/verification.json`));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const collect = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? collect(file) : [file];
});
const sourceBefore = Object.fromEntries([...collect('src'), ...collect('test')].map(file => [file, hash(file)]));
const frozen = [
  'docs/project/G03_GROWTH_CONSUMPTION_20261023.md',
  'docs/project/G03_TIER_BALANCE_20261023.md',
  'reports/qa/g03-growth-consumption-20261023.json',
  'reports/qa/g03-tier-balance-20261023.json',
];
const frozenBefore = Object.fromEntries(frozen.map(file => [file, hash(file)]));
const tasksBefore = board.tasks.map(t => ({ id: t.id, status: t.status }));
fs.mkdirSync(evidenceDir, { recursive: true });
fs.copyFileSync(boardPath, `${evidenceDir}/board-before.json`);

const task = board.tasks.find(t => t.id === 'G03');
assert.equal(task.status, '待讨论');
const oldStep = '分别定义正常入场配装与毕业配装：前者验证合理发展后进入无尽，后者验证平推18关；不可用同一个蓝绿配装样本替代两层验收。';
const stepIndex = task.steps.indexOf(oldStep);
assert(stepIndex >= 0);
task.steps[stepIndex] = '按最新用户口径区分开荒/farm/小毕业/毕业：开荒允许失败，farm应能打通18关进入无尽，小毕业与毕业应平推。高品质成长调整与消费补测已完成，不再以开荒失败作为本轮调整无效或继续加数值的理由。';
const historyIndex = task.steps.findIndex(s => s.startsWith('本批108条有限测量已归档'));
assert(historyIndex >= 0);
task.steps[historyIndex] = '历史108条有限测量已归档，开荒/farm/小毕业/毕业候选与不同版本策略分列。最新验收不再要求开荒必通；新版farm/小毕业尚未重测，不以毕业通关替代中间档，也不将旧版地狱farm失败直接判作新版失败。';
task.steps.push('后续种族平衡专项（星灵低配稳定性优先）：与本轮已完成的成长调整分开，先核实预算、产线、增援交付和控制策略，再同层级比较三族。简单星灵失败是局部疑点；新版地狱开荒星灵2/2、其余两族各0/2，尚不支持星灵全阶段整体更弱的结论。');
const acceptanceIndex = task.acceptance.findIndex(s => s.startsWith('正常入场装与毕业装分别验收'));
assert(acceptanceIndex >= 0);
task.acceptance[acceptanceIndex] = '最新用户验收口径：开荒失败正常；farm装备在合理操作、培养与消费下应打通战役进入无尽；小毕业/毕业应平推。不能要求开荒稳定通关，也不能只凭通关次数认定平推；品质不是最优配装证明。';
const tierIndex = task.acceptance.findIndex(s => s.startsWith('用户再次明确毕业依据基本最高掉落'));
assert(tierIndex >= 0);
task.acceptance[tierIndex] = '毕业品质依据基本最高掉落继续保留：简单全绿、普通全蓝；困难蓝绿开荒、全蓝加部分紫farm、大部分紫小毕业、最优解毕业；地狱类推。新版farm/小毕业证据缺口单列，不能拿开荒失败或毕业成功替代其验收。';
task.acceptance.push('阶段调整效果与后续种族平衡分开记录：保留已完成成长方案及毕业端正面验证，不以局部种族疑点否定整批调整，也不在缺少同层级证据时认定星灵整体弱势。');
const clarification = '最新口径：开荒允许失败，farm应能打通，小毕业/毕业应平推。本轮高品质成长调整与消费补测已完成，毕业端有正面验证，保留当前方案；不因开荒2/6否定本轮。新版farm/小毕业未复测，尚不能宣布全部分层验收完成。星灵低配稳定性作为后续种族平衡专项单列，现有地狱开荒星灵2/2、其余各0/2，不支持整体判弱。';
task.result = `${clarification} ${task.result.replace('简单弹幕容错、诱饵价值、开荒目标及最终G03仍开放', '简单弹幕容错、诱饵价值、新版farm/小毕业与后续种族专项及最终G03仍开放')}`;
task.evidence.push(note);
task.updated = '2026-10-23';
board.revision = 136;
board.updated = '2026-10-23';
board.updates.push({ date: '2026-10-23', tasks: ['G03'], change: `${clarification} 仅更新验收与后续分工，无新游戏改动或测试；62项及各状态保持。`, evidence: [note] });
fs.writeFileSync(boardPath, `${JSON.stringify(board, null, 2)}\n`);
execFileSync(process.execPath, ['tools/render-performance-board.mjs'], { stdio: 'pipe' });

const actual = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
assert.equal(actual.revision, 136);
assert.deepEqual(actual.tasks.map(t => ({ id: t.id, status: t.status })), tasksBefore);
assert.deepEqual(Object.fromEntries([...collect('src'), ...collect('test')].map(file => [file, hash(file)])), sourceBefore);
for (const [file, sha] of Object.entries(frozenBefore)) assert.equal(hash(file), sha, file);
const text = fs.readFileSync(`docs/project/${note}`, 'utf8');
for (const match of text.matchAll(/\]\(([^)]+)\)/g)) assert(fs.existsSync(path.resolve('docs/project', match[1])), match[1]);
assert(fs.readFileSync('AGENTS.md', 'utf8').startsWith('## G03阶段验收口径修正与种族专项分开'));
const verification = {
  date: '2026-10-23', complete: true, boardRevision: actual.revision,
  statusCounts: actual.tasks.reduce((r, t) => ({ ...r, [t.status]: (r[t.status] || 0) + 1 }), {}),
  sourceAndTestFilesUnchanged: Object.keys(sourceBefore).length,
  historicalReportsUnchanged: frozenBefore,
  document: { file: `docs/project/${note}`, sha256: hash(`docs/project/${note}`) },
  scope: 'Documentation and acceptance clarification only; no new game test, build, numerical change, commit or release.',
};
fs.writeFileSync(`${evidenceDir}/verification.json`, `${JSON.stringify(verification, null, 2)}\n`);
console.log(JSON.stringify(verification, null, 2));
