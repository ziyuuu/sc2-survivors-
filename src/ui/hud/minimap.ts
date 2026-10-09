import {minimapThreats} from './minimap-threats';
import {battleInputCapture} from '../presentation/input-capture';
import type {ControlSettings} from '../controls/settings';
import {RARITIES} from '../../data/rewards';
import {Vector3} from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {MapDefinition,TerrainQuery} from '../../data/map-definition';
import type {BattleRenderer} from '../../render/scene/battle-renderer';
import {SC2_UNITS} from '../../data/sc2-units';
import {hudGlyph} from './glyphs';
import {MINIMAP_CHASSIS} from '../presentation/reference-minimap';
export type MapFrame={left:number;top:number;size:number};
/** North is -z, exactly as in the battlefield. Fit the opened sector without stretching it. */
export function minimapFrame(d:MapDefinition,stage:number):MapFrame{
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(let i=0;i<d.opening.length;i++)if(d.opening[i]>0&&d.opening[i]<=stage){const x=(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z=d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,z);bottom=Math.max(bottom,z);}
 if(!Number.isFinite(left))return {left:-10,top:-10,size:20};
 const size=Math.max(right-left,bottom-top)+6;return {left:(left+right-size)/2,top:(top+bottom-size)/2,size};
}
export const mapProject=(f:MapFrame,p:Point)=>({x:(p.x-f.left)/f.size,z:(p.z-f.top)/f.size});
export const mapUnproject=(f:MapFrame,p:Point)=>({x:f.left+p.x*f.size,z:f.top+p.z*f.size});
/** Same source colors, without allocating arrays and map points for each pixel. */
export function paintMinimapTerrain(d:MapDefinition,terrain:Pick<TerrainQuery,'height'>,frame:MapFrame,stage:number,side:number,pixels:Uint8ClampedArray){
 const p={x:0,z:0},closed=(i:number)=>!d.opening[i]||d.opening[i]>stage;
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  p.x=frame.left+(x+.5)/side*frame.size;p.z=frame.top+(y+.5)/side*frame.size;
  const gx=Math.floor((p.x+d.origin[0])/d.cellSize),gy=Math.floor((d.origin[1]-p.z)/d.cellSize),i=gy*d.walkWidth+gx,k=(y*side+x)*4;
  let r=6,g=14,b=20;
  if(gx>=0&&gy>=0&&gx<d.walkWidth&&gy<d.walkHeight){
   const opened=d.reveal[i]>0&&d.reveal[i]<=stage,h=terrain.height(p),walk=d.walk[i]&&d.opening[i]>0;
   if(!opened){r=12;g=22;b=29;}else if(walk){r=51+h*8;g=65+h*8;b=65+h*7;}else{r=26+h*4;g=32+h*4;b=35+h*4;}
   if(opened&&walk&&(closed(i-1)||closed(i+1)||closed(i-d.walkWidth)||closed(i+d.walkWidth))){r=67;g=133;b=150;}
  }
  pixels[k]=r;pixels[k+1]=g;pixels[k+2]=b;pixels[k+3]=255;
 }
}
export class Minimap {
 readonly element:HTMLElement;readonly canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;private backdrop=document.createElement('canvas');private stage=0;private mapTerrain?:TerrainQuery;private frame:MapFrame={left:-10,top:-10,size:20};private height=0;private observer:ResizeObserver;
 private cancelTap=()=>{};
 resetInput(){this.cancelTap();}
 constructor(readonly world:World,readonly view:BattleRenderer,parent:HTMLElement,readonly controls:ControlSettings){
  this.element=document.createElement('aside');this.element.id='minimap';this.element.className='mini-map';
  this.element.innerHTML=`<header><span>N ↑</span><button type="button" id="map-toggle" aria-controls="minimap-canvas" aria-expanded="true" aria-label="收起地图">−</button></header><canvas id="minimap-canvas" role="img" aria-label="小地图：绿点友军，紫点精英，金色菱形英雄，红点敌人，橙框救援。点击模式下，鼠标或触屏轻点前往。"></canvas><footer><span class="mini-friend">小队</span><span class="mini-hostile">敌军</span><span class="mini-rescue">救援</span></footer>`;
  this.element.insertAdjacentHTML('beforeend',MINIMAP_CHASSIS);parent.append(this.element);this.canvas=this.element.querySelector('canvas')!;this.ctx=this.canvas.getContext('2d')!;
  this.observer=new ResizeObserver(()=>{const width=this.canvas.clientWidth;if(width>0&&Math.max(128,Math.round(width*Math.min(devicePixelRatio||1,2)))!==this.canvas.width)this.stage=0;this.update(!this.element.hidden,this.element.classList.contains('map-collapsed'));});this.observer.observe(this.canvas);
  this.element.addEventListener('contextmenu',e=>e.preventDefault());
  let tap:{id:number;x:number;y:number;time:number;cancelled:boolean}|null=null;
  this.cancelTap=()=>{const id=tap?.id;tap=null;if(id!==undefined&&this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);};
  this.canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(world.phase!=='battle'||world.paused)return;if(e.pointerType==='mouse'){if(e.button===0||e.button===2)this.command(e);return;}if(tap){tap.cancelled=true;return;}if(!e.isPrimary)return;tap={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),cancelled:false};this.canvas.setPointerCapture(e.pointerId);});
  this.canvas.addEventListener('pointermove',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>10)tap.cancelled=true;});
  this.canvas.addEventListener('pointerup',e=>{if(tap?.id!==e.pointerId)return;const old=tap;tap=null;if(!old.cancelled&&performance.now()-old.time<450)this.command(e);if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);});
  for(const name of ['pointercancel','lostpointercapture'])this.canvas.addEventListener(name,e=>{if(tap?.id===(e as PointerEvent).pointerId)tap=null;});
 }
 private command(e:PointerEvent){const w=this.world;if(battleInputCapture()||!this.controls.pointerMoves(e.pointerType)||w.phase!=='battle'||w.paused||w.requiresPlayerDecision||!!document.body.dataset.targetFamily)return;
  const r=this.canvas.getBoundingClientRect(),p=mapUnproject(this.frame,{x:(e.clientX-r.left)/r.width,z:(e.clientY-r.top)/r.height});
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
  w.issueMove(p);
 }
 private background(){const d=this.world.terrain?.definition;this.frame=d?minimapFrame(d,this.world.terrainStage):{left:-80,top:-80,size:160};this.stage=this.world.terrainStage;this.mapTerrain=this.world.terrain;
  const side=Math.max(128,Math.round(this.canvas.clientWidth*Math.min(devicePixelRatio||1,2)));this.canvas.width=this.canvas.height=side;this.backdrop.width=this.backdrop.height=side;
  const c=this.backdrop.getContext('2d')!,im=c.createImageData(side,side),terrain=this.world.terrain!;
  if(d)paintMinimapTerrain(d,terrain,this.frame,this.stage,side,im.data);else for(let y=0;y<side;y++)for(let x=0;x<side;x++){const p=mapUnproject(this.frame,{x:(x+.5)/side,z:(y+.5)/side}),open=terrain.isOpen?.(p),i=(y*side+x)*4;im.data.set(open?[51,65,65,255]:[12,22,29,255],i);}c.putImageData(im,0,0);this.canvas.dataset.mapFrame=JSON.stringify(this.frame);
 }
 update(visible=this.world.phase==='battle',collapsed=false){const w=this.world;this.element.hidden=!w.terrain||!visible;this.element.classList.toggle('map-collapsed',collapsed);this.canvas.hidden=collapsed;const button=this.element.querySelector<HTMLButtonElement>('#map-toggle')!;button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'展开地图':'收起地图');button.title=collapsed?'展开地图':'收起地图';button.textContent=collapsed?'+':'−';if(this.element.hidden||collapsed){this.resetInput();return;}if(this.stage!==w.terrainStage||this.mapTerrain!==w.terrain)this.background();const c=this.ctx,s=this.canvas.width;c.clearRect(0,0,s,s);c.drawImage(this.backdrop,0,0);const unit=s/180;
  const project=(p:Point)=>{const q=mapProject(this.frame,p);return {x:q.x*s,y:q.z*s};};
  const dot=(p:Point,color:string,r:number)=>{const q=project(p);c.fillStyle=color;c.beginPath();c.arc(q.x,q.y,r*unit,0,Math.PI*2);c.fill();};
  for(const p of w.pickups)dot(p,'#6d96b2',.8);
  for(const p of w.rewardDrops)dot(p,RARITIES[p.reward.rarity].color,2.4);
  for(const e of w.entities.values())if(e.hp>0&&w.visibleTo(e,'terran'))dot(e,e.enemyTier==='lord'?'#ff514f':e.enemyTier==='boss'?'#ffb049':e.enemyTier==='elite'?'#ee6471':e.eliteId?'#ca82ff':e.owner==='terran'?'#8ceeaa':'#f96751',e.enemyTier==='lord'?5:e.enemyTier==='boss'?4:e.enemyTier==='elite'?3:e.owner==='terran'?2:1.5);
  for(const u of w.allies())if(u.heroId){const p=project(u),r=4*unit;c.fillStyle='#ffc75c';c.strokeStyle='#fff2c8';c.lineWidth=unit;c.beginPath();c.moveTo(p.x,p.y-r);c.lineTo(p.x+r,p.y);c.lineTo(p.x,p.y+r);c.lineTo(p.x-r,p.y);c.closePath();c.fill();c.stroke();}
  for(const e of w.economicTargets.values())if(e.status==='active'){if(e.kind==='egg')this.rescue(project(e),'S',unit);else dot(e,'#eda679',1.7);}
  for(const p of w.pods)if(['falling','active','opening'].includes(p.status))this.rescue(project(p),(({marine:'M',marauder:'R',hellion:'H',tank:'T',medivac:'+'} as Record<string,string>)[p.unitType]??SC2_UNITS[p.unitType].zh.slice(0,1))+'×'+p.passengers.filter(c=>c.status==='waiting').length,unit,p.hp/p.maxHp);
  if(w.hive&&w.hive.hp>0){const p=project(w.hive);c.strokeStyle='#fa746b';c.lineWidth=2*unit;c.strokeRect(p.x-4*unit,p.y-4*unit,8*unit,8*unit);}
  for(const hive of w.expansionHives.values()){const p=project(hive);c.strokeStyle='#ff614f';c.lineWidth=2*unit;c.strokeRect(p.x-3*unit,p.y-3*unit,6*unit,6*unit);}
  for(const fort of w.fortifications.values()){const p=project(fort);c.fillStyle=fort.kind==='bunker'?'#6ec4ff':'#73ebcf';c.fillRect(p.x-2.5*unit,p.y-2.5*unit,5*unit,5*unit);}
  const threats=minimapThreats(w);for(const threat of threats){const p=project(threat.point);c.strokeStyle=threat.kind==='scan'?'#ff6357':threat.kind==='arrival'?'#ffbb61':'#f69055';c.lineWidth=1.5*unit;c.beginPath();c.arc(p.x,p.y,Math.max(3*unit,threat.radius/this.frame.size*s),0,Math.PI*2);c.stroke();if(threat.end){const end=project(threat.end);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(end.x,end.y);c.stroke();}}
  this.canvas.dataset.threatCount=String(threats.length);
  this.height=w.terrain?.height(w.anchor)??0;c.strokeStyle='#d0e2e080';c.lineWidth=unit;c.beginPath();for(const [i,[x,y]]of [[-1,1],[1,1],[1,-1],[-1,-1]].entries()){const near=new Vector3(x,y,-1).unproject(this.view.camera),far=new Vector3(x,y,1).unproject(this.view.camera),v=far.sub(near),t=(this.height-near.y)/v.y,q=project({x:near.x+v.x*t,z:near.z+v.z*t});if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);}c.closePath();c.stroke();
  if(w.order){const p=project(w.order.point);c.strokeStyle='#7fefff';c.lineWidth=unit;c.beginPath();c.arc(p.x,p.y,5*unit,0,Math.PI*2);c.stroke();}
  const a=project(w.anchor);c.fillStyle='#9aefff';c.beginPath();c.moveTo(a.x,a.y-4*unit);c.lineTo(a.x+3*unit,a.y+3*unit);c.lineTo(a.x-3*unit,a.y+3*unit);c.closePath();c.fill();
  this.canvas.title=`${w.endless?'无尽第 '+w.endless.round+' 轮':'第 '+w.stage+' 关'} · 右键 / 轻点前往 · ${w.pods.filter(p=>['falling','active','opening'].includes(p.status)).map(p=>{const n=p.passengers.filter(c=>c.status==='waiting').length;return `${SC2_UNITS[p.unitType].zh} ×${n} · 增援${p.number} · ${Math.ceil(p.hp)}/${p.maxHp} HP · ${w.podPurpose(p.unitType,n)}`;}).join(' / ')}`;
 }
 private rescue(p:{x:number;y:number},glyph:string,unit:number,hp?:number){const c=this.ctx;c.font=`${8*unit}px sans-serif`;const half=Math.max(5*unit,c.measureText(glyph).width/2+2*unit);c.fillStyle='#181e21';c.strokeStyle='#ffc277';c.lineWidth=unit;c.fillRect(p.x-half,p.y-5*unit,half*2,10*unit);c.strokeRect(p.x-half,p.y-5*unit,half*2,10*unit);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ffe1a2';c.fillText(glyph,p.x,p.y+.5*unit);if(hp!==undefined){c.fillStyle='#263a2b';c.fillRect(p.x-half,p.y+6*unit,half*2,2*unit);c.fillStyle=hp<.3?'#ff7852':'#75ef95';c.fillRect(p.x-half,p.y+6*unit,half*2*Math.max(0,Math.min(1,hp)),2*unit);}}
}
