export interface HudPreferences {mapCollapsed:boolean;armyCollapsed:boolean}
/** UI preferences are independent of runs, control mappings and resource caches. */
export class HudSettings {
 private value:HudPreferences;readonly listeners=new Set<()=>void>();
 constructor(private storage?:Pick<Storage,'getItem'|'setItem'>){
  let saved:unknown;try{saved=JSON.parse(storage?.getItem('sc2.hud.v1')??'null');}catch{}
  const p=(saved&&typeof saved==='object'?saved:{}) as Partial<HudPreferences>;
  this.value={mapCollapsed:p.mapCollapsed===true,armyCollapsed:p.armyCollapsed===true};
 }
 get mapCollapsed(){return this.value.mapCollapsed;}
 get armyCollapsed(){return this.value.armyCollapsed;}
 toggle(key:keyof HudPreferences){this.value={...this.value,[key]:!this.value[key]};try{this.storage?.setItem('sc2.hud.v1',JSON.stringify(this.value));}catch{}for(const listener of this.listeners)listener();}
 report(){return {...this.value};}
}
