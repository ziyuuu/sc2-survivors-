import * as THREE from 'three';
import {splitTerrainLayers} from './map-surface';

/** SC2 terrain alpha contains blend/height data, not surface transparency.
 * A 2D canvas round trip premultiplies it and destroys RGB at zero alpha.
 * Decode straight pixels, then copy RGB through an opaque GPU target once.
 */
export async function readTerrainPixels(url:string){
 const response=await fetch(url);if(!response.ok)throw Error('地表纹理读取失败：'+response.status);
 const bitmap=await createImageBitmap(await response.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
 if(!gl){bitmap.close();throw Error('地表纹理需要 WebGL2');}
 const texture=gl.createTexture(),program=gl.createProgram()!,shaders:WebGLShader[]=[];
 try{
  const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)??'地表解码着色器失败');gl.attachShader(program,s);};
  shader(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}');
  shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;uniform sampler2D atlas;in vec2 uv;out vec4 color;void main(){color=vec4(texture(atlas,uv).rgb,1.0);}');
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'地表解码程序失败');
  gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);gl.uniform1i(gl.getUniformLocation(program,'atlas'),0);gl.disable(gl.BLEND);gl.disable(gl.DITHER);
  gl.viewport(0,0,bitmap.width,bitmap.height);gl.drawArrays(gl.TRIANGLES,0,3);
  const pixels=new Uint8Array(bitmap.width*bitmap.height*4);gl.readPixels(0,0,bitmap.width,bitmap.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  if(gl.getError()!==gl.NO_ERROR)throw Error('地表像素读取失败');
  return {pixels,width:bitmap.width,height:bitmap.height};
 }finally{
  gl.deleteTexture(texture);gl.deleteProgram(program);for(const shader of shaders)gl.deleteShader(shader);gl.getExtension('WEBGL_lose_context')?.loseContext();bitmap.close();canvas.width=canvas.height=1;
 }
}
export async function campaignTerrainArray(url:string){
 const decoded=await readTerrainPixels(url),{pixels,side}=splitTerrainLayers(decoded.pixels,decoded.width,decoded.height);
 const texture=new THREE.DataArrayTexture(pixels,side,side,8);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;return texture;
}
