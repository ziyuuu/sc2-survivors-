import {displayPreferences,TEXT_SIZE_OPTIONS} from '../display-preferences';

/** The same controls are rendered by the game settings and the standalone host. */
export function renderDisplaySettings(){
 const {textScale,motion}=displayPreferences();
 return `<label class="setting-row"><span>文字大小</span><select data-setting="text-scale" aria-label="文字大小">${TEXT_SIZE_OPTIONS.map(o=>`<option value="${o.value}" ${textScale===o.value?'selected':''}>${o.label}</option>`).join('')}</select></label><label class="setting-row"><span>界面动态效果</span><button class="toggle-switch" data-action="toggle-ui-motion" aria-pressed="${motion}" aria-label="动态效果">${motion?'开启':'关闭'}<i></i></button></label>`;
}
