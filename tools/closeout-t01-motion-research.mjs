// Run with node --import tsx. Source inventory only; does not build or test the game.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {DOMParser} from '@xmldom/xmldom';
import {DYNAMIC_CASES} from './t01/catalogue.ts';
import {buildGallery,actorModel} from './t01/gallery.ts';
import {loadAudioSources} from './t01/audio-source.mjs';
import {MOTION_ACTORS} from './t01/motion-audio-plan.mjs';
const cache='.cache/t01-all-motion',read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const research=read(cache+'/research.json'),shortlist=read(cache+'/shortlist.json'),downloads=read(cache+'/downloads.json'),paths=read(cache+'/casc-paths.json');
const originalData='assets/private/movement-research/data';
function copyOriginals(from,to){fs.mkdirSync(to,{recursive:true});for(const e of fs.readdirSync(from,{withFileTypes:true})){if(e.isDirectory())copyOriginals(from+'/'+e.name,to+'/'+e.name);else if(e.isFile())fs.writeFileSync(to+'/'+e.name,fs.readFileSync(from+'/'+e.name));else throw Error('Unexpected source entry');}}
copyOriginals(cache+'/data',originalData);
const stable=p=>p?.replace(cache+'/data',originalData),db=await loadAudioSources();
const identities={...MOTION_ACTORS,scv:['melee','SCV'],drone:['melee','Drone'],probe:['melee','Probe'],
 'carrier:barracks':['melee','Barracks'],'building:factory':['melee','Factory'],'building:starport':['melee','Starport'],'building:command-center':['melee','CommandCenter'],
 'special:infested-marine':['melee','InfestorTerran'],
 'reference:locust':['melee','LocustMP'],'reference:broodling':['melee','Broodling']};
