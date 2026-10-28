import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HttpAssetStore,type HttpAssetManifest} from '../src/assets/http-store';
const data=new TextEncoder().encode('verified game resource'),hash=createHash('sha256').update(data).digest('hex');
const entry={url:`assets/${hash}.json`,bytes:data.length,sha256:hash,mime:'application/json'};
const manifest:HttpAssetManifest={version:1,release:'test',assets:{one:entry,two:entry}};
test('HTTP assets validate and share identical content across asset IDs',async()=>{
 let calls=0;const store=new HttpAssetStore(manifest,'https://cdn.example/game/',async(input)=>{calls++;assert.equal(String(input),'https://cdn.example/game/'+entry.url);return new Response(data);});
 await store.prepare(['one','two']);assert.equal(calls,1);assert.ok(store.urls.one.startsWith('blob:'));assert.equal(store.urls.one,store.urls.two);await store.prepare(['one']);assert.equal(calls,1);
 URL.revokeObjectURL(store.urls.one);
});
test('wrong cached bytes reload once; failed assets remain unavailable and can retry',async()=>{
 let calls=0;const store=new HttpAssetStore(manifest,'https://cdn.example/',async(_input,init)=>{calls++;if(calls===2)assert.equal(init?.cache,'reload');return new Response(calls<3?'corrupt':data);});
 await assert.rejects(store.prepare(['one']),/校验失败/);assert.equal(store.urls.one,undefined);await store.prepare(['one']);assert.ok(store.urls.one);URL.revokeObjectURL(store.urls.one);
});
test('missing IDs fail before requests; HTTP failure does not authorize a ready asset',async()=>{
 let calls=0;const store=new HttpAssetStore(manifest,'https://cdn.example/',async()=>{calls++;return new Response('',{status:404});});
 await assert.rejects(store.prepare(['absent']),/缺失/);assert.equal(calls,0);await assert.rejects(store.prepare(['one']),/404/);assert.equal(store.urls.one,undefined);
});

test('model cache retirement revokes shared encoded copies and reloads verified bytes without touching images',async()=>{
 const model={...entry,mime:'model/gltf-binary'},imageData=new TextEncoder().encode('image'),imageHash=createHash('sha256').update(imageData).digest('hex');
 const image={url:`assets/${imageHash}.png`,sha256:imageHash,bytes:imageData.length,mime:'image/png'};
 let calls=0;const store=new HttpAssetStore({version:1,release:'trim',assets:{body:model,death:model,icon:image}},'https://cdn.example/',async input=>{calls++;return new Response(String(input).endsWith('.png')?imageData:data);});
 await store.prepare(['body','death','icon']);const old=store.urls.body,icon=store.urls.icon;
 assert.equal(calls,2);assert.equal(store.trimModelCache(0).releasedBytes,data.length);
 assert.equal(store.urls.body,undefined);assert.equal(store.urls.death,undefined);assert.equal(store.urls.icon,icon);await assert.rejects(fetch(old));
 await store.prepare(['body','death']);assert.equal(calls,3);assert.notEqual(store.urls.body,old);assert.equal(store.urls.body,store.urls.death);
 assert.equal(await(await fetch(store.urls.body)).text(),new TextDecoder().decode(data));
 store.trimModelCache(0);URL.revokeObjectURL(icon);
});
