import {ASSETS,assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';

/** A failed icon keeps its readable label and retries on a later page mutation.
 * Replacing only the icon preserves keyboard focus, scroll and live HUD state. */
export function bindDeferredIcons(root:HTMLElement){
 const pending=new Map<string,Promise<void>>();let queued=false;
 const scan=()=>{queued=false;const ids=new Set([...root.querySelectorAll<HTMLElement>('[data-deferred-icon]')].map(el=>el.dataset.deferredIcon!));
  for(const id of ids){if(pending.has(id)||!ASSETS.has(id))continue;
   const job=prepareEmbeddedAssetIds([id]).then(()=>{const url=assetUrl(id);if(!url)return;for(const node of root.querySelectorAll<HTMLElement>('[data-deferred-icon]'))if(node.dataset.deferredIcon===id){const image=document.createElement('img');image.src=url;image.alt=node.textContent??'';image.draggable=false;image.className=node.dataset.iconClass??'';node.replaceWith(image);}}).catch(()=>{}).finally(()=>pending.delete(id));pending.set(id,job);
  }
 };
 const observer=new MutationObserver(records=>{if(queued||!records.some(record=>[...record.addedNodes].some(node=>node instanceof Element&&(node.matches('[data-deferred-icon]')||node.querySelector('[data-deferred-icon]')))))return;queued=true;queueMicrotask(scan);});observer.observe(root,{childList:true,subtree:true});scan();return ()=>observer.disconnect();
}
