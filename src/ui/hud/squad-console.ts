import {unitData} from '../../simulation/combat/expedition-combat';
import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import type {FamilyId} from '../../data/races';
import {SC2_UNITS} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {HEROES} from '../../data/heroes';
import {icon} from '../../assets/manifest';
import {pairBodies,pairFor} from '../../simulation/zerg-brood';
import {rankLabel,statusReadout} from '../unit-identity';
import './squad-console.css';

type Seat={key:string;family?:FamilyId;unit?:Entity;bodies:Entity[];name:string;image:string;hero?:string;defeated?:boolean};
const number=(n:number)=>Number(n.toFixed(2)).toString();
const bar=(value:number,max:number)=>max>0?Math.max(0,Math.min(100,value/max*100)):0;
/** Inspection only. No simulation commands or saved selection state. */
export class SquadConsole {
 readonly root:HTMLElement;private grid:HTMLElement;private detail:HTMLElement;private pager:HTMLElement;
 private pagerHTML='';private detailHTML='';private selected='';private page=0;private structure='';private run='';private positions=new Map<number,number>();private rows:Seat[]=[];
 private suppressClickUntil=0;private swipeX=0;private narrow=matchMedia('(max-width:900px), (max-width:950px) and (orientation:landscape)');private detailOpen=false;
 constructor(private world:World,parent:HTMLElement){
  this.root=document.createElement('section');this.root.id='battle-console';this.root.setAttribute('aria-label','作战控制台');
  this.root.innerHTML='<div id="console-map"></div><section id="unit-inspector" aria-label="单位详情"></section><section id="army-hud"><div class="army-heading"><b>作战部队</b><div id="army-pages"></div></div><div id="roster" role="group" aria-label="全队单位"></div></section><section id="console-commands" aria-label="指令区"></section><div id="production-detail" hidden></div>';
  parent.append(this.root);this.grid=this.root.querySelector('#roster')!;this.detail=this.root.querySelector('#unit-inspector')!;this.pager=this.root.querySelector('#army-pages')!;
  for(const id of ['hero-skills','skills']){const el=parent.querySelector('#'+id);if(el)this.root.querySelector('#console-commands')!.append(el);}
  this.root.addEventListener('pointerdown',e=>{e.stopPropagation();this.swipeX=e.clientX;});
  this.grid.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&Math.abs(e.clientX-this.swipeX)>48){this.turnPage(e.clientX<this.swipeX?1:-1);this.suppressClickUntil=performance.now()+350;e.preventDefault();}});
  this.root.addEventListener('click',e=>{if(performance.now()<this.suppressClickUntil){e.preventDefault();return;}const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
   if(button.dataset.seat){this.selected=button.dataset.seat;this.detailOpen=true;this.update();}
   if(button.dataset.page)this.turnPage(Number(button.dataset.page));
   if(button.dataset.inspectClose!==undefined){this.detailOpen=false;this.update();this.grid.querySelector<HTMLButtonElement>(`[data-seat="${this.selected}"]`)?.focus();}
  });
  this.grid.addEventListener('keydown',e=>{const delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:this.narrow.matches?-7:-10,ArrowDown:this.narrow.matches?7:10} as Record<string,number>)[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();const buttons=[...this.grid.querySelectorAll<HTMLButtonElement>('button')],index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[Math.max(0,Math.min(buttons.length-1,index+delta))]?.focus();});
  this.narrow.addEventListener('change',()=>{this.structure='';this.update();});
 }
 private turnPage(delta:number){this.page=Math.max(0,Math.min(Math.ceil(this.rows.length/14)-1,this.page+delta));this.structure='';this.update();}
 private seats():Seat[]{const w=this.world,rows:Seat[]=[];if(this.run!==w.runId){this.run=w.runId??'';this.positions.clear();this.selected='';this.page=0;}
  const living=new Set(w.allies().map(u=>u.id));for(const id of this.positions.keys())if(!living.has(id))this.positions.delete(id);
  for(const family of w.expedition.familySlots){const units=w.familyUnits(family),used=new Set<number>();
   for(const u of units){const slot=u.pairId?pairFor(w,u)?.slot:this.positions.get(u.id);if(slot!==undefined&&slot<w.rosterCap){used.add(slot);this.positions.set(u.id,slot);}}
   for(const u of units)if(!this.positions.has(u.id)){let slot=0;while(used.has(slot))slot++;used.add(slot);this.positions.set(u.id,slot);}
   for(let slot=0;slot<w.rosterCap;slot++){const u=units.find(u=>this.positions.get(u.id)===slot);rows.push({key:family+':'+slot,family,unit:u,defeated:!u&&family==='zergling'&&w.expedition.zerglingPairs.some(p=>p.slot===slot&&!p.members.length),bodies:u?(u.pairId?pairBodies(w,pairFor(w,u)!):[u]):[],name:u?.eliteId?ELITES[u.eliteId].name:SC2_UNITS[family].zh,image:u?.eliteId?ELITES[u.eliteId].icon:'unit.'+family});}
  }
  const heroes=[...w.heroes.keys()];for(let i=0;i<3;i++){const id=heroes[i],u=id?w.heroEntity(id):undefined;rows.push({key:'hero:'+i,unit:u?.hp?u:undefined,bodies:u?.hp?[u]:[],hero:id,name:id?HEROES[id].name:'英雄席位',image:id?'hero.'+id:''});}return rows;
 }
 update(){const w=this.world;this.root.dataset.race=w.expedition.race;const visible=w.phase==='battle';this.root.hidden=!visible;document.body.classList.toggle('has-battle-console',visible);if(!visible)return;
  this.rows=this.seats();if(!this.rows.some(s=>s.key===this.selected))this.selected=this.rows.find(s=>s.unit)?.key??this.rows[0]?.key??'';
  const pages=Math.max(1,Math.ceil(this.rows.length/14));this.page=Math.min(this.page,pages-1);const shown=this.narrow.matches?this.rows.slice(this.page*14,(this.page+1)*14):this.rows;
  const structure=shown.map(s=>[s.key,s.unit?.id,s.unit?.eliteId,s.hero,s.image,s.bodies.map(b=>b.id)].join('/')).join('|');
  if(this.structure!==structure){const focused=(document.activeElement as HTMLElement)?.dataset.seat;this.structure=structure;
   this.grid.innerHTML=shown.map(s=>`<button class="squad-seat ${s.hero?'hero-seat':s.unit?.eliteId?'elite-seat':''} ${s.unit?'':'empty-seat'}" data-seat="${s.key}" aria-label="${s.name}${s.unit?'':' · 空位'}">${s.image?icon(s.image,s.name):'<span class="seat-silhouette">◇</span>'}<span class="seat-badge">${s.hero?'★':s.unit?.eliteId?'◆':''}</span><span class="seat-rank"></span><span class="seat-count"></span><span class="seat-bars"><i class="seat-hp"><b></b></i><i class="seat-hp twin-hp"><b></b></i><i class="seat-shield"><b></b></i></span><span class="seat-timer"></span></button>`).join('');
   if(focused)this.grid.querySelector<HTMLButtonElement>(`[data-seat="${focused}"]`)?.focus({preventScroll:true});
  }
  const pager=this.narrow.matches?`<button data-page="-1" ${this.page===0?'disabled':''} aria-label="上一页">‹</button><span>${this.page+1}/${pages}</span><button data-page="1" ${this.page===pages-1?'disabled':''} aria-label="下一页">›</button>`:'';if(this.pagerHTML!==pager){this.pagerHTML=pager;this.pager.innerHTML=pager;}
  for(const s of shown){const node=this.grid.querySelector<HTMLElement>(`[data-seat="${s.key}"]`)!;node.setAttribute('aria-pressed',String(s.key===this.selected));node.querySelector('.seat-rank')!.textContent=s.unit?rankLabel(s.unit.rank):s.hero?'阵亡':'';
   node.querySelector('.seat-count')!.textContent=s.family==='zergling'&&s.unit?s.bodies.length+'/2':'';
   const bars=[...node.querySelectorAll<HTMLElement>('.seat-hp')];bars.forEach((el,i)=>{el.hidden=i===1&&s.family!=='zergling';const b=s.bodies[i];el.firstElementChild!.setAttribute('style',`width:${b?bar(b.hp,b.maxHp):0}%`);});
   const shield=node.querySelector<HTMLElement>('.seat-shield')!,u=s.unit;shield.hidden=!u?.maxShield;shield.firstElementChild!.setAttribute('style',`width:${u?bar(u.shield??0,u.maxShield??0):0}%`);
   const pair=u&&pairFor(w,u),time=pair?.regrowAt==null?'':Math.max(0,Math.ceil((pair.regrowAt-w.tick)/60))+'s';node.querySelector('.seat-timer')!.textContent=time||(!u?(s.hero?'阵亡':s.defeated?'整对阵亡':s.key.startsWith('hero:')?'待招募':'空位'):'');
  }
  this.detail.classList.toggle('inspect-open',this.detailOpen);const seat=this.rows.find(s=>s.key===this.selected),u=seat?.unit;
  const detail=seat?`<button class="inspect-close" data-inspect-close aria-label="关闭单位详情">×</button><header>${seat.image?icon(seat.image,seat.name):''}<div><b>${seat.name}</b><small>${u?rankLabel(u.rank)+(u.eliteId?' · 精英':u.heroId?' · 英雄':''):seat.hero?'等待复活':'等待增援'}</small></div></header>${u?`<div class="inspect-vitals">${seat.bodies.map((b,i)=>`<span>${seat.family==='zergling'?'跳虫'+(i+1)+' ':''}生命 ${Math.ceil(b.hp)} / ${Math.ceil(b.maxHp)}</span>`).join('')}${u.maxShield?`<span class="blue">护盾 ${Math.ceil(u.shield??0)} / ${Math.ceil(u.maxShield)}</span>`:''}${u.maxEnergy?`<span>能量 ${Math.floor(u.energy??0)} / ${u.maxEnergy}</span>`:''}</div><dl><dt>攻击</dt><dd>${number(u.weaponDamage)}${unitData(u).attacks>1?' × '+unitData(u).attacks:''}</dd><dt>间隔</dt><dd>${number(u.attackPeriod)}秒</dd><dt>护甲</dt><dd>${number(u.armor)}${u.maxShield?' / 盾 '+number(u.shieldArmor??0):''}</dd><dt>移速</dt><dd>${number(u.moveSpeed)}</dd></dl><p>${u.eliteId?ELITES[u.eliteId].description:statusReadout(w,u).detail}</p>`:'<p>招募或生产后加入此处</p>'}`:'';
  if(this.detailHTML!==detail){this.detailHTML=detail;const closeFocused=document.activeElement?.hasAttribute('data-inspect-close');this.detail.innerHTML=detail;if(closeFocused)this.detail.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});}
 }
}
