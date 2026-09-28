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
