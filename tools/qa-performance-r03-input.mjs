import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'input-1',revision=process.argv[3]??'r1',root=path.resolve('reports/local/performance-r03-20261020',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const build=JSON.parse(await fs.readFile('preview/performance-r03-20261020-candidate-'+revision+'/input-build-inputs.json'));
const hash=x=>createHash('sha256').update(x).digest('hex'),report={run,build,variants:{},samples:[],errors:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),pages={};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1000,height:700}});pages[variant]=page;page.on('pageerror',e=>report.errors.push({variant,error:e.message}));
  await page.setContent('<style>button,input,select,summary{display:block;margin:2px}#joystick{position:absolute;left:700px;top:400px;width:160px;height:160px;background:#ccc}canvas{position:absolute;left:600px;top:0;width:350px;height:300px}</style><div id="interface"><div id="overlay"></div></div><div id="joystick"></div><canvas width="350" height="300"></canvas>');
  await page.addScriptTag({path:'preview/performance-r03-20261020-candidate-'+revision+'/input.js'});
  await page.evaluate(variant=>{
   const {World,ControlSettings}=window.R03Inputs,{Input,GamepadInput}=window.R03Inputs[variant],w=new World(529),settings=new ControlSettings();settings.set('desktop','keyboard');
   const trace=[],previews=[],canvas=document.querySelector('canvas'),input=new Input(w,document.querySelector('#joystick'),()=>{w.paused=!w.paused;},settings,{canvas,pick:()=>({point:{x:4,z:5}}),previewTarget:p=>previews.push(p?{...p}:null)}),pad=new GamepadInput(w,()=>{w.paused=!w.paused;},()=>input.reset());
   const html=n=>Array.from({length:n},(_,i)=>'<button id="b'+i+'">Button '+i+'</button>').join('');
   const menu=n=>{document.querySelector('#overlay').innerHTML=html(n);document.querySelector('#overlay').hidden=false;};
   menu(64);document.querySelector('#overlay').addEventListener('click',e=>trace.push('click:'+e.target.id));
   const state=()=>({focus:document.activeElement?.id,paused:w.paused,input:{...w.input},keys:[...input.keys],stick:{...input.stick},pointer:input.pointer,target:document.body.dataset.targetFamily??null,preview:previews.at(-1)??null,skillsHidden:pad.skillPanel.hidden,calibrationHidden:pad.dialog.hidden,active:pad.active,order:w.order,trace:[...trace]});
   const states=[],step=(name,fn)=>{fn();states.push({name,state:state()});};
   const idle=()=>pad.menu('',false,false);
   step('initial-focus',idle);
   step('idle-keeps-focus',()=>{for(let i=0;i<20;i++)idle();});
   step('next',()=>pad.menu('down',false,false));
   step('confirm',()=>pad.menu('',true,false));
   step('disabled-focus',()=>{document.activeElement.disabled=true;idle();});
   step('hidden-focus',()=>{document.activeElement.hidden=true;idle();});
   step('css-hidden-focus',()=>{document.activeElement.style.visibility='hidden';idle();});
   step('inert-focus',()=>{const el=document.activeElement,parent=document.createElement('div');el.before(parent);parent.append(el);parent.inert=true;idle();});
   step('removed-focus',()=>{document.activeElement.remove();idle();});
   step('modal-open',()=>{document.querySelector('#overlay').insertAdjacentHTML('beforeend','<section class="modal-window"><button id="modal-1">One</button><button id="modal-2">Two</button></section>');idle();});
   step('second-modal',()=>{document.querySelector('#overlay').insertAdjacentHTML('beforeend','<section class="modal-window" id="second"><button id="modal-3">Three</button></section>');idle();});
   step('modal-removed',()=>{document.querySelector('#second').remove();idle();});
   step('dialog-open',()=>{const d=document.createElement('dialog');d.id='test-dialog';d.innerHTML='<button id="dialog-button">Dialog</button>';document.body.append(d);d.showModal();idle();});
   step('dialog-close',()=>{document.querySelector('#test-dialog').close();idle();});
   step('range-and-select',()=>{menu(3);document.querySelector('#overlay').insertAdjacentHTML('beforeend','<input id="range" type="range" min="0" max="100" value="50"><select id="select"><option>A</option><option>B</option></select>');document.querySelector('#range').focus();pad.menu('right',false,false);trace.push('range:'+document.querySelector('#range').value);document.querySelector('#select').focus();pad.menu('left',false,false);trace.push('select:'+document.querySelector('#select').selectedIndex);});
   step('back',()=>{document.querySelector('#overlay').insertAdjacentHTML('beforeend','<button id="back" data-action="menu-back">Back</button>');pad.menu('',false,true);});
   step('keyboard-move',()=>{w.phase='battle';w.paused=false;document.querySelector('#overlay').hidden=true;document.activeElement.blur();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));input.poll();});
   step('pause-clears-held-input',()=>{w.paused=true;input.poll();});
   step('unpause-does-not-replay-held-key',()=>{w.paused=false;input.poll();});
   step('target-start',()=>document.dispatchEvent(new CustomEvent('sc2-target-family',{detail:'tactical'})));
   step('target-nudge',()=>document.dispatchEvent(new CustomEvent('sc2-target-nudge',{detail:{x:2,z:3}})));
   step('blocked-reset-clears-target',()=>{input.reset();pad.reset();});
   step('repeated-reset',()=>{for(let i=0;i<100;i++){input.reset();pad.reset();}});
   step('inspection-capture-clears-keys',()=>{const el=document.createElement('div');el.dataset.capturesBattleInput='';el.textContent='Inspect';document.body.append(el);input.keys.add('KeyD');input.poll();el.remove();});
   step('reset-preserves-order',()=>{w.order={kind:'move',point:{x:8,z:9},issuedAt:0};input.keys.add('KeyA');input.reset();pad.reset();});
   step('calibration-reset',()=>{pad.openCalibration({id:'test',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))});pad.reset();});
   const p={id:'synthetic-standard',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};
   step('synthetic-neutral-armed',()=>{w.phase='menu';w.paused=false;menu(64);pad.poll(0,[p]);});
   step('synthetic-activate',()=>{p.buttons[13]={value:1,pressed:true};pad.poll(100,[p]);});
   step('synthetic-release',()=>{p.buttons[13]={value:0,pressed:false};pad.poll(200,[p]);});
   step('synthetic-idle',()=>{for(let i=0;i<120;i++)pad.poll(300+i*16.667,[p]);});
   step('synthetic-disconnect',()=>pad.poll(3000,[]));
   window.R03Test={w,pad,input,settings,menu,idle,state,states,p,trace,previews};
  },variant);
  const states=await page.evaluate(()=>window.R03Test.states);report.variants[variant]={states};
  // Native pointer capture on the joystick, then the same production reset used by loading/pause.
  await page.evaluate(()=>{const t=window.R03Test;t.w.phase='battle';t.w.paused=false;document.querySelector('#overlay').hidden=true;});
  await page.mouse.move(820,470);await page.mouse.down();
  const captured=await page.evaluate(()=>{const t=window.R03Test;t.input.poll();return {pointer:t.input.pointer,has:document.querySelector('#joystick').hasPointerCapture(t.input.pointer),input:{...t.w.input}};});
  assert.ok(captured.has&&captured.pointer!==null&&Math.hypot(captured.input.x,captured.input.z)>0);
  const cleared=await page.evaluate(()=>{const t=window.R03Test,id=t.input.pointer;t.input.reset();return {state:t.state(),has:document.querySelector('#joystick').hasPointerCapture(id)};});
  await page.mouse.up();assert.equal(cleared.has,false);assert.equal(cleared.state.pointer,null);assert.deepEqual(cleared.state.input,{x:0,z:0});report.variants[variant].pointer={captured,cleared};
  await page.evaluate(()=>{
   const t=window.R03Test;t.w.phase='menu';t.menu(64);t.pad.menu('',false,false);t.input.reset();t.pad.reset();
   t.count=kind=>{const e=Element.prototype.getClientRects,css=window.getComputedStyle,counts={rects:0,styles:0,mutations:0,previewCalls:0};Element.prototype.getClientRects=function(...args){counts.rects++;return e.apply(this,args);};window.getComputedStyle=function(...args){counts.styles++;return css.apply(this,args);};const obs=new MutationObserver(()=>{});obs.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});const start=t.previews.length;
    try{for(let i=0;i<120;i++){if(kind==='menu')t.idle();else{t.input.reset();t.pad.reset();}}counts.previewCalls=t.previews.length-start;counts.mutations=obs.takeRecords().length;return counts;}finally{Element.prototype.getClientRects=e;window.getComputedStyle=css;obs.disconnect();}
   };
   t.measure=(kind,calls=1000)=>{for(let i=0;i<100;i++){if(kind==='menu')t.idle();else{t.input.reset();t.pad.reset();}}const at=performance.now();for(let i=0;i<calls;i++){if(kind==='menu')t.idle();else{t.input.reset();t.pad.reset();}}return {calls,ms:performance.now()-at,state:t.state()};};
  });
  report.variants[variant].counts={menu:await page.evaluate(()=>window.R03Test.count('menu')),reset:await page.evaluate(()=>window.R03Test.count('reset'))};
 }
 assert.deepEqual(report.variants.candidate.states,report.variants.baseline.states);
 for(const [kind,controls]of [['menu',2],['menu',16],['menu',64],['reset',64]]){
  for(const variant of ['baseline','candidate']){
   const counts=await pages[variant].evaluate(({kind,controls})=>{const t=window.R03Test;t.menu(controls);t.idle();return t.count(kind);},{kind,controls});
   (report.variants[variant].bySize??=[]).push({kind,controls,...counts});
  }
  for(let round=0;round<12;round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate']){
   const sample=await pages[variant].evaluate(kind=>window.R03Test.measure(kind),kind);report.samples.push({kind,controls,round,variant,...sample});await save();
  }
 }
 assert.ok(report.variants.candidate.counts.menu.rects<report.variants.baseline.counts.menu.rects);
 assert.equal(report.variants.candidate.counts.reset.mutations,0);
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);process.exitCode=1;}finally{await save();await browser.close();}
console.log(JSON.stringify({pass:report.pass,states:report.variants.candidate?.states?.length,samples:report.samples.length,counts:Object.fromEntries(Object.entries(report.variants).map(([k,v])=>[k,v.counts])),errors:report.errors}));
