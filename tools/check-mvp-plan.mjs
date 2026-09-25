import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const state=JSON.parse(read('docs/project/status.json'));
const errors=[];
const ids=new Set(state.tasks.map(t=>t.id));
const reqs=new Set(state.requirements);
const decisions=new Set(state.decisions);
const states=new Set(['DRAFT','BLOCKED_APPROVAL','READY','IN_PROGRESS','REVIEW','VERIFIED','DONE','BLOCKED','CANCELLED']);
const matrix=read('docs/project/ACCEPTANCE.md');
if(ids.size!==state.tasks.length)errors.push('Duplicate task ID');
for(const t of state.tasks){
 if(!states.has(t.status))errors.push(`${t.id}: invalid status`);
 if(!fs.existsSync(path.join(root,t.design)))errors.push(`${t.id}: missing design ${t.design}`);
 if(!t.requirements.length||!t.acceptance.length||!t.ownerRole)errors.push(`${t.id}: missing contract`);
 for(const d of t.dependsOn)if(!ids.has(d)||d===t.id)errors.push(`${t.id}: invalid dependency ${d}`);
 for(const r of t.requirements)if(!reqs.has(r))errors.push(`${t.id}: unknown requirement ${r}`);
 for(const d of t.decisions)if(!decisions.has(d))errors.push(`${t.id}: unknown decision ${d}`);
 for(const a of t.acceptance)if(!matrix.includes(`| ${a} |`))errors.push(`${t.id}: missing acceptance ${a}`);
 if(['READY','IN_PROGRESS','REVIEW','VERIFIED','DONE'].includes(t.status)&&(t.phase!=='M0'||t.id==='M0-03')){
  for(const d of t.decisions)if(!state.approvals.some(a=>a.id===d&&a.approvedAt&&a.userEvidence&&a.documentHash))errors.push(`${t.id}: ${d} not approved with evidence/hash`);
  for(const d of t.dependsOn)if(state.tasks.find(x=>x.id===d)?.status!=='DONE')errors.push(`${t.id}: ${d} not DONE`);
 }
 if(t.status==='DONE'&&!t.evidence.length)errors.push(`${t.id}: DONE without evidence`);
 if(t.status==='IN_PROGRESS'&&!t.assignee)errors.push(`${t.id}: missing assignee`);
}
const visiting=new Set(),visited=new Set();
function visit(id){if(visiting.has(id)){errors.push(`Dependency cycle ${id}`);return;}if(visited.has(id))return;visiting.add(id);for(const d of state.tasks.find(t=>t.id===id).dependsOn)if(ids.has(d))visit(d);visiting.delete(id);visited.add(id);}
for(const id of ids)visit(id);
for(const r of reqs)if(!state.tasks.some(t=>t.requirements.includes(r)))errors.push(`Uncovered ${r}`);
const documents=['docs/MVP10_ITERATION_PLAN.md','docs/MVP10_TALENTS.md','docs/MVP10_RUNTIME.md','docs/MVP10_COMBAT_ASSETS.md','docs/MVP10_ELITE_CATALOG.md','docs/project/README.md','docs/project/DECISIONS.md','docs/project/ACCEPTANCE.md','docs/project/CHANGELOG.md'];
for(const doc of documents){if(!fs.existsSync(path.join(root,doc))){errors.push(`Missing ${doc}`);continue;}
 for(const m of read(doc).matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1].split('#')[0];if(!target||/^(https?:|codex:|[A-Za-z]:)/.test(target))continue;
  const resolved=path.resolve(root,path.dirname(doc),target);
  const pendingBoard=process.argv.includes('--write-board')&&resolved===path.join(root,'docs/project/BACKLOG.md');
  if(!pendingBoard&&!fs.existsSync(resolved))errors.push(`${doc}: broken link ${target}`);
 }
}

const talent=read('docs/MVP10_TALENTS.md');
const talentRows=[...talent.matchAll(/^\| ([TZP])-([RSAM])(\d{2}) \| (\d+) \| ([^|]+) \| (\d+) \| (\d+) \|/gm)];
if(talentRows.length!==165)errors.push(`Talent definitions ${talentRows.length}, expected 165`);
if(new Set(talentRows.map(m=>`${m[1]}-${m[2]}${m[3]}`)).size!==165)errors.push('Talent IDs duplicate/missing');
for(const race of ['T','Z','P'])for(const branch of ['R','S','A','M']){
 const rows=talentRows.filter(m=>m[1]===race&&m[2]===branch),micro=branch==='M';
 const rank=rows.reduce((n,m)=>n+Number(m[6]),0),cost=rows.reduce((n,m)=>n+Number(m[6])*Number(m[7]),0);
 if(rows.length!==(micro?7:16)||rank!==(micro?17:41)||cost!==(micro?64:59))errors.push(`${race}-${branch}: count/rank/cost ${rows.length}/${rank}/${cost}`);
 for(const m of rows)if(Number(m[7])!==(micro?[1,3,3,6,3,6,10]:[1,1,1,2,1,3,5])[Number(m[4])-1])errors.push(`${race}-${branch}${m[3]}: wrong tier price`);
}

