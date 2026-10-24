import json, hashlib, collections
from pathlib import Path

root=Path('reports/local/disk-cleanup-20261021')
assert not (root/'cleanup-wegame-r2.json').exists(), 'Initial finalizer is superseded by the recorded WeGame matching correction; preserve corrected report.'
def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write(p,d): Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
run=read(root/'cleanup-result.json')
assert run['finished'] and run['execute'] and len(run['targets'])==223
guard=read(root/'protected-before.json'); failures=[]
for f in guard:
    p=Path(f['path'])
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:
        failures.append(f['path'])
verification={'files':len(guard),'hashMismatches':failures,'scope':'Current src/test files, accepted D02 evidence bindings and all 50 D02 screenshots. No new performance or gameplay test.'}
write(root/'protected-after.json',verification)
assert not failures,failures
removed=[x for x in run['targets'] if x['status']=='removed']
skipped=[x for x in run['targets'] if x['status']!='removed']
assert all(not Path(x['path']).exists() for x in removed)
assert all(x['error']=='Related application still running; cache preserved' for x in skipped),skipped
categories={}
for x in removed:
    c=categories.setdefault(x['category'],{'directories':0,'files':0,'logicalBytes':0})
    c['directories']+=1;c['files']+=x['beforeFiles'];c['logicalBytes']+=x['beforeBytes'] or 0
drives=[]
for before in run['beforeDrives']:
    after=next(x for x in run['afterDrives'] if x['Name']==before['Name'])
    drives.append({'drive':before['Name'],'freeBefore':before['Free'],'freeAfter':after['Free'],'freeIncrease':after['Free']-before['Free'],
        'deletedLogicalBytes':sum((x['beforeBytes'] or 0)-(x['afterBytes'] or 0) for x in removed if x['path'].startswith(before['Name']+':'))})
