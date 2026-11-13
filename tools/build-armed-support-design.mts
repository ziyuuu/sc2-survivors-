import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {ARMED_CARDS,ARMED_RULES,ARMED_NODE_LINKS,armedDetail} from '../src/data/terran-armed-support';
import {ASSETS} from '../src/assets/manifest';
import {ELITES} from '../src/data/elites';
import {PAINTED_CARDS} from '../src/assets/ui-art.generated';
import {REVIEW_ART} from '../preview/armed-support-cards-20261111/art';

const root=process.cwd(),out=path.join(root,'reports/local/armed-support-design-20261111');
const docPath=path.join(root,'docs/project/V1_4_TERRAN_ARMED_SUPPORT_CARD_DESIGN_20261111.md');
await fs.mkdir(out,{recursive:true});
const specPath='docs/project/V1_3_TERRAN_ARMED_SUPPORT_CODE_SPEC_20261110.md';
const spec=await fs.readFile(path.join(root,specPath),'utf8');
const hash=createHash('sha256').update(spec).digest('hex');
const configSha256=createHash('sha256').update(await fs.readFile('src/data/terran-armed-support.ts')).digest('hex');
const ids=new Set(ARMED_CARDS.map(c=>c.id));
if(ids.size!==45)throw Error('Expected 45 unique cards');
for(const [prefix,count]of Object.entries({W:9,G:9,B:9,P:6,N:9,O:3}))if(ARMED_CARDS.filter(c=>c.id.startsWith(prefix)).length!==count)throw Error('Wrong group '+prefix);
for(const c of ARMED_CARDS)if(!spec.includes(c.id+' '+c.name))throw Error('R3 identity missing '+c.id);

const embedded:Record<string,string>={};
const paintingKeys=Object.values(REVIEW_ART).flatMap(a=>[a.identity,...(a.identities??[])]).map(id=>'ui.paint.'+PAINTED_CARDS[id as keyof typeof PAINTED_CARDS].assetKey);
for(const id of new Set(['ui.intermission.background-terran','ui.intermission.objects-terran','ui.minerals','ui.gas',...paintingKeys])){
 const a=ASSETS.get(id);if(!a||a.status!=='available'||!a.url)throw Error('Missing required review art '+id);
 const bytes=await fs.readFile(path.join(root,'public',a.url));embedded[id]=`data:image/${a.url.endsWith('.webp')?'webp':'png'};base64,${bytes.toString('base64')}`;
}
const bundle=await build({entryPoints:['preview/armed-support-cards-20261111/main.ts'],bundle:true,write:false,outfile:'review.js',format:'iife',target:'es2022',minify:true,define:{__ARMED_ASSETS__:JSON.stringify(embedded)}});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js'))!.text.replaceAll('</script','<\/script');
const css=bundle.outputFiles.find(f=>f.path.endsWith('.css'))!.text;
const html=(mode:string)=>`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="armed-design-config" content="${configSha256}"><title>武装支援卡面</title><style>${css}</style></head><body data-page="${mode}"><script>${js}</script></body></html>`;
await fs.writeFile(path.join(out,'武装支援-卡面审阅.html'),html('review'));
await fs.writeFile(path.join(out,'卡槽.html'),html('shelf'));