// Check four authored 80-point examples, including full micro-control, against the authored graph; this is not a runtime test.
const playerRows=talentRows.filter(m=>m[1]==='T');
const defs=new Map(playerRows.map(m=>[`${m[2]}${m[3]}`,{tier:+m[4],max:+m[6],cost:+m[7]}]));
const prerequisites={R02:['R01'],R03:['R01'],R04:['R01'],R05:['R02'],R06:['R03'],R07:['R04'],R08:['R05'],R09:['R06'],R10:['R07'],R11:['R08'],R12:['R09'],R13:['R10'],R16:['R14','R15'],S02:['S01'],S03:['S01'],S04:['S01'],S05:['S02'],S06:['S03'],S07:['S04'],S08:['S05'],S09:['S06'],S10:['S07'],S11:['S08'],S12:['S09'],S13:['S10'],S14:['S11','S12'],S15:['S12','S13'],S16:['S14','S15'],A02:['A01'],A03:['A01'],A04:['A01'],A05:['A02'],A06:['A03'],A07:['A04'],A08:['A05'],A09:['A06'],A10:['A06'],A11:['A08'],A12:['A09'],A13:['A10'],A14:['A10']};
function legal(allocation,id){
 const d=defs.get(id),rank=allocation[id]||0;
 if(rank>=d.max||Object.values(allocation).reduce((a,b)=>a+b,0)>=80)return false;
 if(id[0]==='M'&&d.tier>1){const prev=`M${String(d.tier-1).padStart(2,'0')}`;if((allocation[prev]||0)!==defs.get(prev).max)return false;}
 if(id[0]!=='M'&&d.tier>1){let sum=0;for(const[k,v]of defs)if(k[0]===id[0]&&v.tier===d.tier-1)sum+=allocation[k]||0;if(sum<[0,2,5,5,3,5,2][d.tier-1])return false;}
 if((prerequisites[id]||[]).some(k=>(allocation[k]||0)!==defs.get(k).max))return false;
 const fullFifth=line=>[11,12,13].filter(n=>(allocation[`${line}${n}`]||0)===defs.get(`${line}${n}`).max).length;
 if(id==='R14'&&fullFifth('R')<rank+1)return false;
 if(id==='R15'&&fullFifth('R')<rank+2)return false;
 if(id==='R16'&&fullFifth('R')<2)return false;
 if(id==='A15'&&(!(allocation.A11>=1)||!(allocation.A13>=1)))return false;
 if(id==='A16'&&fullFifth('A')<2)return false;
 return true;
}
const maximum=key=>defs.get(key).max;
const fill=(line,end)=>Object.fromEntries(Array.from({length:end},(_,i)=>{const k=`${line}${String(i+1).padStart(2,'0')}`;return[k,maximum(k)];}));
const samples=[
 {name:'经济招募',ranks:{...fill('R',16),...fill('S',14),S15:1},cost:110},
 {name:'精锐扩编',ranks:{...fill('S',16),...fill('A',14),A16:1},cost:112},
 {name:'三线均衡',ranks:{...fill('R',10),...fill('S',10),...fill('A',10),A09:1},cost:97},
 {name:'微操融合',ranks:{...fill('R',16),...fill('M',7),...fill('S',7),S08:1},cost:146}
];
for(const sample of samples){
 const actual={};let changed=true,cost=0;
 while(changed){changed=false;for(const id of defs.keys())if((actual[id]||0)<(sample.ranks[id]||0)&&legal(actual,id)){actual[id]=(actual[id]||0)+1;cost+=defs.get(id).cost;changed=true;}}
 const total=Object.values(actual).reduce((a,b)=>a+b,0);
 if(total!==80||cost!==sample.cost||Object.entries(sample.ranks).some(([id,n])=>actual[id]!==n))errors.push(`${sample.name}: not reachable at 80 points / ${sample.cost} resources`);
 if([...defs.keys()].some(id=>legal(actual,id)))errors.push(`${sample.name}: accepted 81st point`);
}

