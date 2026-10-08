/** Collect actual browser evidence. Never fabricates measurements or test success. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const out=path.resolve(process.argv[2]??'reports/local/visual-repair-research-20261008');
const sha=b=>createHash('sha256').update(b).digest('hex');
const names=await fs.readdir(out),captures=[],benchmarks=[];
for(const file of names.filter(n=>/^\d\d-.*\.json$/.test(n)).sort()){
 const raw=await fs.readFile(path.join(out,file)),r=JSON.parse(raw),id=file.slice(0,-5),screen=await fs.readFile(path.join(out,id+'.jpg'));
 const excluded=/^0[12]-/.test(id);
 if(!r.immutable||r.errors.length)throw Error('Invalid evidence '+id);
 if(!excluded&&(r.resolution.width!==1280||r.resolution.height!==720))throw Error('Unexpected framebuffer '+id);
 captures.push({id,scene:r.scene,mode:r.mode,state:r.state,fixture:r.fixture,head:r.investigation.head,sourceHarness:r.investigation.provenance.find(p=>p.name==='lab.ts').derivedSha256,immutable:r.immutable,errors:r.errors,resolution:r.resolution,replay:r.replay,excluded,exclusion:excluded?'Initial viewport setup: saved report dimensions became stale after the panel adopted its visible size. Retained, excluded from comparisons.':null,jsonSha256:sha(raw),imageSha256:sha(screen)});
}
for(const file of names.filter(n=>/^bench-.*\.json$/.test(n)).sort()){
 const r=JSON.parse(await fs.readFile(path.join(out,file),'utf8')),m=r.measurements.at(-1);
 if(!m||!m.immutable||r.errors.length)throw Error('Invalid benchmark '+file);
 benchmarks.push({file,hardware:r.hardware,resolution:r.resolution,state:r.state,...m});
}
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:null;};
const summary=[...new Set(benchmarks.map(b=>b.mode))].map(mode=>{const b=benchmarks.filter(b=>b.mode===mode);return {mode,runs:b.length,gpuMeanMedian:median(b.map(x=>x.gpuMeanMs)),frameMeanMedian:median(b.map(x=>x.frameMeanMs)),p95Range:[Math.min(...b.map(x=>x.frameP95Ms)),Math.max(...b.map(x=>x.frameP95Ms))],over20Range:[Math.min(...b.map(x=>x.over20ms)),Math.max(...b.map(x=>x.over20ms))],drawsMedian:median(b.map(x=>x.drawsMean))};});
const result={date:'2026-10-08',method:'Fresh current-main renderer. 1280x720 fixed viewport/framebuffer after excluding setup captures. Frozen comparisons preserve complete captured World/Profile fingerprint. FX/death are synthetic inputs through real World logic, not natural campaign acceptance. Each capture retains its actual diagnostic harness hash.',captures,benchmarks,summary};
await fs.writeFile(path.join(out,'comparison.json'),JSON.stringify(result,null,2));
const image=async id=>'data:image/jpeg;base64,'+(await fs.readFile(path.join(out,id+'.jpg'))).toString('base64');
const pairs=[
 ['单位材质','白块来自材质与控制错误；局部语义恢复能露出机体。','03-protoss-current-A','05-protoss-current-B','当前基线','原材质控制试验'],
 ['地图投影','投影改善岩石落地感，地表与岩脚材质仍需继续修复。','11-ice-A','13-ice-shadow','当前基线','真实投影试验'],
 ['死亡特效','白色光团在狂热者死亡模型中；右侧只是定位来源，不能作为修复。','26-protoss-death-12-A','29-protoss-death-zealot-hidden','死亡后 0.2 秒','诊断中隔离该死亡模型']
 ];
const cards=await Promise.all(pairs.map(async([title,note,a,b,left,right])=>`<section><h2>${title}</h2><p>${note}</p><div class="pair"><figure><img src="${await image(a)}"><figcaption>${left}</figcaption></figure><figure><img src="${await image(b)}"><figcaption>${right}</figcaption></figure></div></section>`));
const gallery=await Promise.all(captures.filter(c=>!c.excluded).map(async c=>`<figure><img loading="lazy" src="${await image(c.id)}"><figcaption>${c.id} · ${c.scene} · ${c.mode}</figcaption></figure>`));
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>地图 单位 特效修复调研</title><style>*{box-sizing:border-box}body{margin:0;background:#111a20;color:#e8edf0;font:16px/1.65 system-ui}main{max-width:1240px;margin:auto;padding:32px 28px}h1{font-size:30px;margin:0}h2{font-size:22px;margin:0}p{margin:5px 0 16px;color:#b9cbd3}.meta{color:#80b7c8;font-size:13px}section{padding:22px 0;border-top:1px solid #34474f}.pair,.gallery{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{font-size:13px;margin:6px 0 12px;color:#c8d5db}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:8px;border-bottom:1px solid #34474f}a{color:#86cee9}details{margin:22px 0}pre{white-space:pre-wrap}body.plate main{max-width:1100px;padding:18px 22px}body.plate h1{font-size:26px}body.plate section{padding:12px 0}body.plate p{font-size:14px;margin:3px 0 9px}body.plate h2{font-size:19px}body.plate .pair img{height:185px;object-fit:cover;object-position:center}body.plate .long{display:none}@media(max-width:700px){.pair,.gallery{grid-template-columns:1fr}main{padding:18px}}</style><main><h1>地图、单位和特效都要修复</h1><p>先修材质与控制，再补投影、分图照明，最后验收特效叠加和整场性能。</p><p class="meta">2026-10-08 · 主线 ed215df · 原始资源保持 · 诊断试验，未替换正式游戏</p>${cards.join('')}<p class="meta">同一场景与冻结状态；原始浏览器截图。紧凑视图仅用 CSS 裁切上下边缘，无调色。隐藏死亡模型仅用于定位。</p><div class="long"><section><h2>完整修复顺序</h2><ol><li>固定原版与当前参考，建立全量材质缺口清单。</li><li>修复复合材质、发光、UV、动画控制及死亡层。</li><li>接入姿态正确的投影与质量回退。</li><li>修复五图地表、接触过渡及各自照明。</li><li>校准三族单位材质和局部几何细节。</li><li>修复特效时序、空间形态和大编制叠加。</li><li>完成状态等价、视觉、自然性能、Web／离线与发行验收。</li></ol><p>37 个可疑材质条目需要逐个核实；旧 P6 泛白来源和持续时间尚未完整确定。正式计划与验收细目保存在 docs/project/VISUAL_REPAIR_PLAN_20261008.md。</p></section><section><h2>本次 300 目标固定诊断</h2><p>暂停场景、10 秒窗口、Chrome 155、AMD Radeon、1280×720。表中 GPU 与平均帧时间为每次均值的中位数。不是自然性能验收。</p><table><thead><tr><th>模式</th><th>次数</th><th>GPU ms</th><th>帧均值 ms</th><th>P95 范围 ms</th><th>超过20ms</th><th>draw calls</th></tr></thead><tbody>${summary.map(s=>`<tr><td>${s.mode}</td><td>${s.runs}</td><td>${s.gpuMeanMedian?.toFixed(3)}</td><td>${s.frameMeanMedian?.toFixed(3)}</td><td>${s.p95Range.map(x=>x.toFixed(1)).join('–')}</td><td>${s.over20Range.map(x=>(x*100).toFixed(2)+'%').join('–')}</td><td>${s.drawsMedian}</td></tr>`).join('')}</tbody></table><p>A 当前基线；C 原材质语义与投影；E 再加环境照明与半分辨率遮蔽。与10月6日不同浏览器／分辨率的测量不可直接比较。</p></section><details><summary>全部有效截图 ${captures.filter(c=>!c.excluded).length} 张</summary><div class="gallery">${gallery.join('')}</div></details><details><summary>测量与文件校验数据</summary><pre>${JSON.stringify(result,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></details></div></main><script>if(new URLSearchParams(location.search).has('plate'))document.body.classList.add('plate')</script></html>`;
await fs.writeFile(path.join(out,'report.html'),html);
console.log(JSON.stringify({validCaptures:captures.filter(c=>!c.excluded).length,excluded:captures.filter(c=>c.excluded).map(c=>c.id),benchmarks:benchmarks.length,summary}));
