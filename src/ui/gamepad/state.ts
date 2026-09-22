export type ButtonBinding={button:number}|{axis:number;sign:number;rest:number};
export interface PadMapping {x:number;y:number;invertX:number;invertY:number;confirm:ButtonBinding;back:ButtonBinding;stim:ButtonBinding;siege:ButtonBinding;pause:ButtonBinding;previous:ButtonBinding;next:ButtonBinding;raynor?:ButtonBinding;tychus?:ButtonBinding;nova?:ButtonBinding}
export type PadSnapshot=Pick<Gamepad,'id'|'index'|'mapping'|'axes'|'buttons'|'connected'>;
export const STANDARD:PadMapping={x:0,y:1,invertX:1,invertY:1,confirm:{button:0},back:{button:1},stim:{button:2},siege:{button:3},pause:{button:9},previous:{button:6},next:{button:7},raynor:{button:12},tychus:{button:14},nova:{button:15}};
export function deadzone(x:number,y:number,zone=.18){const r=Math.hypot(x,y);if(r<=zone)return {x:0,z:0};const strength=Math.min(1,(r-zone)/(1-zone));return {x:x/r*strength,z:y/r*strength};}
export function value(p:PadSnapshot,b:ButtonBinding){return 'button' in b?Math.max(0,Math.min(1,p.buttons[b.button]?.value??0)):Math.max(0,Math.min(1,((p.axes[b.axis]??b.rest)-b.rest)*b.sign/Math.max(.1,1-b.rest*b.sign)));}
export class PadState {
 private held=new Set<string>();private direction='';private repeatAt=0;
 sample(p:PadSnapshot,m:PadMapping,now:number){const move=deadzone((p.axes[m.x]??0)*m.invertX,(p.axes[m.y]??0)*m.invertY);const edges=new Set<keyof PadMapping>();let pressed=false;
  for(const k of ['confirm','back','stim','siege','pause','previous','next','raynor','tychus','nova'] as const){const binding=m[k]??(p.mapping==='standard'?STANDARD[k]:undefined);if(!binding)continue;const v=value(p,binding),before=this.held.has(k);if(v>=.55){pressed=true;if(!before){edges.add(k);this.held.add(k);}}else if(v<=.35)this.held.delete(k);else pressed||=before;}
  const dpad=p.mapping==='standard'?{x:(p.buttons[15]?.value??0)-(p.buttons[14]?.value??0),z:(p.buttons[13]?.value??0)-(p.buttons[12]?.value??0)}:{x:0,z:0};
  const axis=Math.abs(dpad.x)+Math.abs(dpad.z)>.5?dpad:move;const direction=Math.max(Math.abs(axis.x),Math.abs(axis.z))<.5?'':Math.abs(axis.x)>Math.abs(axis.z)?axis.x>0?'right':'left':axis.z>0?'down':'up';let menu='';
  if(direction&& (direction!==this.direction||now>=this.repeatAt)){menu=direction;this.repeatAt=now+(direction===this.direction?150:380);}this.direction=direction;
  return {move,edges,menu,neutral:!pressed&&!direction&&Math.hypot(move.x,move.z)===0,meaningful:edges.size>0||!!menu||Math.hypot(move.x,move.z)>0};
 }
 reset(){this.held.clear();this.direction='';this.repeatAt=0;}
}
export function validMapping(m:unknown):m is PadMapping {if(!m||typeof m!=='object')return false;const a=m as PadMapping;if(![a.x,a.y].every(n=>Number.isInteger(n)&&n>=0&&n<32)||![a.invertX,a.invertY].every(n=>n===1||n===-1))return false;return ['confirm','back','stim','siege','pause','previous','next',...(['raynor','tychus','nova'] as const).filter(k=>a[k]!==undefined)].every(k=>{const b=a[k as keyof PadMapping];return typeof b==='object'&&b!==null&&('button' in b?Number.isInteger(b.button)&&b.button>=0&&b.button<64:Number.isInteger(b.axis)&&b.axis>=0&&b.axis<32&&(b.sign===1||b.sign===-1)&&Math.abs(b.rest)<=1);});}
