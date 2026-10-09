import type {PermanentProfile} from '../../simulation/progression/permanent-profile';
import type {Race} from '../../data/races';
import {assetUrl} from '../../assets/manifest';
import {HUD_SKINS,type HudSkin} from './catalog';
import {esc} from '../presentation/reference-primitives';
import './skins.css';
export const nativeArt=(file:string)=>assetUrl('ui.native.'+file.replace(/\.png$/,''))??'';
export const skinArt=(skin:HudSkin)=>nativeArt('sc2_ui_collection_huds_large_'+skin.skin);
export function commandArt(id:string,race:Race){const file=({dash:'btn-command-move',detection:'btn-ability-terran-scannersweep','stalker-blink':'btn-ability-protoss-blink',airlift:race==='protoss'?'btn-ability-protoss-massrecall':race==='zerg'?'btn-ability-zerg-nyduswormmove':undefined,tactical:race==='terran'?'btn-ability-terran-fireonthemove':race==='protoss'?'btn-ability-spearofadun-purifierbeam':'btn-ability-zerg-transfusion',strategic:race==='terran'?'btn-ability-terran-nuclearstrike':undefined} as Record<string,string|undefined>)[id];return file?nativeArt(file):null;}
export function activeSkin(profile:PermanentProfile,race:Race){return HUD_SKINS.find(s=>s.id===race+'-0'+profile.hudSkin(race))!;}
export function renderSkins(profile:PermanentProfile){return `<div class="hud-skin-groups">${(['terran','protoss','zerg'] as const).map(race=>`<section aria-label="${({terran:'人族',protoss:'神族',zerg:'虫族'})[race]}皮肤"><div class="hud-skin-options">${HUD_SKINS.filter(s=>s.race===race).map(s=>{const variant=s.id.endsWith('02')?2:1,unlocked=variant===1||profile.hasVeteranHud(race),selected=profile.hudSkin(race)===variant;return `<article class="hud-skin-option ${selected?'selected':''}"><img src="${skinArt(s)}" alt="${esc(s.name)}外框预览"><h2>${esc(s.name)}</h2><p>${esc(s.material)}</p><button class="game-button small ${selected?'primary':''}" data-action="hud-skin-select" data-race="${race}" data-variant="${variant}" aria-pressed="${selected}" ${unlocked?'':'disabled'}><span>${selected?'使用中':unlocked?'使用此皮肤':'通关本族困难或地狱战役解锁'}</span></button></article>`;}).join('')}</div></section>`).join('')}</div>`;}
