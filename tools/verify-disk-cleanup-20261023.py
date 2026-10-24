"""Verify cleanup bytes/paths and publish the maintenance result."""
import os, json, hashlib, time, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'reports/local/disk-cleanup-20261023'
def load(n): return json.loads((BASE/n).read_text(encoding='utf-8-sig'))
def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''): h.update(b)
    return h.hexdigest()
def save(p,data): p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
plan=load('link-plan.json'); protected=load('protected-before.json')
issues=[]; paths=0; journals=[]; checked_parents=set()
for name in ('hardlinks-pilot.json','hardlinks-execute.json'):
    r=load(name);journals.append(r)
    if r['errors']: issues.extend(r['errors'])
for g in plan['groups']:
    donor=Path(g['canonical']); ds=donor.stat()
    if sha(donor)!=g['sha256'] or ds.st_size!=g['bytes']: issues.append({'donor':str(donor),'issue':'hash-or-size'})
    for target in g['targets']:
        p=Path(target);st=p.stat();paths+=1
        if (st.st_dev,st.st_ino,st.st_size)!=(ds.st_dev,ds.st_ino,ds.st_size): issues.append({'path':target,'issue':'different-bytes-or-file-identity'})
        checked_parents.add(p.parent)
    if paths%1000<50: print(json.dumps({'assetPathsChecked':paths}),flush=True)
for parent in checked_parents:
    with os.scandir(parent) as entries:
        for entry in entries:
            if '.dedup-' in entry.name or '.backup-' in entry.name: issues.append({'path':entry.path,'issue':'unfinished-replacement'})
for p in protected:
    if Path(p['path']).stat().st_size!=p['bytes'] or sha(p['path'])!=p['sha256']: issues.append({'path':p['path'],'issue':'protected-file-changed'})
cleanup=load('cleanup-result.json')
for row in cleanup['targets']:
    if row['status']!='removed' or Path(row['path']).exists():issues.append({'path':row['path'],'issue':'cache-not-removed'})
assert paths==plan['targets'] and sum(r['completedPaths'] for r in journals)==paths
verification={'completed':time.time(),'pass':not issues,'issues':issues,'assetGroups':len(plan['groups']),'assetPathsChecked':paths,'protectedFiles':len(protected),'protectedSourceTestFiles':sum(bool(Path(p['path']).relative_to(ROOT).parts[0] in ('src','test')) for p in protected),'method':'SHA-256 for every canonical asset, file identity and size for every replaced path; independent SHA-256 of all protected source/test/config/Current/QA/docs/deploy files.'}
save(BASE/'verification.json',verification)
assert not issues,issues
before={d['Name']:d['Free'] for d in cleanup['beforeDrives']}
drives=[{'drive':d,'freeBefore':before[d],'freeAfter':shutil.disk_usage(d+':/').free} for d in ('C','D')]
for d in drives:d['observedFreeIncrease']=d['freeAfter']-d['freeBefore']
report={'date':'2026-10-23','pass':True,'scope':'Completed synthetic test databases and transpiler cache; exact SHA-256-named immutable binary assets in generated builds. All output paths retained.','drives':drives,'cacheTargets':cleanup['targets'],'cacheLogicalBytesRemoved':sum(r['beforeBytes'] for r in cleanup['targets']),'deduplication':{'groups':len(plan['groups']),'paths':paths,'distinctDuplicateBytesRemoved':plan['distinctDuplicateBytes'],'method':'NTFS hard links; no source, HTML, JS or JSON sharing introduced.'},'verification':verification,'boardRevision':json.loads((ROOT/'docs/project/performance-board.json').read_text(encoding='utf-8-sig'))['revision'],'gameChanges':False,'newGameplayAcceptance':False,'discussion':[{'topic':'farm通关稳定性','evidence':'困难5/6、地狱3/6进入无尽；地狱529三族均败、530均通。','decision':'先隔离目标执行/行军钻地、增援交付和成长抽选，再决定是否调整后段压力；现有结果不能直接归因地图或种族。'},{'topic':'困难小毕业后期余量','evidence':'6/6进入无尽，但虫族529死亡48次、第16/17关末各余1单位；星灵529后两关死亡10次。','decision':'针对已测候选的后期掉队补因果验证，再讨论成长或压力调整；不能以通关认定平推。'},{'topic':'简单毒爆弹幕容错','evidence':'已有程序躲弹路线通过，尚无人类操作容错验收。','decision':'讨论弹速、密度、通路和受击容错的优先方向。'},{'topic':'诱饵定位与价格','evidence':'存在零触发情况；诱饵不生成独立虫群，现有单关收益不等于整局价值。','decision':'确定它是额外随机机会还是更稳定的奖励机会，再决定触发规则/说明/价格是否需要调整。'},{'topic':'G03成长经济收口','evidence':'当前预配装通关证据不能证明自然获得目标配装耗时和后期消费选择充分。','decision':'补自然成长时间、后期选择与无尽衔接的剩余证据，再冻结候选。'}],'notes':['Free-space snapshots include concurrent system writes; logical bytes and observed free-space change are separate.','Current, 829 source/test files, original screenshots/raw reports/frozen inputs and saved games retained. No running application was stopped.','Initial read-only inventory overlapped cache deletion and stopped on a missing synthetic fixture; rerun explicitly excluded p5-tests and preserved the original protected-byte manifest.','No source changes, build, performance/gameplay acceptance, commit, push or publication.'],'evidence':['reports/local/disk-cleanup-20261023/cleanup-result.json','reports/local/disk-cleanup-20261023/link-plan.json','reports/local/disk-cleanup-20261023/hardlinks-pilot.json','reports/local/disk-cleanup-20261023/hardlinks-execute.json','reports/local/disk-cleanup-20261023/verification.json']}
save(ROOT/'reports/qa/disk-cleanup-20261023.json',report)
print(json.dumps({'pass':True,'drives':drives,'groups':len(plan['groups']),'paths':paths,'protected':len(protected)}),flush=True)
