import {deviceHints,deviceTier,graphicsPreferences,optimizedGraphics,saveGraphics,handshakeBudget,type GraphicsTier} from './graphics-profile';
export interface DeviceSample {gpuMs:number|null;cpuMs:number|null;reliable:boolean}
export function tierFromSample(sample:DeviceSample):GraphicsTier {
 const h=deviceHints(),base=deviceTier(h);if(!sample.reliable)return base;
 if(base==='low'||(sample.gpuMs??0)>8||(sample.cpuMs??0)>16)return 'low';
 // Promotion requires measured GPU evidence AND headroom, not pointer type.
 if(sample.gpuMs!==null&&sample.gpuMs<2&&(sample.cpuMs??Infinity)<4&&(h.memory??0)>=8&&(h.cores??0)>=4)return 'high';
 return 'medium';
}
export let deviceProbeReport:DeviceSample&{tier?:GraphicsTier;cached?:boolean}={gpuMs:null,cpuMs:null,reliable:false};
export async function initializeGraphics(){
 if(!optimizedGraphics())return;
 handshakeBudget();const p=graphicsPreferences();if(p.preset!=='auto'||p.probeVersion===1){deviceProbeReport={...deviceProbeReport,tier:p.tier,cached:true};return;}
 if(document.visibilityState!=='visible')return;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const gl=canvas.getContext('webgl2',{antialias:false,powerPreference:'default'});if(!gl)return;
 const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),queries:WebGLQuery[]=[],samples:number[]=[],cpu:number[]=[];
 const vertex=gl.createShader(gl.VERTEX_SHADER)!,fragment=gl.createShader(gl.FRAGMENT_SHADER)!,program=gl.createProgram()!;
 try{
  gl.shaderSource(vertex,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}');gl.compileShader(vertex);
  gl.shaderSource(fragment,'#version 300 es\nprecision highp float;out vec4 c;void main(){vec2 p=gl_FragCoord.xy/256.;float v=0.;for(int i=0;i<32;i++)v+=sin(p.x*float(i)+p.y);c=vec4(fract(v),p,1.);}');gl.compileShader(fragment);
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);gl.viewport(0,0,256,256);gl.drawArrays(gl.TRIANGLES,0,3); // Compile/warm outside samples.
  const deadline=performance.now()+600;
  for(let frame=0;frame<12&&performance.now()<deadline;frame++){
   // Timer-based yield is bounded even if rAF is throttled by a hidden tab.
   await new Promise<void>(r=>setTimeout(r,16));if(document.visibilityState!=='visible'||gl.isContextLost())break;
   const start=performance.now();let v=.1;for(let i=0;i<40000;i++)v=Math.sqrt(v+i%17);if(Number.isFinite(v)&&frame>0)cpu.push(performance.now()-start);
   if(ext){while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift()!;samples.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
    const q=gl.createQuery();if(q){gl.beginQuery(ext.TIME_ELAPSED_EXT,q);gl.drawArrays(gl.TRIANGLES,0,3);gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push(q);}}
  }
  const median=(a:number[])=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)]??null;
  const reliable=document.visibilityState==='visible'&&!gl.isContextLost()&&!(ext&&gl.getParameter(ext.GPU_DISJOINT_EXT));
  const sample={gpuMs:samples.length>=3?median(samples):null,cpuMs:median(cpu),reliable};const tier=tierFromSample(sample);deviceProbeReport={...sample,tier};
  if(reliable)saveGraphics({tier,texture:tier,probeVersion:1});
 }finally{for(const q of queries)gl.deleteQuery(q);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
