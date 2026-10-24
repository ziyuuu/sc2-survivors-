import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'ui-1',revision=process.argv[3]??'r1',folder='performance-u01-u03-20261020-candidate-'+revision;
const root=path.resolve('reports/local/performance-u01-u03-20261020',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
await fs.writeFile('preview/'+folder+'/harness.html','<!doctype html><html><head><link rel="stylesheet" href="ui.css"></head><body><div id="interface"></div><div id="skin-root"></div><div id="joystick"></div><canvas width="500" height="300" style="position:fixed;left:600px;top:0;width:500px;height:300px"></canvas><script src="ui.js"></script></body></html>');
const report={run,build:JSON.parse(await fs.readFile('preview/'+folder+'/ui-build-inputs.json')),variants:{},samples:[],errors:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),pages={};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});pages[variant]=page;
  page.on('pageerror',e=>report.errors.push({variant,error:e.message}));
  await page.goto('http://127.0.0.1:4436/'+folder+'/harness.html');
  const result=await page.evaluate(variant=>{
   const lib=U01[variant],{World,HudSettings,ControlSettings}=U01;
   const w=new World({race:'terran',seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.runId='00000000-0000-4000-8000-000000000529';
   w.entities.clear();w.expedition.familySlots=['tank','marine','hellion','viking','thor','banshee'];for(const f of w.expedition.familySlots)for(let i=0;i<5;i++)w.addUnit(f,'terran',i*2,0);
   
   const preferences=new HudSettings(),console=new lib.SquadConsole(w,document.querySelector('#interface'),preferences);
   const settings=new ControlSettings();settings.set('desktop','mouse');settings.set('touch','tap');
   const trace=[],pointer={inspect:0,move:0,pick:0,hit:false},canvas=document.querySelector('canvas');
   const input=new lib.Input(w,document.querySelector('#joystick'),()=>{w.paused=!w.paused;},settings,{canvas,inspect:()=>{pointer.inspect++;return pointer.hit;},pickMove:()=>{pointer.move++;return {point:{x:10,z:11}};},pick:()=>{pointer.pick++;return {point:{x:8,z:9}};}});
   const pad=new lib.GamepadInput(w,()=>{w.paused=!w.paused;},()=>input.reset());
   const p={id:'synthetic-standard',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};let at=0;
   const poll=()=>pad.poll(at+=120,[p]),press=b=>{p.buttons[b]={value:1,pressed:true};poll();p.buttons[b]={value:0,pressed:false};poll();};
   const state=()=>({phase:w.phase,paused:w.paused,time:w.time,tick:w.tick,input:w.input,order:w.order,skills:lib.skillPages(w),pad:{page:pad.skillPage,selected:pad.selectedSkill,active:pad.active,html:pad.skillPanel.innerHTML,hidden:pad.skillPanel.hidden},console:console.root.innerHTML,selection:console.selectedEntityIds,units:w.allies().map(u=>({id:u.id,hp:u.hp,mode:u.mode,stimUntil:u.stimUntil})),notice:w.notice});
   const states=[],step=(name,fn)=>{fn();states.push({name,state:state()});};
   step('initial-console',()=>console.update(true,false));
   step('select-seat',()=>console.root.querySelector('[data-seat]')?.click());
   step('damage-and-cooldown',()=>{w.allies()[0].hp-=5;w.time=10;console.update();});
   step('arm-pad',poll);p.axes=[.8,0,0,-.9];step('select-dash',poll);p.axes=[0,0,0,-.9];step('cast-dash',()=>press(0));
   step('next-page',()=>press(7));step('previous-page',()=>press(6));
   step('inspect-capture',()=>{const d=document.createElement('div');d.id='inspect-test';d.dataset.capturesBattleInput='';d.textContent='Inspect';document.body.append(d);poll();d.remove();});
   step('pause',()=>{w.paused=true;console.update();poll();});
   step('resume',()=>{w.paused=false;poll();});
   step('no-ability-bodies',()=>{w.entities.clear();console.update();poll();});
   step('new-race',()=>{w.expedition.race='protoss';w.expedition.familySlots=['stalker'];for(let i=0;i<5;i++)w.addUnit('stalker','terran',i*2,0);console.update();poll();});
   step('disconnect',()=>pad.poll(at+=120,[]));
   pad.reset();w.paused=false;w.phase='battle';console.update(true,false);
   const skinRoot=document.querySelector('#skin-root'),skin=lib.mountIntermissionSkin(skinRoot,()=>w,{assets:{resolve:()=>null}});
   const skinStates=[],skinStep=(name,html)=>{if(html!==undefined)skinRoot.innerHTML=html;skin.refresh();skinStates.push({name,html:skinRoot.innerHTML,className:skinRoot.className,style:skinRoot.getAttribute('style')});};
   skinStep('settings-empty','<section class="settings-modal"><h1>设置</h1></section>');
   const cards=U01.catalogueCards(w).filter(c=>c.race==='protoss').slice(0,6);
   const cardsHTML=()=>'<section class="formal-intermission">'+cards.map((c,i)=>U01.referenceCard(c,i)).join('')+'</section>';
   skinStep('catalog-six',cardsHTML());skinStep('catalog-repeat');
   const flip=skinRoot.querySelector('[data-imx-flip]');flip?.click();skinStep('flip-preserved');
   skinRoot.querySelector('.im-card')?.classList.add('im-sold');skinStep('sold');
   skinStep('detail-id','<section class="im-detail-dialog"><h1>'+cards[0].name+'</h1><div data-detail-card-id="'+cards[0].id+'"></div><div class="im-detail-art"></div><p class="im-detail-rule"></p></section>');
   skinStep('detail-repeat');
   skinStep('detail-name','<section class="im-detail-dialog"><h1>'+cards[0].name+'</h1><div class="im-detail-art"></div><p class="im-detail-rule"></p></section>');
   skinStep('production-empty','<section class="production-modal"><h1>基地</h1></section>');
   const r={id:'card.weapon.marine.white',offerId:'one',name:'火力',description:'加强',icon:'tech.attack',rarity:'white',sold:true,purchaseReceipt:{minerals:5,gas:0},expeditionEffect:{kind:'card',effect:'weapon',key:'weapon.marine',family:'marine',amount:.05}};
   const journal=new lib.ShopProgress(w);
   const history=n=>{const entries=Array.from({length:n},(_,i)=>({...structuredClone(r),offerId:'receipt-'+i}));w.rewards=entries.length?[structuredClone(entries.at(-1))]:[];journal.restore({version:1,runId:w.runId,complete:true,entries});return journal.snapshot().entries.length;};
   const count=fn=>{let calls=0;globalThis.__UCounts={actions:0,pages:0};const original=w.familyUnits;w.familyUnits=function(...args){calls++;return original.apply(this,args);};try{fn();return {familyQueries:calls,...globalThis.__UCounts};}finally{w.familyUnits=original;globalThis.__UCounts=null;}};
   w.expedition.race='terran';w.expedition.familySlots=['tank'];w.entities.clear();for(let i=0;i<5;i++)w.addUnit('tank','terran',i*2,0);console.update();
   const counts={consoleFamilyQueries:count(()=>console.update()),pagesFamilyQueries:count(()=>lib.skillPages(w))};
   pad.reset();p.axes=[.8,0,0,-.9];p.buttons=p.buttons.map(()=>({value:0,pressed:false}));p.axes=[0,0,0,0];poll();p.axes=[.8,0,0,-.9];poll();counts.padDrawFamilyQueries=count(poll);
   counts.padIdleFamilyQueries=count(()=>pad.poll(at+1,[p]));
   window.U01Test={w,console,pad,input,p,settings,pointer,poll,press,skin,skinRoot,cardsHTML,journal,history,
    measure(kind,calls){const fresh=kind==='skin-new'?cardsHTML():'';const fn=kind==='console'?()=>console.update():kind==='pad'?poll:kind==='shop'?()=>journal.observe():kind==='skin-new'?()=>{skinRoot.innerHTML=fresh;skin.refresh();}:()=>skin.refresh();for(let i=0;i<20;i++)fn();const start=performance.now();for(let i=0;i<calls;i++)fn();return (performance.now()-start)/calls;},
    configure(kind,n){if(kind==='pad'){pad.reset();w.paused=false;p.axes=[0,0,0,0];poll();p.axes=[.8,0,0,-.9];poll();if(!pad.active||pad.skillPanel.hidden)throw Error('Battle pad fixture inactive');}if(kind==='shop')history(n);if(kind==='skin-empty')skinRoot.innerHTML='<section class="settings-modal">设置</section>';if(kind==='skin-cards')skinRoot.innerHTML=cardsHTML();skin.refresh();},
   };
   pad.reset();return {states,skinStates,counts};
  },variant);
  report.variants[variant]=result;await save();
 }
 assert.deepEqual(report.variants.candidate.states,report.variants.baseline.states,'UI and gamepad states');
 assert.deepEqual(report.variants.candidate.skinStates,report.variants.baseline.skinStates,'skin states');
 const scenarios=process.env.SC2_U01_SKIN_ONLY==='1'?[['skin-new',0,100]]:[['console',0,100],['pad',0,200],['shop',0,10000],['shop',50,10000],['shop',10000,10000],['skin-empty',0,200],['skin-cards',0,200],['skin-new',0,30]];
 report.skinOnly=process.env.SC2_U01_SKIN_ONLY==='1';
 for(const [kind,n,calls]of scenarios){
  for(const variant of ['baseline','candidate'])await pages[variant].evaluate(({kind,n})=>U01Test.configure(kind,n),{kind,n});
  for(let round=0;round<8;round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate']){
   const ms=await pages[variant].evaluate(({kind,calls})=>U01Test.measure(kind,calls),{kind,calls});report.samples.push({kind,n,calls,round,variant,ms});
  }await save();
 }
 for(const variant of ['baseline','candidate']){
  const page=pages[variant],rows=[];
  await page.evaluate(()=>{U01Test.skinRoot.hidden=true;document.querySelector('#interface').hidden=true;U01Test.pad.reset();U01Test.w.phase='battle';U01Test.w.paused=false;});
  for(const [name,hit,button,paused]of [['left-miss',false,'left',false],['left-hit',true,'left',false],['right',false,'right',false],['paused',false,'left',true]]){
   await page.evaluate(({hit,paused})=>{Object.assign(U01Test.pointer,{inspect:0,pick:0,move:0,hit});U01Test.w.paused=paused;},{hit,paused});
   await page.mouse.click(800,150,{button});
   rows.push({name,...await page.evaluate(()=>({pointer:{...U01Test.pointer},order:U01Test.w.order}))});
  }
  await page.evaluate(()=>{Object.assign(U01Test.pointer,{inspect:0,pick:0,move:0,hit:false});U01Test.w.paused=false;});
  await page.touchscreen.tap(800,150);rows.push({name:'touch-miss',...await page.evaluate(()=>({pointer:{...U01Test.pointer},order:U01Test.w.order}))});
  report.variants[variant].pointer=rows;
  const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
  await page.evaluate(()=>{document.querySelector('#interface').hidden=false;U01Test.console.update();});await page.waitForTimeout(50);
  const before=(await session.send('Performance.getMetrics')).metrics;
  await page.evaluate(()=>{for(let i=0;i<100;i++)U01Test.console.update();});
  const after=(await session.send('Performance.getMetrics')).metrics;
  report.variants[variant].layout=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration'].map(n=>[n,after.find(v=>v.name===n).value-before.find(v=>v.name===n).value]));
 }
 const old=report.variants.baseline.pointer,cur=report.variants.candidate.pointer;
 assert.equal(old[0].pointer.inspect,2);assert.equal(cur[0].pointer.inspect,1);
 for(let i=0;i<old.length;i++){assert.deepEqual(cur[i].order,old[i].order);if(i)assert.deepEqual(cur[i],old[i]);}
 if(report.build.instrumented){
  assert.equal(report.variants.baseline.counts.consoleFamilyQueries.actions,14);assert.equal(report.variants.candidate.counts.consoleFamilyQueries.actions,6);
  assert.equal(report.variants.baseline.counts.padDrawFamilyQueries.pages,3);assert.equal(report.variants.candidate.counts.padDrawFamilyQueries.pages,1);
  assert.equal(report.variants.baseline.counts.padDrawFamilyQueries.actions,43);assert.equal(report.variants.candidate.counts.padDrawFamilyQueries.actions,17);
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);process.exitCode=1;}finally{await save();await browser.close();}
console.log(JSON.stringify({run,pass:report.pass,states:report.variants.candidate?.states.length,counts:Object.fromEntries(Object.entries(report.variants).map(([k,v])=>[k,v.counts])),failure:report.failure?.slice(0,300)}));
