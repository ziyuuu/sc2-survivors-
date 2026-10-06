import {assetUrl} from '../../assets/manifest';
import {PAINTED_CARDS} from '../../assets/ui-art.generated';
import type {Race} from '../../data/races';
export const COVER_HEROES:Record<Race,readonly string[]>={terran:['raynor','nova','tychus'],zerg:['kerrigan','zagara','dehaka'],protoss:['artanis','zeratul','fenix']};
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Plate={width:number;height:number;assetKey:string;sceneBounds:{x:number;y:number;width:number;height:number};bodyBounds:{x:number;y:number;width:number;height:number};bodyHeight?:number;bodyWidth?:number;air?:boolean};
const positions:Record<number,readonly (readonly [number,number])[]>={1:[[0,0]],2:[[-48,-6],[47,10]],3:[[-88,-6],[88,-4],[0,12]],4:[[-53,-27],[52,-27],[-52,38],[53,40]],6:[[-86,-27],[0,-28],[86,-26],[-86,40],[86,42],[0,44]]};
/** R11 original plate rectangles, with a constant body scale for every cohort size. */
export function paintedArt(identity:string,name:string,bodies=1):string{
 if(!positions[bodies])throw Error('Unsupported painted body count: '+bodies);
 const a=(PAINTED_CARDS as Record<string,Plate>)[identity];
 if(!a){const cover=assetUrl('ui.cover.'+identity);return cover?`<span class="painted-art hero-cover"><img src="${cover}" alt="${escapeHtml(name)}" draggable="false"></span>`:'';}
 const url=assetUrl('ui.paint.'+a.assetKey);if(!url)return '';
 const bb=a.bodyBounds,sb=a.sceneBounds,scale=Math.min((a.bodyWidth??(a.air?240:184))/bb.width,(a.bodyHeight??(a.air?150:224))/bb.height),w=bb.width*scale,h=bb.height*scale;
 const figures=positions[bodies].map(([dx,dy])=>`<svg x="${200-w/2+dx}" y="${255-h+dy}" width="${w}" height="${h}" viewBox="${bb.x} ${bb.y} ${bb.width} ${bb.height}" overflow="hidden"><image href="${url}" width="${a.width}" height="${a.height}"/></svg>`).join('');
 return `<span class="painted-art" data-art-key="${escapeHtml(identity)}" data-body-count="${bodies}"><svg class="painted-scene" viewBox="${sb.x} ${sb.y} ${sb.width} ${sb.height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="${url}" width="${a.width}" height="${a.height}"/></svg><svg class="painted-bodies" viewBox="0 0 400 300" role="img" aria-label="${escapeHtml(name)}，${bodies} 个战士">${figures}</svg></span>`;
}
