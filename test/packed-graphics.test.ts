import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readGraphics,deviceTier,deviceBudget,graphicsPixelRatio} from '../src/platform/graphics-profile';
import {HttpAssetStore} from '../src/assets/http-store';
import {PreparationLane} from '../src/platform/preparation-budget';
import {SoundVariation,SOUND_DATA} from '../src/render/effects/audio-source-data';
import {audioPreloadBanks} from '../src/app/audio-preload-plan';

test('automatic selection is conservative with missing signals and independent of pointer type',()=>{
 assert.equal(deviceTier({}),'medium');assert.equal(deviceTier({memory:2,cores:8,coarse:false}),'low');
 assert.equal(deviceTier({memory:8,cores:8,coarse:true}),deviceTier({memory:8,cores:8,coarse:false}));
 assert.ok(deviceBudget({memory:2,cores:2}).packBytes<deviceBudget({memory:8,cores:8}).packBytes);
 assert.equal(readGraphics({getItem:()=>null},{}).preset,'auto');
 assert.equal(readGraphics({getItem:k=>k==='sc2.renderQuality'?'native':null},{}).preset,'custom');
 assert.equal(readGraphics({getItem:()=>'{broken'},{}).texture,'high');
});
test('low and medium actually reduce DPR1 pixels; explicit native retains DPR3',()=>{
 for(const dpr of [1,2,3]){assert.ok(graphicsPixelRatio('high',dpr)>graphicsPixelRatio('balanced',dpr));assert.ok(graphicsPixelRatio('balanced',dpr)>graphicsPixelRatio('performance',dpr));}
 assert.equal(graphicsPixelRatio('native',3),3);assert.equal(graphicsPixelRatio('performance',1),.7);
});
test('variant is chosen before download; failed upgrade leaves the active tier and URL intact',async()=>{
 const hi=Buffer.from('high source'),lo=Buffer.from('low source');const row=(b:Buffer)=>{const h=createHash('sha256').update(b).digest('hex');return {url:`assets/${h}.webp`,sha256:h,bytes:b.length,mime:'image/webp'};};const high=row(hi),low=row(lo),requests:string[]=[];let fail=true;
 const store=new HttpAssetStore({version:1,release:'tiers',assets:{world:{...high,variants:{low}},icon:high}},'https://example.test/',async input=>{const u=String(input);requests.push(u);return new Response(u.endsWith(low.url)?lo:fail?'corrupt':hi);});store.activeTier='low';store.cache.get=async()=>null;store.cache.put=async()=>true;
 await store.prepare(['world']);assert.equal(requests.length,1);assert.ok(requests[0].endsWith(low.url));const old=store.urls.world;
 await assert.rejects(store.urlForTier('world','high'),/校验/);assert.equal(store.activeTier,'low');assert.equal(store.urls.world,old);
 fail=false;await store.urlForTier('world','high');store.commitTier('high');assert.notEqual(store.urls.world,old);store.releaseOldVariants();URL.revokeObjectURL(store.urls.world);
});
test('decode lane bounds concurrent work and continues after failure',async()=>{
 const lane=new PreparationLane(()=>2);let active=0,peak=0;
 const result=await Promise.allSettled(Array.from({length:8},(_,i)=>lane.run(async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;if(i===2)throw Error('decode');return i;})));
 assert.equal(peak,2);assert.equal(result.filter(r=>r.status==='fulfilled').length,7);assert.equal(lane.report().active,0);
});
test('dialogue preview leaves RNG and sequential cursor untouched',()=>{
 for(const bank of Object.values(SOUND_DATA.banks).filter(b=>b.samples.length>2).slice(0,20)){const a=new SoundVariation(),b=new SoundVariation();for(let i=0;i<15;i++){a.preview(bank.id,bank,true,2);assert.deepEqual(a.sample(bank.id,bank,true),b.sample(bank.id,bank,true));}}
});
test('opening audio closure covers current weapons but excludes unselected hero dialogue',()=>{
 const plan=audioPreloadBanks('terran',1,[{heroId:'raynor'}]);assert.ok(plan.combat.includes(SOUND_DATA.weapons.marine.attack!));
 assert.ok(SOUND_DATA.dialogue['hero:raynor'].every(b=>plan.dialogue.includes(b)));assert.ok(SOUND_DATA.dialogue['hero:dehaka'].every(b=>!plan.dialogue.includes(b)));
 const samples=new Set(plan.combat.flatMap(b=>SOUND_DATA.banks[b].samples.map(s=>s.asset)));assert.ok(samples.size<800,`${samples.size} battle samples`);
});