const pack=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8'));
const fx=JSON.parse(await fs.readFile('src/data/combat-fx-routes.json','utf8'));
const audio=JSON.parse(await fs.readFile('src/data/combat-audio.json','utf8'));
const sourceFx=JSON.parse(await fs.readFile('src/render/effects/source/catalog.json','utf8'));
const manualFx:Record<string,string[]>={pod:['JumpLandDust'],nuke:['GhostNukeExplode'],planetary:['PlanetaryFortressAttackLaunch','PlanetaryFortressAttackImpact'],battlecruiser:['ATSLaserBatteryLMWeapon','BattlecruiserAirAttackImpact']};
const groups:Record<string,{keys?:string[];routes?:string[];note?:string}>={
 pod:{keys:['model.barracks','model.barracks.death'],routes:['rescue:terran'],note:'真实载体 FlyEnd/Stand Work/FlyStart；逐人出门回执，实际落地与退场时钟。'},
 marine:{keys:['model.marine','model.marine.death'],routes:['marine']},
 'production-families':{keys:['model.marine','model.marauder','model.reaper','model.hellion','model.tank','model.thor','model.viking'],note:'正式席与已付订单共享预留；分关/恢复按实际 familySlots 与在途身份动态预载，第一批免费生产尚待合流。'},
 siege:{keys:['model.tank.siege'],routes:['tank-siege','tank'],note:'正式逐弹计划；原版炮口/落点效果，装备只冻结一次，渲染不驱动命中。'},
 thor:{keys:['model.thor'],routes:['thor-ground','thor-air']},
 bunker:{keys:['model.fort.bunker','model.fort.bunker.death'],routes:['building:bunker'],note:'G02 的双枪和 N02 门动画只跟随实际 G02 地堡；P05 使用独立的非武装补给站设备。'},
 turret:{keys:['model.fort.turret_terran','model.fort.turret_terran.death'],routes:['building:auto-turret']},
 hellion:{keys:['model.hellion','model.hellion.death'],routes:['hellion']},
 reaper:{keys:['model.reaper','model.elite.reaper.1'],routes:['reaper','elite:reaper.1']},
 viking:{keys:['model.viking','model.viking.death'],routes:['viking','viking-air']},
 zergling:{keys:['model.zergling','model.zergling.death'],routes:['zergling']},
 nuke:{routes:['special:nuke'],note:'GhostNukeExplode 原版源效果；整轮发射、每弹命中、手动库存和恢复游标独立结算。'},
 'elite-thors':{keys:['model.elite.thor.1'],routes:['thor-ground','thor-air'],note:'thor.1/.2/.3 沿 ELITES 共用模型键，实际精英身份和原技能分别冻结。'},
 'elite-tanks':{keys:['model.elite.tank.1','model.elite.tank.2','model.elite.tank.2.siege'],routes:['tank','tank-siege']},
 mines:{routes:['mines'],note:'G01 复用 tracking-mines/nonhero-effects 与原声；N04 读取同一枚雷的原状态。'},
 missiles:{routes:['terran.missiles'],note:'B07 复用 SupportPacket 飞行/命中/原声，N01 半径与 N06 首击只冻结一次。'},
 ricochet:{routes:['terran.ricochet'],note:'G07 复用原跳弹与实际兵种武器效果/声音。'},
 mutation:{routes:['mutation'],note:'G08 复用原挂火/层时钟和实际兵种命中事件。'},
 overdrive:{routes:['terran.overdrive'],note:'B09 复用原主动 buff 与音轨，展示真实攻击周期变化。'},
 'production-ui':{note:'W03 使用正式新订单报价；旧已开工工时不重算。'},
 recovery:{keys:['model.support.medkit'],routes:['special:medicHeal'],note:'内容物为原版 PickupMedicRecharge（Stand/Death）；外箱、铰链与开盖是本作程序美术，实际开盖/治疗事件驱动。'},
 detection:{note:'照明弹为本作程序美术；爆炸复用原版炮击声，显形读取正式探测域。'},
 repair:{keys:['model.support.repair_drone','model.support.repair_drone.death'],routes:['special:repair'],note:'原版 Repair_Drone_MP 工作动作；SCV 原版修理循环声仅实际修理时播放，不使用 model.fort.repair 冒充。'},
 root:{note:'六柱夹具为本作程序美术；原版人族卸载声跟随锁位生效，捕获和根位来自正式 World。'},
 oil:{routes:['special:bile'],note:'油面/油泡/附身油为本作程序美术；原版腐蚀发射声跟随真实铺油，周期伤害独立去重。'},
 shield:{note:'信标为本作程序美术；卡盾实际受击/耗尽走原版盾面与音效。已提取的 sensor_payload 不冒称用于该卡本体。'},
 'authored-props':{note:'道具外壳、夹具、照明弹、炸药、油面和信标由 ArmedFieldViews 程序构建，独立几何/材质随退场释放；不声明为原版模型。'},
 'prepared-elites':{note:'按本局已准备精英池动态取原身份；实际出门时掷一次，保存后不重掷，原模型/动作/武器声。'},
 'prepared-hero':{note:'本局准备英雄的原模型/主动/被动，独立临时实例，不覆盖常驻英雄记录。'},
 battlecruiser:{keys:['model.battlecruiser','model.battlecruiser.death'],routes:['battlecruiser-ground','battlecruiser-air','hero:yamato_battlecruiser','hero:yamato_battlecruiser-air'],note:'原版 BattlecruiserEX2 默认形态和 BattleCruiserDeathEx1_00；普通 ATS8/ATA5 原武器，不继承大和英雄数值或技能。'},
 planetary:{keys:['model.fort.planetary','model.fort.planetary.death'],routes:['building:planetary'],note:'原演员 PlanetaryFortress 指定 CommandCenter + AnimGroup A；Stand A/Attack/Stand Work A。原版发射/命中声继承 Terran_ExplosionSmall/Medium，非猜测替代。'}
};
const resourceRows=await Promise.all(ARMED_CARDS.map(async c=>{
 const keys=[...new Set(c.resources.flatMap(r=>r.startsWith('model.')?[r]:groups[r]?.keys??[]))];
 const assets=await Promise.all(keys.map(async id=>{
  const a=ASSETS.get(id),source=pack.manifest.find((x:any)=>x.id===id);let exists=false;
  if(a?.url)try{await fs.access(path.join('public',a.url));exists=true;}catch{}
  return {id,status:a?.status??'unregistered',localExists:exists,url:a?.url??null,source:source?{path:source.sourcePath,build:source.sourceBuild,sha256:source.sourceSha256,transport:source.sourceTransport,animations:source.animations,clips:source.clipSources?.map((x:any)=>({name:x.name,duration:x.duration}))}:null};
 }));
 const requestedRoutes=[...new Set(c.resources.flatMap(r=>groups[r]?.routes??[]))];
  return {id:c.id,name:c.name,visual:c.visual,visibleEffect:c.effect,icon:{current:REVIEW_ART[c.id]??{atlas:'ui.intermission.objects-terran',sprite:c.sprite},status:'approved SC2 painting/atlas composition shared by production card slots'},assets,
  eliteIdentities:c.resources.includes('elite-thors')?['thor.1','thor.2','thor.3'].map(id=>({id,definition:ELITES[id as keyof typeof ELITES]})):undefined,
  sourceEffects:[...new Set([...c.resources.flatMap(r=>manualFx[r]??[]),...fx.filter((r:any)=>requestedRoutes.includes(r.key)).flatMap((r:any)=>Object.values(r.models).flat())] as string[])].filter(id=>sourceFx[id]).map(id=>({id,source:sourceFx[id].source,sha256:sourceFx[id].sourceSha256,glbId:sourceFx[id].glbId??null,animations:sourceFx[id].materialProfile.clips.map((c:any)=>c.name)})),
  routeCandidates:requestedRoutes.map(key=>({key,fx:fx.filter((r:any)=>r.key===key),audio:audio.weapons[key]??audio.skills[key]??audio.special[key.replace(/^special:/,'')]??null})),
  notes:[...new Set(c.resources.flatMap(r=>groups[r]?.note?[groups[r].note]:[]))],gaps:assets.filter(a=>a.status!=='available'||!a.localExists).map(a=>a.id),
  lifecycle:'出勤前按冻结身份纳入分关/恢复准备；实际发射、命中、承伤、出兵驱动表现；单物件退场撤预约/碰撞/光环，回收视图、mixer、循环声；已出乘员按自身寿命。运行时由实际部署/出兵/伤害/退场状态驱动，资源预载按本关及恢复快照收集。'};
}));
const audit={date:'2026-11-11',sourceHead:'679720fefa5c',configSha256,spec:specPath,specSha256:hash,scope:'候选版45卡实际资源/程序美术盘点；模型身份见 source-identities.json，运行验证见展示及玩家入口报告。第一批经济/生产仍待合流。',cards:resourceRows};
await fs.writeFile(path.join(out,'资源盘点.json'),JSON.stringify(audit,null,2)+'\n');

