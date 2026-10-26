import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [run,numbers,note]=process.argv.slice(2),root='reports/local/t01-20261024/'+run;if(!/^(?:actions|cycle-probe|card-cycles|equipment-cycles|map-cycles)-r\d+(?:-r\d+)?$/.test(run)||!note)throw Error('Run and specific observation required');
const rows=JSON.parse(await fs.readFile(root+'/report.json','utf8')).rows;let review;try{review=JSON.parse(await fs.readFile(root+'/visual-review.json','utf8'));}catch{review={scope:'Model inspection of full-cycle contact frames. Raw frames and effect state retained separately; no performance or human acceptance claim.',rows:[]};}
const paged=process.argv[5]==='paged',full=process.argv[5]==='full',focus=process.argv[5]==='focus';let pageIndex;if(paged)pageIndex=JSON.parse(await fs.readFile(root+'/review-pages/index.json','utf8'));
for(const n of numbers.split(',').map(Number)){
 const row=rows[n-1];if(!row||!['cycle-captured','receipt-captured'].includes(row.status))throw Error('No captured cycle');
 const files=paged?pageIndex.find(x=>x.id===row.id)?.pages:[root+(focus?'/review-focus/':full?'/review-full/':'/review/')+row.directory+'.jpg'];if(!files?.length)throw Error('No generated review frames');
 const images=[];for(const file of files)images.push({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});
 const entry={id:row.id,condition:row.condition??'normal',...(paged?{images}:{file:images[0].file,sha256:images[0].sha256}),observation:note,status:'reviewed',at:new Date().toISOString()},at=review.rows.findIndex(r=>r.id===row.id&&(r.condition??'normal')===(row.condition??'normal'));if(at<0)review.rows.push(entry);else review.rows[at]=entry;
 if(process.argv[6]==='first-shot'){const file=root+'/review-first-shot/'+row.directory+'.jpg';entry.supplements=[{file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')}];}
}
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2));console.log(JSON.stringify({reviewed:review.rows.length}));
