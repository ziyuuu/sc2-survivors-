import fs from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {HEROES} from '../src/data/heroes';
import {ASSETS} from '../src/assets/manifest';
import {DYNAMIC_CASES} from './t01/catalogue';
import {buildGallery} from './t01/gallery';
import routes from '../src/data/combat-fx-routes.json';
import {sourcePhase,sourceSeed} from '../src/render/effects/source/timeline';
const root='.cache/t01-feedback-inspection';
const audio=[...ASSETS.values()].filter(a=>a.kind==='audio'&&a.status==='available'),ids=new Set(audio.map(a=>a.id.replace('audio.','')));
const attack=(family:string)=>ids.has('sc2.'+family+'.attack')?'sc2.'+family+'.attack':family==='marine'?'shot':['tank','baneling','hellion'].includes(family)?'blast':null;
const heroes=Object.entries(HEROES).map(([id,h])=>({id,name:h.name,family:h.baseFamily,skill:h.skill,attack:h.target==='none'?'mother:no-weapon':attack(h.baseFamily),skillLaunch:ids.has('sc2.'+h.baseFamily+'.attack')?'sc2.'+h.baseFamily+'.attack':['tychus','yamato_battlecruiser','hots_leviathan'].includes(id)?'blast':'shot',death:ids.has('sc2.'+h.baseFamily+'.death')?'sc2.'+h.baseFamily+'.death':null}));
const gallery=buildGallery(DYNAMIC_CASES),groups=Object.groupBy(gallery,o=>o.group),runners=Object.groupBy(DYNAMIC_CASES,c=>c.runner);
if(process.argv.includes('--audio-scope')){
 const objects=gallery.filter(o=>o.unit).map(o=>{const rows=o.actions.flatMap(a=>a.cases.filter(c=>c.action==='attack').map(c=>{const family=c.actor==='hero.purifier_flagship'?'carrier':c.family!,siege=c.fixture?.mode==='siege'||c.actor==='elite.tank.1',id=`sc2.${family}.${siege?'siege':'attack'}`,sound=ids.has(id)?id:family==='marine'?'shot':['tank','baneling','hellion'].includes(family)?'blast':null;return {action:a.name,sound,scope:family==='carrier'?'实际截击机事件':'单位攻击事件'};}));const unique=[...new Map(rows.map(r=>[JSON.stringify(r),r])).values()];return {id:o.id,name:o.name,group:o.group,branches:unique};});
 const attacking=objects.filter(o=>o.branches.length),silent=attacking.filter(o=>o.branches.every(b=>!b.sound)),partial=attacking.filter(o=>o.branches.some(b=>!b.sound)&&o.branches.some(b=>!!b.sound));
 const report={clarification:'用户列举的是部分例子。攻击音效核验与修复覆盖全量适用对象及其实际武器形态。',scope:['全部普通单位','全部精英','全部英雄','全部敌军/首领/领主','召唤物与子机','实际参与攻击的建筑、特殊遭遇与支援对象','对地/对空、近程/远程及变形后武器'],catalogueAudit:{unitObjects:objects.length,attackingObjects:attacking.length,noAttackObjects:objects.length-attacking.length,allBranchesWithoutAudioMapping:silent.length,partiallyMissingObjects:partial.length,originalAttackFamilies:[...new Set(audio.filter(a=>/^audio\.sc2\.[^.]+\.(attack|siege)$/.test(a.id)).map(a=>a.id.split('.')[2]))],objects},limits:['这是当前目录的全量源码/资源路由审核，不是逐项试听或现场播放通过。','165个单位目录是起点；目录外召唤、建筑、特殊遭遇与支援发声路径也属于实施核验范围，不能据本统计宣称全游戏已核对完。','已有声音也须核对身份、实际武器与技能适配，不能只用是否非空判定通过。'],acceptance:'每个适用对象/武器分支具备可追溯原版资源、正确发射/命中时机和实际播放结果；无武器对象明确不适用，不凭空补攻击声。'};
 const file='reports/qa/t01-effects-inspection-20261025.json',qa=JSON.parse(await fs.readFile(file,'utf8'));qa.audioFullScope=report;qa.findings[0].topic='全量单位攻击与死亡音效';if(!qa.findings[0].plan.startsWith('以全部适用对象'))qa.findings[0].plan='以全部适用对象和武器分支为范围，用户点名仅为例子。'+qa.findings[0].plan;const command='node --import tsx tools/audit-t01-feedback-source.mts --audio-scope';if(!qa.reproduce.includes(command))qa.reproduce.push(command);await fs.writeFile(file,JSON.stringify(qa,null,2)+'\n');
 console.log(JSON.stringify({objects:objects.length,attacking:attacking.length,silent:silent.length,partial:partial.length,originalAttackFamilies:report.catalogueAudit.originalAttackFamilies}));process.exit(0);
}
await fs.mkdir(root,{recursive:true});
const cards=(await import('./t01/native-cards.generated.json')).default;
const cardKinds=Object.entries(Object.groupBy(cards,c=>c.data.effect?.kind??'none')).map(([kind,cs])=>({kind,count:cs!.length,example:cs!.slice(0,4).map(c=>({id:c.id,name:c.name,effect:c.data.effect}))}));
const sourceNodes=[];
for(const [file,ids] of [
 ['mods/liberty.sc2mod/base.sc2data/GameData/ActorData.xml',['Marine_Stimpack','Marauder_Stimpack','StimpackStartImpact','StimpackEndImpact','ColossusAttackLaunchSite','ColossusAttackLaunchSiteReverse','ColossusAttackImpactSite','ColossusAttackBeam','ColossusAttackBeamReverse','VoidRayAttackBeam','Carrier','Interceptor','GhostAttack','GhostNukeExplode']],
 ['mods/liberty.sc2mod/base.sc2data/GameData/ModelData.xml',['CarrierBase','InterceptorBase','StimpackStartImpact','StimpackEndImpact','GhostNukeExplode']],
 ['campaigns/liberty.sc2campaign/base.sc2data/GameData/ActorData.xml',['NovaAttack','NovaSnipeAttack']],
 ['mods/swarmmulti.sc2mod/base.sc2data/GameData/ActorData.xml',['VoidRaySwarmAttackBeam','VoidRaySwarmAttack','VoidRaySwarmEnhancedAttack']],
] as Array<[string,string[]]>){
 const full='assets/private/actor-source/'+file,xml=await fs.readFile(full,'utf8'),dom=new DOMParser().parseFromString(xml,'text/xml');
 for(const e of Array.from(dom.documentElement!.childNodes)){if(e.nodeType!==1)continue;const node=e as unknown as Element,id=node.getAttribute('id');if(!ids.includes(id!))continue;const text=e.toString();sourceNodes.push({file:full,line:xml.slice(0,xml.indexOf(text.split('\n')[0])).split('\n').length,id,xml:text});}
}
const effects=JSON.parse(await fs.readFile('src/render/effects/source/catalog.json','utf8'));
const beamClips=Array.from({length:4},(_,n)=>{const key=`channel:2:${n+1}:VoidRayAttackBeam`;return {key,clip:sourcePhase(effects.VoidRayAttackBeam,.1,true,sourceSeed(key)).clip.name};});
const modelScales=[];for(const id of ['model.carrier','model.interceptor']){const asset=ASSETS.get(id)!,bytes=await fs.readFile('public/'+asset.url),json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));modelScales.push({id,url:asset.url,sourceScale:json.nodes.flatMap((n:any)=>typeof n.extras?.sc2ModelScale==='number'?[n.extras.sc2ModelScale]:[])});}
const report={audio:audio.map(a=>({id:a.id,url:a.url})),heroes,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v!.length])),runners:Object.fromEntries(Object.entries(runners).map(([k,v])=>[k,v!.length])),unitObjects:gallery.filter(o=>o.unit).length,objects:gallery.length,cardKinds,sourceNodes,beamClips,modelScales,routes:routes.filter(p=>['colossus','void-ray'].includes(p.key))};
await fs.writeFile(root+'/source.json',JSON.stringify(report,null,2));console.log(JSON.stringify({audio:report.audio,heroes,groups:report.groups,runners:report.runners,objects:report.objects,unitObjects:report.unitObjects,cardKinds:cardKinds.map(k=>({kind:k.kind,count:k.count})),sourceNodes:sourceNodes.map(n=>({id:n.id,file:n.file}))}));
