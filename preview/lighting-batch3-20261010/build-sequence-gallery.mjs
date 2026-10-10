import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/lighting-batch3-20261010';
const beforeLabel='before-r5-sequence',afterLabel='after-r6-sequence';
const read=async label=>JSON.parse(await fs.readFile(root+'/'+label+'/results.json','utf8'));
const before=await read(beforeLabel),after=await read(afterLabel);
assert.equal(before.passed,true,before.failure);assert.equal(after.passed,true,after.failure);
assert.deepEqual(before.errors,[]);assert.deepEqual(after.errors,[]);
assert.deepEqual(before.records.map(r=>r.name),after.records.map(r=>r.name));
for(let i=0;i<before.records.length;i++){
 const a=before.records[i],b=after.records[i];
 assert.equal(a.state,b.state,a.name);assert.deepEqual(a.subjects,b.subjects,a.name);assert.equal(a.time,b.time);
 for(const label of [beforeLabel,afterLabel])assert.ok((await fs.stat(root+'/'+label+'/'+a.name+'.png')).isFile());
}
const groups=['marine','baneling','immortal','zealot'],phases=['idle','move','attack','hit','death'];
const data=groups.flatMap(group=>phases.map(phase=>({group,phase,frames:after.records.filter(r=>r.name.startsWith(group+'-'+phase+'-')).map(r=>({name:r.name,time:r.time}))})));
for(const row of data)for(let i=1;i<row.frames.length;i++)assert.ok(Math.abs(row.frames[i].time-row.frames[i-1].time-.1)<1e-8,row.group+'/'+row.phase);
const comparison={passed:true,states:after.records.length,framesPerBuild:after.records.length,groups,phases,ticksBetweenFrames:6,before:beforeLabel,after:afterLabel,beforeBuild:before.build.jsSha256,afterBuild:after.build.jsSha256,method:after.method};
await fs.writeFile(root+'/sequence-comparison.json',JSON.stringify(comparison,null,2));
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>第三批视觉连续动作对照</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#111820;color:#e0e8ee}body{margin:24px}h1{font-size:24px}p{color:#b4c2ca;line-height:1.6}nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:20px 0}button,select{font:inherit;padding:10px;background:#1f2e3a;color:inherit;border:1px solid #60717c;border-radius:5px;max-width:100%}button{cursor:pointer}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;min-width:0;border:1px solid #34434e}figcaption{padding:10px}img{display:block;width:100%}input{width:260px;max-width:100%}a{color:#9ccffd}@media(max-width:750px){main{grid-template-columns:1fr}body{margin:14px}}
</style><h1>第三批视觉连续动作对照</h1><p>四个重点身份的待机、移动、原生攻击、受击与死亡。每帧推进原生模拟 6 tick（0.1 秒），两侧 World / Profile / RNG 完全相同。播放为已保存截图的顺序回放，不代表实时性能或真机动画验收。<a href="comparison-gallery.html">查看全 138 身份对照</a></p>
<nav><select id="group" aria-label="兵种"><option value="marine">精英陆战队员</option><option value="baneling">精英毒爆</option><option value="immortal">精英不朽者</option><option value="zealot">精英狂热者</option></select><select id="phase" aria-label="动作"><option value="idle">待机</option><option value="move">移动</option><option value="attack">原生攻击</option><option value="hit">真实受击</option><option value="death">死亡</option></select><button id="play">播放诊断帧</button><input id="frame" aria-label="帧" type="range" min="0" value="0"><span id="label"></span></nav><main><figure><figcaption>修复前 · ab1ce01</figcaption><img id="before" alt="修复前诊断帧"></figure><figure><figcaption>修复后 · 第三批 · candidate-r4</figcaption><img id="after" alt="修复后诊断帧"></figure></main>
<script type="application/json" id="data">${JSON.stringify(data)}</script><script>
const data=JSON.parse(document.querySelector('#data').textContent),group=document.querySelector('#group'),phase=document.querySelector('#phase'),frame=document.querySelector('#frame'),play=document.querySelector('#play');let timer=null;
function show(){const row=data.find(r=>r.group===group.value&&r.phase===phase.value);frame.max=row.frames.length-1;const value=row.frames[Number(frame.value)];document.querySelector('#before').src='${beforeLabel}/'+value.name+'.png';document.querySelector('#after').src='${afterLabel}/'+value.name+'.png';document.querySelector('#label').textContent=(Number(frame.value)+1)+' / '+row.frames.length+' · 模拟时间 '+value.time.toFixed(2)+' 秒';}
function stop(){clearInterval(timer);timer=null;play.textContent='播放诊断帧';}
function reset(){stop();frame.value=0;show();}group.onchange=phase.onchange=reset;frame.oninput=()=>{stop();show()};play.onclick=()=>{if(timer){stop();return}play.textContent='暂停回放';timer=setInterval(()=>{frame.value=(Number(frame.value)+1)%(Number(frame.max)+1);show()},100)};document.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){stop();frame.value=Math.max(0,Math.min(Number(frame.max),Number(frame.value)+(e.key==='ArrowRight'?1:-1)));show()}};show();
</script></html>`;
await fs.writeFile(root+'/sequence-gallery.html',html);
console.log(JSON.stringify(comparison));
