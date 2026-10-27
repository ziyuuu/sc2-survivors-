import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const cache='.cache/v04-20261027',out='dist/V04-20261027';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=async p=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
const baseline=await read(cache+'/baseline.json'),application=await read(cache+'/application.json'),resources=await read(cache+'/resource-packages.json'),zip=await read('reports/local/v04-20261027/application-zip.json'),decoder=await read(cache+'/offline-decoder.json'),startup=await read(cache+'/startup/startup.json'),update=await read(cache+'/update.json');
assert.equal(update.complete,true);assert.equal(startup.passed,true);assert.equal(startup.cases.length,4);assert.equal(decoder.checked.length,3845);
const browsers=[];
for(const mode of ['web','offline','application']){
 const directories=(await fs.readdir(cache)).filter(x=>x.startsWith('browser-'+mode));let result;
 for(const directory of directories){try{const r=await read(cache+'/'+directory+'/result.json');if(r.complete)result=r;}catch{}}
 assert.ok(result,'Missing successful final browser run: '+mode);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.httpErrors,[]);assert.deepEqual(result.externalRequests,[]);
 assert.equal(result.newGame.stage,1);assert.equal(result.newGame.race,'terran');assert.equal(result.newGame.decoded,1921);assert.ok(result.newGame.wallet.minerals<100);
 browsers.push({mode,checks:result.checks,newGame:result.newGame,screens:result.screens,errors:0,httpErrors:0,externalRequests:0,complete:true});
}
const changed=[];for(const r of baseline.source)if(await hash(r.file)!==r.sha256)changed.push(r.file);
const visual=await read(cache+'/visual-review.json');for(const mode of ['web','offline','application'])assert.ok(visual[mode]?.reviewed?.length,'Visual review missing: '+mode);
assert.deepEqual(changed,['test/coze-fetch.test.mjs']);
for(const r of baseline.mirror)assert.equal(await hash(r.file),r.sha256,r.file);
for(const r of [baseline.current,baseline.t01])assert.equal(await hash(r.file),r.sha256,r.file);
assert.deepEqual(await read('dist/web/web-release.json'),baseline.web);
const artifacts=[zip,...resources.packages,{path:decoder.file,bytes:decoder.htmlBytes,sha256:decoder.htmlSha256,decodedAssets:decoder.checked.length}];
for(const a of artifacts){assert.equal((await fs.stat(a.path)).size,a.bytes);assert.equal(await hash(a.path),a.sha256,a.path);}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();assert.equal(git('rev-parse','HEAD'),baseline.head);
const report={date:'2026-10-27',task:'V04',status:'local-packaging-and-validation-complete-no-deployment',authorization:baseline.authorization,sourceCommit:baseline.head,sourceCommitScope:'Game source from main; uncommitted packaging helper changes are bound by packageBuildId and delivery.json file hashes.',applicationVersion:application.applicationVersion,appBuildId:application.appBuildId,packageBuildId:application.packageBuildId,resourceRelease:application.release,artifacts,validation:{freshWebBuildAndProductionTypes:true,priorUnchangedGameRegression:{report:'reports/qa/t01-closeout-20261027.json',uniquePassed:2704,rerun:false},packagingTests:{passed:2,command:'node --test test/coze-fetch.test.mjs test/coze-web.test.mjs'},resourceClosure:{logicalAssets:3845,uniqueFiles:3748,offlineDecoded:decoder.checked.length,allZipsRoundTripVerified:true},startup:{method:startup.method,cases:startup.cases.map(c=>({name:c.name,checks:c.checks,health:c.health}))},update:{checks:update.checks,previousRelease:update.previousRelease,targetRelease:update.targetRelease,activation:update.activation,complete:update.complete},browsers},preserved:{sourceFiles:baseline.source.length,changedTests:changed,gameSourceUnchanged:true,deploymentMirrorFiles:baseline.mirror.length,current:baseline.current,t01:baseline.t01},scope:{deployed:false,published:false,pushed:false,newCommit:false,currentReplaced:false,deploymentMirrorUpdated:false,v05Started:false},packagingFix:'原生资源引用扩展到经过哈希与文件名验证的 assets、mission-assets、fun-props 三个目录；路径穿越与其他目录拒绝。未改变游戏源码。',resolvedVerificationIssues:['打包工具初版只接受 assets，现按真实资源清单支持另两个受控目录。','首轮浏览器夹具沿用旧存档按钮；按设置→存档入口修正，旧挂起测试已结束。','浏览器下载夹具混用 Windows 路径分隔符导致取消；使用 path.join 后重测。','关间钱包夹具原期待结算前10000矿，忽略奖励；改为与原生结算后的档案钱包严格比较。','续跑检查脚本时临时端口变化导致存储域不同；固定原端口后继续，未修改游戏存档逻辑。'],git:{branch:git('branch','--show-current'),head:baseline.head,originMainLastKnown:git('rev-parse','refs/remotes/origin/main'),remoteContacted:false},retention:{policy:'docs/project/ARTIFACT_RETENTION.md',temporaryEvidenceRemoved:false},next:'V05待办；未获本轮部署发布授权，不启动。'};
report.validation.visualReview=visual;
await fs.mkdir('reports/qa',{recursive:true});await fs.writeFile('reports/qa/v04-packaging-20261027.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile(out+'/CHECKSUMS.json',JSON.stringify({date:report.date,sourceCommit:baseline.head,appBuildId:application.appBuildId,packageBuildId:application.packageBuildId,resourceRelease:application.release,artifacts},null,2)+'\n');
const text=`# V04 本地交付与验证 · 2026-10-27

本地打包与验证完成，版本 ${application.applicationVersion}。未部署、发布或推送；Current 与现有 deploy/coze 保持。V05 真实环境验收尚未启动。

## 成品

- [正式离线游戏](D:/星际/dist/SC2-Survivors-V04-20261027.html)，可直接打开；约 1.32 GB，首次打开与解码需要时间。
- [Web.zip](D:/星际/dist/V04-20261027/Web.zip)：完整静态 Web，解压后使用 HTTP 静态服务器。
- [Application.zip](D:/星际/dist/V04-20261027/Application.zip) + [Resources.zip](D:/星际/dist/V04-20261027/Resources.zip)：既定应用及完整资源，解压到同一目录；按 Application/README.md 使用 Node.js 22+ 启动。
- [Resources-Update.zip](D:/星际/dist/V04-20261027/Resources-Update.zip)：增量资源，仅适用于完整旧资源版本 ${resources.deltaFrom}；复用 1167 个文件，增加 2581 个。
- [CHECKSUMS.json](D:/星际/dist/V04-20261027/CHECKSUMS.json)：五份成品的字节数与 SHA-256。
- T01 检测工具仍是 reports/local/t01-20261024/offline-r33/T01-综合检测.html。正式游戏不会打开该检测目录或启用测试控制 API。

## 验证

本轮 Web 构建和生产类型检查通过；3845 条资源记录对应 3748 个唯一文件，离线 HTML 经正式解码器逐项还原并校验。四份 ZIP 均完整解压读回、逐文件验证 SHA-256。

2 项受影响的打包/服务测试、4 类真实应用启动场景和 7 项本地更新/回退检查通过。更新保留现有配置、旧应用与旧资源；缺失资源及篡改包在激活前被拒绝，旧版本回退及再次更新均实际启动成功。应用包含现有后台程序与 PGlite 运行库，不含数据库、账号、私有数据包或测试缓存。

普通 Web、断网 file:// 离线 HTML 与应用包入口均完成正常新开局、1921 份音频解码、存档导出和横竖屏检查。Web 与离线另做完整关闭浏览器再恢复；关间装备/货币/管理状态往返在 Web 覆盖三族，在离线覆盖人族。应用包使用逐 SHA 一致的 Web 文件，独立核验正常入口并结合四类启动检查，不重复相同游戏逻辑的全部存档场景。所有成功最终运行均无页面错误、HTTP 错误或外部请求。关间夹具仅存在于测试目录，未放入发布包。保存恢复按现有检查点规则，当前关可能重打。

游戏源码未改；沿用同版 T01 的 2704 唯一回归结果，本轮未重新执行。打包修复仅扩展三个受控原生资源目录，并增加路径与哈希校验测试。本轮 Git 工作尚未新提交。下面的源码提交标识游戏源码；未提交的打包工具改动由应用包标识及 delivery.json 中的逐文件哈希独立绑定。

## 身份与范围

源码提交：${baseline.head}
Web 构建：${application.appBuildId}
应用包：${application.packageBuildId}
资源版本：${application.release}

本地检查不替代 V05 的现网后台、真实数据持久化及发布验收。本轮没有接触或修改生产环境。临时截图、日志、浏览器缓存及合成档案在简要结论保存后按产物保留规则清理。

复现工具：prepare-v04-application.mjs、package-v04-resources.py、prepare-v04-fixtures.mts、verify-v04-browser.mts、verify-v04-update.mjs；构建仍使用既有 build:web 与命名输出的 build-demo.mjs。完整简要结论见 reports/qa/v04-packaging-20261027.json。
`;
await fs.writeFile(out+'/V04-交付说明.md',text);await fs.writeFile('docs/project/V04_DELIVERY_20261027.md',text);
const p='docs/project/performance-board.json',b=await read(p);assert.equal(b.revision,218);b.revision=219;b.updated=report.date;b.next='V05';const t=b.tasks.find(t=>t.id==='V04');t.status='已完成';t.updated=b.updated;t.result='V04本地同版打包与验证完成：Web、命名离线HTML、应用/完整/增量资源包已核验；3845资源解码、四ZIP读回、2项打包测试、4类启动、7项更新回退及三入口浏览器存档/布局通过。游戏源码、Current、现有应用镜像保持；未提交、推送、部署或发布，V05待办。';t.evidence=['V04_DELIVERY_20261027.md','../../reports/qa/v04-packaging-20261027.json'];b.updates.push({date:b.updated,tasks:['V04'],change:t.result,evidence:t.evidence});await fs.writeFile(p,JSON.stringify(b,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const agents='AGENTS.md',old=await fs.readFile(agents,'utf8');await fs.writeFile(agents,`## V04本地打包验证完成 · 2026-10-27\n\n- ${t.result}\n- 成品目录 dist/V04-20261027；正式离线 dist/SC2-Survivors-V04-20261027.html。说明 docs/project/V04_DELIVERY_20261027.md，结论 reports/qa/v04-packaging-20261027.json。源码 main ${baseline.head.slice(0,7)}，版本 ${application.applicationVersion}；此前2704唯一回归仅沿用未改游戏源码结果。\n- 看板219，下一项V05待办。当前包为待后续使用的本地交付，临时日志、截图、测试缓存及合成档案按保留规则清理。\n\n`+old);
console.log(JSON.stringify({complete:true,board:b.revision,artifacts:artifacts.length,checks:browsers.map(x=>({mode:x.mode,count:x.checks.length}))}));
