export const TEXT_SIZE_OPTIONS = [
 {value:0.85,label:'小号'},
 {value:0.95,label:'标准'},
 {value:1.15,label:'大号'},
] as const;
export const DISPLAY_PREFERENCES_CHANGED='sc2-display-preferences-changed';
export interface DisplayPreferences {textScale:number;motion:boolean}
let current:Readonly<DisplayPreferences>|undefined;

/** Application display preferences, shared by the main settings and mounted UI. */
export function displayPreferences():Readonly<DisplayPreferences> {
 if(current)return current;
 let size=0.95,motion=true;
 try {
  const saved=localStorage.getItem('sc2.text-scale');
  if(saved!==null){const value=Number(saved);if(TEXT_SIZE_OPTIONS.some(o=>o.value===value))size=value;else if(value===1.25||value===1.5)size=1.15;}
  motion=localStorage.getItem('sc2.ui-motion')!=='false';
 }catch{}
 return current=Object.freeze({textScale:size,motion});
}

export function applyDisplayPreferences(){
 const value=displayPreferences();
 if(typeof document!=='undefined')document.documentElement.style.setProperty('--text-scale',String(value.textScale));
}

export function setDisplayPreferences(patch:Partial<DisplayPreferences>):boolean {
 if(patch.textScale!==undefined&&!TEXT_SIZE_OPTIONS.some(o=>o.value===patch.textScale))return false;
 if(patch.motion!==undefined&&typeof patch.motion!=='boolean')return false;
 const before=displayPreferences(),next=Object.freeze({...before,...patch});current=next;
 applyDisplayPreferences();
 try {localStorage.setItem('sc2.text-scale',String(next.textScale));localStorage.setItem('sc2.ui-motion',String(next.motion));}catch{}
 if(typeof window!=='undefined'){
  if(before.textScale!==next.textScale||before.motion!==next.motion)window.dispatchEvent(new Event(DISPLAY_PREFERENCES_CHANGED));
  if(before.textScale!==next.textScale)window.dispatchEvent(new Event('resize'));
 }
 return true;
}
