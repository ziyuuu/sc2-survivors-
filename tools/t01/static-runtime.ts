import type {boot} from '../../src/app/bootstrap';
import type {Case} from './catalogue';
import {newEquipmentAccount,grantEquipment,equip,WAREHOUSE_CAPACITIES,BACKPACK_CAPACITY,itemsAt,settleEquipment} from '../../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentAccount,type ItemLocation} from '../../src/simulation/starship/types';
import type {StarshipPage} from '../../src/ui/starship/view';
import type {Race,FamilyId} from '../../src/data/races';
import type {Difficulty} from '../../src/data/stages';
import {prepareCardWorld,inspection} from './card-fixture';
import {draftContext,purchaseOffer,generateEliteContracts} from '../../src/simulation/expedition-economy';
import {HEROES,type HeroId} from '../../src/data/heroes';
import type {EliteId} from '../../src/data/elites';
import {newManagementState} from '../../src/ui/starship/host';
import {saveDisplayControls,type SaveDisplayState} from './save-fixture';
import {MapPreview} from '../../src/ui/presentation/map-preview';
import type {ShipCommand} from '../../src/ui/starship/controller';
import {prepareDecision} from './decision-fixture';
import {ELITES} from '../../src/data/elites';
import {prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {packedSeats} from '../../src/ui/hud/packed-roster';

export function installStaticRuntime(app:Awaited<ReturnType<typeof boot>>){
 const {world:w,hud,view,readiness}=app;
 const realSaveUI=hud.saveUI;
 let selected:Case|null=null,operations:string[]=[];
 function click(selector:string){const el=document.querySelector<HTMLButtonElement>(selector);if(!el||el.disabled)throw Error('真实界面操作不可用：'+selector);el.click();operations.push(selector);}
 async function settleDecision(){
  const deadline=performance.now()+30000;let previous='',stable=0;
  while(stable<3){
   if(performance.now()>deadline)throw Error('Decision display did not settle');
   const root=document.querySelector<HTMLElement>('#overlay')!;
   const ids=[...root.querySelectorAll<HTMLElement>('[data-deferred-icon]')].map(e=>e.dataset.deferredIcon!);
   if(ids.length)await prepareEmbeddedAssetIds([...new Set(ids)]);
   hud.update();await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
   await new Promise(resolve=>setTimeout(resolve,50));
   const html=root.innerHTML;stable=html===previous&&!view.assetsPending?stable+1:0;previous=html;
  }
 }
 function addItems(a:EquipmentAccount,n:number,race:Race,location:ItemLocation,wear=false,polluted=false,mixed=false){
  for(let i=0;i<n;i++){const slot=ATTRIBUTE_SLOTS[i%ATTRIBUTE_SLOTS.length],quality=mixed?i%5+1:3,template=quality===5?'set.orange.elite.5':'attribute.'+quality,g=grantEquipment(a,{template,race,slot,polluted:polluted&&i>=8},'t01:'+location.kind+':'+i,location);if(!g.ok)throw Error(g.error);if(wear&&i<8){const e=equip(a,race,g.value.id,slot);if(!e.ok)throw Error(e.error);}}
 }
 async function prepare(c:Case){
  // Let the previous fixture's native feedback expire before replacing its
  // account. Do not transplant a transient error into an unrelated display.
  const feedbackDeadline=performance.now()+6500;
  while(document.querySelector('.ship-toast')?.textContent?.trim()){
   if(performance.now()>feedbackDeadline)throw Error('Previous fixture feedback did not expire');
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  document.querySelector<HTMLButtonElement>('[data-action="battle-panel-close"]')?.click();
  document.querySelector<HTMLButtonElement>('[data-action="ui-info-close"]')?.click();
  selected=c;operations=[];hud.saveUI=realSaveUI;hud.starship?.close();hud.squadConsole.close();hud.carrierInspector.close();readiness.cancel();hud.settingsOpen=false;hud.talentOpen=false;hud.inputReset();hud.intermission.reset();Object.assign(hud,{decisionDetail:null,decisionTarget:null});
  w.resetRun('normal');view.resetRun();view.resetCameraZoom();w.starship.account=newEquipmentAccount(529);w.selectRace((c.race??'terran') as Race);w.paused=true;hud.menuRace=(c.race??'terran') as Race;hud.menuPage='title';hud.flowError='';
  Object.assign(app.session.management,newManagementState());
  if(['title','race','difficulty','confirm'].includes(c.action!)){hud.menuPage=c.action as typeof hud.menuPage;if(c.action==='difficulty')hud.menuDifficulty=c.target as Difficulty;hud.update();if(c.action==='title'&&hud.coverPreference.lockedRace!==c.race)click(`[data-action="cover-race"][data-race="${c.race}"]`);return snapshot();}
  if(c.action==='decision'){
   const setup=prepareDecision(w,(c.race??'terran') as Race,c.target!);
   if(setup.assets){if(!await readiness.prepare('reinforcement',{race:w.expedition.race}))throw Error('Decision assets unavailable');readiness.cancel();}
   hud.update();await settleDecision();if(setup.detail){
    if(c.target==='receipt-detail')click('.family-receipt summary');
    else{
     // The installed production skin replaces the original card-face modal
     // entry with the existing short/detail flip. Exercise that visible route.
     const selector='#overlay [data-imx-flip]';click(selector);
     if(document.querySelector(selector)?.getAttribute('aria-expanded')!=='true')throw Error('Native decision detail did not expand');
    }
   }
   return snapshot();
  }
  if(c.action==='inspector'){
   const race=(c.race??'terran') as Race,family:FamilyId=race==='terran'?'marine':race==='zerg'?'zergling':'zealot',target=c.target!;
   prepareCardWorld(w,family);w.phase='battle';w.paused=false;
   if(target.startsWith('hero')){const id=(Object.keys(HEROES) as HeroId[]).find(id=>HEROES[id].race===race)!;if(!w.acquireHero(id))throw Error('Inspector hero unavailable');if(target==='hero-dead')w.hit(w.heroEntity(id)!,1e12,[],1,'zerg',0,1,undefined,true);}
   if(target==='elite'){const e=Object.values(ELITES).find(e=>e.family===family)!;if(!w.acquireElite(e.id))throw Error('Inspector elite unavailable');}
   if(target==='empty'){w.entities.clear();w.expedition.ledger=[];w.expedition.zerglingPairs=[];}
   if(!await readiness.prepare('reinforcement',{race}))throw Error('Inspector display assets unavailable');readiness.cancel();
   view.render(0,1);view.prepareRosterAssets();const deadline=performance.now()+120000;
   while(view.assetsPending||!view.report().map){if(performance.now()>deadline)throw Error('Inspector display readiness timeout');await new Promise(resolve=>setTimeout(resolve,16));view.render(0,1);}
   if(target==='empty'){hud.update();operations.push('Current packed roster intentionally has no empty ordinary seats');return snapshot();}
   if(target.startsWith('carrier')){const pod=w.spawnPod(family,{x:5,z:0});pod.status=target.slice(8) as 'falling'|'active'|'opening';hud.update();hud.carrierInspector.show(pod.id);}
   else{hud.update();const entry=packedSeats(w).find(s=>target.startsWith('hero')?!!s.hero:target==='elite'?!!s.unit?.eliteId:!s.hero),selector=`#roster [data-seat="${entry?.key}"]`;
    let seat=document.querySelector<HTMLElement>(selector);
    for(let page=0;!seat&&page<20;page++){
     const next=document.querySelector<HTMLButtonElement>('#army-pages [data-page="1"]');if(!next||next.disabled)break;
     click('#army-pages [data-page="1"]');seat=document.querySelector<HTMLElement>(selector);
    }
    if(!seat)throw Error('Current packed roster seat absent: '+selector);seat.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));operations.push('native-contextmenu:'+selector);
    if(!hud.squadConsole.isOpen)throw Error('Native inspection route did not open');
    if(['abilities','ability-detail','army'].includes(target))click(`[data-inspect-tab="${target==='army'?'army':'abilities'}"]`);
    if(target==='abilities'||target==='ability-detail'){const details=document.querySelector<HTMLDetailsElement>('#unit-inspector details[data-ability]');if(!details)throw Error('Native ability details absent');if(details.open!==(target==='ability-detail'))click('#unit-inspector details[data-ability] > summary');}
   }
   return snapshot();
  }
  if(c.action==='ship-operation'){
   const race=(c.race??'terran') as Race,a=w.starship.account,target=c.target!;a.dust=100000;
   addItems(a,12,race,{kind:'warehouse'},true);
   if(target==='effects-active')for(const [template,slot] of [['set.training.2','offense1'],['set.training.2','offense2'],['module.workers.2','gathering']] as const){
    const item=grantEquipment(a,{template,race,slot},'t01-active:'+slot,{kind:'warehouse'});if(!item.ok)throw Error(item.error);
    const result=equip(a,race,item.value.id,slot);if(!result.ok)throw Error(result.error);
   }
   const grant=grantEquipment(a,{template:target.includes('elite')?'set.orange.elite.5':'attribute.3',race,slot:'offense1',polluted:target==='cleansed'},'t01-operation',{kind:'warehouse'});if(!grant.ok)throw Error(grant.error);
   hud.update();app.starship!.open();app.starship!.ui.open('warehouse');app.starship!.ui.open(target.startsWith('preset')||['slot-filter','attributes-detail','effects-detail','effects-active'].includes(target)?'loadout':target.startsWith('reroll')||target==='forge-crafted'||target==='cleansed'?'forge':'warehouse');
   const issue=(command:ShipCommand)=>{const result=app.starship!.ui.controller.execute({id:'t01-ui:'+crypto.randomUUID(),revision:a.revision,managementRevision:app.session.management.revision,command});if(!result.ok)throw Error(result.error);operations.push('native-command:'+command.type);};
   if(target.startsWith('preset')){
    if(['preset-apply','preset-missing'].includes(target))issue({type:'savePreset',index:0});
    if(target==='preset-missing'){
     const id=a.equipped[race].offense1!;issue({type:'unequip',slot:'offense1'});issue({type:'dismantle',ids:[id]});
    }else if(target==='preset-rename'||target==='preset-error'){
     click('#native-starship [data-act="rename-preset"][data-index="0"]');
     if(target==='preset-error'){const input=document.querySelector<HTMLInputElement>('[data-preset-name]')!;input.value='                         ';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector<HTMLFormElement>('[data-preset-name-form]')!.requestSubmit();}
    }else click(`#native-starship [data-act="${target==='preset-save'?'save-preset':'apply-preset'}"][data-index="0"]`);
   }else if(target==='expand-confirm')click('#native-starship [data-act="expand"]');
   else if(target==='search-empty'){const input=document.querySelector<HTMLInputElement>('#native-starship [data-filter="query"]')!;input.value='不存在的检索装备';input.dispatchEvent(new Event('input',{bubbles:true}));}
   else if(target==='slot-filter')click('#native-starship [data-act="slot"][data-id="offense1"]');
   else if(target==='attributes-detail'||target==='effects-detail'||target==='effects-active')click('#native-starship '+(target==='attributes-detail'?'.source-details':'.set-strip')+' > summary');
   else if(target==='forge-crafted'){click('#native-starship [data-act="craft"]');await new Promise(resolve=>setTimeout(resolve,1500));}
   else{
    click(`#native-starship [data-act="detail"][data-id="${grant.value.id}"]`);
    if(target==='cleansed'){click('#native-starship [data-act="cleanse"]');await new Promise(resolve=>setTimeout(resolve,1500));}
    else if(target.startsWith('reroll')){click('#native-starship [data-act="'+(target.includes('elite')?'reroll-elite':'reroll-affix')+'"]');if(target.endsWith('choice')){click('#native-starship [data-act="confirm"]');await new Promise(resolve=>setTimeout(resolve,1500));if(!a.modification)throw Error('Native reroll did not produce choices');}}
    else click('#native-starship [data-act="'+(target.startsWith('dismantle')?'dismantle':'discard')+'"]');
   }
   return snapshot();
  }
  if(c.action==='starship'){
   const account=w.starship.account,race=(c.race??'terran') as Race;
   if(c.target!=='empty')addItems(account,c.target==='full'?WAREHOUSE_CAPACITIES[account.warehouseLevel]+8:13,race,{kind:'warehouse'},true,c.target==='polluted',c.target!=='polluted');
   let heroItemId:string|undefined;
   if(c.target==='hero-detail'){const hero=({terran:'raynor',zerg:'kerrigan',protoss:'artanis'} as const)[race],g=grantEquipment(account,{template:'set.orange.hero.5',race,slot:'offense1',binding:{hero}},'t01:hero-detail',{kind:'warehouse'});if(!g.ok)throw Error(g.error);heroItemId=g.value.id;}
   account.dust=c.target==='insufficient'?0:10000;hud.update();app.starship!.open();
   // Same-page open intentionally preserves the real UI's state. Visit a
   // different permitted page so each isolated fixture starts cleanly.
   app.starship!.ui.open(c.actor==='warehouse'?'loadout':'warehouse');app.starship!.ui.open(c.actor as StarshipPage);
   if(c.target==='selected')click('#native-starship [data-act="select-page"]');
   if(c.target==='filters')click('#native-starship [data-act="toggle-filters"]');
   if(c.target?.startsWith('quality-'))click(`#native-starship .item-grid .rarity-${c.target.slice(8)}[data-act="detail"]`);
   if(heroItemId)click(`#native-starship [data-act="detail"][data-id="${heroItemId}"]`);
   if(['detail','protected','polluted'].includes(c.target!)){click('#native-starship .item-grid [data-act="detail"]');if(c.target==='protected'){click('#native-starship [data-act="lock"]');click('#native-starship [data-act="favorite"]');}}
   return snapshot();
  }
  if(c.action==='settings'){
   if(c.target==='saves'){
    const state=((c.data as {state?:SaveDisplayState}|undefined)?.state??'empty');
    if(state==='battle'){if(!w.start())throw Error('Save display battle fixture failed');w.paused=true;}
    hud.saveUI=saveDisplayControls(app.session,state,action=>operations.push(action),()=>hud.update());
   }
   hud.settingsOpen=true;hud.update();click(`[data-action="settings-tab"][data-tab="${c.target}"]`);return snapshot();
  }
  if(c.action?.startsWith('card')||c.action==='progress'||c.action==='contracts'&&c.target||c.action==='rest'&&c.target){
   const race=(c.race??'terran') as Race,family:FamilyId=race==='terran'?'marine':race==='zerg'?'zergling':'zealot';prepareCardWorld(w,family);
   if(c.action==='contracts'){
    // Generate the production contract using an explicitly controlled eligibility
    // flag. This display fixture makes no random-availability claim.
    w.stage=3;w.expedition.eliteContractWindow=-1;const originalTalent=w.talent;
    try{w.talent=id=>id==='find_elites'?1:originalTalent.call(w,id);generateEliteContracts(w);}finally{w.talent=originalTalent;}
    const contract=w.expedition.eliteContracts[0];if(!contract)throw Error('Contract display unavailable');
    if(c.target==='bought'&&!w.buyEliteContract(contract.id,contract.eliteId as EliteId))throw Error('Contract purchase display failed');
    if(c.target!.includes('insufficient'))w.wallet={minerals:0,gas:0};
    w.changed();hud.update();hud.intermission.push({page:'contracts'});hud.update();
    if(c.target!.startsWith('detail')){hud.intermission.push({page:'contract',id:contract.id});hud.update();}return snapshot();
   }
   if(c.action==='rest'){
    if(c.target!.startsWith('hero-')){
     const id=(Object.keys(HEROES) as HeroId[]).find(id=>HEROES[id].race===race)!;
     if(!w.acquireHero(id))throw Error('Rest hero fixture unavailable');
     const hero=w.heroEntity(id);if(!hero)throw Error('Rest hero did not deploy');
     if(c.target!=='hero-alive')w.hit(hero,1e12,[],1,'zerg',0,1,undefined,true);
     if(c.target==='hero-paid'&&!w.reviveHero(id))throw Error('Rest paid revival unavailable');
    }else for(const u of w.allies())u.hp=u.maxHp*.35;
    if(c.target!.includes('insufficient'))w.wallet={minerals:0,gas:0};
    w.changed();hud.update();hud.intermission.push({page:'rest'});hud.update();
    if(c.target==='repair-detail')click('[data-action="ui-rest-repair"]');return snapshot();
   }
   const ctx=draftContext(w),pool=inspection.t01NativePool(ctx).filter(p=>p.effect.kind==='teamCard');
   w.rewards=pool.slice(0,4).map(p=>inspection.t01NativeQuote(ctx,p.id));if(!w.rewards.length)throw Error('原生商店展示无候选');
   if(c.action==='progress'){
    if((c.data as {state:string}).state==='populated')for(const card of w.rewards.slice(0,2))if(!purchaseOffer(w,card.offerId))throw Error('Enhancement display purchase failed');
    hud.update();click('[data-action="battle-progress"]');click(`[data-action="battle-progress-tab"][data-tab="${c.target}"]`);return snapshot();
   }
   if(c.action==='cards-bought'&&!purchaseOffer(w,w.rewards[0].offerId))throw Error('已购状态创建失败');
   if(c.action==='cards-insufficient')w.wallet={minerals:0,gas:0};
   hud.update();if(c.action==='card-detail'){hud.intermission.push({page:'offer',id:w.rewards[0].offerId});hud.update();}return snapshot();
  }
  if(!w.start())throw Error('展示战局创建失败');w.paused=true;
  if(c.action==='pause'){hud.update();return snapshot();}
  if(['reward','base','direction','rest','contracts'].includes(c.action!)){
   w.paused=false;w.endStage();hud.update();
   const route=c.action==='base'?'production':c.action;if(route!=='reward')hud.intermission.push({page:route} as any);hud.update();
   if(c.action==='base'&&c.target)click(`[data-action="ui-production-tab"][data-tab="${c.target}"]`);return snapshot();
  }
  if(c.action==='backpack'){
   const a=w.starship.account;addItems(a,c.target==='empty'?0:c.target==='full'?BACKPACK_CAPACITY:6,(c.race??'terran') as Race,{kind:'backpack',run:a.run!.id});
   w.paused=false;if(c.actor==='reward')w.endStage();hud.update();app.starship!.open();return snapshot();
  }
  if(c.action==='settlement'){
   const a=w.starship.account,race=(c.race??'terran') as Race;if(c.target==='full')addItems(a,WAREHOUSE_CAPACITIES[a.warehouseLevel],race,{kind:'warehouse'});
   if(c.target!=='empty')addItems(a,6,race,{kind:'backpack',run:a.run!.id});
   const outcome=c.target==='failure'?'failure':'success';settleEquipment(a,outcome);w.phase=outcome==='failure'?'lost':'finished';w.changed();hud.update();app.starship!.open();return snapshot();
  }
  if(['won','lost','finished','endless-ready'].includes(c.action!)){
   // Explicit terminal display fixture, not evidence of a completed campaign.
   w.stage=18;w.stats.kills=529;w.stats.rescued=6;
   if(c.action==='lost'||c.action==='finished')settleEquipment(w.starship.account,c.action==='lost'?'failure':'success');
   if(c.action==='endless-ready'){
    // Prepare an actual render before the production preview records this run.
    w.paused=false;view.resetRun();if(!await readiness.prepare('reinforcement',{race:w.expedition.race}))throw Error('Endless display assets unavailable');readiness.cancel();
    view.render(0,1);view.prepareRosterAssets();const deadline=performance.now()+120000;
    while(view.report().assetsPending||!view.report().map){if(performance.now()>deadline)throw Error('Endless preview readiness timeout');await new Promise(resolve=>setTimeout(resolve,16));view.render(0,1);}
    if(view.report().errors.length)throw Error(view.report().errors.join('; '));
    // Replace only the display cache with the same production class; do not
    // retain a signature from an earlier unprepared frame of this fixture.
    w.phase='endless-ready';w.paused=true;view.render(0,1);
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Endless preview encoding timeout')),10000),preview=new MapPreview(()=>{clearTimeout(timer);hud.update();resolve();});Object.assign(hud,{mapPreview:preview});preview.capture(w,view.canvas);});
   }
   w.phase=c.action as typeof w.phase;w.paused=true;w.changed();hud.update();view.render(0,1);hud.afterRender();return snapshot();
  }
  throw Error('页面真实状态执行器尚未接入：'+c.id);
 }
 function snapshot(){return {caseId:selected?.id,displayFixture:true,operations:operations.slice(),phase:w.phase,menu:hud.menuPage,route:hud.intermission.current,starship:app.starship?.ui.page,starshipOpen:app.starship?.isOpen,memoryOnly:app.session.memoryOnly,warehouse:{count:itemsAt(w.starship.account,'warehouse').length,capacity:WAREHOUSE_CAPACITIES[w.starship.account.warehouseLevel]},backpack:itemsAt(w.starship.account,'backpack').length,settlement:w.starship.account.settlement??null};}
 function release(){
  hud.saveUI=realSaveUI;hud.starship?.close();hud.squadConsole.close();hud.carrierInspector.close();
  hud.intermission.reset();Object.assign(hud,{decisionDetail:null,decisionTarget:null});
  document.querySelector<HTMLButtonElement>('[data-action="battle-panel-close"]')?.click();
  document.querySelector<HTMLButtonElement>('[data-action="ui-info-close"]')?.click();
 }
 return {prepare,snapshot,release};
}
