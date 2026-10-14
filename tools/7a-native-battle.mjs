/** Exercise only controls available to a player. No World writes or invulnerability. */
export async function playNativeBattle(page,seconds,{onSample=()=>{},onCheckpoint=()=>{}}={}){
 const began=Date.now(),actions=[],states=[],segments=[],target=seconds,deadline=began+Math.max(180000,seconds*6000);
 let nextMove=10,step=0,lastState='',lastProgress=Date.now(),previousTime=-1,completedSeconds=0;
 const purchased=new Set(),repairedStages=new Set();
 const read=()=>page.evaluate(()=>({report:window.__SC2_REPORT__(),ui:document.body.dataset.uiPhase}));
 const checkpoint=async(label)=>onCheckpoint({label,at:Date.now()-began,completedSeconds,segments,actions,states,current:await read()});
 const click=async(selector)=>{
  const locator=page.locator(selector).first();
  if(!await locator.isVisible()||!await locator.isEnabled())return false;
  const at=Date.now();await locator.click();actions.push({at:at-began,selector,automationMs:Date.now()-at});return true;
 };
 const required=async(selector,nextSelector)=>{
  await checkpoint('before '+selector);
  let advanced=false;
  for(let attempt=1;attempt<=8&&!advanced;attempt++){
   // The native screen may just have been replaced. Settle its real DOM,
   // then retry only this same still-visible control if no transition occurs.
   await page.waitForTimeout(400);
   const at=Date.now();await page.locator(selector).first().click({timeout:5000});
   actions.push({at:at-began,selector,automationMs:Date.now()-at,required:true,attempt});
   advanced=!nextSelector||await page.locator(nextSelector).first().waitFor({state:'visible',timeout:1500}).then(()=>true,()=>false);
   await checkpoint('required attempt '+attempt+' '+selector);
   if(!advanced&&!await page.locator(selector).first().isVisible())throw Error('Native navigation reached an unexpected screen after '+selector);
  }
  if(!advanced)throw Error('Native control did not change the screen after eight attempts: '+selector);
  await checkpoint('after '+selector);
 };
 while(Date.now()<deadline){
  const {report:r,ui}=await read();
  if(r.time!==previousTime){previousTime=r.time;lastProgress=Date.now();}
  const key=[r.phase,ui,r.stage,r.readiness.phase,r.assetsPending].join(':');
  if(key!==lastState){states.push({at:Date.now()-began,key,time:r.time,background:r.background});lastState=key;await checkpoint(key);}
  onSample({...r,sampledSeconds:completedSeconds+r.time});
  if(completedSeconds+r.time>=target){segments.push({time:r.time,phase:r.phase,stage:r.stage,stats:r.stats,map:r.map,camera:r.camera});return {passed:true,target,sampledSeconds:completedSeconds+r.time,segments,elapsedMs:Date.now()-began,actions,states,after:r,method:'Cumulative native combat time; real losses and native-menu restarts retained. No survival guarantee, invulnerability, hidden entity reads or World mutation.'};}
  if(['lost','defeat','won','over'].includes(r.phase)){
   segments.push({time:r.time,phase:r.phase,stage:r.stage,stats:r.stats,map:r.map,camera:r.camera});completedSeconds+=r.time;
   if(segments.length>=8)return {passed:false,reason:'Eight native attempts did not supply the requested combat time',target,sampledSeconds:completedSeconds,segments,actions,states,after:r};
   const race=r.expedition.race;
   await required('[data-action=restart]:visible','.main-actions [data-action=menu-new]');
   await required('.main-actions [data-action=menu-new]','[data-action=menu-race-next]');
   await required(`[data-action=menu-race][data-race=${race}]`,`[data-action=menu-race][data-race=${race}][aria-checked=true]`);
   await required('[data-action=menu-race-next]','[data-action=menu-difficulty-next]');
   await required('[data-action=menu-difficulty][data-difficulty=normal]','[data-action=menu-difficulty][data-difficulty=normal][aria-checked=true]');
   await required('[data-action=menu-difficulty-next]','[data-action=menu-start]');
   await required('[data-action=menu-start]','[data-action=flow-cancel]:visible,[data-action=flow-continue]:visible');
   const prepareDeadline=Date.now()+180000;
   while(Date.now()<prepareDeadline){
    const ready=(await read()).report;await checkpoint('restart preparation '+ready.readiness.phase);
    if(ready.readiness.phase==='error')throw Error('Native restart readiness failed: '+ready.readiness.error);
    if(ready.readiness.phase==='ready')break;
    await page.waitForTimeout(1000);
   }
   if((await read()).report.readiness.phase!=='ready')throw Error('Native restart preparation exceeded 180 seconds');
   await required('[data-action=flow-continue]','#topbar [data-action=pause]:visible');
   await page.waitForFunction(()=>document.body.dataset.uiPhase==='battle',null,{timeout:45000});
   nextMove=10;step=0;previousTime=-1;lastProgress=Date.now();purchased.clear();repairedStages.clear();continue;
  }
  if(r.readiness.phase==='error')throw Error('Native entrance failed: '+r.readiness.error);
  if(r.readiness.phase==='ready'&&r.readiness.kind){await click('[data-action=flow-continue]:visible');continue;}
  if(r.phase==='reward'){
   // Spend real earned resources through the same cards a player uses.
   // A fixed first-affordable choice makes this repeatable without a World edit.
   if(await click('[data-action=shop-supply-confirm]:not(:disabled):visible'))continue;
   if(await click('[data-action=shop-elite-confirm]:not(:disabled):visible'))continue;
   if(await click('.modal-window [data-action=reward]:not(:disabled):visible'))continue;
   const direction=page.locator('[data-action=development-direction][aria-pressed=true]:visible');
   if(await page.locator('[data-action=development-direction]:visible').count()&&!await direction.count()){
    if(await click('[data-action=development-direction]:visible'))continue;
   }
   const offer=page.locator('#reward-cards [data-action=reward]:not(:disabled):visible').first();
   if(await offer.isVisible()){
    const id=await offer.getAttribute('data-id'),key=r.stage+':'+id;
    if(!purchased.has(key)){purchased.add(key);if(await click('#reward-cards [data-action=reward]:not(:disabled):visible'))continue;}
   }
   if(await click('[data-action=shop-supply-cancel]:visible'))continue;
   if(await click('[data-action=shop-elite-cancel]:visible'))continue;
   if(await click('.modal-window [data-action=ui-back]:visible'))continue;
   if(!repairedStages.has(r.stage)&&await page.locator('[data-action=ui-page][data-page=rest]:visible').count()){
    repairedStages.add(r.stage);if(await click('[data-action=ui-page][data-page=rest]:visible'))continue;
   }
   if(await click('[data-action=repair-all]:not(:disabled):visible')){await click('[data-action=ui-back]:visible');continue;}
   if(await click('.reward-actions [data-action=skip]:visible'))continue;
   if(await click('[data-action=ui-back]:visible'))continue;
  }
  if(ui==='pause'){
   if(await click('[data-action=elite-replace]:not(:disabled):visible'))continue;
   if(await click('[data-action=talent-loot]:not(:disabled):visible'))continue;
   if(await click('[data-action=elite-rescue-claim]:not(:disabled):visible'))continue;
   if(await click('[data-action=family-reject]:visible'))continue;
   // A disabled confirmation can be waiting for the real reinforcement gate.
   // Do not spam its retry button while model preparation is still active.
   if(r.assetsPending===0&&r.readiness.phase==='error'&&await click('[data-action=elite-assets-retry]:visible'))continue;
   if(!await page.locator('[data-action=elite-replace]:visible').count()&&await click('[data-action=elite-rescue-decline]:visible'))continue;
  }
  if(ui==='battle'&&r.time>=nextMove){
   // Ordinary fixed minimap waypoints. A loss is retained and the remaining
   // sample comes from a real menu restart, rather than manipulating the army.
   const points=[[.75,.25],[.75,.75],[.25,.75],[.25,.25]],p=points[step%points.length];
   const box=await page.locator('#minimap-canvas').boundingBox();
   // The live battle can end between the report and DOM reads. A hidden
   // minimap means the next loop must handle that real UI transition.
   if(box&&(await read()).ui==='battle'){
    await page.mouse.click(box.x+box.width*p[0],box.y+box.height*p[1],{button:'right'});
    actions.push({at:Date.now()-began,time:r.time,segment:segments.length,minimapMove:p});nextMove=r.time+12;step++;
   }
  }
  if(Date.now()-lastProgress>120000)throw Error('Native battle stopped advancing: '+key);
  await page.waitForTimeout(250);
 }
 throw Error('Native combat sample timed out before '+target+' seconds');
}
