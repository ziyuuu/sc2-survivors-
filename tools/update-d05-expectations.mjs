import fs from 'node:fs';
function edit(file,changes){let s=fs.readFileSync(file,'utf8');for(const [a,b] of changes){if(!s.includes(a))throw Error(file+': missing '+a.slice(0,80));s=s.replace(a,b);}fs.writeFileSync(file,s);}
edit('src/persistence/save-repository.ts',[["notice:error?'存档无法读取，原文件已保留。", "notice:error?'当前版本存档无法读取，原文件已保留。"]]);
edit('test/main-feedback-20261019.test.ts',[["{run:null,savedAt:0,notice:''}","{run:null,savedAt:0,notice:'',memoryOnly:true}"],["in-page continuation preserves", "isolated in-page continuation preserves"]]);
edit('test/encounters.test.ts',[
 ["in-memory DTO restore retains plans and exact next threshold; legacy saves stay blocked", "equipment checkpoint restore retains plans and exact next threshold"],
 ["assert.throws(()=>w.captureRun(),/MVP/);\n const saved=structuredClone({state:w.snapshotData(),account:w.starship.account}),copy=world();\n validateRunData(saved.state,new RunState());Object.assign(copy,saved.state);copy.starship.account=saved.account;", "const saved=w.captureRun(),copy=world();\n validateRunData(saved.state,new RunState());copy.restoreRun(saved);"],
]);
edit('test/g01-card-equipment.test.ts',[["assert.throws(()=>w.captureRun(),/MVP/)","assert.ok(w.captureRun().starship)"]]);
edit('test/starship-drops.test.ts',[["equipment opt-in never writes enhanced stats into the deferred old save format; existing empty-account game remains unchanged", "equipment snapshots include their runtime; existing empty-account game remains unchanged"],["assert.throws(()=>equipped.captureRun(),/MVP收尾/)","assert.ok(equipped.captureRun().starship)"]]);
edit('test/integration-i03-entry.test.ts',[["assert.equal(session.memoryOnly,true);assert.throws(()=>session.inspectSave('{}'),/不读取正式存档/);", "assert.equal(session.memoryOnly,false);assert.ok(JSON.parse(session.exportJSON()).data);"]]);
edit('test/starship-production-integration.test.ts',[
 ["the integrated account has no starter grants and UI never offers unavailable archive operations", "the integrated account has no starter grants and exposes durable equipment archives"],
 ["assert.equal(session.memoryOnly,true)","assert.equal(session.memoryOnly,false)"],
 ["assert.ok(!menu.includes('data-action=\"menu-load\"'))", "assert.ok(menu.includes('data-action=\"menu-load\"'))"],
 ["world.endStage();assert.ok(world.extractEquipment());", "world.stage=3;world.endStage();assert.ok(world.extractEquipment());"],
 ["assert.ok(!ended.includes('data-action=\"save-'))", "assert.ok(ended.includes('data-action=\"save-'))"],
]);
edit('test/starship-ui-flow.test.ts',[
 ["w.endStage();m.endStage();for(const host of [h,m.host])assert.ok(run(host,{type:'extract'}).ok)", "w.stage=3;w.endStage();m.endStage();for(const host of [h,m.host])assert.ok(run(host,{type:'extract'}).ok)"],
 ["w.endStage();m.endStage();const before=a.dust;", "w.stage=3;w.endStage();m.endStage();const before=a.dust;"],
]);
edit('test/integration-i02-transactions.test.ts',[["assert.ok(finishSpecialStage(w,'timeout'));w.endStage();const dust=a.dust;", "assert.ok(finishSpecialStage(w,'timeout'));while(w.stage<6){w.endStage();while(w.phase==='reward')w.skipReward();}w.endStage();const dust=a.dust;"]]);
