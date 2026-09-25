import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import {HEROES} from '../../data/heroes';
import {healthReadout,rankLabel,specialUnitName,statusReadout} from '../../ui/unit-identity';
type Label={root:HTMLDivElement;title:HTMLElement;slot?:HTMLElement;fill?:HTMLElement;meter?:HTMLElement;action?:HTMLElement;timer?:HTMLElement};
/** At most 18 special allies. Labels are pooled by entity identity and never receive input. */
export class FriendlyLabels {
 private labels=new Map<number,Label>();
 constructor(private parent:HTMLElement){}
 reset(){for(const label of this.labels.values())label.root.remove();this.labels.clear();}
 update(world:World,project:(unit:Entity)=>{x:number;y:number;visible:boolean},width:number){
  const units=world.allies().filter(u=>u.heroId||u.eliteId||u.unitType==='baneling'&&(u.recoveryUntil??0)>world.time).sort((a,b)=>Number(!!b.heroId)-Number(!!a.heroId)||a.id-b.id),ids=new Set(units.map(u=>u.id));
  for(const [id,label] of this.labels)if(!ids.has(id)){label.root.remove();this.labels.delete(id);}
  const occupied:{x:number;y:number;w:number;h:number}[]=[];
  for(const u of units){let label=this.labels.get(u.id);const hero=!!u.heroId,recovery=!hero&&!u.eliteId;
   if(!label){const root=document.createElement('div');root.className='friendly-unit-label '+(hero?'hero-world-label':recovery?'recovery-world-label':'elite-world-label');root.dataset.entityId=String(u.id);if(u.heroId)root.dataset.hero=u.heroId;if(u.eliteId)root.dataset.elite=u.eliteId;
    root.innerHTML=hero
     ?'<span class="hero-slot"></span><div class="hero-world-health" role="meter" aria-valuemin="0"><i></i></div><span class="unit-label-title"></span><span class="hero-action" hidden></span>'
     :recovery?'<span class="recovery-timer"></span><span class="unit-label-title"></span>':'<span class="elite-glyph">◆</span><span class="unit-label-title"></span>';
    label={root,title:root.querySelector('.unit-label-title')!,slot:root.querySelector('.hero-slot')??undefined,meter:root.querySelector('[role=meter]')??undefined,fill:root.querySelector('.hero-world-health i')??undefined,action:root.querySelector('.hero-action')??undefined,timer:root.querySelector('.recovery-timer')??undefined};this.parent.append(root);this.labels.set(u.id,label);
   }
   const p=project(u);label.root.hidden=!p.visible||world.phase!=='battle'||world.paused||world.requiresPlayerDecision;if(label.root.hidden)continue;
   const name=recovery?'爆虫恢复中':specialUnitName(u),status=statusReadout(world,u),title=`${name} ${rankLabel(u.rank)}${status.short?' · '+status.short:''}`;if(label.title.textContent!==title)label.title.textContent=title;label.root.title=title+' · '+status.detail;label.root.classList.toggle('focused',!!u.heroId&&(document.activeElement as HTMLElement|null)?.dataset.action==='hero-'+u.heroId);if(u.heroId){const slot=[...world.heroes.keys()].indexOf(u.heroId);label.root.dataset.slot=String(slot);label.slot!.textContent=String(slot+1);label.root.style.setProperty('--hero-accent',['#6bcfff','#ff985d','#c5a1ff'][slot]??'#ffd782');}
   let casting=false;
   if(hero){const h=healthReadout(u.hp,u.maxHp),skill=HEROES[u.heroId!].skill;label.fill!.style.width=`${h.ratio*100}%`;label.root.classList.toggle('critical',h.critical);const sinceSkill=world.time-(u.lastSkillAt??-Infinity);casting=sinceSkill>=0&&sinceSkill<.6;label.root.classList.toggle('hero-casting',casting);label.action!.hidden=!casting;if(casting)label.action!.textContent=skill;label.meter!.setAttribute('aria-label',name+'生命');label.meter!.setAttribute('aria-valuenow',String(h.current));label.meter!.setAttribute('aria-valuemax',String(h.max));}
   if(recovery&&label.timer)label.timer.textContent=`${Math.ceil((u.recoveryUntil??world.time)-world.time)}s`;
   const w=hero?48:recovery?34:20,h=hero?25+(casting?17:0):20,x=Math.max(w/2+2,Math.min(width-w/2-2,p.x));let y=p.y;label.root.style.width=w+'px';
   // Resolve name overlaps before paint. Heroes claim their readable space first.
   for(let n=0;n<18;n++){const blocker=occupied.find(b=>Math.abs(x-b.x)<(w+b.w)/2+3&&y>b.y-b.h-3&&y-h<b.y+3);if(!blocker)break;y=blocker.y-blocker.h-3;}
   occupied.push({x,y,w,h});label.root.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
  }
 }
}
