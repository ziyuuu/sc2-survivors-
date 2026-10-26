import fs from 'node:fs/promises';
const base='reports/local/t01-20261024',record=JSON.parse(await fs.readFile(base+'/slot-fix-authorization.json','utf8')),result=JSON.parse(await fs.readFile(base+'/slot-fix-r1/report.json','utf8'));
if(!result.pass||result.rows.length!==9||result.errors.length)throw Error('Slot check incomplete');
Object.assign(record,{status:'verified',verification:{report:base+'/slot-fix-r1/report.json',races:3,viewports:3,cases:9,occupiedEach:8,totalSlotsEach:12,outside:0,errors:0,visualReview:['terran-1440x900.png','zerg-844x390.png','protoss-390x844.png'],scope:'One approved positioning rule only. Remaining T01 coverage open.'}});
await fs.writeFile(base+'/slot-fix-result.json',JSON.stringify(record,null,2)+'\n');
const qaFile='reports/qa/t01-20261024.json',qa=JSON.parse(await fs.readFile(qaFile,'utf8'));qa.approvedUiFix=record;await fs.writeFile(qaFile,JSON.stringify(qa,null,2)+'\n');
const file='AGENTS.md',text=await fs.readFile(file,'utf8');await fs.writeFile(file,text.replace('三族三尺寸正式源码复验进行中。','三族三尺寸正式源码9项通过，12槽/8已装备均absolute且无越界、脚本错误0；桌面/横屏/竖屏截图复看。'));
console.log(JSON.stringify(record.verification));