const rows=Object.entries(identities).map(([key,[profile,id]])=>{
 const a=db.actor(id,profile),token=a?.fields['SoundArray:Movement']?.value,s=db.sound(token,profile),turn=a?.fields['SoundArray:Turning']?.value,ts=db.sound(turn,profile);
 const modelKey=key.startsWith('hero:')?key.replace(':','.'):key==='hellbat'?'hellion.hellbat':key==='viking-assault'?'viking.assault':key;
 const m=research.rows.find(r=>r.id==='model.'+modelKey);
 const steps=m?.xmlEvents.filter(e=>e.Type==='Sound'&&(key==='hero:dehaka'?e.model==='MutatorAmonDehaka':key==='hero:zagara'?e.model==='ZagaraVoidCoop':key==='hero:fenix'?e.model==='FenixDragoon':true))??[];
 const herd=a?.fields.MovementHerdNode?.value??s?.fields.HerdNode?.value;
 return {key,profile,actor:id,actorSources:a?.chain,movementToken:token,files:s?.assets.map(x=>x.path)??[],
  movementSource:s?.chain,turningToken:turn,turningFiles:ts?.assets.map(x=>x.path)??[],herd,
  walkEvents:steps.map(e=>({...e,file:stable(e.file)})),
  status:s?.assets.length?'original-movement-bank':steps.length?'original-model-walk-events':herd?'original-herd-binding':'unresolved-not-proof-of-absence'};
});
const unitCoverage=buildGallery(DYNAMIC_CASES).filter(o=>o.unit).map(o=>{
 const cases=o.actions.flatMap(a=>a.cases),c=cases[0],models=[...new Set(cases.map(actorModel))];
 const key=c.actor?.startsWith('hero.')?c.actor.replace('hero.','hero:'):c.family;
 const source=rows.find(r=>r.key===key);
 const modelResearch=models.map(m=>research.rows.find(r=>r.id==='model.'+m)).filter(Boolean);
 return {id:o.id,name:o.name,family:c.family,models,sourceIdentity:key,sourceStatus:source?.status??'unresolved',
  forms:[...new Set(cases.map(x=>x.fixture?.mode).filter(Boolean))],
  modelSources:modelResearch.map(m=>({id:m.id,file:m.file,modelIds:m.modelIds,walkClips:m.clips,
   xmlSoundCandidates:m.xmlEvents.filter(e=>e.Type==='Sound').map(e=>({...e,file:stable(e.file)})),
   embeddedEvents:m.events})),note:c.actor?.startsWith('elite.')?'项目精英按家族接音；独立模型已逐项检索，不能把外观皮肤等同于另一个原生单位身份。':undefined};
});
const parse=file=>new DOMParser().parseFromString(fs.readFileSync(file,'utf8'),'text/xml');
const herdFile=originalData+'/mods/swarm.sc2mod/base.sc2data/GameData/HerdData.xml';
const herds=Array.from(parse(herdFile).documentElement.childNodes).filter(n=>n.nodeType===1).map(n=>({id:n.getAttribute('id'),xml:n.toString(),source:herdFile}));
const alternatives=read(cache+'/cinematic-alternatives.json').map(x=>({...x,file:stable(x.file),status:'cinematic-only-not-combat-binding'}));
const report={date:'2026-10-26',status:'source-search-complete-with-unresolved-bindings',scope:'全项目单位移动声来源尽可能检索；只做来源研究、原声提取与音频完整性检查，未接线或开发测试。',
 sourceBuild:read('tools/sc2-casc-lock.json'),coverage:{catalogueUnits:unitCoverage.length,distinctCatalogueModels:new Set(unitCoverage.flatMap(x=>x.models)).size,
  modelKeys:research.models,uniqueM3Files:research.uniqueModelFiles,modelScanNote:'包含单位、变形、死亡、建筑和环境模型，不能将 522 当作单位数量。',
  xmlActorModelSoundFiles:research.files,cascIndexedPaths:paths.length,audioPaths:paths.filter(p=>/\.(wav|ogg|mp3)$/i.test(p)).length,
  supplementaryDataFiles:read(cache+'/supplement.json').length,identities:rows.length},
 findings:[
  {id:'dehaka-walk',status:'confirmed-missing-route',summary:'德哈卡实际来源 MutatorAmonDehaka 有 Slow Walk 与 Walk 01 脚步事件；现有 walkEvents 只接扎加拉和菲尼克斯，遗漏了德哈卡。',bank:'Dehaka_FootStep',files:'Kraith_Fs_1.wav 至 Kraith_Fs_5.wav',eventTimes:{SlowWalk:[.004,.530],Walk01:[.004,.813]}},
  {id:'zerg-herds',status:'confirmed-missing-route',summary:'跳虫通过 MovementHerdNode_ZergSmall、虫后通过 HerdNode_ZergQueens 接原版群体移动声；现有 MotionAudio 没有 Herd 接口。',source:herdFile,note:'群体按节点权重和空间范围分级触发，不能改成每个单位独立叠加循环。其他 Herd 表存在不代表所有虫族单位都已绑定。'},
  {id:'building-propulsion',status:'confirmed-source-for-separate-path',summary:'兵营、工厂、星港、指挥中心有共享原版飞行推进声，三份 Terran_BuildingMovement 文件已提取。兵营入场载体属于 entities 以外的显示路径，尚未接线。'},
  {id:'marine',status:'battle-binding-unresolved',summary:'已提取五份陆战队员剧情行走/转身原声，以及通用重靴与人族重型步伐候选。普通战斗 Marine 的独立脚步绑定仍未找到。',historicalEvidence:'暴雪 2.0.4 官方补丁说明明确提及 Marine marches 群体声音；它证明官方曾描述该功能，但不能证明 B97563 的具体文件和绑定。'},
  {id:'tank',status:'battle-binding-unresolved',summary:'核查 SiegeTank_Movement 与 SiegeTankMovement 别名、模型事件、群体入口、全部原声索引及跨语言候选，仍未定位坦克普通行驶履带/引擎的可靠绑定。已排除变形声、军械库摆设声及 War3 SteamTankMovement。'},
  {id:'legacy-zerg',status:'original-files-inactive-binding',summary:'找到跳虫 a–l 及刺蛇、蟑螂、爆虫、雷兽旧单体移动素材；部分绑定/声音库被注释，部分库音量 -60 dB。这些是原始候选，不能直接称为当前生效原声。'},
  {id:'other-heroes',status:'cinematic-alternatives',summary:'另外定位到阿塔尼斯、阿拉纳克、沃拉尊、斯托科夫及人类凯瑞甘的剧情脚步库，记录路径但没有混接到当前战斗模型。'}
 ],
 identities:rows,units:unitCoverage,herds,shortlist:shortlist.groups,cinematicAlternatives:alternatives,
 originalAudio:downloads.map(r=>({...r,file:r.file.replaceAll('\\','/')})),
 audioValidation:{decoded:downloads.length,allNonzeroSignal:downloads.every(r=>r.audio?.peak>0),sourceBytes:downloads.reduce((n,r)=>n+r.bytes,0),seconds:downloads.reduce((n,r)=>n+r.audio.duration,0),kind:'原始音频 libsndfile 解码与信号检查；不是游戏运行或人工听感验收。'},
 limitations:{unavailableData:read(cache+'/unavailable.json'),note:'29 份 Nova 任务地图内部数据因原始归档缺解密键未读取；已读取 Nova 公共单位/声音层。没有尝试绕过。只检索当前固定 B97563，未取得 2.0.4 完整历史客户端以追溯 Marine marches。'},
 publicEvidence:[{url:'https://news.blizzard.com/en-gb/article/10053042/patch-2-0-4-now-live',publisher:'Blizzard Entertainment',relevance:'官方描述 Group Sounds 包括 Marine marches 与 mech ground-shaking；不能当作坦克单体声音文件绑定。'},
 {url:'https://s2editor-guides.readthedocs.io/New_Tutorials/04_Data_Editor/058_Data_Editor_Introduction/',relevance:'编辑器文档列出 Herd/HerdNode 独立数据类别。'}],
 reproduction:['pwsh -File tools/discover-t01-all-motion.ps1','node tools/research-t01-all-motion.mjs','node tools/prepare-t01-motion-research.mjs','pwsh -File tools/fetch-t01-motion-research.ps1','python -m pip install --target .cache/t01-all-motion/python -r tools/audio-requirements.txt','python -X utf8 tools/inspect-t01-motion-research.py','node --import tsx tools/closeout-t01-motion-research.mjs'],
 preservation:{runtimeCode:'untouched',audioRoutes:'untouched',currentDelivery:'reports/local/t01-20261024/offline-r32/T01-综合检测.html',developmentTestsRun:false,buildRun:false,commitPushPublish:false},
 retention:{originalAudio:'assets/private/movement-research',originalData,temporaryCache:cache,cleanupPending:true}};
const delivery=report.preservation.currentDelivery;report.preservation.deliverySha256=crypto.createHash('sha256').update(fs.readFileSync(delivery)).digest('hex');
fs.mkdirSync('reports/qa',{recursive:true});fs.writeFileSync('reports/qa/t01-all-motion-source-search-20261026.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({coverage:report.coverage,audio:report.audioValidation,findings:report.findings.map(x=>({id:x.id,status:x.status})),report:'reports/qa/t01-all-motion-source-search-20261026.json'}));
