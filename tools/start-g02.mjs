import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {createReadStream} from 'node:fs';
const root='D:/星际',base=root+'/reports/local/g02-20261022';await fs.mkdir(base+'/before',{recursive:true});
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
const rows=[];async function save(file){const target=base+'/before/'+file;await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(root+'/'+file,target);rows.push({file,sha256:await hash(target),bytes:(await fs.stat(target)).size});}
async function walk(dir){for(const e of await fs.readdir(root+'/'+dir,{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())await walk(file);else if(e.isFile())await save(file);}}
for(const dir of ['src','test'])await walk(dir);for(const file of ['docs/project/performance-board.json','docs/project/FUN_FEEDBACK_R4_PLAN_20261022.md','docs/project/G01_CARD_EQUIPMENT_HERO_REVIEW_20261022.md','AGENTS.md','package.json','tsconfig.json'])await save(file);
const current='dist/SC2-Survivors-Current-20261006.html';await fs.writeFile(base+'/before.json',JSON.stringify({source:rows,current:{path:current,sha256:await hash(root+'/'+current)},authorization:'User confirmed easy stage12, normal9, hard/hell6 Boss hero unlock, unchanged probabilities, prior exceptions/no stat nerf, and requested this together with G02.'},null,2));
const file=root+'/docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8'));if(b.revision!==117)throw Error('Unexpected board');b.revision=118;
const g01=b.tasks.find(t=>t.id==='G01'),g02=b.tasks.find(t=>t.id==='G02'),u05=b.tasks.find(t=>t.id==='U05');
g01.result+=' 用户已明确批准按难度开放普通新英雄：简单12、普通9、困难和地狱6关Boss，概率不改，既定特殊来源例外及英雄数值保持；本次与G02连续执行，待实现核验。';
g02.status='进行中';g02.updated='2026-10-22';g02.result='用户授权与G01英雄分档门槛同批执行。先落实已批准获取规则，再比较三族、无/蓝/橙属性装、早中后期卡牌的实际收益与费用；新平衡数值未预先授权，明确问题后提出具体方案。';
u05.status='待办';u05.result+=' G01/G02联合批次执行期间，其余引导工作等待数值定稿，改列待办；第四轮已完成证据保持。';
b.updates.push({date:'2026-10-22',tasks:['G01','G02','U05'],change:'用户批准简单12/普通9/困难地狱6关Boss起普通英雄开放，原概率和特殊来源例外保持，并要求连同G02执行。G01/G02进行中，U05剩余项等待数值定稿改列待办；仍62项49完成，无提前验收结论。',evidence:['G01_CARD_EQUIPMENT_HERO_REVIEW_20261022.md']});await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
const review=root+'/docs/project/G01_CARD_EQUIPMENT_HERO_REVIEW_20261022.md';await fs.appendFile(review,'\n## 用户已批准的最终门槛（覆盖上文统一12关候选）\n\n用户明确确认：简单第12关、普通第9关、困难与地狱第6关Boss奖励起开放普通新英雄；概率整体不变。保留高阶装备赠送／进化和999击杀虫后例外、已有英雄培养，不削英雄数值。本次与G02连续实施和评估。以击败对应或后续正式战役Boss为开放事件，不在刚进入该关时提前开放商店／地图／情报；当前正在实现核验。\n');
console.log(JSON.stringify({frozen:rows.length,board:b.revision,sourceTests:rows.filter(r=>/^(src|test)\//.test(r.file)).length}));
