import raw from './art-metrics.json';

type Bounds={width:number;height:number;bounds:number[]};
const metrics=raw as Record<string,{runtime:Bounds;detail?:Bounds}>;
/** One square icon, with the visible artwork centered at the same optical scale. */
export function equipmentArtStyle(key:string,detail=false){
 const row=metrics[key],m=detail?row?.detail??row?.runtime:row?.runtime;
 if(!m)return '';
 const [left,top,right,bottom]=m.bounds,scale=88/Math.max(right-left,bottom-top);
 return `--art-width:${m.width*scale}%;--art-height:${m.height*scale}%;--art-left:${50-(left+right)*.5*scale}%;--art-top:${50-(top+bottom)*.5*scale}%`;
}
