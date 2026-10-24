import fs from 'node:fs';
function edit(file,changes){let s=fs.readFileSync(file,'utf8');for(const [a,b] of changes){if(!s.includes(a))throw Error(file+': missing '+a.slice(0,80));s=s.replace(a,b);}fs.writeFileSync(file,s);}
edit('src/app/bootstrap.ts',[
 ['equipmentAccount?:EquipmentAccount;seed?', 'equipmentAccount?:EquipmentAccount;persistentEquipment?:boolean;seed?'],
 ['let storage:Storage|undefined=options.equipmentAccount?new MemoryStorage():undefined,factory:IDBFactory|undefined;if(!options.equipmentAccount)', 'const isolated=!!options.equipmentAccount&&!options.persistentEquipment;let storage:Storage|undefined=isolated?new MemoryStorage():undefined,factory:IDBFactory|undefined;if(!isolated)'],
 ['const saved=options.equipmentAccount?{repository:null,profile:new PermanentProfile(),notice:\'\',run:null,savedAt:0}:await openSaveProfile(factory)', 'const saved=isolated?{repository:null,profile:new PermanentProfile(),notice:\'\',run:null,savedAt:0,equipment:undefined,management:undefined}:await openSaveProfile(factory)'],
 ['equipmentAccount:options.equipmentAccount,seed:options.seed', 'equipmentAccount:saved.equipment??options.equipmentAccount,seed:options.seed'],
 ['new RunSession(world,saved.repository,saved)', 'new RunSession(world,saved.repository,{...saved,memoryOnly:isolated})'],
 ['options.equipmentAccount?{protocol:\'file:\'}:{}', 'isolated?{protocol:\'file:\'}:{}'],
 ['hud.onCommitFlow=()=>{const kind=', 'hud.onCommitFlow=()=>{void commitFlow();};\n let committing=false;\n const commitFlow=async()=>{if(committing)return;committing=true;try{const kind='],
 ["if(!kind||!token)return;\n  if(kind==='new')", "if(!kind||!token)return;\n  if(['reinforcement','endless'].includes(kind)&&!await session.saveBeforeAdvance()){readiness.fail(session.message);hud.update();return;}\n  if(token!==readiness.readyToken)return;\n  if(kind==='new')"],
 ["preparedNew=null;resetPresentation();readiness.cancel();void audio.start();}", "preparedNew=null;resetPresentation();if(!await session.saveBeforeAdvance()){readiness.fail(session.message);hud.update();return;}readiness.cancel();void audio.start();}"],
 ["}else readiness.cancel();hud.update();};", "}else readiness.cancel();hud.update();}finally{committing=false;}};"],
 ["if(!session.memoryOnly||!session.canResume)world.resetRun();", "if(!world.starship.enabled)world.resetRun();"],
]);
edit('src/ui/starship/native.ts',[["{resolveImage,inputReset:()=>hud.inputReset(),", "{resolveImage,management:hud.session?.management,inputReset:()=>hud.inputReset(),"]]);
edit('src/ui/starship/host.ts',[["begin?():EquipmentResult<unknown>;continue?()", "canExtract?():boolean;begin?():EquipmentResult<unknown>;continue?()"]]);
edit('src/ui/starship/world-host.ts',[["extract:()=>result(world.extractEquipment(),'只能在关间撤离')", "canExtract:()=>world.canExtractEquipment,extract:()=>result(world.extractEquipment(),'战役完成3/6/9/12/15/18关后或无尽可撤退')"]]);
edit('src/ui/starship/controller.ts',[["case 'extract':result=phase==='intermission'&&this.host.extract?this.host.extract():failure('只能在关间撤离');", "case 'extract':result=(this.host.canExtract?.()??phase==='intermission')&&this.host.extract?this.host.extract():failure('当前尚未到撤退节点');"]]);
edit('src/ui/starship/legacy-view.ts',[["host.phase()==='intermission'?button('撤离结算','extract'", "(host.canExtract?.()??host.phase()==='intermission')?button('撤退结算','extract'"]]);
edit('test/starship-main-integration.test.ts',[["main RunSession never serializes or writes an enabled equipment run", "isolated verification RunSession never serializes or writes an enabled equipment run"],["{run:null,savedAt:0,notice:''}","{run:null,savedAt:0,notice:'',memoryOnly:true}"],["/仅保留内存/", "/独立试玩/"],["/仅保留内存/", "/独立试玩/"]]);
