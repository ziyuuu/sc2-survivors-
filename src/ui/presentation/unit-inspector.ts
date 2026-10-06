import {heroAbilityCopy} from './ability-copy';
import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import type {FamilyId} from '../../data/races';
import {unitData} from '../../simulation/combat/expedition-combat';
import {HEROES,type HeroId} from '../../data/heroes';
import {ELITES} from '../../data/elites';
import {statusReadout,rankLabel} from '../unit-identity';
import {icon} from '../../assets/manifest';
import {paintedArt,escapeHtml as esc} from './painted-art';
export type InspectorTab='stats'|'abilities'|'army';
export interface UnitSeat {key:string;family?:FamilyId;unit?:Entity;bodies:Entity[];name:string;image:string;hero?:HeroId;defeated?:boolean;regrowAt?:number}
const n=(value:number)=>Number.isFinite(value)?value.toLocaleString('zh-CN',{maximumFractionDigits:2}):'—';
const meter=(label:string,value:number,max:number,kind='hp')=>`<div class="inspect-meter ${kind}"><div><span>${label}</span><strong>${n(Math.ceil(value))} <small>/ ${n(Math.ceil(max))}</small></strong></div><i><b style="width:${max>0?Math.max(0,Math.min(100,value/max*100)):0}%"></b></i></div>`;
const stat=(label:string,value:string,unit='')=>`<div><dt>${label}</dt><dd>${value}${unit?` <small>${unit}</small>`:''}</dd></div>`;
/** All displayed values come from actual entities and saved timers; never creates a unit. */
export function inspectorStats(w:World,u:Entity){
 const data=unitData(u),medical=!u.heroId&&['medivac','science_vessel'].includes(u.unitType),children=[...w.entities.values()].filter(child=>child.summonOwnerId===u.id&&child.hp>0);
 const period=u.shotInterval>0&&u.lastShotAt>=u.bornAt?u.shotInterval:u.attackPeriod;
 return {medical,children,damage:u.weaponDamage,attacks:data.attacks,period,basePeriod:u.attackPeriod,healing:u.healRate,targets:u.healTargets??(u.healTarget?[u.healTarget]:[]),range:u.attackRange,target:data.targetType,move:u.moveSpeed,armor:u.armor,shieldArmor:u.shieldArmor??0};
}
function attributes(w:World,seat:UnitSeat){const u=seat.unit;if(!u)return `<p class="inspector-empty">${seat.hero?(w.heroes.get(seat.hero)?.revivePaid?'已支付复活费用，下关归队。':'英雄已阵亡，可在关间整备复活。'):seat.regrowAt!==undefined?`编制重生中 · ${Math.max(0,Math.ceil((seat.regrowAt-w.tick)/60))} 秒`:'空编制 · 等待生产或增援。'}</p>`;
 const s=inspectorStats(w,u),mode=u.nativeMode??(u.unitType==='tank'?u.mode:''),status=statusReadout(w,u).detail;
 const weapon=s.medical?stat(u.unitType==='science_vessel'?'主系维修':'主系治疗',n(s.healing),'生命/秒'):s.target==='none'?stat(s.children.length?'所属作战单位':'普通武器',s.children.length?String(s.children.length):'无'):stat('武器伤害',n(s.damage)+(s.attacks>1?' × '+s.attacks:''));
 return `<dl class="inspector-stats">${weapon}${s.medical?stat('正在照护',String(s.targets.length),'名'):s.target==='none'?'':stat('最近攻击周期',n(s.period),'秒')}${stat('护甲',n(s.armor))}${u.maxShield?stat('护盾护甲',n(s.shieldArmor)):''}${stat('移动速度',n(s.move))}${stat(s.medical?'支援主系':'攻击目标',s.medical?(u.unitType==='science_vessel'?'机械':'生物'):({ground:'地面',air:'空中',both:'地空',none:'无'}[s.target]))}${s.target!=='none'?stat('射程',n(s.range)):''}</dl>${s.medical?'<p class="inspect-note">异类目标恢复为主系的 1/3；实际恢复受伤损、能量及状态限制。</p>':''}${mode?`<p class="inspect-note">当前模式：${esc(({tank:'坦克',siege:'架炮',hellbat:'恶火',viking_assault:'突击',lurker_burrowed:'潜地',lurker:'移动'} as Record<string,string>)[mode]??mode)}</p>`:''}${status?`<p class="inspect-note">${esc(status)}</p>`:''}${u.recoveryUntil&&u.recoveryUntil>w.time?`<p class="inspect-note">恢复中 · ${Math.ceil(u.recoveryUntil-w.time)} 秒</p>`:''}${u.heroId==='dehaka'?`<p>精华 ${n(u.zergCombat?.essence??0)} · 当前生命储备 ${n((u.zergCombat?.reserveUntil??0)>w.time?u.zergCombat?.reserve??0:0)}</p>`:''}`;
}
function abilities(w:World,seat:UnitSeat,expanded:ReadonlySet<string>){const u=seat.unit,id=seat.hero??u?.heroId;
 const rows:{id:string;name:string;description:string;status?:string}[]=[];
 if(id){const hero=HEROES[id],state=w.heroes.get(id),left=Math.max(0,(state?.skillReady??w.time)-w.time),casting=w.heroCasts.some(c=>c.hero===id&&c.phase!=='dot');rows.push({id:'active',name:hero.skill,description:heroAbilityCopy(id).active,status:!u?'未部署':casting?'施放中':left>0?`冷却 ${Math.ceil(left)} 秒`:'就绪'});rows.push({id:'passive',name:'固有能力',description:heroAbilityCopy(id).passive});}
 if(u?.eliteId)rows.push({id:'elite',name:ELITES[u.eliteId].name,description:ELITES[u.eliteId].description});
 if(u?.maxEnergy)rows.push({id:'energy',name:'能量与施法',description:`能量恢复 ${n(u.energyRegen)} / 秒。当前施法等待 ${Math.max(0,Math.ceil((u.abilityReady??w.time)-w.time))} 秒。`});
 if(u&&!id&&!u.eliteId)rows.push({id:'native',name:'当前作战状态',description:u.healRate>0&&['medivac','science_vessel'].includes(u.unitType)?`实际照护目标 ${(u.healTargets??[]).length} 名；每次仅支付实际恢复量对应能量。`:statusReadout(w,u).detail||'自动寻找合法目标；移动与手动技能遵循当前操作设置。'});
 if(u){const data=unitData(u);rows.push({id:'weapon',name:'武器与目标',description:`${data.name} · ${data.attacks} 段攻击；目标：${({ground:'地面',air:'空中',both:'地空',none:'无普通武器'})[data.targetType]}。${data.bonusDamage.map(b=>`${b.attribute} 原生武器加成 ${n(b.amount)}`).join('；')}${data.splash.length?'；原生范围层：'+data.splash.map(a=>n(a.radius)+' 范围 / '+n(a.fraction*100)+'%').join('、'):''}。实际结算受当前型号、状态及目标防护影响。`});}
 if(u?.summonOwnerId)rows.push({id:'owner',name:'所属单位',description:'该子单位属于母体，不占用独立编制。'});
 return rows.map(row=>`<details class="inspect-ability" data-ability="${row.id}" ${expanded.has(row.id)?'open':''}><summary><span>${esc(row.name)}</span><small>${esc(row.status??'被动')}</small></summary><p>${esc(row.description)}</p></details>`).join('')||'<p>暂无可查看的技能。</p>';
}
export function renderUnitInspector(w:World,seat:UnitSeat,all:readonly UnitSeat[],tab:InspectorTab,expanded:ReadonlySet<string>){
 const u=seat.unit,rank=u?.rank??(seat.hero?w.heroes.get(seat.hero)?.rank:undefined),id=u?.heroId??u?.eliteId??seat.hero??seat.family??'',index=all.indexOf(seat),kind=seat.hero?'英雄':u?.eliteId?'精英':'普通',art=paintedArt(id,seat.name,seat.family==='zergling'?Math.max(1,seat.bodies.length):1);
 const content=tab==='stats'?attributes(w,seat):tab==='abilities'?abilities(w,seat,expanded):`<div class="inspector-army">${all.map(s=>`<button data-inspect-seat="${s.key}" aria-pressed="${s.key===seat.key}">${s.image?icon(s.image,s.name):''}<span>${esc(s.name)}<small>${s.unit?rankLabel(s.unit.rank):s.hero?'阵亡':'空位'}</small></span></button>`).join('')}</div>`;
 return `<header class="inspector-title" data-unit-identity="${esc(id)}" data-unit-rank="${rank??0}"><div><small>${kind} / ${u?(u.flying?'空中':'地面'):'未部署'}</small><h2>${esc(seat.name)} ${rank?`<em>${rankLabel(rank)}</em>`:''}</h2></div><button class="inspect-close" data-inspect-close aria-label="关闭单位详情">×</button></header><div class="inspector-summary">${art}<div class="inspector-vitals">${seat.bodies.map((b,i)=>meter(seat.family==='zergling'?'跳虫 '+(i+1):'生命',b.hp,b.maxHp)).join('')}${u?.maxShield?meter('护盾',u.shield??0,u.maxShield,'shield'):''}${u?.maxEnergy?meter('能量',u.energy,u.maxEnergy,'energy'):''}${seat.regrowAt!==undefined?`<p>重生 ${Math.max(0,Math.ceil((seat.regrowAt-w.tick)/60))} 秒</p>`:''}${!u?'<p>当前无存活身体</p>':''}</div></div><nav class="inspector-tabs" role="tablist" aria-label="单位详情类别">${(['stats','abilities','army'] as const).map(key=>`<button role="tab" data-inspect-tab="${key}" aria-selected="${key===tab}" aria-controls="inspector-content">${({stats:'属性',abilities:'技能',army:'部队'})[key]}</button>`).join('')}</nav><div id="inspector-content" class="inspector-content" role="tabpanel" tabindex="0" data-inspector-scroll>${content}</div><footer class="inspector-neighbors"><button data-inspect-neighbor="-1" aria-label="上一个单位" ${index===0?'disabled':''}>‹</button><div>${all.slice(Math.max(0,index-1),Math.min(all.length,index+2)).map(s=>`<button data-inspect-seat="${s.key}" aria-label="${esc(s.name)}" aria-pressed="${s===seat}">${s.image?icon(s.image,s.name):'◇'}</button>`).join('')}</div><span>${index+1} / ${all.length}</span><button data-inspect-neighbor="1" aria-label="下一个单位" ${index===all.length-1?'disabled':''}>›</button></footer>`;
}
