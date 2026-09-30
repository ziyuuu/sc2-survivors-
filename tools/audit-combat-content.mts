import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AnimationClip} from 'three';
import {ALL_FAMILIES,familyRace} from '../src/data/races';
import {ELITES} from '../src/data/elites';
import {HEROES} from '../src/data/heroes';
import {UNIT_SPECTACLE} from '../src/data/unit-spectacle';
import {HERO_SPECTACLE} from '../src/data/hero-spectacle';
import {mapAnimations,weaponAttachmentNames} from '../src/render/loaders/animations';
const assets=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
const byId=new Map<string,any>(assets.map((a:any)=>[a.id,a]));
const cache=new Map<string,any>();
const read=async(id:string)=>{if(cache.has(id))return cache.get(id);const a=byId.get('model.'+id);if(!a)throw Error('Missing model '+id);const b=await fs.readFile(a.packedFile),json=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),result={asset:a,json,bytes:b,sha256:createHash('sha256').update(b).digest('hex')};cache.set(id,result);return result;};
function movingChannels(data:any,animation:any){const base=20+data.bytes.readUInt32LE(12)+8;return animation.channels.filter((ch:any)=>{const acc=data.json.accessors[animation.samplers[ch.sampler].output],view=data.json.bufferViews[acc.bufferView],n=({SCALAR:1,VEC3:3,VEC4:4} as any)[acc.type];if(!n||acc.componentType!==5126||acc.count<2)return false;const start=base+(view.byteOffset??0)+(acc.byteOffset??0),stride=view.byteStride??n*4;for(let i=1;i<acc.count;i++)for(let k=0;k<n;k++)if(Math.abs(data.bytes.readFloatLE(start+i*stride+k*4)-data.bytes.readFloatLE(start+k*4))>1e-5)return true;return false;}).length;}
const entries=[...ALL_FAMILIES.map(id=>({id,kind:'ordinary',model:id,race:familyRace(id),family:id})),...Object.values(ELITES).map(e=>({id:e.id,kind:'elite',model:e.model,race:familyRace(e.family),family:e.family,mechanism:e.description})),...Object.entries(HEROES).map(([id,h])=>({id,kind:'hero',model:h.model,race:h.race,family:h.baseFamily}))];
const rows=[];
const optionalJson=async(path:string)=>fs.readFile(path,'utf8').then(JSON.parse).catch(()=>null);
const playback=await optionalJson('reports/local/hero-iteration/playback-resolved/report.json');
const cleanHeroes=await optionalJson('reports/local/hero-iteration/playback-clean/report.json');
const fullCombat=await optionalJson('reports/local/hero-iteration/roster-playback/report.json');
const finales=await optionalJson('reports/local/hero-iteration/death-finales-complete/report.json');
const played=new Map<string,any>([...(playback?.heroes??[]),...(playback?.identities??[]),...(cleanHeroes?.heroes??[])].map((r:any)=>[r.id,r]));
const fought=new Map<string,any>((fullCombat?.rows??[]).map((r:any)=>[r.id,r]));
const finished=new Map<string,any>((finales?.rows??[]).map((r:any)=>[r.id,r]));
for(const entry of entries){
 const body=await read(entry.model),{asset,json,sha256}=body,clips=(json.animations??[]).map((a:any)=>new AnimationClip(a.name,-1,[])),actions=mapAnimations(clips,entry.model);
 const deathId=byId.has('model.'+entry.model+'.death')?entry.model+'.death':entry.model,death=deathId===entry.model?body:await read(deathId),nodes=(json.nodes??[]).map((n:any)=>n.name??''),mounts=nodes.filter((n:string)=>/Ref.?Weapon|Ref.?Target|Banshee.?Pod/i.test(n));
 const deathSequences=(death.json.animations??[]).filter((a:any)=>/death|dead/i.test(a.name)).map((a:any)=>({name:a.name,channels:a.channels?.length??0,movingChannels:movingChannels(death,a)}));
 rows.push({...entry,source:asset.sourcePath??asset.sourceFile??asset.packedFile,sourceBuild:asset.sourceBuild??null,sha256,clipNames:clips.map((c:AnimationClip)=>c.name),actions:Object.fromEntries(Object.entries(actions).map(([k,v])=>[k,v?.name??null])),mounts,death:{id:deathId,sha256:death.sha256,sequences:deathSequences,sourceClips:death.asset.clipSources,adaptation:death.asset.deathMotion??null},profile:entry.kind==='hero'?HERO_SPECTACLE[entry.id as keyof typeof HERO_SPECTACLE]:UNIT_SPECTACLE[entry.family as keyof typeof UNIT_SPECTACLE],status:deathSequences.some((d:any)=>d.movingChannels>0)?'SOURCE_CHECKED_PLAYBACK_PENDING':'DEATH_SOURCE_GAP',visualAcceptance:'PENDING',authoredDeath:entry.model==='elite.science_vessel.1'?'Authentic hologram body dissolves with local fragments; source has no moving death clip.':null,notes:!actions.attack||actions.attack===actions.idle?'No distinct skeletal attack: inspect source weapon mount/VFX; not declared passed.':''});
}
for(const row of rows){const observed=played.get(row.id),combat=fought.get(row.id);Object.assign(row,{playback:observed??null,combatPlayback:combat??null,deathFinale:finished.get(row.id)??null});if(observed&&!observed.errors?.length&&row.status!=='DEATH_SOURCE_GAP')row.status=combat?'FULL_STEP_DIAGNOSTIC_RECORDED':'DIAGNOSTIC_PLAYBACK_RECORDED';}
const ancillary=[];
for(const [id,deathKey,usage] of [
 ['scv','scv.death','Friendly rescue worker; no combat attack or death is invented'],['drone','drone.death','Friendly rescue / enemy economy identities remain separate'],['probe','probe.death','Friendly rescue worker'],
 ['interceptor','interceptor.death','Owned combat child, no independent rewards'],['hellion.hellbat','hellion.hellbat.death','Manual form'],['viking.assault','viking.assault.death','Manual form'],['tank.siege','tank.death','Manual deployed form'],
 ['barracks','barracks.death','Temporary delivery carrier'],['hatchery','hatchery.death','Temporary delivery carrier'],['pylon','pylon.death','Temporary delivery carrier'],['hive','hatchery.death','Objective/expansion uses the same original Hatchery identity'],
 ['fort.bunker','fort.bunker.death','Fixed or card-created bunker'],['fort.repair','fort.repair.death','Endless Engineering Bay'],
] as const){const body=await read(id),death=await read(deathKey);ancillary.push({id,usage,sha256:body.sha256,source:body.asset.sourcePath,death:deathKey,deathSha256:death.sha256,sequences:(death.json.animations??[]).filter((a:any)=>/death|dead/i.test(a.name)).map((a:any)=>({name:a.name,movingChannels:movingChannels(death,a)})),visualAcceptance:'PENDING'});}
await fs.mkdir('reports/local/hero-iteration',{recursive:true});
await fs.writeFile('reports/local/hero-iteration/content-audit.json',JSON.stringify({method:'Every identity reads its actual runtime GLB bytes. Animation metadata and diagnostic playback are not visual acceptance. combatPlayback records the real fixed-step fixture, including actual healing, deployment and available spell events. It does not prove every situational modifier or natural balance.',heroFilmSource:cleanHeroes?.heroes.length===18?'playback-clean':'playback-resolved',fullCombatRecorded:fullCombat?.rows.length??0,rows,ancillary},null,2));
await fs.writeFile('docs/project/HERO_MAP_CONTENT_AUDIT.md','# 全量身份素材核验\n\n本表由实际运行GLB生成。主体/动作元数据检查不等于画面签收；本地详细散列、动作及挂点见 reports/local/hero-iteration/content-audit.json。\n\n| 身份 | 模型 | 普攻动作 | 死亡动作 | 状态 |\n|---|---|---|---|---|\n'+rows.map(r=>`| ${r.id} | ${r.model} | ${r.actions.attack??'无独立动作'} | ${r.death.sequences.map((d:any)=>d.name+'('+d.channels+')').join('、')||'缺失'} | ${r.status} |`).join('\n')+'\n');
console.log(JSON.stringify({identities:rows.length,counts:Object.fromEntries(['ordinary','elite','hero'].map(k=>[k,rows.filter(r=>r.kind===k).length])),deathGaps:rows.filter(r=>r.status==='DEATH_SOURCE_GAP').map(r=>r.id),attachmentGaps:rows.filter(r=>!r.mounts.length).map(r=>r.id)}));
await fs.appendFile('docs/project/HERO_MAP_CONTENT_AUDIT.md','\n## 附属对象\n\n| 对象 | 使用路径 | 原死亡主体 | 动作 |\n|---|---|---|---|\n'+ancillary.map(a=>`| ${a.id} | ${a.usage} | ${a.death} | ${a.sequences.map(s=>s.name+'（'+s.movingChannels+'条可动轨）').join('、')||'缺失'} |`).join('\n')+`\n\n另有${fullCombat?.rows.length??0}/120个普通/精英身份的完整固定步作战录像，记录实际攻击、治疗、部署、变形及已触发技能。逐项观测见本地content-audit.json的combatPlayback；未在该夹具触发的条件型机制不能视为经过画面验证。人工观感继续待验。临时兵沿对应主体播放，到期不触发真实死亡奖励；Boss沿对应原型，技能检查与普通普攻分别记录。\n`);