evidence=[]
for p in [root/'plan.json',root/'validated-plan.json',root/'cleanup-result.json',root/'protected-before.json',root/'protected-after.json',Path('tools/cleanup-disk-20261021.ps1')]:
    b=p.read_bytes();evidence.append({'path':str(p).replace('\\','/'),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
qa={'date':'2026-10-21','status':'complete','userDecision':'保留默认全特效，采用新中档选项','removedDirectories':len(removed),'skippedDirectories':len(skipped),'drives':drives,'categories':categories,'protected':verification,
    'skipped':skipped,'evidenceFiles':evidence,'notes':['Free-space snapshots include small concurrent operating-system writes; logical file lengths are recorded separately.','Old QA browser profiles and synthetic test databases were removed. Original screenshots, JSON measurements, logs, frozen inputs, game builds and historical pass/fail outcomes remain.','Personal browser IndexedDB, Local Storage, Service Worker/offline data, login data, history and user documents were excluded.','No running application was terminated. No production code, Current, save policy or performance task status changed.']}
write('reports/qa/disk-cleanup-20261021.json',qa)
gib=lambda n:f'{n/2**30:.2f}'
doc=Path('docs/project/DISK_CLEANUP_20261021.md')
doc.write_text('''# C/D盘缓存清理与中特效采用确认

2026-10-21。用户确认“保留默认全特效，采用新中档选项”，并要求清理C盘、D盘无用缓存与磁盘占用。新中特效继续采用D02已验证的实现；本次没有改动游戏代码或默认档位。

'''+f'已清理{len(removed)}个目录，跳过{len(skipped)}个仍关联运行中WeGame进程的缓存目录。未停止任何应用。\n\n'+'''| 磁盘 | 清理前可用 | 清理后可用 | 可用空间增加 |
| --- | ---: | ---: | ---: |
'''+''.join(f"| {d['drive']}盘 | {gib(d['freeBefore'])}GiB | {gib(d['freeAfter'])}GiB | {gib(d['freeIncrease'])}GiB |\n" for d in drives)+'''
可用空间为清理前后实际磁盘快照；同期系统写入会造成小幅差异，删除文件的逻辑长度另存于证据中，不与磁盘实占混用。

清理范围包括已结束QA的164个专用浏览器数据目录、项目`.cache/p5-tests`内的合成测试数据库、C盘Gradle依赖缓存、两个旧运行时下载临时目录、旧测试工具临时缓存，以及确认未运行应用的HTTP/代码/图形缓存。所有目标先规范化绝对路径，校验边界、重解析点和运行进程，再用PowerShell原生LiteralPath删除；没有遍历删除整个盘符或用户目录。

保留项目源码、测试、素材、Current、所有预览、冻结编译输入、截图、原始测量JSON和日志。个人文档、下载、聊天记录、登录状态、浏览器IndexedDB/Local Storage/Service Worker及离线数据、实际游戏存档和运行时均未纳入清单。

历史QA浏览器profile与合成测试数据库已清理，不能再直接重开这些旧运行目录；A03等历史“缓存完整”结论仍指当时验证结果。对应截图、测量和失败记录保持原样，需要复跑时重新创建测试目录。

'''+f'清理后逐文件SHA-256核对{len(guard)}个保护项：当前src/test、新中特效D02验收绑定及50张截图，全部一致。未重跑会重新产生缓存的游戏回归，也不产生新性能结论。看板仍44/52完成，D03未开始；未替换Current、提交、推送或发布。\n\n'+'''[清理证据](../../reports/qa/disk-cleanup-20261021.json) · [完整目录清单](../../reports/local/disk-cleanup-20261021/plan.json) · [执行结果](../../reports/local/disk-cleanup-20261021/cleanup-result.json) · [D02实现](PERFORMANCE_D02_MEDIUM_20261021.md)
''',encoding='utf-8')
decision='> 采用确认（2026-10-21）：用户确认“保留默认全特效，采用新中档选项”。继续使用本报告的实现与已验证构建；本次确认未改默认或生产代码。\n'
p=Path('docs/project/PERFORMANCE_D02_MEDIUM_20261021.md');t=p.read_text(encoding='utf-8');a=t.index('\n');p.write_text(t[:a+1]+'\n'+decision+t[a+1:],encoding='utf-8')
driveText='；'.join(f"{d['drive']}盘可用{gib(d['freeBefore'])}→{gib(d['freeAfter'])}GiB" for d in drives)
p=Path('AGENTS.md');p.write_text(f'''## D02采用确认与磁盘清理完成 · 2026-10-21

- 用户确认“保留默认全特效，采用新中档选项”；新中特效实现继续采用，未改默认或生产代码。看板仍44/52，D03未开始。
- 按用户要求清理{len(removed)}个闲置缓存目录，{driveText}；{len(skipped)}个运行中WeGame缓存跳过。记录docs/project/DISK_CLEANUP_20261021.md，证据reports/qa/disk-cleanup-20261021.json。
- 已结束QA的164个浏览器profile及合成测试数据库已删除，历史缓存完整结论指当时证据；截图/日志/测量/冻结输入保留。当前src/test与D02证据/50图共{len(guard)}个保护项SHA-256保持；个人数据、离线数据、运行时、Current及预览保留，未停止应用。
- 无新游戏回归或性能实验，未提交/推送/发布，其他MVP与存档边界保持。

'''+p.read_text(encoding='utf-8'),encoding='utf-8')
for file,prefix in [('docs/project/README.md',''),('docs/DOCUMENT_INDEX.md','project/')]:
    p=Path(file);t=p.read_text(encoding='utf-8');a=t.index('\n');p.write_text(t[:a+1]+f'\n2026-10-21 [C/D盘缓存清理与中特效采用确认]({prefix}DISK_CLEANUP_20261021.md)：清理{len(removed)}个闲置缓存目录；默认全特效保持，新中档继续采用。\n'+t[a+1:],encoding='utf-8')
print(json.dumps({'removed':len(removed),'skipped':len(skipped),'protectedFiles':len(guard),'drives':drives,'doc':str(doc)},ensure_ascii=False))