const header=await fs.readFile('preview/armed-support-cards-20261111/design-notes.md','utf8');
const body=Object.entries({W:'白卡 · 9 张',G:'绿卡 · 9 张',B:'蓝卡 · 9 张',P:'普通紫 · 6 张',N:'紫节点 · 9 张',O:'橙节点 · 3 张'}).map(([prefix,title])=>`## ${title}\n\n`+ARMED_CARDS.filter(c=>c.id.startsWith(prefix)).map(c=>{
 const r=resourceRows.find(r=>r.id===c.id)!;
 const links=ARMED_NODE_LINKS[c.id]?.map(id=>ARMED_CARDS.find(c=>c.id===id)!.name).join('、');
 return `### ${c.id} ${c.name}\n\n**图标／主视觉**　${c.visual}\n\n**【简单描述】**　${c.brief}\n\n**【详情】**\n\n${armedDetail(c).split('\n').map(line=>'- '+line).join('\n')}\n\n**普通镜头与音画**　${c.effect}\n\n**资源接点**　${r.assets.map(a=>'`'+a.id+'`（'+a.status+'／本地'+(a.localExists?'有':'缺')+'）').join('、')||'见原执行器或待核来源'}。${[...r.notes,...r.gaps].join(' ')}${links?'\n\n**联动配置（开发核对）**　'+links+'。':''}\n`;
 }).join('\n')).join('\n');
const footer=`\n## 生成依据\n\n本稿由 \`src/data/terran-armed-support.ts\` 和本目录审阅说明生成；R3 SHA256：\`${hash}\`。45 个编号／名称逐项与 R3 核对。参数已被正式 World、关间货架与详情读取；六张原卡继续复用原执行器。候选版验证及第一批依赖边界以本轮验收报告为准。\n`;
await fs.writeFile(docPath,header+'\n'+body+footer);
await fs.writeFile(path.join(out,'完整卡面设计.md'),header+'\n'+body+footer);
console.log(JSON.stringify({out,cards:ids.size,specSha256:hash,bytes:(await fs.stat(path.join(out,'武装支援-卡面审阅.html'))).size,missingRegistered:resourceRows.flatMap(r=>r.assets.filter(a=>a.status!=='available'||!a.localExists).map(a=>r.id+':'+a.id))}));
await fs.writeFile(path.join(out,'design-build.json'),JSON.stringify({id:'armed-design-r3-20261111-simple-r4',sourceHead:'679720fefa5c',configSha256,specSha256:hash,cards:ids.size},null,2)+'\n');
