import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const p='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(p,'utf8'));
assert.equal(b.revision,48);assert.equal(b.next,'S05');
for(const id of ['S05','U01','U04'])assert.equal(b.tasks.find(t=>t.id===id).status,'待办');
b.revision++;b.updated='2026-10-20';
b.updates.push({date:'2026-10-20',tasks:['S05','U01','A01'],change:'用户询问S05是否单独做。建议以S05为主小合批，仅带U01中生产详情/战术预留的账本查询消费端，复用相同查询与失效验证；A01同步补S05关联7条审计结论。U01其余通知/商店/布局、U04统计遥测、S06出生和S07碰撞保持独立；统计需要新增订单历史而非仅活动任务，不能直接替换为活动集合。保留支付/退款/交付/回执和全部历史，存档仍延期。本次仅提案，所有任务状态与next保持，未开始实现。',evidence:['../../src/simulation/expedition-production.ts','../../src/ui/hud.ts','../../src/ui/hud/expedition-panel.ts','../../src/services/game-observer.ts']});
await fs.writeFile(p,JSON.stringify(b,null,2)+'\n');console.log(JSON.stringify({revision:b.revision,next:b.next,implementationStarted:false}));
