import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const seconds=Number(process.argv.includes('--seconds')?process.argv[process.argv.indexOf('--seconds')+1]:15);
if(!Number.isFinite(seconds)||seconds<1||seconds>120)throw Error('Invalid duration');
const headed=process.argv.includes('--headed');
const out='reports/local/m6-browser-baseline'+(headed?'-headed':'');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:!headed});
const report={at:new Date().toISOString(),seconds,headed,browserVersion:browser.version(),runs:[]};
const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b),q=x=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*x))]:null;return {count:values.length,p95:q(.95),p99:q(.99),max:sorted.at(-1)??null,over20:values.filter(x=>x>20).length,over50:values.filter(x=>x>50).length};};
try{
 for(const mode of ['2d','webgl2']){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.setContent('<canvas id="c" width="1440" height="900"></canvas>');
  const setup=await page.evaluate(mode=>{
   const canvas=document.querySelector('canvas'),frames=[],longTasks=[],state={frames,longTasks,last:0,done:false,draws:0};
   new PerformanceObserver(list=>{for(const item of list.getEntries())longTasks.push(item.duration);}).observe({entryTypes:['longtask']});
   let draw;
   if(mode==='webgl2'){
    const gl=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'});
    if(!gl)return {error:'webgl2 unavailable'};
    const vertex=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vertex,'#version 300 es\nlayout(location=0) in vec2 p; void main(){gl_Position=vec4(p,0.,1.);}');gl.compileShader(vertex);
    const fragment=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fragment,'#version 300 es\nprecision mediump float; out vec4 color; void main(){color=vec4(.2,.5,.7,1.);}');gl.compileShader(fragment);
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return {error:gl.getProgramInfoLog(program)};
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,0,.5]),gl.STATIC_DRAW);
    gl.useProgram(program);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    draw=()=>{gl.clearColor(.1,.1,.1,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);};
    state.renderer=gl.getParameter(gl.RENDERER);
   }else{
    const ctx=canvas.getContext('2d');draw=()=>{ctx.fillStyle='#192029';ctx.fillRect(0,0,1440,900);ctx.fillStyle='#599cbb';ctx.fillRect(360,220,640,420);};
   }
   const frame=at=>{if(state.done)return;if(state.last)frames.push(at-state.last);state.last=at;draw();state.draws++;requestAnimationFrame(frame);};
   window.__baseline=state;requestAnimationFrame(frame);return {renderer:state.renderer??mode};
  },mode);
  if(setup.error)throw Error(setup.error);
  await page.waitForTimeout(seconds*1000);
  const result=await page.evaluate(()=>{window.__baseline.done=true;return window.__baseline;});
  const run={mode,renderer:setup.renderer,frames:summarize(result.frames),longTasks:summarize(result.longTasks),draws:result.draws,gaps:result.frames.filter(ms=>ms>50).slice(0,25)};
  report.runs.push(run);
  console.log(JSON.stringify(run));
  await context.close();
 }
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
