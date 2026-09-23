import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import {healthReadout,rankLabel,specialUnitName,statusReadout} from '../../ui/unit-identity';
type Label={root:HTMLDivElement;title:HTMLElement;fill?:HTMLElement;value?:HTMLElement;meter?:HTMLElement};
/** At most 18 special allies. Labels are pooled by entity identity and never receive input. */
export class FriendlyLabels {
 private labels=new Map<number,Label>();
 constructor(private parent:HTMLElement){}
 reset(){for(const label of this.labels.values())label.root.remove();this.labels.clear();}
 update(world:World,project:(unit:Entity)=>{x:number;y:number;visible:boolean},width:number){
  const units=world.allies().filter(u=>u.heroId||u.eliteId).sort((a,b)=>Number(!!b.heroId)-Number(!!a.heroId)||a.id-b.id),ids=new Set(units.map(u=>u.id));
  for(const [id,label] of this.labels)if(!ids.has(id)){label.root.remove();this.labels.delete(id);}
  const occupied:{x:number;y:number;w:number;h:number}[]=[];
  for(const u of units){let label=this.labels.get(u.id);const hero=!!u.heroId;
   if(!label){const root=document.createElement('div');root.className='friendly-unit-label '+(hero?'hero-world-label':'elite-world-label');root.dataset.entityId=String(u.id);if(u.heroId)root.dataset.hero=u.heroId;if(u.eliteId)root.dataset.elite=u.eliteId;
    root.innerHTML='<span class="unit-label-title"></span>'+(hero?'<div class="hero-world-health" role="meter" aria-valuemin="0"><i></i><span></span></div>':'');
    label={root,title:root.querySelector('.unit-label-title')!,meter:root.querySelector('[role=meter]')??undefined,fill:root.querySelector('i')??undefined,value:root.querySelector('.hero-world-health span')??undefined};this.parent.append(root);this.labels.set(u.id,label);
   }
   const p=project(u);label.root.hidden=!p.visible||world.phase!=='battle'||world.paused||world.requiresEliteChoice;if(label.root.hidden)continue;
   const name=specialUnitName(u),status=statusReadout(world,u),title=`${hero?'★':'◆'} ${name} ${rankLabel(u.rank)}${status.short?' · '+status.short:''}`;if(label.title.textContent!==title)label.title.textContent=title;label.root.title=status.detail;
   if(hero){const h=healthReadout(u.hp,u.maxHp);label.fill!.style.width=`${h.ratio*100}%`;label.root.classList.toggle('critical',h.critical);const text=`${h.current} / ${h.max}`;if(label.value!.textContent!==text)label.value!.textContent=text;
    label.meter!.setAttribute('aria-label',name+'生命');label.meter!.setAttribute('aria-valuenow',String(h.current));label.meter!.setAttribute('aria-valuemax',String(h.max));}
   const w=status.short?Math.min(220,Math.max(150,title.length*8)):hero?116:110,h=hero?37:19,x=Math.max(w/2+2,Math.min(width-w/2-2,p.x));let y=p.y;label.root.style.width=w+'px';
   // Resolve name overlaps before paint. Heroes claim their readable space first.
   for(let n=0;n<18;n++){const blocker=occupied.find(b=>Math.abs(x-b.x)<(w+b.w)/2+3&&y>b.y-b.h-3&&y-h<b.y+3);if(!blocker)break;y=blocker.y-blocker.h-3;}
   occupied.push({x,y,w,h});label.root.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
  }
 }
}
