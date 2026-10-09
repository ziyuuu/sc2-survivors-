/** Presentation only. Never round the simulation or persisted numbers. */
export const hudInteger=(value:number)=>Number.isFinite(value)?Math.max(0,Math.ceil(value-1e-7)).toLocaleString('zh-CN'):'—';
export const hudDecimal=(value:number)=>Number.isFinite(value)?value.toLocaleString('zh-CN',{maximumFractionDigits:1}):'—';
export function hudInterval(seconds:number){return seconds>0&&seconds<1?{value:String(Math.max(1,Math.round(seconds*1000))),unit:'毫秒'}:{value:hudDecimal(seconds),unit:'秒'};}
export function romanStage(stage:number){return ['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','Ⅺ','Ⅻ','ⅩⅢ','ⅩⅣ','ⅩⅤ','ⅩⅥ','ⅩⅦ','ⅩⅧ'][stage]??String(stage);}
