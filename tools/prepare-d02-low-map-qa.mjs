import fs from 'node:fs';
const tf='test/low-combat-preset.test.ts';fs.writeFileSync(tf,fs.readFileSync(tf,'utf8').replace('new World(529)','new World({seed:529})'));
const f='tools/qa-performance-d02-low-functional.mjs';let s=fs.readFileSync(f,'utf8');s=s.replace(" for(const preset of ['low','medium','full']){",` await page.evaluate(()=>{const w=A03.app.world;w.enemySpecials.acidZones=[{source:999999,point:{x:w.anchor.x,z:w.anchor.z+3},radius:3,damage:5,nextTick:w.time+1,ticks:3}];w.revision++;});
 for(const preset of ['low','medium','full']){`);
const pos=s.indexOf(" setPhase('responsive-settings');");if(pos<0)throw Error('maps');s=s.slice(0,pos)+`
 for(const theme of ['industrial','mar-sara','char','ice','frontier']){
  setPhase('map-'+theme);await page.evaluate(async theme=>{const a=A03.app,w=a.world,v=a.view,recipe={version:3,seed:529,theme};await v.prepareCampaignAssets(recipe);w.resetRun();if(!w.configureCampaign(recipe))throw Error('Map rejected');await D02Functional.heroScene('terran',['raynor','tychus','nova']);v.syncMap();await v.waitForPendingAssets();w.enemySpecials.acidZones=[{source:999999,point:{x:w.anchor.x,z:w.anchor.z+3},radius:3,damage:5,nextTick:w.time+1,ticks:3}];w.revision++;D02Functional.draw();},theme);
  const before=await page.evaluate(()=>D02Functional.snapshot());await page.evaluate(()=>D02Functional.preset('full'));await shot('map-'+theme+'-full',true);const low=await page.evaluate(()=>D02Functional.preset('low'));const environment=await page.evaluate(()=>A03.app.view.mapView.report());assert.equal(environment.environment.atmosphere.visibleParticles,0);assert.equal(low.danger.patches.length,1);await shot('map-'+theme+'-low',true);await page.evaluate(()=>D02Functional.preset('full'));await shot('map-'+theme+'-full-restored',true);assert.equal(await page.evaluate(()=>D02Functional.snapshot()),before);report.checks.push({kind:'map',theme,low,environment,stateSha256:hash(before)});await save();
 }
`+s.slice(pos);fs.writeFileSync(f,s);
