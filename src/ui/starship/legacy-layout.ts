import type {Race} from '../../data/races';
import {LEGACY_SLOT_ICONS} from './legacy-icons';

/** R12 authored ship attachment locations, in the unchanged twelve-slot order. */
export const LEGACY_SLOT_POSITIONS:Record<Race,readonly (readonly number[])[]>={
 terran:[[13,61],[37,67],[37,15],[59,30],[17,34],[34,44],[50,53],[64,68],[25,58],[71,43],[84,54],[80,77]],
 zerg:[[21,46],[37,61],[66,11],[83,30],[29,18],[45,31],[58,50],[74,66],[22,61],[47,77],[84,52],[63,85]],
 protoss:[[13,48],[35,81],[51,24],[78,30],[17,18],[34,40],[54,57],[73,76],[14,73],[70,51],[91,51],[92,83]],
};
export function legacySlotIcon(index:number){return `<span class="icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${LEGACY_SLOT_ICONS[index%12]}</svg></span>`;}

/** Port of R12 layoutSlots: keep authored positions and resolve target collisions on resize. */
export function mountLegacySlots(root:HTMLElement){
 const diagram=root.querySelector<HTMLElement>('.ship-diagram');if(!diagram)return ()=>{};
 const arrange=()=>{
  const w=diagram.clientWidth,h=diagram.clientHeight;if(w<1||h<1)return;
  const controls=[...diagram.querySelectorAll<HTMLElement>('.slot')].filter(el=>getComputedStyle(el).display!=='none');
  const placed:{el:HTMLElement;x:number;y:number;size:number}[]=[],gap=4;
  for(const el of controls){
   const size=el.offsetWidth,half=size/2,x0=Math.max(half,Math.min(w-half,w*Number(el.dataset.x)/100)),y0=Math.max(half,Math.min(h-half,h*Number(el.dataset.y)/100));let best:typeof placed[number]|undefined;
   for(let radius=0;radius<=Math.max(w,h)&&!best;radius+=6){const candidates=radius===0?[[x0,y0]]:Array.from({length:24},(_,i)=>[x0+Math.cos(i*Math.PI/12)*radius,y0+Math.sin(i*Math.PI/12)*radius]);for(const [x,y] of candidates){if(x<half||x>w-half||y<half||y>h-half)continue;if(placed.every(p=>Math.abs(x-p.x)>=(size+p.size)/2+gap||Math.abs(y-p.y)>=(size+p.size)/2+gap)){best={el,x,y,size};break;}}}
   if(best)placed.push(best);
  }
  if(placed.length===controls.length){for(const p of placed){p.el.style.setProperty('--x',p.x+'px');p.el.style.setProperty('--y',p.y+'px');}diagram.dataset.layout='anchored';return;}
  const size=Math.max(...controls.map(el=>el.offsetWidth)),half=size/2;
  const layouts=Array.from({length:controls.length},(_,i)=>({cols:i+1,rows:Math.ceil(controls.length/(i+1))})).filter(g=>g.cols*size+(g.cols-1)*gap<=w&&g.rows*size+(g.rows-1)*gap<=h).sort((a,b)=>Math.abs(a.cols/a.rows-w/h)-Math.abs(b.cols/b.rows-w/h));
  if(!layouts.length){diagram.dataset.layout='insufficient-space';return;}
  const grid=layouts[0],cells=Array.from({length:grid.cols*grid.rows},(_,i)=>({x:grid.cols===1?w/2:half+(i%grid.cols)*(w-size)/(grid.cols-1),y:grid.rows===1?h/2:half+Math.floor(i/grid.cols)*(h-size)/(grid.rows-1)}));
  const pairs=controls.flatMap((el,i)=>cells.map((c,j)=>({i,j,cost:(c.x-w*Number(el.dataset.x)/100)**2+(c.y-h*Number(el.dataset.y)/100)**2}))).sort((a,b)=>a.cost-b.cost||a.i-b.i||a.j-b.j),usedItems=new Set<number>(),usedCells=new Set<number>();
  for(const p of pairs){if(usedItems.has(p.i)||usedCells.has(p.j))continue;usedItems.add(p.i);usedCells.add(p.j);controls[p.i].style.setProperty('--x',cells[p.j].x+'px');controls[p.i].style.setProperty('--y',cells[p.j].y+'px');}diagram.dataset.layout='compact';
 };
 arrange();const observer=new ResizeObserver(arrange);observer.observe(diagram);return ()=>observer.disconnect();
}
