import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {DOOMSDAY_CARDS,type DoomsdayId} from '../src/data/terran-doomsday';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {World} from '../src/simulation/world';
import {prepareShop} from '../preview/doomsday-showcase-20261117/shop-fixture';

const base=(process.env.SC2_QA_URL??'http://127.0.0.1:5199')+'/preview/doomsday-showcase-20261117/';
const out=path.resolve('reports/local/doomsday-shop-ui-20261118');
await fs.mkdir(out,{recursive:true});
for(const card of DOOMSDAY_CARDS){
  const w=new World({race:'terran',seed:171145});
  prepareShop(w,card.id);
  const m=pendingBuildChoice(w);
  if(card.purchase==='node'||card.purchase==='orange'){
    assert.equal(m?.offers.length,3);
    const before={...w.wallet};
    assert.ok(w.claimBuildChoice(m!.id,w.expedition.shopRevision,card.id),card.id);assert.deepEqual(w.wallet,before);
  }else{
    assert.equal(w.rewards.length,3);
    const r=w.rewards.find(r=>r.id==='doomsday.'+card.id)!;
    const {minerals,gas}=w.wallet;
    assert.ok(w.purchaseShopOffer(w.draftWindowKey,r.offerId),card.id);
    assert.deepEqual(w.wallet,{minerals:minerals-r.minerals,gas:gas-r.gas});
  }
  assert.equal(w.expedition.doomsday?.ranks[card.id],1);
}
console.log('45 / 45 transactions');

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
  for(const [branch,initial] of [['doomsday',0],['armed',0],['doomsday',9],['armed',9]] as const){
    const mobile=branch==='armed';
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    try{
      if(initial===9){
        await page.goto(base+'shop.html?branch='+branch+'&after=9');
      }else if(mobile){
        await page.goto(base+'shops.html');
        await page.locator('a[href$="branch=armed"]').click();
      }else{
        await page.goto(new URL('../terran-branch-marks-20261118/?view=shelf',base).href);
      }
      const cards=page.locator('#reward-cards>.im-card');
      await cards.last().locator('.branch-mark').waitFor({timeout:120000});
      const badge=cards.locator('.imx-art>.branch-mark[data-branch="'+branch+'"]');
      assert.equal(await badge.count(),3);
      const dims=await badge.first().evaluate(el=>{
        const a=el.parentElement!.getBoundingClientRect(),b=el.getBoundingClientRect();
        return {size:b.width,left:b.left-a.left,bottom:a.bottom-b.bottom};
      });
      assert.ok(Math.abs(dims.size-(mobile?24:36))<1&&Math.abs(dims.left-dims.bottom)<1&&dims.left>0);
      const state=()=>page.evaluate(({branch,initial})=>{
        const w=(window as any).__SC2_DEBUG__.world,b=w.expedition.build;
        return {progress:b?.counts[branch]??0,main:b?.main??null,wallet:{...w.wallet},choice:b?.milestones.find((m:any)=>m.at===initial+3)?.claimed??null};
      },{branch,initial});
      assert.deepEqual((await state()).wallet,{minerals:100000,gas:100000});
      if(!initial)await page.screenshot({path:path.join(out,branch+'-three-cards.png'),animations:'disabled'});
      for(const [n,i] of [2,0,1].entries()){
        await cards.nth(i).locator('[data-action="reward"]').click();
        await page.waitForFunction(({branch,expected})=>(window as any).__SC2_DEBUG__.world.expedition.build?.counts[branch]===expected,{branch,expected:initial+n+1});
        if(n<2){
          assert.equal(await page.locator('[data-action="armed-node"]').count(),0);
          assert.equal(await badge.count(),3);
        }
      }
      const choices=page.locator('[data-action="armed-node"]');
      await choices.last().waitFor();
      assert.equal(await choices.count(),3);
      assert.equal(await page.locator('.imx-art>.branch-mark').count(),0);
      assert.equal(await page.locator('.imx-art>.armed-node-symbol').count(),initial?0:3);
      const before=await state();
      assert.equal(before.main,initial?branch:null);
      const choice=choices.nth(mobile?0:1),node=await choice.getAttribute('data-node');
      await choice.click();
      const after=await state();
      assert.equal(after.main,branch);
      assert.equal(after.choice,node);
      assert.deepEqual(after.wallet,before.wallet);
      assert.equal(await choices.count(),0);
      const reveal=page.locator('#arrival-layer .arrival-card[data-identity="'+node+'"]');
      await reveal.waitFor({state:'attached'});assert.equal(await reveal.getAttribute('data-quality'),initial?'orange':'purple');
      assert.ok(await reveal.locator('.arrival-art>*').count()>0);
      assert.ok(await reveal.locator('.arrival-body').evaluate(el=>el.getAnimations().some(a=>a instanceof CSSAnimation&&a.animationName==='arrival-body-turn')));
      assert.deepEqual(errors,[]);
      console.log(initial,branch,'three purchased in order 3,1,2; free choice',node,'wallet',JSON.stringify(after.wallet));
    }finally{await context.close();}
  }
  for(const [layout,width,height,id] of [
    ['desktop',1440,900,'M-P05'],['landscape',844,390,'M-N08'],['portrait',390,844,'M-O02'],
  ] as const){
    const context=await browser.newContext({viewport:{width,height},isMobile:layout!=='desktop',hasTouch:layout!=='desktop'});
    const page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    try{
      await page.goto(base+'shops.html');
      const links=page.locator('main nav a');
      assert.deepEqual(await links.evaluateAll(els=>els.map(el=>new URL((el as HTMLAnchorElement).href).searchParams.get('card'))),DOOMSDAY_CARDS.map(c=>c.id));
      await page.locator('a[href$="'+id+'"]').click();
      const card=DOOMSDAY_CARDS.find(c=>c.id===id)!;
      const shelf=page.locator('.intermission-screen>.im-choice-grid>.im-card');
      const target=shelf.filter({has:page.getByRole('heading',{name:card.name,exact:true})});
      const flip=target.locator('.imx-copy');
      await flip.waitFor({timeout:120000});
      assert.equal(await page.locator('#overlay').getAttribute('data-layout'),layout);
      assert.equal(await shelf.count(),3);
      if(id==='M-P05'){
        assert.deepEqual(await shelf.evaluateAll(els=>els.map(el=>el.querySelector('.branch-mark')?.getAttribute('data-branch')??null)),['doomsday',null,'armed']);
      }else{
        assert.equal(await shelf.locator('.branch-mark').count(),0);
      }
      // Wait for the production background, paintings and deferred skin images.
      await page.evaluate(async()=>{
        const decoded=[...document.querySelectorAll<HTMLImageElement>('.intermission-screen img')].map(i=>i.decode());
        for(const el of document.querySelectorAll('[data-imx-race],.imx-object,.im-unit-painting image')){
          const value=el.getAttribute('href')||getComputedStyle(el).getPropertyValue(el.hasAttribute('data-imx-race')?'--imx-background':'background-image').match(/url\(["']?(.*?)["']?\)/)?.[1];
          if(value){const i=new Image();i.src=value;decoded.push(i.decode());}
        }
        await Promise.all(decoded);
        await document.fonts.ready;
      });
      await page.screenshot({path:path.join(out,layout+'.png'),animations:'disabled'});
      const brief=await flip.innerText();
      await flip.click();
      assert.equal(await flip.getAttribute('aria-expanded'),'true');
      assert.notEqual(await flip.innerText(),brief);
      await flip.click();
      assert.equal(await flip.innerText(),brief);
      const button=target.locator('.im-card-action');
      assert.ok(await button.isEnabled());
      await button.click();
      await page.waitForFunction((id:DoomsdayId)=>(window as any).__SC2_DEBUG__.world.expedition.doomsday?.ranks[id]===1,id);
      if(card.purchase==='node'||card.purchase==='orange'){
        const reveal=page.locator('#arrival-layer .arrival-card[data-identity="'+id+'"]');
        await reveal.waitFor({state:'attached'});
        assert.equal(await reveal.getAttribute('data-quality'),card.quality);
        assert.equal(await reveal.locator('.arrival-caption strong').textContent(),card.name);
        assert.equal(await reveal.locator('.arrival-back').count(),1);
        assert.ok(await reveal.locator('.arrival-art>*').count()>0);
        await reveal.waitFor({state:'detached'});
      }
      assert.deepEqual(errors,[]);
      console.log(layout,card.name,'flip, purchase or claim passed');
    }catch(e){
      console.error(await page.locator('body').innerText().catch(()=>''),errors);
      throw e;
    }finally{await context.close();}
  }
}finally{await browser.close();}
