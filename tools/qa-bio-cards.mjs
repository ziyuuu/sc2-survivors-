import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const base=process.env.SC2_QA_URL??'http://127.0.0.1:5199';
async function checkArtwork(cards){
 return cards.evaluateAll(async elements=>{
  const sources=new Map();
  for(const card of elements){
   const art=card.querySelector('.imx-art');
   const subjects=art?.querySelectorAll('img,svg image,.imx-object')??[];
   const cardId=card.getAttribute('data-card-id');
   if(!subjects.length)throw Error(cardId+' has no artwork');
   for(const element of [...subjects,art]){
    const raw=element instanceof HTMLImageElement?element.currentSrc||element.src:element.getAttribute('href');
    const backgrounds=Array.from(getComputedStyle(element).backgroundImage.matchAll(/url\("([^"]+)"\)/g),m=>m[1]);
    if(element!==art&&!raw&&!backgrounds.length)throw Error(cardId+' has an empty image');
    for(const src of [...(raw?[raw]:[]),...backgrounds])sources.set(new URL(src,element.baseURI).href,cardId);
   }
  }
  await Promise.all([...sources].map(async([url,cardId])=>{
   const image=new Image();image.src=url;
   try{await image.decode();if(image.naturalWidth&&image.naturalHeight)return;}catch{}
   const response=await fetch(url);
   throw Error(cardId+' cannot decode '+url+' ('+response.status+' '+response.headers.get('content-type')+')');
  }));
  return [...sources.keys()];
 });
}
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
try{
 const seen=new Set();
 for(const [width,height] of [[1440,900],[844,390],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<1000,isMobile:width<1000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
  await page.goto(base+'/preview/bio-synergy-20261118/cards.html');
  const select=page.getByRole('combobox'),cards=page.locator('#reward-cards>.im-card');
  const images=new Set();
  for(let i=0;i<15;i++){
   await select.selectOption(String(i));await cards.last().locator('.imx-copy').waitFor();
   assert.equal(await cards.count(),3);assert.equal(await cards.locator('.branch-mark').count(),i<11?3:0);
   for(const url of await checkArtwork(cards))images.add(url);
   for(const card of await cards.all()){
    seen.add(await card.getAttribute('data-card-id'));
    const flip=card.locator('.imx-copy');const brief=await flip.innerText();
    await flip.click();assert.notEqual(await flip.innerText(),brief);await flip.click();
    assert.ok(await card.locator('.imx-art .painted-art,.imx-art .imx-object').count()>0);
   }
  }
  assert.deepEqual(errors,[]);await page.close();console.log(width,height,'45 cards passed;',images.size,'distinct images decoded');
 }
 assert.equal(seen.size,45);
}finally{await browser.close()}
