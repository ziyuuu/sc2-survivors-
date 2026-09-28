import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync as readLocalFile} from 'node:fs';
import {sha256} from '../src/platform/wechat/sha256';
import {WeChatAssetCache,type MiniAssetManifest,type MiniFileSystem,type MiniPlatform} from '../src/platform/wechat/asset-cache';
import {WeChatSaveBackend} from '../src/platform/wechat/save-backend';
import {writeArchive} from '../src/persistence/archive';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {SaveRepository} from '../src/persistence/save-repository';
import {assetUrl,configurePlatformAssetUrl} from '../src/assets/manifest';
import {WeChatGameSession} from '../src/platform/wechat/game-session';

class MemoryFiles implements MiniFileSystem {
 files=new Map<string,Uint8Array>();
 accessSync(path:string){if(!this.files.has(path))throw Error('missing');}
 mkdirSync(){}
 readdirSync(path:string){return [...this.files.keys()].filter(file=>file.startsWith(path+'/')).map(file=>file.slice(path.length+1)).filter(name=>!name.includes('/'));}
 statSync(path:string){const data=this.files.get(path);if(!data)throw Error('missing');return {size:data.byteLength};}
 readFileSync(path:string,encoding?:'utf8'):ArrayBuffer|string{const value=this.files.get(path);if(!value)throw Error('missing');return encoding==='utf8'?new TextDecoder().decode(value):value.slice().buffer;}
 writeFileSync(path:string,data:string){this.files.set(path,new TextEncoder().encode(data));}
 copyFileSync(source:string,target:string){this.files.set(target,new Uint8Array(this.readFileSync(source) as ArrayBuffer));}
 renameSync(source:string,target:string){this.files.set(target,new Uint8Array(this.readFileSync(source) as ArrayBuffer));this.files.delete(source);}
 unlinkSync(path:string){if(!this.files.delete(path))throw Error('missing');}
}
test('WeChat SHA-256 matches native SHA-256 including multi-block assets',()=>{
 for(const n of [0,1,3,55,56,63,64,65,1000,131071]){
  const bytes=Uint8Array.from({length:n},(_,i)=>i*17&255);
  assert.equal(sha256(bytes),createHash('sha256').update(bytes).digest('hex'));
 }
});
test('prepared platform assets override browser paths without changing the browser default',()=>{
 const defaultUrl=assetUrl('model.marine');
 configurePlatformAssetUrl(id=>id==='model.marine'?'wxfile://user/marine.glb':null);
 assert.equal(assetUrl('model.marine'),'wxfile://user/marine.glb');
 assert.equal(assetUrl('model.zergling'),null);
 configurePlatformAssetUrl(null);
 assert.equal(assetUrl('model.marine'),defaultUrl);
});
test('WeChat asset cache validates bytes, reuses verified cache and rejects a corrupt download',async()=>{
 const files=new MemoryFiles(),bytes=new TextEncoder().encode('original-sc-model');
 const digest=sha256(bytes),manifest:MiniAssetManifest={schema:1,rulesId:'mvp-1.0',mapId:'kairos',assetCount:1,totalBytes:bytes.length,assets:{'model.marine':{path:'assets/model.marine.glb',bytes:bytes.length,sha256:digest,kind:'model'}}};
 let downloads=0,corrupt=false;
 const wx:MiniPlatform={env:{USER_DATA_PATH:'wxfile://user'},getFileSystemManager:()=>files as MiniFileSystem,downloadFile({success}){
  downloads++;files.files.set('/download',corrupt?new TextEncoder().encode('wrong bytes'):bytes);
  queueMicrotask(()=>success({statusCode:200,tempFilePath:'/download'}));return {};
 }};
 const cache=new WeChatAssetCache(wx,manifest,'https://assets.example.com/game');
 assert.equal(await cache.prepareOne('model.marine'),`wxfile://user/sc2-assets/${digest}`);
 assert.equal(await cache.prepareOne('model.marine'),`wxfile://user/sc2-assets/${digest}`);
 assert.equal(downloads,1);
 const second=new WeChatAssetCache(wx,manifest,'https://assets.example.com/game');
 assert.equal(await second.prepareOne('model.marine'),`wxfile://user/sc2-assets/${digest}`);
 assert.equal(downloads,1);
 files.files.set(`wxfile://user/sc2-assets/${digest}`,new TextEncoder().encode('bad'));
 corrupt=true;
 const third=new WeChatAssetCache(wx,manifest,'https://assets.example.com/game');
 await assert.rejects(third.prepareOne('model.marine'),/完整性校验失败/);
});
test('WeChat cache keeps a bounded working set and never evicts an active scene',async()=>{
 const files=new MemoryFiles(),one=new TextEncoder().encode('alpha1'),two=new TextEncoder().encode('bravo2');
 const assets={'model.one':{path:'assets/one.glb',bytes:6,sha256:sha256(one),kind:'model'},'model.two':{path:'assets/two.glb',bytes:6,sha256:sha256(two),kind:'model'}};
 const manifest:MiniAssetManifest={schema:1,rulesId:'mvp-1.0',mapId:'kairos',assetCount:2,totalBytes:12,assets};
 const wx:MiniPlatform={env:{USER_DATA_PATH:'wxfile://user'},getFileSystemManager:()=>files as MiniFileSystem,downloadFile({url,success}){
  files.files.set('/download',url.endsWith('one.glb')?one:two);
  queueMicrotask(()=>success({statusCode:200,tempFilePath:'/download'}));return {};
 }};
 const cache=new WeChatAssetCache(wx,manifest,'https://assets.example.com/game',10);
 assert.throws(()=>cache.setActiveIds(['model.one','model.two']),/超过/);
 cache.setActiveIds(['model.one']);await cache.prepareOne('model.one');
 await assert.rejects(cache.prepare(['model.two']),/超过/);
 assert.equal(files.readdirSync('wxfile://user/sc2-assets').length,1);
 cache.setActiveIds(['model.two']);await cache.prepareOne('model.two');
 assert.equal(cache.get('model.one'),null);
 assert.equal(cache.get('model.two'),`wxfile://user/sc2-assets/${assets['model.two'].sha256}`);
 assert.equal(files.readdirSync('wxfile://user/sc2-assets').length,1);
});
test('failed scene preparation releases only its temporary asset protection',async()=>{
 const files=new MemoryFiles();
 const contents={'model.one':'alpha1','model.two':'bravo2','model.three':'charl3'} as const;
 const assets=Object.fromEntries(Object.entries(contents).map(([id,value])=>[id,{path:`assets/${id}.glb`,bytes:6,sha256:sha256(new TextEncoder().encode(value)),kind:'model'}]));
 const manifest:MiniAssetManifest={schema:1,rulesId:'mvp-1.0',mapId:'kairos',assetCount:3,totalBytes:18,assets};
 const wx:MiniPlatform={env:{USER_DATA_PATH:'wxfile://user'},getFileSystemManager:()=>files as MiniFileSystem,downloadFile({url,success}){
  const id=url.match(/model\.(one|two|three)\.glb$/)?.[0]?.replace('.glb','') as keyof typeof contents;
  files.files.set('/download',new TextEncoder().encode(id==='model.two'?'broken':contents[id]));
  queueMicrotask(()=>success({statusCode:200,tempFilePath:'/download'}));return {};
 }};
 const cache=new WeChatAssetCache(wx,manifest,'https://assets.example.com/game',12);
 await cache.prepare(['model.one']);
 await assert.rejects(cache.prepare(['model.two']),/完整性校验失败/);
 await cache.prepare(['model.three']);
 assert.ok(cache.get('model.one'));
 assert.ok(cache.get('model.three'));
});
test('WeChat saves preserve current and two backups in the existing archive format',async()=>{
 const files=new MemoryFiles(),backend=new WeChatSaveBackend({env:{USER_DATA_PATH:'wxfile://user'},getFileSystemManager:()=>files as never});
 const profile=new PermanentProfile().exportJSON();
 const archives=[1,2,3].map(time=>writeArchive({profile,run:null},time));
 for(const archive of archives)await backend.commit(archive);
 assert.deepEqual(await backend.read(),[archives[2],archives[1],archives[0]]);
 files.files.set('wxfile://user/sc2-save/current.json',new TextEncoder().encode('corrupt'));
 assert.deepEqual(await backend.read(),['corrupt',archives[1],archives[0]]);
 const recovered=await new SaveRepository(backend).load();
 assert.equal(recovered.raw,archives[1]);
 assert.match(recovered.notice,/备份/);
});
test('WeChat session uses the same map and preserves race, difficulty and pause on load',async()=>{
 const map=new Uint8Array(readLocalFile('public/assets/map/kairos.json'));
 const files=new MemoryFiles(),manifest:MiniAssetManifest={schema:1,rulesId:'mvp-1.0',mapId:'kairos',assetCount:1,totalBytes:map.byteLength,assets:{'map.kairos':{path:'assets/map/kairos.json',bytes:map.byteLength,sha256:sha256(map),kind:'map-data'}}};
 const wx:MiniPlatform={env:{USER_DATA_PATH:'wxfile://user'},getFileSystemManager:()=>files as MiniFileSystem,downloadFile({success}){
  files.files.set('/download',map);queueMicrotask(()=>success({statusCode:200,tempFilePath:'/download'}));return {};
 }};
 const backend=new WeChatSaveBackend(wx);
 const cache=new WeChatAssetCache(wx,manifest,'https://assets.example.com/game');
 const session=await WeChatGameSession.open(wx,cache,backend);
 await session.newRun('zerg','hard');
 for(let i=0;i<60;i++)session.step();
 await session.hide();
 const resumed=await WeChatGameSession.open(wx,new WeChatAssetCache(wx,manifest,'https://assets.example.com/game'),backend);
 assert.equal(resumed.world.runConfig?.race,'zerg');
 assert.equal(resumed.world.difficulty,'hard');
 assert.equal(resumed.world.phase,'battle');
 assert.equal(resumed.world.paused,true);
 assert.equal(resumed.world.tick,60);
 for(const name of ['current','backup1','backup2'])files.files.set(`wxfile://user/sc2-save/${name}.json`,new TextEncoder().encode('invalid archive'));
 await assert.rejects(WeChatGameSession.open(wx,new WeChatAssetCache(wx,manifest,'https://assets.example.com/game'),backend),/存档无法验证/);
});
