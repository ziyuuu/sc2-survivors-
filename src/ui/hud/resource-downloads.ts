import {button} from '../presentation/reference-primitives';
import {RACE_NAMES as RACE_LABELS,type Race} from '../../data/races';
import type {ResourceDownloads} from '../../app/resource-downloads';
export {raceDownloadIds} from '../../app/resource-downloads';
const mb=(n:number)=>(n/1048576).toFixed(1)+' MiB';

export function renderResourceDownloads(){
 return `<section class="settings-downloads" data-resource-downloads aria-label="资源预下载">
 <p data-download-status role="status" aria-live="polite"></p>
 <div class="download-actions">${button('下载本族','download-race','small')}${button('下载全部','download-all','small')}${button('停止下载','download-stop','small','hidden')}</div>
 <div class="download-progress"><progress aria-label="已保存的资源" max="1" value="0"></progress><p data-download-progress></p></div>
 <p data-download-storage class="settings-help"></p>
 <div class="download-sizes"><p data-download-race-size></p><p data-download-all-size></p></div>
 <p class="settings-help">玩过的内容会自动缓存。提前下载可减少后续等待；本族包含共用的敌人、地图、音效和特效。</p>
 <p class="settings-help">切换设置标签可继续下载；关闭设置或切到后台后，完成当前文件即停止。缓存可能由浏览器回收，未包含网页本身的离线启动。</p>
 ${button('清理资源缓存','download-clear','small')}<p class="settings-help">只清理下载资源，保留存档、天赋和设置。</p></section>`;
}
/** Update progress in place so keyboard focus and the user's scroll position survive. */
export function refreshResourceDownloads(root:HTMLElement,downloads:ResourceDownloads,race:Race){
 const host=root.querySelector<HTMLElement>('[data-resource-downloads]');if(!host)return;
 const text=(selector:string,value:string)=>{const node=host.querySelector<HTMLElement>(selector);if(node&&node.textContent!==value)node.textContent=value;};
 const selected=downloads.size('race',race),all=downloads.size('all',race),s=downloads.state;
 text('[data-action="download-race"] span',downloads.available?`下载本族 · ${mb(selected.bytes)}`:'下载本族');
 text('[data-action="download-all"] span',downloads.available?`下载全部 · ${mb(all.bytes)}`:'下载全部');
 text('[data-download-race-size]',downloads.available?`${RACE_LABELS[race]}与共用资源 · ${mb(selected.bytes)} · ${selected.files} 个文件`:'资源已随游戏提供，无需预下载。');
 text('[data-download-all-size]',downloads.available?`全部资源 · ${mb(all.bytes)} · ${all.files} 个文件`:'');
 text('[data-download-progress]',s.total?`${s.scope==='all'?'全部资源':s.race?RACE_LABELS[s.race]+'与共用资源':''}：已保存 ${mb(s.done)} / ${mb(s.total)}`:'');
 text('[data-download-status]',downloads.available?s.message:'');
 text('[data-download-storage]',s.availableBytes===null?'':`浏览器估计可用存储约 ${mb(s.availableBytes)}；实际可保存容量由浏览器决定。`);
 const bar=host.querySelector('progress')!;bar.max=Math.max(1,s.total);bar.value=s.done;bar.hidden=!s.total;
 for(const action of ['download-race','download-all','download-clear'])host.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.disabled=!downloads.canStart;
 const stop=host.querySelector<HTMLButtonElement>('[data-action="download-stop"]')!;stop.hidden=!['running','stopping'].includes(s.phase);stop.disabled=s.phase==='stopping';
}
