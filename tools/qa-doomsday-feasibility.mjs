// Isolated design probes. The local callbacks stand in for unimplemented cards.
// Run from the project root with node tools/qa-doomsday-feasibility.mjs.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';

const out = 'reports/local/doomsday-feasibility-20261111';
const html = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body,main,canvas{width:100%;height:100%;margin:0;overflow:hidden;display:block}main{position:relative}</style><main><canvas id="battle"></canvas></main>';

async function prepare() {
  const {World} = await import('/src/simulation/world.ts');
  const {FlatTerrain} = await import('/src/simulation/movement/flat-terrain.ts');
  const {clearLine} = await import('/src/simulation/movement/steering.ts');
  const {BattleRenderer} = await import('/src/render/scene/battle-renderer.ts');
  const {SourceEffectPlayer} = await import('/src/render/effects/source/player.ts');
  const {TerranEliteMaterials} = await import('/src/render/effects/terran-elite-materials.ts');
  const {unitData, expeditionWeaponBonuses} = await import('/src/simulation/combat/expedition-combat.ts');
  const {launchWeaponFlight, tickWeaponFlights} = await import('/src/simulation/combat/weapon-flight.ts');
  await import('/src/ui/presentation/world-labels.css');
  await import('/src/render/scene/battle-distress.css');

  const w = new World({race:'terran', seed:111103, waves:false, sandbox:true, terrain:new FlatTerrain(), obstacles:[]});
  w.start();
  w.missions.enabled = w.encounters.enabled = w.starship.enabled = false;
  w.entities.clear();
  w.heroes.clear();
  w.pods = [];
  w.hive = null;
  w.expansionHives.clear();
  w.economicTargets.clear();
  w.fortifications.clear();
  for (const family of ['hellion','viking','banshee','tank']) w.addUnit(family,'terran',0,0);
  for (const family of ['roach','mutalisk']) w.addUnit(family,'zerg',0,0);
  const view = new BattleRenderer(document.querySelector('canvas'), w);
  await view.prepareCurrentAssets();
  await view.ensureUnitVariant('viking.assault','viking');
  await view.ensureUnitVariant('tank.siege','tank');
  // The dual mount probe needs both kits in the same asset set, irrespective of pose.
  const {COMBAT_FX_PROFILES} = await import('/src/render/effects/combat-fx-profile.ts');
  const kits = ['viking','viking-assault','hellion','banshee','tank-siege'];
  await view.sourceCombatEffects.load(kits.flatMap(k => Object.values(COMBAT_FX_PROFILES.get(k).models).flat()));
  view.initialAssetsLoaded = true;
  const check = (ok, detail) => { if (!ok) throw Error(detail); };
  const dt = 1/60;
  const routes = view.sourceCombatEffects;
  const blueKit = new SourceEffectPlayer(view.effectScene,view.camera);
  await blueKit.load(['HellionAttackBeam','HellionAttackDamageReaction']);
  const paletteMaterials = new WeakSet();
  function applyBluePalette() {
    for (const {root} of blueKit.preparationEntries()) {
      const material = root.material;
      if (paletteMaterials.has(material)) continue;
      paletteMaterials.add(material);
      const original = material.onBeforeCompile.bind(material);
      const cacheKey = material.customProgramCacheKey();
      material.customProgramCacheKey = () => cacheKey+':blue-hellion-probe';
      material.onBeforeCompile = (shader,renderer) => {
        original(shader,renderer);
        const marker = '#include <opaque_fragment>';
        check(shader.fragmentShader.includes(marker),'Source particle shader changed');
        shader.fragmentShader = shader.fragmentShader.replace(marker,
          'float heat=max(outgoingLight.r,max(outgoingLight.g,outgoingLight.b)); outgoingLight=heat*mix(vec3(.008,.13,.92),vec3(.09,.53,1.4),smoothstep(.28,1.14,heat));\n'+marker);
      };
      material.needsUpdate = true;
    }
  }
  const trails = new TerranEliteMaterials(view.effectScene,view.camera,view.fx);
  trails.prepare();
  let requests = [];
  const blueKeys = new Set();
  let gunTrace;
  const add = routes.player.add.bind(routes.player);
  routes.player.add = (r,ground) => {
    requests.push({key:r.key, model:r.model, from:r.placement.from, at:{x:r.placement.x,y:r.placement.y,z:r.placement.z}});
    if (blueKeys.has(r.key)) return blueKit.add(r,ground);
    const isFighter = r.model==='VikingFighterWeapon';
    const isChild = r.model==='BacklashRocketsLMWeapon' && r.key.includes(':1:0:');
    if ((isFighter||isChild) && r.placement.from) {
      const head=r.placement, from=head.from;
      const length=Math.hypot(head.x-from.x,head.y-from.y,head.z-from.z);
      const t=Math.min(1,(isFighter?1.75:1.1)/Math.max(.001,length));
      const tail={x:head.x+(from.x-head.x)*t,y:head.y+(from.y-head.y)*t,z:head.z+(from.z-head.z)*t};
      trails.ribbon('trace',tail,head,.14,isFighter?0x8bd4ff:0xffca73,.96);
      trails.sprite('glow',head,.26,isFighter?0xb4e6ff:0xffde8a,.85);
    }
    if (['VikingAssaultAttackLaunch','VikingFighterAttackLaunch'].includes(r.model)) {
      return add({...r,particleOpacity:.45,placement:{...r.placement,scale:.55}},ground);
    }
    if (r.model==='SiegeTankSiegedAttackImpact') {
      return add({...r,particleOpacity:.72,projections:false,placement:{...r.placement,scale:.62}},ground);
    }
    return add(r,ground);
  };
  const renderSource = routes.render.bind(routes);
  routes.render = (world,mount,...other) => {
    blueKit.begin(world.time);
    trails.begin(world.time);
    renderSource(world,(event,side) => {
      const body = w.entities.get(event.entityId);
      if (body?.unitType !== 'viking') return mount(event,side);
      // Aim both channels from sockets on the one visible hull.
      const air = body.flying;
      const left = side === 'Left' || side === '10';
      const socket = air ? (left ? '10' : '14') : (left ? 'Left' : 'Right');
      const point = mount({...event, flying:air, nativeMode:air?'viking':'viking_assault', facing:body.facing},socket);
      if (event.kind === 'attack' && event.nativeMode === 'viking_assault' && gunTrace !== event.serial) {
        view.fx.trace(event,point,'fx.muzzle.1',0xffc779,.2);
        gunTrace = event.serial;
      }
      return point;
    },...other);
    blueKit.end();
    applyBluePalette();
    trails.end();
  };

  function reset() {
    w.entities.clear();
    w.weaponFlights = [];
    w.visualEvents = [];
    w.effects = [];
    blueKeys.clear();
    blueKit.reset();
    gunTrace = undefined;
    w.time = 1;
    w.tick = 60;
    w.phase = 'battle';
    w.paused = false;
    w.anchor.x = w.anchor.z = 0;
    view.resetRun();
  }
  function enemy(type,x,z) {
    const u = w.addUnit(type,'zerg',x,z);
    u.hp = u.maxHp = 10000;
    u.shield = u.armor = 0;
    return u;
  }
  function step(count) {
    for (let i = 0; i < count; i++) {
      w.time = ++w.tick * dt;
      tickWeaponFlights(w,dt);
    }
  }
  function frame() {
    requests = [];
    view.render(dt,1);
    check(!view.renderer.getContext().isContextLost(),'Lost WebGL context');
    const report = view.report();
    check(!report.errors.length,report.errors.join(', '));
    return {models:[...new Set(requests.map(r => r.model))], instances:requests.length};
  }
  function aim(u,target) { u.facing = u.attackFacing = Math.atan2(target.x-u.x,target.z-u.z); }
  function nativeShot(u,target) {
    w.hash.rebuild(w.entities.values());
    check(w.canFireAt(u,target),'Native target or range rejected');
    aim(u,target);
    w.fire(u,target);
  }

  function flame() {
    reset();
    const u = w.addUnit('hellion','terran',-3,0);
    const front = enemy('roach',0,0), rear = enemy('roach',2.5,0);
    const side = enemy('roach',1,3), air = enemy('mutalisk',0,1);
    nativeShot(u,front);
    const struck = [front,rear,side,air].filter(e => e.hp < e.maxHp);
    check(struck.length===2 && struck.includes(front) && struck.includes(rear),'Flame hit set');
    for (const e of struck) { e.moveSlowFactor = .3; e.moveSlowUntil = w.time+3; }
    const f = w.effects.find(e => e.kind==='flame' && e.source===u.id);
    check(f,'Flame receipt missing');
    blueKeys.add('flame:'+f.id+':HellionAttackBeam');
    for (const e of w.visualEvents.filter(e=>e.kind==='hit' && e.hitSourceId===u.id)) {
      blueKeys.add('event:'+e.serial+':impact:HellionAttackDamageReaction');
    }
    const ordinary = w.addUnit('hellion','terran',-3,3.3);
    nativeShot(ordinary,side);
    step(12);
    const drawn = frame();
    const blueParticles=blueKit.report().modelDraws.find(d=>d.model==='HellionAttackBeam')?.particles??0;
    const ordinaryParticles=routes.player.report().modelDraws.find(d=>d.model==='HellionAttackBeam')?.particles??0;
    check(blueParticles>0 && ordinaryParticles>0,'Two independently coloured flames');
    return {hits:struck.length,offAxisSlowed:!!side.moveSlowUntil,airborneDamage:air.maxHp-air.hp,blueParticles,ordinaryParticles,
      nativeLineLength:Math.hypot(f.end.x-f.x,f.end.z-f.z), slowSeconds:front.moveSlowUntil-1, drawn};
  }

  function secondVikingGun(u,other,factor,sequence) {
    const secondary = structuredClone(u);
    secondary.nativeMode = u.flying?'viking_assault':'viking';
    secondary.activeWeapon = undefined;
    w.refreshStats(secondary);
    secondary.flying = u.flying;
    aim(secondary,other);
    check(w.targetAllowed(secondary,other) && w.edgeDistance(secondary,other)<=secondary.attackRange && w.hasAttackLine(secondary,other),'Secondary targeting');
    secondary.shotSequence = sequence;
    secondary.weaponDamage *= factor;
    const payload = expeditionWeaponBonuses(w,secondary);
    const bonuses = payload.bonuses.map(b=>({...b,amount:b.amount*factor}));
    w.visual('attack',secondary,other);
    if (!launchWeaponFlight(w,secondary,other,bonuses,payload.shieldBonus*factor,1,undefined,false)) {
      w.attackHit(secondary,other,secondary.weaponDamage,bonuses,unitData(secondary).attacks,payload.shieldBonus*factor,false);
    }
    return secondary.attackPeriod;
  }
  function viking(airborne) {
    reset();
    const u = w.addUnit('viking','terran',0,1);
    u.nativeMode = u.desiredNativeMode = airborne?'viking':'viking_assault';
    w.refreshStats(u);
    const air = enemy('mutalisk',4,6), ground = enemy('roach',-3,4);
    const main = airborne?air:ground, other = airborne?ground:air;
    check(!w.targetAllowed(u,other),'Current single-mode restriction missing');
    nativeShot(u,main);
    secondVikingGun(u,other,.55,10001);
    step(4);
    const drawn = frame();
    const identity = [...w.entities.values()].filter(b=>b.unitType==='viking');
    check(identity.length===1 && identity[0].flying===airborne,'Duplicate or morphed hull');
    check(['VikingFighterWeapon','VikingAssaultAttackLaunch'].every(m=>drawn.models.includes(m)),'Missing weapon layer '+drawn.models);
    step(30);
    check(air.hp<air.maxHp && ground.hp<ground.maxHp && !w.weaponFlights.length,'Dual weapon impacts');
    return {airborne,bodies:identity.length,airDamage:air.maxHp-air.hp,groundDamage:ground.maxHp-ground.hp,drawn};
  }
  function flightCycles() {
    reset();
    const u=w.addUnit('viking','terran',0,1), air=enemy('mutalisk',4,6), ground=enemy('roach',-3,4);
    const salvos={air:[],ground:[]}, groundDamage=[];
    let nextAir=w.time, nextGround=w.time;
    for(let i=0;i<360;i++) {
      if(i===180) air.hp=0;
      if(air.hp>0 && w.time>=nextAir) {
        nativeShot(u,air);
        salvos.air.push(i);
        nextAir=w.time+u.attackPeriod;
      }
      if(w.time>=nextGround) {
        const before=ground.hp;
        const period=secondVikingGun(u,ground,air.hp>0?.55:1,10001+i);
        salvos.ground.push(i);
        groundDamage.push(before-ground.hp);
        nextGround=w.time+period;
      }
      step(1);
    }
    const shots=w.visualEvents.filter(e=>e.kind==='attack');
    check(salvos.air.length>=2 && salvos.ground.length>salvos.air.length && salvos.air[1]!==salvos.ground[1],'Independent Viking periods');
    check(Math.abs(groundDamage[0]/groundDamage.at(-1)-.55)<1e-6 && shots.every(e=>e.entityId===u.id),'Single-plane full damage');
    return {ticks:salvos,groundDamageMixed:groundDamage[0],groundDamageAlone:groundDamage.at(-1)};
  }

  function banshee(kind) {
    reset();
    const u = w.addUnit('banshee','terran',0,0);
    const center = enemy('roach',0,4.5);
    const neighbors = kind==='crowd' ? [[-3,4.5],[2.9,5],[0,7.8]].map(([x,z])=>enemy('roach',x,z)) : [];
    const air = enemy('mutalisk',2,3.5);
    nativeShot(u,center);
    check(w.weaponFlights.length===1,'Native mother salvo should have one packet');
    const parent = w.weaponFlights[0];
    check(parent.hits===2,'Expected two native damage components');
    if (kind==='lost') center.hp=0;
    for (let tick=0; tick<20 && w.weaponFlights.includes(parent); tick++) step(1);
    const impact = w.visualEvents.find(e=>e.kind==='projectile-impact' && e.castId===parent.id);
    if (kind==='lost') {
      check(!impact && !w.weaponFlights.length,'Lost target incorrectly triggered split');
      return {children:0};
    }
    check(impact && center.hp<center.maxHp,'Mother did not arrive');
    const eligible = [...w.entities.values()].filter(e=>e.id!==center.id && e.owner!==u.owner && e.hp>0 && !e.flying && w.visibleTo(e,u.owner) && Math.hypot(e.x-impact.end.x,e.z-impact.end.z)<=4);
    const targets = eligible.length ? eligible.slice(0,3) : [center];
    const childIds = [];
    for (const e of targets) {
      const id = w.nextId++;
      childIds.push(id);
      // The existing hop route starts one missile at the preceding ground impact.
      w.weaponFlights.push({...structuredClone(parent),id,primary:false,attackId:parent.attackId+':child:'+id,
        target:e.id,point:{...impact.end},from:{...impact.end},lastSeen:{x:e.x,z:e.z},start:w.time,
        expires:w.time+2,speed:12,damage:parent.damage*parent.hits*.2,hits:1,hop:1,seen:[center.id],apm:false,crit:1});
    }
    step(9);
    const drawn = frame();
    const visibleChildren = childIds.filter(id=>requests.some(r=>r.model==='BacklashRocketsLMWeapon' && r.key.startsWith('flight:'+id+':')));
    if (kind==='crowd') check(visibleChildren.length===3 && w.weaponFlights.every(f=>f.from.x===impact.end.x && f.from.z===impact.end.z),'Three children from arrival');
    step(40);
    const receipts = w.visualEvents.filter(e=>e.kind==='projectile-impact' && childIds.includes(e.castId));
    check(receipts.length===targets.length && new Set(receipts.map(e=>e.targetId)).size===targets.length && air.hp===air.maxHp,'Child impacts');
    return {nativePackets:1,motherHits:parent.hits,children:receipts.length,visibleChildren:visibleChildren.length,
      differentTargets:new Set(receipts.map(e=>e.targetId)).size,childDamage:neighbors.map(e=>e.maxHp-e.hp),airDamage:air.maxHp-air.hp,drawn};
  }

  function intercept() {
    function shot(cancel) {
      reset();
      const target=w.addUnit('tank','terran',0,0);
      const r=enemy('roach',3,0);
      nativeShot(r,target);
      const flight=w.weaponFlights[0];
      check(flight?.hits===1 && flight.source.id===r.id,'Hostile ordinary flight missing');
      const before=target.hp;
      step(2);
      check(w.weaponFlights.includes(flight) && target.hp===before,'Not a pre-arrival projectile');
      if(cancel) w.weaponFlights=w.weaponFlights.filter(f=>f.id!==flight.id);
      step(12);
      return before-target.hp;
    }
    const normal=shot(false), cancelled=shot(true);
    check(normal>0 && cancelled===0,'Interception changed wrong packet');
    return {normalDamage:normal,interceptedDamage:cancelled};
  }

  function mobility() {
    function chase(factor) {
      const run=new World({race:'terran',seed:111103,waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[]});
      run.start();
      run.entities.clear();
      run.addUnit('marine','terran',0,0);
      const unit=run.addUnit('roach','zerg',0,35);
      unit.moveSlowFactor=factor;
      unit.moveSlowUntil=3;
      const distances=[];
      for(let tick=1;tick<=240;tick++) {
        run.time=tick*dt;
        run.tick=tick;
        run.hash.rebuild(run.entities.values());
        const start={x:unit.x,z:unit.z};
        run.updateUnit(unit,dt);
        if(tick===90 || tick===230) distances.push(Math.hypot(unit.x-start.x,unit.z-start.z));
      }
      return distances;
    }
    const normal=chase(0), slowed=chase(.30);
    const activeRatio=slowed[0]/normal[0], expiredRatio=slowed[1]/normal[1];
    check(Math.abs(.70-activeRatio)<.01 && Math.abs(1-expiredRatio)<.01,'Chase speed ratios '+[activeRatio,expiredRatio]);
    return {activeRatio,expiredRatio};
  }

  function detector() {
    reset();
    const carrier=w.addUnit('tank','terran',-8,0);
    const cloaked=enemy('roach',2,0);
    cloaked.cloaked=true;
    const field={id:w.nextId++,x:carrier.x,z:carrier.z,radius:4,until:w.time+1,team:'player'};
    w.expedition.detectionFields.push(field);
    const seen=()=>w.visibleTo(cloaked,'terran');
    const far=seen();
    carrier.x=field.x=1;
    const near=seen();
    carrier.hp=0;
    w.expedition.detectionFields=w.expedition.detectionFields.filter(f=>f.id!==field.id);
    const dead=seen();
    check(!far && near && !dead,'Mobile detector life and radius');
    return {far,near,dead};
  }

  function penetration() {
    reset();
    const tank=w.addUnit('tank','terran',-6,0);
    tank.mode=tank.desiredMode='siege';
    w.refreshStats(tank);
    const line=[-2,0,2,4,6,8].map(x=>enemy('roach',x,0));
    const beside=enemy('roach',0,2.6), airborne=enemy('mutalisk',1,0);
    function shoot(obstacles) {
      w.obstacles=obstacles;
      const targets=[...line,beside,airborne].filter(e=>!e.flying && e.x>tank.x && e.x-tank.x<=tank.attackRange+e.unitRadius &&
        Math.abs(e.z-tank.z)<=.2+e.unitRadius && clearLine(tank,e,0,w.obstacles,w.terrain)).sort((a,b)=>a.x-b.x).slice(0,4);
      for (const [i,target] of targets.entries()) w.attackHit(tank,target,tank.weaponDamage*(i ? .60 : 1),[],1,0,i===0);
      return targets.length;
    }
    const open=shoot([]);
    const wall=shoot([{x:1,z:0,w:1,h:4}]);
    w.obstacles=[];
    check(open===4 && wall===2 && beside.hp===beside.maxHp && airborne.hp===airborne.maxHp,'Piercing target selection');
    return {open,wall,besideDamage:beside.maxHp-beside.hp,airDamage:airborne.maxHp-airborne.hp};
  }

  function barrage() {
    reset();
    const tank=w.addUnit('tank','terran',0,-4);
    tank.mode=tank.desiredMode='siege';
    w.refreshStats(tank);
    const target=enemy('roach',0,3);
    target.unitRadius=4; // One large target overlaps multiple cells in each row.
    const back=enemy('roach',0,-6);
    const cells=[],hits=[];
    for(let row=0;row<3;row++) {
      const seen=new Set();
      for(let col=-2;col<=2;col++) {
        const point={x:col*1.8,z:1+row*1.8};
        w.visual('projectile-impact',tank,point,w.nextId++);
        cells.push(point);
        for(const e of [target,back]) if(!seen.has(e.id) && Math.hypot(e.x-point.x,e.z-point.z)<=e.unitRadius+.6) {
          seen.add(e.id);
          w.attackHit(tank,e,30,[],1,0,false);
        }
      }
      hits.push(seen.size);
      step(4);
      frame();
    }
    const drawn=frame();
    check(cells.length===15 && hits.every(n=>n===1) && target.maxHp-target.hp===90 && back.hp===back.maxHp,'Barrage row cap or direction');
    check(drawn.models.includes('SiegeTankSiegedAttackImpact'),'Missing siege impact layer');
    return {cells:cells.length,perRow:hits,totalDamage:target.maxHp-target.hp,rearDamage:back.maxHp-back.hp,drawn};
  }
  window.mechProbe = {flame, viking, flightCycles, banshee, intercept, mobility, detector, penetration, barrage};
}

