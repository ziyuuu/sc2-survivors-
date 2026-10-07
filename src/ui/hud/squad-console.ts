import {renderUnitInspector,type InspectorTab,type UnitSeat as Seat} from '../presentation/unit-inspector';
import {trapTab} from '../presentation/input-capture';
import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import type {FamilyId} from '../../data/races';
import {SC2_UNITS} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {HEROES} from '../../data/heroes';
import {icon} from '../../assets/manifest';
import {pairBodies,pairFor} from '../../simulation/zerg-brood';
import {rankLabel} from '../unit-identity';
import './squad-console.css';
import type {HudSettings} from './preferences';
import {hudGlyph} from './glyphs';
import {glyph} from '../presentation/reference-primitives';
import {updateLiveInspector} from '../presentation/live-inspector';

const bar=(value:number,max:number)=>max>0?Math.max(0,Math.min(100,value/max*100)):0;
/** Inspection only. No simulation commands or saved selection state. */
export class SquadConsole {
 readonly root:HTMLElement;private grid:HTMLElement;private detail:HTMLElement;private pager:HTMLElement;
 private pagerHTML='';private detailHTML='';private selected='';private page=0;private structure='';private run='';private positions=new Map<number,number>();private rows:Seat[]=[];
 private suppressClickUntil=0;private swipeX=0;private detailOpen=false;private tab:InspectorTab='stats';private expanded=new Set<string>();private commandsCollapsed=false;private commandPage=0;
 get isOpen(){return this.detailOpen&&!this.root.hidden;}
 private get pageSize(){return (document.querySelector('#game-root')?.clientWidth??innerWidth)>=1000?14:7;}
 private get narrow(){const r=document.querySelector('#game-root')?.getBoundingClientRect(),width=r?.width??innerWidth,height=r?.height??innerHeight;return width<=900||width<=950&&width>height;}
 constructor(private world:World,parent:HTMLElement,private preferences:HudSettings){
  this.root=document.createElement('section');this.root.id='battle-console';this.root.className='battle-console';this.root.setAttribute('aria-label','作战控制台');
  this.root.innerHTML=`<div class="console-body"><div class="army-row"><button class="console-fold" type="button" id="army-toggle" aria-label="收起队伍" title="收起队伍" aria-controls="army-hud" aria-expanded="true">${glyph('next')}</button><section id="army-hud" class="army-block"><div id="roster" class="portrait-grid" role="group" aria-label="全队单位"></div><div id="army-pages" class="roster-pager"></div></section></div><div class="command-row"><button class="console-fold" type="button" id="commands-toggle" aria-label="收起指令" aria-controls="console-commands" aria-expanded="true">${glyph('next')}</button><section id="console-commands" class="command-block" aria-label="指令区"></section><nav id="command-pages" aria-label="指令分页"><button data-command-page="-1" aria-label="上一页指令">${glyph('back')}</button><button data-command-page="1" aria-label="下一页指令">${glyph('next')}</button></nav></div></div><div id="unit-inspector" data-captures-battle-input></div><div id="production-detail" hidden></div>`;
  document.addEventListener('sc2-inspection-open',e=>{if((e as CustomEvent).detail==='carrier')this.close();});
  parent.append(this.root);this.grid=this.root.querySelector('#roster')!;this.detail=this.root.querySelector('#unit-inspector')!;this.pager=this.root.querySelector('#army-pages')!;
  for(const id of ['skills','hero-skills']){const el=parent.querySelector('#'+id);if(el)this.root.querySelector('#console-commands')!.append(el);}
  this.root.addEventListener('pointerdown',e=>{e.stopPropagation();this.swipeX=e.clientX;});
  this.grid.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&Math.abs(e.clientX-this.swipeX)>48){this.turnPage(e.clientX<this.swipeX?1:-1);this.suppressClickUntil=performance.now()+350;e.preventDefault();}});
  this.root.addEventListener('click',e=>{if(performance.now()<this.suppressClickUntil){e.preventDefault();return;}const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
   if(button.dataset.seat){this.open(button.dataset.seat);}
   if(button.dataset.page)this.turnPage(Number(button.dataset.page));
   if(button.dataset.inspectClose!==undefined)this.close();
   if(button.dataset.inspectTab){this.setTab(button.dataset.inspectTab as InspectorTab);}
   if(button.dataset.inspectSeat)this.select(button.dataset.inspectSeat);
   if(button.dataset.inspectNeighbor){const at=this.rows.findIndex(s=>s.key===this.selected);this.select(this.rows[Math.max(0,Math.min(this.rows.length-1,at+Number(button.dataset.inspectNeighbor)))]?.key);}
   if(button.id==='commands-toggle'){this.commandsCollapsed=!this.commandsCollapsed;this.updateCommandPages();}
   if(button.dataset.commandPage){this.commandPage+=Number(button.dataset.commandPage);this.updateCommandPages(true);}
   if(button.id==='army-toggle')this.preferences.toggle('armyCollapsed');
  });
  this.detail.addEventListener('toggle',e=>{const el=e.target as HTMLDetailsElement;if(el.dataset.ability){if(el.open)this.expanded.add(el.dataset.ability);else this.expanded.delete(el.dataset.ability);}},true);
  this.detail.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.close();return;}trapTab(e,this.detail);if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const delta=e.key==='ArrowRight'?1:-1,button=(e.target as HTMLElement).closest<HTMLElement>('[data-inspect-tab]');if(button){const tabs:InspectorTab[]=['stats','abilities','army'];this.setTab(tabs[(tabs.indexOf(this.tab)+delta+3)%3]);this.detail.querySelector<HTMLButtonElement>(`[data-inspect-tab="${this.tab}"]`)?.focus();}else{const at=this.rows.findIndex(s=>s.key===this.selected);this.select(this.rows[Math.max(0,Math.min(this.rows.length-1,at+delta))]?.key);}}});
  const commandViewport=this.root.querySelector<HTMLElement>('#console-commands')!;commandViewport.addEventListener('scroll',()=>this.updateCommandPages());
  new ResizeObserver(()=>{this.structure='';this.update();this.updateCommandPages(true);}).observe(this.root);
  this.grid.addEventListener('keydown',e=>{const delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:this.narrow?-7:-10,ArrowDown:this.narrow?7:10} as Record<string,number>)[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();const buttons=[...this.grid.querySelectorAll<HTMLButtonElement>('button')],index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[Math.max(0,Math.min(buttons.length-1,index+delta))]?.focus();});
 }
 private turnPage(delta:number){this.page=Math.max(0,Math.min(Math.ceil(this.rows.length/this.pageSize)-1,this.page+delta));this.structure='';this.update();}
 private seats():Seat[]{const w=this.world,rows:Seat[]=[];if(this.run!==w.runId){this.run=w.runId??'';this.positions.clear();this.selected='';this.page=0;this.detailOpen=false;this.tab='stats';this.expanded.clear();}
  const living=new Set(w.allies().map(u=>u.id));for(const id of this.positions.keys())if(!living.has(id))this.positions.delete(id);
  for(const family of w.expedition.familySlots){const units=w.familyUnits(family),used=new Set<number>();
   for(const u of units){const slot=u.pairId?pairFor(w,u)?.slot:this.positions.get(u.id);if(slot!==undefined&&slot<w.rosterCap){used.add(slot);this.positions.set(u.id,slot);}}
   for(const u of units)if(!this.positions.has(u.id)){let slot=0;while(used.has(slot))slot++;used.add(slot);this.positions.set(u.id,slot);}
   for(let slot=0;slot<w.rosterCap;slot++){const u=units.find(u=>this.positions.get(u.id)===slot);rows.push({key:family+':'+slot,family,unit:u,regrowAt:family==='zergling'?w.expedition.zerglingPairs.find(p=>p.slot===slot)?.regrowAt??undefined:undefined,defeated:!u&&family==='zergling'&&w.expedition.zerglingPairs.some(p=>p.slot===slot&&!p.members.length),bodies:u?(u.pairId?pairBodies(w,pairFor(w,u)!):[u]):[],name:u?.eliteId?ELITES[u.eliteId].name:SC2_UNITS[family].zh,image:u?.eliteId?ELITES[u.eliteId].icon:'unit.'+family});}
  }
  const heroes=[...w.heroes.keys()];for(let i=0;i<heroes.length;i++){const id=heroes[i],u=w.heroEntity(id);rows.push({key:'hero:'+i,unit:u?.hp?u:undefined,bodies:u?.hp?[u]:[],hero:id,name:HEROES[id].name,image:'hero.'+id});}return rows;
 }
 update(visible=this.world.phase==='battle'){const w=this.world;this.root.dataset.race=w.expedition.race;this.root.hidden=!visible;document.body.classList.toggle('has-battle-console',visible);const collapsed=this.preferences.armyCollapsed;this.root.classList.toggle('army-collapsed',collapsed);this.root.querySelector<HTMLElement>('#army-hud')!.hidden=collapsed;this.detail.hidden=!this.detailOpen;const toggle=this.root.querySelector<HTMLButtonElement>('#army-toggle')!;toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'展开队伍':'收起队伍');toggle.title=toggle.getAttribute('aria-label')!;if(!visible)return;
  this.rows=this.seats();if(!this.rows.some(s=>s.key===this.selected))this.selected=this.rows.find(s=>s.unit)?.key??this.rows[0]?.key??'';
  const pages=Math.max(1,Math.ceil(this.rows.length/this.pageSize));this.page=Math.min(this.page,pages-1);const shown=this.rows.slice(this.page*this.pageSize,(this.page+1)*this.pageSize);
  const structure=shown.map(s=>[s.key,s.unit?.id,s.unit?.eliteId,s.hero,s.image,s.bodies.map(b=>b.id)].join('/')).join('|');
  if(this.structure!==structure){const focused=(document.activeElement as HTMLElement)?.dataset.seat;this.structure=structure;
   this.grid.innerHTML=shown.map(s=>`<button class="squad-seat unit-portrait ${s.hero?'hero-seat hero':s.unit?.eliteId?'elite-seat elite':'ordinary'} ${s.unit?'':'empty-seat'}" data-seat="${s.key}" aria-label="${s.name}${s.unit?'':' · 空位'}">${s.image?icon(s.image,s.name):'<span class="seat-silhouette">◇</span>'}<span class="seat-badge">${s.hero?'★':s.unit?.eliteId?'◆':''}</span><span class="seat-rank"></span><span class="seat-count"></span><span class="seat-bars"><i class="seat-hp"><b></b></i><i class="seat-hp twin-hp"><b></b></i><i class="seat-shield"><b></b></i></span><span class="seat-timer"></span></button>`).join('');
   if(focused)this.grid.querySelector<HTMLButtonElement>(`[data-seat="${focused}"]`)?.focus({preventScroll:true});
  }
  const pager=`<button data-page="-1" ${this.page===0?'disabled':''} aria-label="上一页">‹</button><span>${this.page+1}/${pages}</span><button data-page="1" ${this.page===pages-1?'disabled':''} aria-label="下一页">›</button>`;if(this.pagerHTML!==pager){this.pagerHTML=pager;this.pager.innerHTML=pager;}
  for(const s of shown){const node=this.grid.querySelector<HTMLElement>(`[data-seat="${s.key}"]`)!;node.setAttribute('aria-pressed',String(s.key===this.selected));node.querySelector('.seat-rank')!.textContent=s.unit?rankLabel(s.unit.rank):s.hero?'阵亡':'';
   node.querySelector('.seat-count')!.textContent=s.family==='zergling'&&s.unit?s.bodies.length+'/2':'';
   const bars=[...node.querySelectorAll<HTMLElement>('.seat-hp')];bars.forEach((el,i)=>{el.hidden=i===1&&s.family!=='zergling';const b=s.bodies[i];el.firstElementChild!.setAttribute('style',`width:${b?bar(b.hp,b.maxHp):0}%`);});
   const shield=node.querySelector<HTMLElement>('.seat-shield')!,u=s.unit;shield.hidden=!u?.maxShield;shield.firstElementChild!.setAttribute('style',`width:${u?bar(u.shield??0,u.maxShield??0):0}%`);
   const pair=u&&pairFor(w,u),time=pair?.regrowAt==null?'':Math.max(0,Math.ceil((pair.regrowAt-w.tick)/60))+'s';node.classList.toggle('fallen-seat',!u&&!!(s.hero||s.defeated));node.querySelector('.seat-timer')!.textContent=time||(!u&&(s.hero||s.defeated)?'×':'');
  }
  this.detail.classList.toggle('inspect-open',this.detailOpen);const seat=this.rows.find(s=>s.key===this.selected),u=seat?.unit;
  this.detail.dataset.tier=seat?.hero?'hero':u?.eliteId?'elite':'ordinary';
  const detail=seat&&this.detailOpen?renderUnitInspector(w,seat,this.rows,this.tab,this.expanded):'';
  if(this.detailHTML!==detail){this.detailHTML=detail;const active=document.activeElement as HTMLElement|null,focused=this.detail.contains(active),token=active?.dataset,scroll=this.detail.querySelector<HTMLElement>('[data-inspector-scroll]')?.scrollTop??0;updateLiveInspector(this.detail,detail);const content=this.detail.querySelector<HTMLElement>('[data-inspector-scroll]');if(content)content.scrollTop=scroll;if(focused){const target=token?.inspectTab?this.detail.querySelector<HTMLButtonElement>(`[data-inspect-tab="${token.inspectTab}"]`):token?.inspectSeat?this.detail.querySelector<HTMLButtonElement>(`[data-inspect-seat="${token.inspectSeat}"]`):token?.inspectNeighbor?this.detail.querySelector<HTMLButtonElement>(`[data-inspect-neighbor="${token.inspectNeighbor}"]`):active?.tagName==='SUMMARY'?this.detail.querySelector<HTMLElement>(`[data-ability="${active.parentElement?.dataset.ability}"] summary`):token?.inspectorScroll!==undefined?content:this.detail.querySelector<HTMLButtonElement>('[data-inspect-close]');target?.focus({preventScroll:true});}}
  this.updateCommandPages();
 }
 private open(key:string){this.selected=key;this.detailOpen=true;this.tab='stats';this.expanded.clear();document.dispatchEvent(new CustomEvent('sc2-inspection-open',{detail:'unit'}));this.update();this.detail.querySelector<HTMLButtonElement>('[data-inspect-close]')?.focus({preventScroll:true});}
 close(){if(!this.detailOpen)return false;this.detailOpen=false;this.page=Math.floor(Math.max(0,this.rows.findIndex(s=>s.key===this.selected))/this.pageSize);this.update();this.grid.querySelector<HTMLButtonElement>(`[data-seat="${this.selected}"]`)?.focus({preventScroll:true});return true;}
 private firstAbility(){const s=this.rows.find(s=>s.key===this.selected);return s?.hero?"active":s?.unit?.eliteId?"elite":"native";}
 private setTab(tab:InspectorTab){this.tab=tab;this.expanded.clear();if(tab==="abilities")this.expanded.add(this.firstAbility());this.update();}
 private select(key?:string){if(!key)return;this.selected=key;this.expanded.clear();if(this.tab==="army")this.tab="stats";if(this.tab==="abilities")this.expanded.add(this.firstAbility());const scroller=this.detail.querySelector<HTMLElement>('[data-inspector-scroll]');if(scroller)scroller.scrollTop=0;this.update();}
 updateCommandPages(scroll=false){const viewport=this.root.querySelector<HTMLElement>('#console-commands')!,pager=this.root.querySelector<HTMLElement>('#command-pages')!,toggle=this.root.querySelector<HTMLButtonElement>('#commands-toggle')!;viewport.hidden=this.commandsCollapsed;pager.hidden=this.commandsCollapsed;toggle.setAttribute('aria-expanded',String(!this.commandsCollapsed));toggle.setAttribute('aria-label',this.commandsCollapsed?'展开指令':'收起指令');this.root.classList.toggle('commands-collapsed',this.commandsCollapsed);if(this.commandsCollapsed)return;const width=viewport.clientWidth;if(!width)return;const max=Math.max(0,Math.ceil(viewport.scrollWidth/width)-1);this.commandPage=Math.max(0,Math.min(max,scroll?this.commandPage:Math.round(viewport.scrollLeft/width)));if(scroll)viewport.scrollLeft=Math.min(viewport.scrollWidth-width,this.commandPage*width);const previous=pager.querySelector<HTMLButtonElement>('[data-command-page="-1"]')!,next=pager.querySelector<HTMLButtonElement>('[data-command-page="1"]')!;previous.disabled=viewport.scrollLeft<1;next.disabled=viewport.scrollLeft+width>=viewport.scrollWidth-1;pager.setAttribute('aria-label',`指令第 ${this.commandPage+1} 页，共 ${max+1} 页`);}
}
