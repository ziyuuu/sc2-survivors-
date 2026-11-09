import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
if(await fs.stat('reports/local/tutorial-20261105/baseline.json').catch(()=>null))throw Error('Baseline already exists; preserve the original intake record');
const file='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8'));
const steps=[['TUT-01','首局资格、邀请、永久跳过与恢复'],['TUT-02','移动、敌方工蜂与对应资源拾取'],['TUT-03','真实增援入队'],['TUT-04','关间发展、生产与补给'],['TUT-05','首件穿戴与第三关首领2–3件奖励'],['TUT-06','撤离、同件模块入仓与旗舰安装']];
if(!b.tasks.some(t=>t.id==='TUT-1.1'))b.tasks.push({id:'TUT-1.1',title:'1.1 首局战役教学本地候选',status:'进行中',phase:'整合',priority:'用户授权',depends:['PLAN-1X'],scenes:[],owner:'Codex 教学实现',updated:'2026-11-05',historical:false,problem:'按已批准首局真实出征方案实现三族共用教学、奖励与持久化，交付可审阅本地候选。',steps:steps.map(([id,s])=>`${id} ${s}`),substeps:steps.map(([id,title])=>({id,title,status:'待办'})),acceptance:['三族从无档首关到同件模块旗舰装备端到端验证','资格、终态、奖励身份与检查点/失败/多页保护定向验证','三端实际画面，静音可完成，通讯/声音/镜头统一取消','相关回归及 npm test/typecheck/docs:check；独立本地构建与增量清单','人神声音未落实部分明确列出，用户试玩审阅与物理手机单列'],auditIds:[],evidence:['V1_1_FIRST_RUN_TUTORIAL_20261104.md'],result:'已核对分支体积优化版、HEAD 6510fb2；生产源码与测试开工时无已有修改。共享规划/部署/历史清理保持原状。',next:'接通资格、教学事件与持久化，再接正式资源和通讯。'});
b.updated='2026-11-05';await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
const inputs=['docs/project/V1_1_FIRST_RUN_TUTORIAL_20261104.md','docs/project/V1X_ROADMAP_20261104.md','reports/qa/v1x-roadmap-revision-20261104.json','reports/local/tutorial-advisors/adjutant.png','reports/local/tutorial-advisors/queen.png','reports/local/tutorial-advisors/executor.png'];
const root='reports/local/tutorial-20261105';await fs.mkdir(root,{recursive:true});
const hashes=[];for(const path of inputs){const data=await fs.readFile(path);hashes.push({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await fs.writeFile(root+'/baseline.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),workspace:'D:\\星际',inputs:hashes,status:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'})},null,2));