const combat=read('docs/MVP10_COMBAT_ASSETS.md');
const eliteSection=combat.match(/^## 3\.[\s\S]*?(?=^## 4\.)/m)?.[0]||'';
const eliteIds=[...eliteSection.matchAll(/^\| `([^`]+)`/gm)].map(m=>m[1]);
const eliteCatalog=read('docs/MVP10_ELITE_CATALOG.md');
const newEliteIds=[...eliteCatalog.matchAll(/^\| `([a-z_]+\.[23])`/gm)].map(m=>m[1]);
const templateRows=[...eliteCatalog.matchAll(/^\| (quick|heavy|guard|mobile|support) \| [^|]+ \| \*\*([^*]+)\*\* \|/gm)];
if(templateRows.length!==5||new Set(templateRows.map(m=>m[1])).size!==5)errors.push('Elite strength proposal must define all five shared templates');
for(const row of templateRows){const nums=row[2].split('／').map(Number);if(nums.length!==5||nums.some(n=>!Number.isFinite(n))||nums[0]<1.55||nums[2]<1.35)errors.push(`${row[1]}: elite strength proposal below minimum`);}
if(!eliteCatalog.includes('提高到**1.75倍**'))errors.push('Support recovery strength proposal missing');
for(const id of ['.1','.2','.3'])if(!eliteCatalog.includes(`| \`${id}\` |`))errors.push(`Shared visual recipe ${id} missing`);
const allElites=[...eliteIds,...newEliteIds];
const counts=new Map();for(const id of allElites){const family=id.split('.')[0];counts.set(family,(counts.get(family)||0)+1);}
if(eliteIds.length!==40||newEliteIds.length!==50||allElites.length!==90||new Set(allElites).size!==90||counts.size!==30||[...counts.values()].some(n=>n!==3))errors.push('Elite design must contain 30 families with exactly 3 variants each (90 IDs: 40 existing + 50 new)');
for(const hero of ['雷诺','泰凯斯','诺娃','斯旺','托什','凯瑞甘','扎加拉','德哈卡','斯托科夫','妮雅德拉','阿塔尼斯','泽拉图','阿拉纳克','菲尼克斯','沃拉尊']){
 if(!combat.includes(`| ${hero} |`)||!combat.includes(`| ${hero}／`))errors.push(`${hero}: missing attack or skill spec`);
}

for(const airHero of ['大和战列巡洋舰／yamato_battlecruiser','利维坦／hots_leviathan','净化者旗舰／purifier_flagship'])if(!combat.includes('| '+airHero+' |'))errors.push('Missing air hero '+airHero);
if(!combat.includes('### 9.6 玩家爆虫自爆后停顿5秒'))errors.push('Missing player Baneling recovery design');
const board=['# 1.0 MVP 任务看板','','由 `status.json` 维护；`node tools/check-mvp-plan.mjs --write-board` 更新本表。M0 r6设计已获用户确认；运行实施仍按依赖、素材和验收逐项推进。','','| 任务 | 阶段 | 工作 | 状态 | 责任 | 依赖 | 需求 | 验收 |','| --- | --- | --- | --- | --- | --- | --- | --- |',...state.tasks.map(t=>`| ${t.id} | ${t.phase} | ${t.title} | ${t.status} | ${t.ownerRole} | ${t.dependsOn.join('、')||'—'} | ${t.requirements.join('、')} | ${t.acceptance.join('、')} |`),'','每项具体方案见status.json的design与[总计划](../MVP10_ITERATION_PLAN.md)相应阶段；决定见[DECISIONS](DECISIONS.md)，验收细节见[ACCEPTANCE](ACCEPTANCE.md)。',''].join('\n');
if(process.argv.includes('--write-board'))fs.writeFileSync(path.join(root,'docs/project/BACKLOG.md'),board,'utf8');
else if(!fs.existsSync(path.join(root,'docs/project/BACKLOG.md'))||read('docs/project/BACKLOG.md')!==board)errors.push('Board out of date: use --write-board');
if(errors.length){for(const e of errors)console.error(e);process.exitCode=1;}else console.log(`MVP plan OK: ${state.tasks.length} tasks, ${reqs.size} requirements, ${decisions.size} decision IDs. 165 talent definitions, 90 elite designs, 18 hero candidates and four legal 80-point examples checked. This validates planning structure, not game acceptance.`);
