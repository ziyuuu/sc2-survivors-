import {test} from 'node:test';import assert from 'node:assert/strict';import {Texture} from 'three';
import {configureSharedImageLoader} from './v01-shared-image-source-candidate';
function setup(bytes:number[],options:Record<string,unknown>={},extra:Record<string,unknown>={},native?:()=>Promise<any>){
 let calls=0;const imageLoader={isImageBitmapLoader:true,options:{premultiplyAlpha:'none',...options}},parser={json:{images:[{bufferView:0,mimeType:'image/png',extras:extra}]},getDependency:async()=>Uint8Array.from(bytes).buffer,loadImageSource:async()=>{calls++;if(native)return native();const texture=new Texture({width:4,height:4});texture.needsUpdate=true;return texture;}};
 configureSharedImageLoader({register(callback:any){callback(parser);return this;}} as any);return {parser,imageLoader,calls:()=>calls,load:()=>parser.loadImageSource(0,imageLoader)};
}
test('exact bytes and decoder options share one source with independent wrappers and metadata',async()=>{
 const a=setup([1,2,3,4],{}, {side:'a'}),b=setup([1,2,3,4],{}, {side:'b'}),ta=await a.load(),version=ta.source.version,tb=await b.load();
 assert.notEqual(ta,tb);assert.equal(ta.source,tb.source);assert.equal(a.calls(),1);assert.equal(b.calls(),0);assert.equal(ta.source.version,version);assert.ok(ta.version>0&&tb.version>0);assert.deepEqual(ta.userData,{side:'a',mimeType:'image/png'});assert.deepEqual(tb.userData,{side:'b',mimeType:'image/png'});
 ta.wrapS=1000;tb.wrapS=1001;ta.colorSpace='srgb';assert.equal(tb.wrapS,1001);assert.notEqual(ta.colorSpace,tb.colorSpace);
});
test('different bytes or decode options never share sources',async()=>{
 const a=setup([6,7,8]),b=setup([6,7,9]),c=setup([6,7,8],{imageOrientation:'flipY'}),textures=await Promise.all([a.load(),b.load(),c.load()]);assert.equal(new Set(textures.map(t=>t.source)).size,3);assert.deepEqual([a.calls(),b.calls(),c.calls()],[1,1,1]);
});
test('concurrent equal embedded images use one decoder result',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),a=setup([10,11,12],{},{},async()=>{await gate;return new Texture({width:2,height:2});}),b=setup([10,11,12]);const first=a.load();await new Promise(resolve=>setTimeout(resolve,20));const second=b.load();await new Promise(resolve=>setTimeout(resolve,20));release();const [x,y]=await Promise.all([first,second]);assert.equal(x.source,y.source);assert.equal(a.calls()+b.calls(),1);
});
test('failed decode is evicted and a fresh attempt can load',async()=>{
 const a=setup([20,21,22],{},{},async()=>{throw Error('decode failed');});await assert.rejects(a.load(),/decode failed/);const b=setup([20,21,22]);assert.ok((await b.load()).source);assert.equal(b.calls(),1);
});
test('invalid native result is evicted rather than poisoning retries',async()=>{
 const a=setup([23,24,25],{},{},async()=>({}));await assert.rejects(a.load(),/source unavailable/);const b=setup([23,24,25]);assert.ok((await b.load()).source);assert.equal(b.calls(),1);
});
test('external images and other loader types retain their native path',async()=>{
 const a=setup([30,31,32]),b=setup([30,31,32]);delete(a.parser.json.images[0] as any).bufferView;b.imageLoader.isImageBitmapLoader=false;const x=await a.load(),y=await b.load();assert.notEqual(x.source,y.source);assert.equal(a.calls(),1);assert.equal(b.calls(),1);
});
