export type DesktopControls='mouse'|'keyboard';
export type TouchControls='tap'|'joystick';
export interface ControlPreferences {desktop:DesktopControls;touch:TouchControls}
const DEFAULTS:ControlPreferences={desktop:'mouse',touch:'joystick'};
export function controlPreferences(value:unknown):ControlPreferences {
 const p=(value&&typeof value==='object'?value:{}) as Partial<ControlPreferences>;
 return {desktop:p.desktop==='keyboard'?'keyboard':DEFAULTS.desktop,touch:p.touch==='tap'?'tap':DEFAULTS.touch};
}
/** Preferences outlive runs; no simulation state is stored here. */
export class ControlSettings {
 private value:ControlPreferences;readonly listeners=new Set<()=>void>();
 constructor(private readonly storage?:Pick<Storage,'getItem'|'setItem'>){
  let saved:unknown;try{saved=JSON.parse(storage?.getItem('sc2.controls.v1')??'null');}catch{}
  this.value=controlPreferences(saved);
 }
 get desktop(){return this.value.desktop;}get touch(){return this.value.touch;}
 set(key:keyof ControlPreferences,value:string){
  const next=controlPreferences({...this.value,[key]:value});if(next[key]===this.value[key])return;
  this.value=next;try{this.storage?.setItem('sc2.controls.v1',JSON.stringify(next));}catch{}
  for(const fn of this.listeners)fn();
 }
 pointerMoves(pointerType:string){return pointerType==='mouse'?this.desktop==='mouse':this.touch==='tap';}
 report(){return {...this.value};}
}
