import {glyph} from '../presentation/reference-primitives';
import {httpStore,httpAssetStatus} from '../../assets/http-store';
import {ASSETS} from '../../assets/manifest';
import {racePreloadModels} from '../../app/race-preload';
import {RESCUE_PRESENTATION} from '../../data/economy';
import type {Race} from '../../data/races';

export function raceDownloadIds(race:Race,ids:string[]){const models=[...racePreloadModels(race).keys()],rescue=RESCUE_PRESENTATION[race];models.push(rescue.workerModel,rescue.carrierModel,...(rescue.carrierBirthModel?[rescue.carrierBirthModel]:[]));
 return ids.filter(id=>!id.startsWith('model.')||/model\.(fort\.|hive|drone|egg|loot\.|projectile\.|support\.)/.test(id)||models.some(key=>id==='model.'+key||id.startsWith('model.'+key+'.'))||['map-data','map-model'].includes(ASSETS.get(id)?.kind??''));}
let active:HTMLDialogElement|null=null;
export function openResourceDownloads(race:Race){if(active){active.focus();return;}const d=document.createElement('dialog');active=d;d.id='resource-downloads';d.setAttribute('data-captures-battle-input','');d.className='resource-downloads modal-window panel';d.innerHTML='<header class="modal-heading"><h1>资源下载</h1><button class="icon-button" data-close aria-label="关闭窗口">'+glyph('close')+'</button></header><div class="modal-content"><p>玩过的内容会自动缓存；提前下载可减少下次等待。</p><progress max="1" value="0"></progress><p role="status"></p><div><button data-download="race">下载本族</button><button data-download="all">下载全部</button><button data-cancel hidden>停止下载</button></div><button data-clear>清理资源缓存</button></div><footer class="modal-footer"><button class="game-button primary" data-close><span>返回</span></button></footer>';for(const b of d.querySelectorAll<HTMLButtonElement>('button:not(.icon-button):not(.game-button)')){b.classList.add('game-button');b.innerHTML='<span>'+b.innerHTML+'</span>';}document.body.append(d);d.showModal();const status=d.querySelector('[role=status]')!,bar=d.querySelector('progress')!;let stop=false,running=false;const mb=(n:number)=>(n/1048576).toFixed(1)+' MiB';
 const store=httpStore();status.textContent=store?'缓存自动启用；只补缺失或变化文件。':'资源已随游戏提供，无需预下载。';if(!store)for(const b of d.querySelectorAll<HTMLButtonElement>('[data-download],[data-clear]'))b.disabled=true;
 const close=()=>{stop=true;d.close();d.remove();active=null;};d.addEventListener('cancel',e=>{e.preventDefault();close();});
 d.addEventListener('click',async e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;if(b.hasAttribute('data-close')){close();return;}if(b.hasAttribute('data-cancel')){stop=true;status.textContent='完成正在下载的文件后停止';return;}if(!store||running)return;
  if(b.hasAttribute('data-clear')){try{await store.cache.clear();status.textContent='资源缓存已清理；存档和天赋保留。';}catch{status.textContent='浏览器未允许清理资源缓存';}return;}
  if(!b.dataset.download)return;running=true;stop=false;for(const button of d.querySelectorAll<HTMLButtonElement>('[data-download],[data-clear]'))button.disabled=true;(d.querySelector('[data-cancel]') as HTMLElement).hidden=false;
  try{await store.cache.persist();const ids=Object.keys(store.manifest.assets),chosen=b.dataset.download==='all'?ids:raceDownloadIds(race,ids);const estimate=await navigator.storage?.estimate?.().catch(()=>null);if(estimate?.quota&&estimate.usage!==undefined)status.textContent='可用存储约 '+mb(estimate.quota-estimate.usage);
   await store.prefetch(chosen,(done,total)=>{bar.max=Math.max(1,total);bar.value=done;status.textContent=`已保存 ${mb(done)} / ${mb(total)}`;},()=>stop);status.textContent=stop?'已停止；已完成文件保留。':'下载完成，下次进入自动复用。';
  }catch(error){status.textContent=String((error as Error).message)+'；可再次点击下载重试缺项。';}finally{running=false;(d.querySelector('[data-cancel]') as HTMLElement).hidden=true;for(const button of d.querySelectorAll<HTMLButtonElement>('[data-download],[data-clear]'))button.disabled=false;const warning=httpAssetStatus()?.warning;if(warning)status.textContent=warning;}
 });
}
