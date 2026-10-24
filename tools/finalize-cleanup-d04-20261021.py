import collections, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base=root/'reports/local/disk-cleanup-d04-20261021'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
verify=load(base/'verification.json');assert verify['pass']
plan=load(base/'build-plan.json');caches=load(base/'caches-execute.json');builds=load(base/'builds-execute.json')
assert all(x['status']=='removed' for x in caches['targets']+builds['targets'])
before={x['Name']:x for x in load(base/'drives-before.json')}
after={x['Name']:x for x in load(base/'drives-after.json')}
drives=[{'drive':d,'freeBefore':before[d]['Free'],'freeAfter':after[d]['Free'],'freeIncrease':after[d]['Free']-before[d]['Free']} for d in ('C','D')]
types=collections.Counter(x['category'] for x in caches['targets'])
oldtypes=collections.Counter(x['kind'] for x in plan['targets'])
evidence=[]
for name in ['drives-before.json','drives-after.json','cache-plan.json','caches-dry-run.json','caches-execute.json','build-plan.json','builds-dry-run.json','builds-execute.json','protected-before.json','verification.json','loading-scope-check.json']:
 p=base/name;b=p.read_bytes();evidence.append({'file':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
qa={'date':'2026-10-21','scope':'Second cleanup after D04; user also clarified original startup batch must be ready by stage 3, not all game content. No production changes.','pass':True,'drives':drives,'cacheDirectoriesRemoved':len(caches['targets']),'cacheCategories':dict(types),'cacheLogicalBytes':sum(x['bytes'] for x in caches['targets']),'oldBuildsRemoved':len(plan['targets']),'oldBuildCategories':dict(oldtypes),'oldBuildLogicalBytes':sum(x['bytes'] for x in plan['targets']),'reconstructionBytes':plan['archiveBytes'],'retainedSharedPayloadDonors':plan['donors'],'verification':verify,'loadingScope':load(base/'loading-scope-check.json'),'originalStartupBatchReadyByStage3':False,'newGameplayTests':False,'boardUnchanged':True,'noCurrentReplacementCommitPushOrPublication':True,'evidence':evidence}
(root/'reports/qa/disk-cleanup-d04-20261021.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
gb=lambda n:f'{n/2**30:.2f}'
table='\n'.join(f"| {r['drive']}盘 | {gb(r['freeBefore'])}GiB | {gb(r['freeAfter'])}GiB | {gb(r['freeIncrease'])}GiB |" for r in drives)
text=f'''# D04后第二轮磁盘清理与加载范围澄清

2026-10-21。用户要求“再进行一遍清理”，并明确第三关结束的目标是原先开局加载的那批内容全部完成，不是全游戏所有资源。本轮完成磁盘清理、可重建归档及范围核对，没有修改加载实现。

清理{len(caches['targets'])}个闲置缓存目录（{types['qa-browser-profile']}个已关闭的测试浏览器目录、合成测试数据库、测试编译缓存及可重新下载的编译头文件缓存），移除{oldtypes['shared-payload']}个重复离线整包和{oldtypes['gzip-build']}个D04旧候选JS产物。当前交付、D04最终候选及基线、正在使用的D02/D03预览、趣味分支最新预览、个人浏览器数据和实际运行时保持。

| 磁盘 | 本轮前可用 | 本轮后可用 | 可用增加 |
| --- | ---: | ---: | ---: |
{table}

本轮快照不包含上次D04执行中已清掉的约17GB浏览器数据，也不重复计入较早的223目录和素材硬链接去重。可用空间受同期系统写入影响；逻辑文件长度与实盘释放分列，硬链接不按路径重复计数。

## 如何还原旧版本

冻结源码、构建清单、原始测量、日志和截图保持。旧整包中相同的资源段仅引用一份仍保留的素材包；各版不同的HTML外壳和完整编译代码压缩保存，合计{gb(plan['archiveBytes'])}GiB。没有把旧大包完整复制到另一个目录。保留精确编译代码作为旧诊断工具或依赖日后变化时的兜底，不声称当前工具必能重新编译出每个历史产物的相同字节。

每份候选先对原文件和重组流校验完整SHA-256及长度，完全一致后才列入删除清单。PowerShell删除前再次检查原文件SHA、绝对路径边界、祖先/后代重解析点和活动进程。删除后又检查全部保留共享包及压缩代码，确认还原所需字节完整。清单中的共享素材供体不能单独当作旧缓存删除。

在项目目录执行 `python tools/archive-old-builds-20261021.py restore <清单中的原相对路径>` 可恢复指定旧文件；命令拒绝覆盖现有文件，并验证还原SHA。执行 `python tools/archive-old-builds-20261021.py verify` 可校验所有重组流，不生成新的大包。具体路径、原SHA、供体范围和压缩代码位置见 `reports/local/disk-cleanup-d04-20261021/build-plan.json`。

历史报告中归档文件的原路径现已不存在，需按此清单还原后才能重跑旧检查。它们的历史测试结果没有改标；已清理的临时浏览器状态不能还原，也不会冒充历史缓存仍然存在。

## 保护检查

{verify['protectedFiles']}个保护项校验通过，包括当前源码/测试/部署文件、原QA汇总、Current、最终预览及共享供体；A03资源映射的{verify['assetSources']}个源文件仍逐SHA一致。D04的{verify['d04EvidenceRetained']}项原证据原文件保持，另{verify['d04EvidenceArchivedReconstructable']}项按原SHA可还原。没有为本次清理重跑会重新产生缓存的游戏测试，也没有新性能验收。

## 第三关结束的范围

用户期望：原来开局阻塞加载的那一批内容，挪到前三关内完成。当前实现没有满足这一完整范围。

同一条正常人族查尔seed529路线，D03旧版开局已准备104个模型；D04新版本开局38个，第三关结束40个（新增实际首领奖励）。Web第三关结束已准备资产1561项，旧版为1618项。这里的数字是这条已测路线的对应记录，不是全游戏资源量或所有模型的百分比。

原因是 `BattleRenderer.battleBackgroundJobs` 对未来名单主要执行文件准备；只有实际首领奖励进入完整模型解析、材质/纹理及GPU预热。当前前三关出场所需和首领奖励已准备，不等于原启动批次已全部准备。即使有约180秒战斗时间和关间时间，现有任务清单没有安排全部旧启动模型的完整后台准备，单纯延长时间也不能自动补齐。未修改D04历史测量或把这一目标宣称完成；后续加载修改应以用户澄清的原启动批次为验收范围。

后续测试产物留存原则：默认保留可重建输入、构建绑定、原始测量、必要截图、最新候选及必要对照；中间重复大包归档差异和共享素材引用，已结束专用浏览器缓存及时清理，不默认累计每次整包和缓存。

本次不改游戏生产代码、看板完成数量或其他分支；未替换Current、提交、推送、发布。原图形、300/4∶4∶1、五图、存档延期及V01–V04/MVP边界保持。

[本轮清理证据](../../reports/qa/disk-cleanup-d04-20261021.json) · [归档还原清单](../../reports/local/disk-cleanup-d04-20261021/build-plan.json) · [D04原报告](PERFORMANCE_D04_20261021.md)
'''
(root/'docs/project/DISK_CLEANUP_D04_20261021.md').write_text(text,encoding='utf-8')
agents=root/'AGENTS.md'
section=f'''## D04后第二轮磁盘清理与加载范围澄清 · 2026-10-21

- 用户授权再次清理，并澄清第三关结束应完成“原开局加载批次”，不是全游戏；当前仍未满足，已测旧版开局104模型、新版第三关40模型，未来名单主要仅备文件。记录docs/project/DISK_CLEANUP_D04_20261021.md，未改加载实现或看板数量。
- 清理{len(caches['targets'])}闲置缓存目录、{oldtypes['shared-payload']}重复离线包、{oldtypes['gzip-build']}旧D04 JS；C可用{gb(drives[0]['freeBefore'])}→{gb(drives[0]['freeAfter'])}GiB，D可用{gb(drives[1]['freeBefore'])}→{gb(drives[1]['freeAfter'])}GiB。本轮不重复计入先前17GB清理。
- 共享素材单份引用，压缩代码/HTML差异共{gb(plan['archiveBytes'])}GiB，所有归档重组SHA精确；原路径需通过tools/archive-old-builds-20261021.py restore恢复。清单build-plan.json中的供体须保留，不把归档历史改为仍可直接打开。
- {verify['protectedFiles']}保护项、{verify['assetSources']}资源来源及D04原证据核验通过；源码、冻结输入、截图/日志/测量、Current、最终候选/基线及其他分支最新预览保持。证据reports/qa/disk-cleanup-d04-20261021.json，无新游戏回归/发布。
- 后续默认留可重建输入/绑定/原始数据/必要截图/最新及必要对照；中间包复用共享素材、差异归档，已关闭QA缓存及时清理，避免再次累计每次整包与浏览器数据。

'''
assert not agents.read_text(encoding='utf-8').startswith('## D04后第二轮磁盘清理')
agents.write_text(section+agents.read_text(encoding='utf-8'),encoding='utf-8')
for rel,prefix in [('docs/project/README.md',''),('docs/DOCUMENT_INDEX.md','project/')]:
 p=root/rel;s=p.read_text(encoding='utf-8');at=s.index('\n')+1
 line=f'\n2026-10-21 [D04后磁盘清理与加载范围澄清]({prefix}DISK_CLEANUP_D04_20261021.md)：删除闲置测试缓存和重复整包，旧版本按SHA可还原；原开局批次第三关全部就绪的目标当前尚未满足。\n'
 p.write_text(s[:at]+line+s[at:],encoding='utf-8')
print(json.dumps({'pass':True,'drives':drives,'cacheDirectories':len(caches['targets']),'builds':dict(oldtypes),'archiveBytes':plan['archiveBytes']},ensure_ascii=True))