await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false}, optimizeDeps:{entries:['src/render/scene/battle-renderer.ts']},
  cacheDir:out+'/vite',logLevel:'error'});
let browser;
try {
  await server.listen();
  const origin='http://127.0.0.1:'+server.httpServer.address().port;
  const installed='C:/Program Files/Google/Chrome/Application/chrome.exe';
  browser=await chromium.launch({headless:true,executablePath:existsSync(installed)?installed:undefined,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.route(origin+'/probe.html',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto(origin+'/probe.html');
  await page.evaluate(prepare);
  const cases=[['blue-flame','flame',null,true],['viking-air','viking',true,true],['viking-ground','viking',false,true],
    ['banshee-crowd','banshee','crowd',true],['banshee-single','banshee','single',false],['banshee-lost','banshee','lost',false],
    ['interception','intercept',null,false],['barrage','barrage',null,true],['slow-motion','mobility',null,false],
    ['detector','detector',null,false],['piercing','penetration',null,false],['viking-cycles','flightCycles',null,false]];
  const result={browser:browser.version(),scope:'Local design callbacks with production World, weapon flights, asset kits and BattleRenderer',cases:{}};
  for(const [id,method,arg,capture] of cases) {
    result.cases[id]=await page.evaluate(([method,arg])=>window.mechProbe[method](arg),[method,arg]);
    if(capture) await page.locator('canvas').screenshot({path:out+'/'+id+'.png'});
    console.log(id,JSON.stringify(result.cases[id]));
  }
  assert.deepEqual(errors,[]);
  await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
} finally {
  await browser?.close();
  await server.close();
}
