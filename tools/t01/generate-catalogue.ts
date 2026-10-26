import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ALL_FAMILIES} from '../../src/data/races';
import {ASSETS} from '../../src/assets/manifest';
import {mapAnimations} from '../../src/render/loaders/animations';
import {displayModelKey,displayAssetModelKey} from '../../src/render/materials/elite-visual';
import {ELITES} from '../../src/data/elites';
import {HEROES} from '../../src/data/heroes';
import {draftContext,purchaseOffer} from '../../src/simulation/expedition-economy';
import {catalogueCards} from '../../src/ui/presentation/intermission';
import {isolatedCardWorld,prepareCardWorld,prepareCardQuote,inspection} from './card-fixture';
import {FUN_SHOP_IDS,funShopCatalogue} from '../../src/simulation/fun-shop/state';
const base='reports/local/t01-20261024',sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const cards=new Map<string,unknown>(),sources=new Map<string,unknown>();
let uiCards:ReturnType<typeof catalogueCards>|undefined;
for(const family of ALL_FAMILIES){
 const w=isolatedCardWorld(family);uiCards??=catalogueCards(w);
 for(let level=0;level<=4;level++){
  const levels=Object.fromEntries(FUN_SHOP_IDS.map(id=>[id,Math.min(level,Math.max(...funShopCatalogue().filter(c=>c.item===id).map(c=>c.level)))]));const ctx=prepareCardWorld(w,family,levels);
  for(const c of inspection.t01NativePool(ctx)){
   const variants=c.effect.kind==='elite'?Object.values(ELITES).filter(e=>e.family===(c.effect as any).family).map(e=>e.id):[null];
   for(const variant of variants){const key=w.expedition.race+':'+c.id+(variant?':'+variant:'');if(!cards.has(key))cards.set(key,{id:'native-card:'+key,name:c.name+(variant?' · '+ELITES[variant].name:''),group:'当前可触发卡牌',runner:'card',actor:c.id,race:w.expedition.race,family,seconds:12,data:{effect:c.effect,rarity:c.rarity,levels,variant},source:['src/simulation/progression/expedition-drafts.ts','src/simulation/expedition-economy.ts']});}
  }
 }
}
// Mid/end-tier supply offers require actual native research eligibility. An
// opening research fixture cannot establish the complete legal supply pool.
for(const family of ALL_FAMILIES){
 const w=isolatedCardWorld(family),ctx=prepareCardWorld(w,family,{},true);
 for(const c of inspection.t01NativePool(ctx))if(c.effect.kind==='supply'&&c.effect.family===family){
  const key=w.expedition.race+':'+c.id;if(!cards.has(key))cards.set(key,{id:'native-card:'+key,name:c.name,group:'当前可触发卡牌',runner:'card',actor:c.id,race:w.expedition.race,family,seconds:12,data:{effect:c.effect,rarity:c.rarity,levels:{},supplyResearch:true,precondition:'所属产线系统已解锁；武器2级与防护2级，保留原生供给阶级/人数门槛'},source:['src/simulation/progression/expedition-drafts.ts','src/simulation/progression/supply-cards.ts','src/simulation/expedition-economy.ts']});
 }
}
for(const c of [...cards.values()] as any[])if(c.data.effect.kind==='support'&&c.data.effect.support!=='strategic')for(let rank=2;rank<=3;rank++){const key=c.id+':level:'+rank;cards.set(key,{...c,id:key,name:c.name+' · '+rank+'级',data:{...c.data,prerequisitePurchases:rank-1}});}
const manifest=JSON.parse(await fs.readFile(base+'/web/asset-manifest.json','utf8'));
const build=JSON.parse(await fs.readFile(base+'/build.json','utf8'));
const resources=new Map<string,{source:string;sha256:string}>(build.resources.map((r:any)=>[r.url,r]));
const actors=[...ALL_FAMILIES.map(id=>({id,family:id})),...Object.entries(HEROES).map(([id,h])=>({id:'hero.'+id,family:h.baseFamily,heroId:id,modelKey:h.model})),...Object.entries(ELITES).map(([id,e])=>({id:'elite.'+id,family:e.family,eliteId:id,modelKey:e.model}))];
const mapping=[];
for(const actor of actors){
 const key=displayModelKey({...actor,unitType:actor.family} as any),assetKey=displayAssetModelKey(key),files=[];
 for(const suffix of ['', '.death', '.siege','.morph']){
  const id='model.'+assetKey+suffix,a=manifest.assets[id];if(!a)continue;const r=resources.get(a.url);if(!r)throw Error('Missing asset source '+id);
  const bytes=await fs.readFile(r.source);if(sha(bytes)!==a.sha256)throw Error('Changed asset '+id);
  const length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length).toString('utf8'));
  const clips=(g.animations??[]).map((clip:any)=>({name:clip.name,duration:Math.max(0,...clip.samplers.map((s:any)=>g.accessors[s.input].max?.[0]??0))}));
  const selected=mapAnimations(clips as any,suffix?undefined:key);
  files.push({id,sha256:a.sha256,clips,mapping:Object.fromEntries(Object.entries(selected).map(([name,clip])=>[name,clip?{name:clip.name,seconds:clip.duration}:null]))});
  sources.set(id,{id,file:r.source,sha256:a.sha256});
 }
 mapping.push({...actor,key,assetKey,files,hitPolicy:files[0]?.mapping.hit?'Native source hit clip exists; trigger feedback still needs render inspection':'No separate mapped Hit clip. Inspect production shield/health impact, material flash and actual HP delta; do not invent a clip.'});
}
const currentIds=new Set([...cards.values()].map((c:any)=>c.race+':'+c.actor));
const visibleOnly=uiCards!.filter(c=>!currentIds.has(c.id)).map(c=>({id:c.id,name:c.name,group:c.group,classification:'UI catalogue entry without a candidate in audited controlled pool; requires explicit applicability audit, not silently tested or removed'}));
const purchases=[];
for(const c of cards.values() as Iterable<any>){const w=isolatedCardWorld(c.family),offer=prepareCardQuote(w,c);const before={...w.wallet};const ok=purchaseOffer(w,offer.offerId,c.data.variant??undefined);purchases.push({id:c.id,ok,effect:offer.expeditionEffect,paid:offer.purchaseReceipt,walletDelta:{minerals:w.wallet.minerals-before.minerals,gas:w.wallet.gas-before.gas},sold:offer.sold});}
await fs.writeFile(base+'/native-card-purchase-audit.json',JSON.stringify({scope:'Current native quote and purchase in each controlled fixture. Rendering and delayed/combat effects remain separate.',count:purchases.length,failed:purchases.filter(p=>!p.ok),rows:purchases},null,2));
await fs.writeFile('tools/t01/native-cards.generated.json',JSON.stringify([...cards.values()],null,2)+'\n');
await fs.writeFile(base+'/model-animation-mapping.json',JSON.stringify({actors:mapping,assets:[...sources.values()]},null,2));
await fs.writeFile(base+'/catalogue-crosscheck.json',JSON.stringify({nativeCardCount:cards.size,uiCatalogueCount:uiCards!.length,uiOnly:visibleOnly,actors:mapping.length,models:sources.size,completeness:false,pending:['Secondary forms and abilities','Equipment condition/binding branches','Gameplay branch coverage','UI-only entries classification']},null,2));
console.log(JSON.stringify({cards:cards.size,ui:uiCards!.length,uiOnly:visibleOnly.length,actors:mapping.length,models:sources.size}));
