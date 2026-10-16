import type {HudSkin} from './catalog';
import {skinArt,nativeArt} from './skins';
import {MAP_FRAMES} from './map-frames';
export type HudMode='pc'|'landscape'|'portrait';
type Bit=[number,number,number,number,string];
export function frame(skin:HudSkin,view:string,cls='native-frame'){return `<svg class="${cls}" viewBox="${view}" preserveAspectRatio="none" aria-hidden="true"><image href="${skinArt(skin)}" width="992" height="316"/></svg>`;}
function sliced(skin:HudSkin,width:number,height:number,bits:Bit[],cls='native-frame'){return `<svg class="${cls}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${bits.map(([x,y,w,h,v])=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${v}" preserveAspectRatio="none"><image href="${skinArt(skin)}" width="992" height="316"/></svg>`).join('')}</svg>`;}
export function armyFrame(s:HudSkin,mode:HudMode){return mode==='pc'?`<div class="native-army-parts">${frame(s,'205 0 35 316','frame-left')}${frame(s,'240 0 400 316','frame-middle')}${frame(s,'640 0 41 316','frame-right')}</div>`:mode==='portrait'?sliced(s,64,600,[[0,0,8,12,'205 190 8 10'],[8,0,48,12,'350 190 240 10'],[56,0,8,12,'669 190 12 10'],[0,12,8,576,'205 200 8 107'],[8,12,48,576,'260 220 320 50'],[56,12,8,576,'669 200 12 107'],[0,588,8,12,'205 307 8 9'],[8,588,48,12,'350 307 240 9'],[56,588,8,12,'669 307 12 9']]):frame(s,'205 180 476 136');}
export function commandFrame(s:HudSkin,mode:HudMode){return mode==='portrait'?sliced(s,200,230,[[0,0,200,40,'771 128 221 55'],[0,40,5,182,'771 183 6 123'],[5,40,185,182,'915 267 45 35'],[190,40,10,182,'980 183 12 123'],[0,222,200,8,'771 306 221 10']]):frame(s,mode==='pc'?'771 0 221 316':'771 128 221 188');}
export function controlFrame(s:HudSkin,side=false){const width=side?26:80,height=side?80:26,edge=side?5:8;return sliced(s,width,height,[[0,0,edge,7,'205 190 8 10'],[edge,0,width-2*edge,7,'350 190 240 10'],[width-edge,0,edge,7,'669 190 12 10'],[0,7,edge,height-14,'205 200 8 107'],[edge,7,width-2*edge,height-14,'260 220 320 50'],[width-edge,7,edge,height-14,'669 200 12 107'],[0,height-7,edge,7,'205 307 8 9'],[edge,height-7,width-2*edge,7,'350 307 240 9'],[width-edge,height-7,edge,7,'669 307 12 9']]);}
// The source console includes painted buttons. Keep its outer housing while
// masking only that interior column, which is occupied by the live controls.
export function mapFrame(s:HudSkin,mode:HudMode){
 if(mode!=='pc')return MAP_FRAMES[s.id].replace('<svg ','<svg class="native-frame" ').replace(/href="([^"]+\.png)"/g,(_,file:string)=>`href="${nativeArt(file)}"`);
 const clip='native-map-controls-'+s.id;
 return `<svg class="native-frame" viewBox="0 0 207 316" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="${clip}"><path d="M0 0H207V316H0Z M174 155V314H204V155Z" clip-rule="evenodd"/></clipPath></defs><path d="M174 155H204V314H174Z" fill="#07100f"/><image href="${skinArt(s)}" width="992" height="316" clip-path="url(#${clip})"/></svg>`;
}
