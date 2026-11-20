import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';

const base=process.env.SC2_QA_URL??'http://127.0.0.1:5199';
const out=path.resolve(process.env.SC2_DOOMSDAY_CARD_OUTPUT??'reports/local/doomsday-shop-cards-20261118');
const groups={W:'白色',G:'绿色',B:'蓝色',P:'普通紫卡',N:'紫色节点',O:'橙色'};
const escapeHtml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function gallery(cards){
 const links=Object.entries(groups).map(([key,name])=>`<a href="#group-${key}">${name}</a>`).join('');
 const sections=Object.entries(groups).map(([key,name])=>{
  const items=cards.filter(c=>c.id[2]===key).map(c=>`<details id="${c.id}"><summary aria-label="${escapeHtml(c.name)}，展开或收起详情"><img alt="${escapeHtml(c.name+'。'+c.brief)}" width="${c.width}" height="${c.height}" src="data:image/jpeg;base64,${c.jpeg}"></summary><p>${escapeHtml(c.detail)}</p></details>`).join('');
  return `<section id="group-${key}"><h2>${name}</h2><div class="shelf">${items}</div></section>`;
 }).join('');
 return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>末日兵器 · 购卡卡面</title>
<style>*{box-sizing:border-box}html{color-scheme:dark}body{margin:0 auto;max-width:1180px;padding:24px clamp(12px,3vw,36px) 60px;background:#09131c;color:#e2ecee;font:16px/1.6 "Microsoft YaHei UI",sans-serif}h1{font-size:25px;margin:0}header p,nav{margin:8px 0}nav{display:flex;flex-wrap:wrap;gap:8px 20px}a{color:#a7d8f0}h2{font-size:18px;margin:26px 0 10px}.shelf{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,275px),1fr));gap:16px;align-items:start}summary{display:block;cursor:pointer}summary::-webkit-details-marker{display:none}summary:focus-visible,details:target{outline:2px solid #b0e1ff;outline-offset:3px}img{display:block;width:100%;height:auto}details>p{margin:0;padding:14px 18px;background:#192733;white-space:pre-line}section,details{scroll-margin-top:12px}</style>
<header><h1>末日兵器 · 购卡卡面</h1><p>点击卡面查看详情。</p><nav aria-label="按品质查看">${links}</nav></header>${sections}</html>`;
}

await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.route('**/doomsday-card-capture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><base href="/"><link rel="icon" href="data:,"><div id="game-root"><div id="interface" class="game-frame" data-device="desktop"><section id="overlay"></section></div></div></html>'}));
 await page.goto(base+'/doomsday-card-capture');
 const definitions=await page.evaluate(async()=>{
  await import('/src/ui/presentation/game-shell.css');
  await import('/src/ui/presentation/text-scale-reference.generated.css');
  const {World}=await import('/src/simulation/world.ts');
  const {DOOMSDAY_CARDS}=await import('/src/data/terran-doomsday.ts');
  const {DOOMSDAY_BRIEF}=await import('/src/data/terran-doomsday-copy.ts');
  const {newBuildProgress}=await import('/src/simulation/progression/build-progress.ts');
  const {newDoomsdayState}=await import('/src/simulation/combat/doomsday-state.ts');
  const {reconcileMechanicalSeats}=await import('/src/simulation/combat/doomsday-roster.ts');
  const {IntermissionNavigation,renderIntermission}=await import('/src/ui/presentation/intermission.ts');
  const {mountIntermissionSkin}=await import('/src/ui/intermission-skin/skin.ts');
  const {mountOverlayLayout}=await import('/src/ui/presentation/overlay-layout.ts');
  const {assetUrl}=await import('/src/assets/manifest.ts');
  const root=document.querySelector('#overlay');
  mountOverlayLayout(root,document.querySelector('#interface'));
  const w=new World({race:'terran',seed:171145,waves:false,terrain:false,obstacles:[]});
  w.start();
  for(const type of ['marine','tank','thor','science_vessel','medivac','hellion','viking','banshee'])w.addUnit(type,'terran',0,0,5);
  w.acquireHero('raynor');w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
  w.wallet={minerals:10000,gas:10000};w.expedition.freePurchasesRemaining=0;
  const nav=new IntermissionNavigation(),skin=mountIntermissionSkin(root,()=>w,{assets:{resolve:key=>assetUrl('ui.intermission.'+key)}});
  window.showShopCards=async ids=>{
   const cards=ids.map(id=>DOOMSDAY_CARDS.find(c=>c.id===id)),first=cards[0];
   const b=w.expedition.build=newBuildProgress();w.expedition.doomsday=newDoomsdayState();
   w.rewards=[];
   if(first.purchase==='node'||first.purchase==='orange'){
    b.counts.doomsday=first.purchase==='orange'?12:3;
    if(first.purchase==='orange'){
     b.main='doomsday';b.orangeAt=12;
     for(const [i,id] of ['M-N01','M-N02','M-N03'].entries()){
      b.milestones.push({id:'doomsday:'+3*(i+1),branch:'doomsday',at:3*(i+1),offers:[id,'M-N04','M-N05'],claimed:id});
      w.expedition.doomsday.ranks[id]=1;
     }
     reconcileMechanicalSeats(w,true);
    }
    const at=b.counts.doomsday;b.milestones.push({id:'doomsday:'+at,branch:'doomsday',at,offers:ids,claimed:null});
   }else{
    w.rewards=cards.map(c=>({id:'doomsday.'+c.id,offerId:c.id,sold:false,name:c.name,description:DOOMSDAY_BRIEF[c.id],
     icon:'tech.attack',rarity:c.quality,kind:'buff',value:c.id,minerals:c.price[0],gas:c.price[1],baseMinerals:c.price[0],baseGas:c.price[1],
     discount:0,expeditionWindow:w.expedition.draftWindow,expeditionRound:'random',expeditionEffect:{kind:'doomsday',cardId:c.id,expectedRank:0}}));
   }
   root.innerHTML=renderIntermission(w,'',nav);skin.refresh();
   const urls=new Set();
   for(const el of root.querySelectorAll('img,svg image,.imx-object')){
    const url=el.getAttribute('src')??el.getAttribute('href')??el.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if(url)urls.add(url);
   }
   urls.add(assetUrl('ui.intermission.background-terran'));
   await Promise.all([...urls].map(async url=>{const img=new Image();img.src=url;await img.decode();}));
   await document.fonts.ready;
   await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
  };
  return DOOMSDAY_CARDS.map(({id,name,price,purchase,quality})=>({id,name,price,purchase,quality}));
 });
 const cards=[];
 for(const group of Object.keys(groups)){
  const tier=definitions.filter(c=>c.id[2]===group),size=3;
  for(let i=0;i<tier.length;i+=size){
   const batch=tier.slice(i,i+size);
   const ids=batch.map(c=>c.id);
   await page.evaluate(ids=>window.showShopCards(ids),ids);
   const shelf=page.locator('.intermission-screen>.im-choice-grid>.im-card');
   assert.equal(await shelf.count(),ids.length);
   for(const [j,c] of batch.entries()){
    const card=shelf.nth(j),copy=card.locator('.imx-copy');
    assert.equal(await card.locator('.imx-name').innerText(),c.name);
    assert.equal(await card.getAttribute('data-quality'),c.quality);
    assert.ok(await card.locator('.im-card-action').isEnabled(),c.name+' 应可获取');
    assert.equal((await card.locator('.im-card-action').innerText()).trim(),c.purchase==='node'||c.purchase==='orange'?'免费领取':'购买');
    assert.deepEqual(await card.locator('.im-card-price b').allTextContents(),c.price.map(String));
    assert.equal(await card.locator('.armed-node-symbol').count(),Number(c.purchase==='node'));
    assert.ok(await card.locator('.imx-object,.im-unit-painting').count()>0,c.name+' 缺少图稿');
    const brief=(await copy.innerText()).trim(),box=await card.boundingBox();
    assert.ok(box&&box.width>=200&&box.height>=200);
    const jpeg=(await card.screenshot({type:'jpeg',quality:93,animations:'disabled'})).toString('base64');
    if(c.id==='M-P05')await card.screenshot({path:path.join(out,'M-P05.png'),animations:'disabled'});
    await copy.click();assert.equal(await copy.getAttribute('aria-expanded'),'true');
    const detail=(await copy.innerText()).trim();
    assert.equal(detail,await copy.getAttribute('data-detail'));assert.notEqual(detail,brief,c.name);
    await copy.click();assert.equal((await copy.innerText()).trim(),brief);
    cards.push({...c,brief,detail,jpeg,width:Math.round(box.width),height:Math.round(box.height)});
   }
  }
 }
 assert.equal(new Set(cards.map(c=>c.id)).size,45);
 assert.deepEqual(errors,[]);
 const file=path.join(out,'cards.html');
 await fs.writeFile(file,gallery(cards));
 await page.goto(pathToFileURL(file).href+'#M-P05');
 assert.equal(await page.locator('details').count(),45);
 await page.locator('#M-P05 summary').click();
 assert.equal(await page.locator('#M-P05 p').innerText(),cards.find(c=>c.id==='M-P05').detail);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.images].every(img=>img.complete&&img.naturalWidth>0)));
 console.log(JSON.stringify({cards:cards.length,flips:2*cards.length,groups:Object.keys(groups).length,file,errors}));
}finally{await browser.close();}
