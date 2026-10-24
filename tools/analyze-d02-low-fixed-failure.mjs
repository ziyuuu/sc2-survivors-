import fs from 'node:fs/promises';
const root='reports/local/performance-d02-low-20261021/functional-r5',report=JSON.parse(await fs.readFile(root+'/report.json','utf8'));
const actual=report.failure.match(/^\+ '(.*)'$/m),expected=report.failure.match(/^- '(.*)'$/m);
if(!actual||!expected){const lines=report.failure.split('\n'),a=lines.find(l=>l.startsWith('+ ' + String.fromCharCode(39))),b=lines.find(l=>l.startsWith('- ' + String.fromCharCode(39)));let offset=2;while(a&&b&&a[offset]===b[offset]&&offset<a.length)offset++;const info={scope:'Only truncated assertion text remains for this run; these prefixes do not prove full-state equality.',failureLength:report.failure.length,firstDifference:offset,actual:a?.slice(Math.max(0,offset-80),offset+130),expected:b?.slice(Math.max(0,offset-80),offset+130)};await fs.writeFile(root+'/fixed-run-differences.json',JSON.stringify(info,null,2));console.log(JSON.stringify(info));process.exit(0);}
const a=JSON.parse(actual[1]),b=JSON.parse(expected[1]),differences=[];
function walk(x,y,key=''){if(JSON.stringify(x)===JSON.stringify(y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'){for(const k of new Set([...Object.keys(x),...Object.keys(y)]))walk(x[k],y[k],key+'.'+k);}else differences.push({key,actual:x,expected:y});}
walk(a,b);await fs.writeFile(root+'/fixed-run-differences.json',JSON.stringify({scope:'Exact actual/expected states recovered from the preserved Node assertion. No result relabelled.',differences},null,2));console.log(JSON.stringify({differences}));

