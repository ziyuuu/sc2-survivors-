import {assetUrl,icon} from '../../assets/manifest';
import {REFERENCE_GLYPHS} from './reference-glyphs';
import {BRAND_LOGO_SRC} from './brand-logo.generated';
import {escapeHtml as esc} from './painted-art';
export {esc};
export const glyph=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${REFERENCE_GLYPHS[name]??REFERENCE_GLYPHS.hex}</svg>`;
export const image=(id:string,alt='',cls='')=>{const url=assetUrl(id);return url?`<img class="${cls}" src="${url}" alt="${esc(alt)}" draggable="false">`:icon(id,alt);};
export const button=(label:string,action:string,cls='',attrs='')=>`<button class="game-button ${cls}" data-action="${action}" ${attrs}><span>${label}</span></button>`;
export const iconButton=(name:string,label:string,action:string,attrs='')=>`<button class="icon-button" data-action="${action}" aria-label="${esc(label)}" ${attrs}>${glyph(name)}</button>`;
export const infoButton=(name:string,copy:string,label='')=>`<button class="info-button ${label?'with-label':''}" data-action="ui-info" data-title="${esc(name)}" data-copy="${esc(copy)}" aria-label="查看${esc(name)}说明">${glyph('info')}${label?`<span>${esc(label)}</span>`:''}</button>`;
export const money=(m:number,g?:number)=>`<span class="money minerals">${image('ui.minerals')}<b>${Math.floor(m).toLocaleString('zh-CN')}</b></span>${g===undefined?'':`<span class="money gas">${image('ui.gas')}<b>${Math.floor(g).toLocaleString('zh-CN')}</b></span>`}`;
let brandUrl:string|undefined;
export const brandLogo=(cls='')=>{
 if(!brandUrl){
  if(typeof document!=='undefined'&&typeof URL.createObjectURL==='function'){
   const binary=atob(BRAND_LOGO_SRC.split(',')[1]),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));brandUrl=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
  }else brandUrl=BRAND_LOGO_SRC;
 }
 return `<img class="game-brand-logo ${cls}" src="${brandUrl}" alt="STARCRAFT SURVIVORS" draggable="false">`;
};
export const masthead=(label='指挥中心',showBrand=true)=>`<div class="masthead${showBrand?'':' status-only'}">${showBrand?`<span class="mini-brand">${brandLogo()}</span>`:''}<span class="mast-status"><i></i>${esc(label)}</span></div>`;
export const tags=(items:readonly string[])=>`<div class="game-tags">${items.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
export const title=(text:string,back='menu-back',right='',sub='')=>`<header class="screen-heading"><div class="heading-left">${iconButton('back','返回',back)}<div><h1>${esc(text)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div></div>${right}</header>`;
export const page=(body:string,classes='')=>`<div class="reference-page title-screen ${classes}">${body}</div>`;
export const modal=(name:string,subtitle:string,body:string,cls='',foot='',back='ui-back')=>`<div class="modal-scrim"><section class="modal-window panel ${cls}" role="dialog" aria-modal="true" aria-label="${esc(name)}" tabindex="-1"><header class="modal-heading"><div><h1>${esc(name)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${iconButton('close',back==='restart'?'返回标题，保留选择':'关闭',back)}</header><div class="modal-content" tabindex="0">${body}</div>${foot?`<footer class="modal-footer">${foot}</footer>`:''}</section></div>`;
