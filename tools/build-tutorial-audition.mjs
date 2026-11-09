import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out='dist/tutorial-1.1-20261105/audition',ff='sites/v04-compression-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe',catalog=JSON.parse(await fs.readFile('deploy/runtime/combat-audio.json','utf8'));
await fs.mkdir(out,{recursive:true});const rows=[];
for(const [name,source] of [['queen-yes','Queen_Yes0.ogg'],['queen-what','Queen_What0.ogg']]){
 const row=catalog.records.find(r=>r.sourceFile.endsWith(source));if(!row)throw Error('Original sample missing');
 execFileSync(ff,['-y','-i',row.gitPath,'-t','0.75','-af','afade=t=out:st=0.71:d=0.04',out+'/'+name+'.wav'],{stdio:'ignore'});
 rows.push({name,source:row.sourcePath,sourceSha256:row.sourceSha256,decodedSha256:row.packedSha256,adaptation:'Original non-verbal Queen response, first 0.75 seconds with 40ms fade; used as gland vibration cue, no language or new voice'});
}
await fs.writeFile(out+'/sources.json',JSON.stringify(rows,null,2));
await fs.writeFile(out+'/index.html','<!doctype html><meta charset="utf-8"><title>1.1 顾问声音试听</title><style>body{background:#0c1720;color:#e8f5fa;font:18px system-ui;margin:40px;max-width:760px}audio{display:block;margin:18px 0 40px}p{line-height:1.6}</style><h1>虫后短震动</h1><p>现有原版非语义应答截取 0.75 秒。候选 A 已接入教程；每条新字幕出现时播放一次。</p><p>A · Queen Yes0</p><audio controls src="queen-yes.wav"></audio><p>B · Queen What0</p><audio controls src="queen-what.wav"></audio><h2>副官与执行官</h2><p>十段新台词及首件装备插话尚无逐句匹配录音。已有原版告警语义不符，当前候选保留完整中文字幕。可用工具没有配音服务；本机仅检测到英文 Microsoft Zira，未用它生成中文或冒充原版声音。</p>');
console.log(out);
