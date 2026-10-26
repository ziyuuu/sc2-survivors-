import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed,['src/ui/starship/native.css']);assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const catalogue=await read(base+'/catalogue-current.json'),offline=await read(base+'/offline-qa-r1/report.json'),ui4=await read(base+'/ui-interactions-r4/report.json'),cards=await read(base+'/card-cycles-r2/visual-review.json');
assert.equal(catalogue.static.length,332);assert.equal(offline.errors.length,0);assert.equal(offline.http.length,0);
const result={date:new Date().toISOString(),baseline:{files:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},catalogue:{dynamic:catalogue.dynamic.length,static:catalogue.static.length},
 toolChanges:['原生弹窗打开时检测工具移入其焦点范围并通过popover置顶，待静态离线验证。','检查夹具以真实packedSeats与原生翻页进入精英详情，待本轮三尺寸结果。','回执先等图片与界面稳定再展开，待本轮结果。','增加三族真实装备训练套装与劳工模块已激活展示，保留原未激活状态。'],
 interrupted:{evidence:base+'/ui-interactions-r3/interruption.json',failure:'打包在异步缓存清理完成前启动，写满D盘；UI报告原地写入被截成空文件。299项共有3442张截图保留，但不能重建事务结果或声称通过。',original:base+'/ui-interactions-r3/report-interrupted-empty.json',resolution:'失败及部分生成包清理记录保留；重跑326项，报告改为临时文件完成后原子替换。打包与浏览器采样改为串行。'},
 interactions:{run:'ui-interactions-r4',total:326,recorded:ui4.rows.length,counts:ui4.rows.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),errors:ui4.errors.length,evidence:base+'/ui-interactions-r4/report.json',remaining:'真实外层触屏手势及超长筛选列表仍有待核项；不直接归因生产界面。'},
 offline:{build:base+'/offline-r4/build.json',evidence:base+'/offline-qa-r1/report.json',dynamicChecks:offline.modes[0].checks.length,errors:0,http:0,passedControls:offline.modes[0].checks.map(c=>c.control??c.target??c.filter),failure:offline.failure,diagnosis:'原生CDP连接noDefaults不启用下载事件；已按工具源码修正为显式CDP下载事件及实际文件核对，待复测。静态、导出、刷新隔离尚未验证。',complete:false,delivered:false},
 dynamic:{cardCycleRowsReviewed:cards.rows.length,evidence:base+'/card-cycles-r2/visual-review.json',limitations:'已看与通过分开；数项瞬时支援效果需按事件加密帧或检查完整画面，全部条目仍未完成。'},
 storage:{cleanup:[base+'/offline-derived-cleanup-r1.json',base+'/offline-r3/failure.json',base+'/profile-cleanup-20261025-r8.json'],removed:'仅未验证的旧派生双HTML、失败半包及已核实关闭的浏览器缓存。原截图、失败日志及构建元数据保持。',probe:base+'/sequence-compression-probe.json',probeScope:'20帧像素逐项无损比对通过，现有原图均保留；仅测试未来序列压缩，未替代既有证据。'},
 pendingUI:['菜单战斗条隐藏提议未获确认、未采用','level0/level1中文等级提议未获确认、未采用'],coverageComplete:false,commit:false,push:false,publish:false};
const file=base+'/progress-20261025-r6.json';await fs.writeFile(file,JSON.stringify(result,null,2));
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,184);const task=board.tasks.find(t=>t.id==='T01');board.revision=185;board.updated='2026-10-25';board.next='T01';task.status='进行中';task.updated=board.updated;
task.result='目录10481动态/332静态，新增三族套装已激活展示。旧323项界面运行因打包并行写满磁盘而中断，3442张原截图保留、事务报告不完整，已改原子保存并重跑326项。新版离线动态页8项控制检查完成、HTTP/页面错误0，导出下载事件观察方式已纠正待复测，静态离线尚未验。卡牌周期逐图检查继续，瞬时效果加密及全量仍开放；非完整T01或MVP验收。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed,coverageComplete:false,offlineDelivered:false,boardRevision:185});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 界面中断恢复与离线控制验证（看板185）\n\n'+task.result+'\n\n840基线中839与Current保持。失败由检测任务同时打包和采样时的存储调度造成，不归因游戏；原空报告、逐项截图、下载观察失败均保留。唯一正式修改仍为用户批准的装备槽定位。进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 界面中断恢复与离线控制验证 · 2026-10-25\n\n- '+task.result+'\n- 840基线839及Current保持，唯一正式修改为已批准装备槽定位；菜单战斗条和英文等级提议仍待答，未采用。未提交/推送/发布。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:185,catalogue:result.catalogue,ui:result.interactions.counts,offlineChecks:8,cardReviewed:cards.rows.length,changed}));
