import '../../src/ui/presentation/game-shell.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import {BIO_CARDS,isBioId} from '../../src/data/terran-bio';
import {World} from '../../src/simulation/world';
import {ASSETS,assetUrl,configurePlatformAssetUrl} from '../../src/assets/manifest';
import {mountOverlayLayout} from '../../src/ui/presentation/overlay-layout';
import {mountIntermissionSkin} from '../../src/ui/intermission-skin/skin';
import {bioCardView} from '../../src/ui/presentation/bio-cards';
import {referenceCard} from '../../src/ui/presentation/reference-card';
import {applyDisplayPreferences} from '../../src/ui/display-preferences';
import './cards.css';

const publicRoot=new URL(import.meta.env.BASE_URL,location.origin);
configurePlatformAssetUrl(id=>{
 const asset=ASSETS.get(id);
 return asset?.status==='available'?new URL(asset.url,publicRoot).href:null;
});
applyDisplayPreferences();
document.body.dataset.uiPhase='reward';
const host=document.querySelector<HTMLElement>('#interface')!,root=document.querySelector<HTMLElement>('#overlay')!;
host.dataset.device=matchMedia('(pointer:coarse)').matches?'mobile':'desktop';
host.dataset.race='terran';
const world=new World({race:'terran',seed:181145,waves:false,terrain:false,obstacles:[]});
world.start();world.endStage();
mountOverlayLayout(root,host);
const skin=mountIntermissionSkin(root,()=>world,{assets:{resolve:key=>assetUrl('ui.intermission.'+key)}});
const query=new URLSearchParams(location.search),requested=query.get('card');
let page=isBioId(requested)?Math.floor(BIO_CARDS.findIndex(c=>c.id===requested)/3):0;
const labels=['白卡','绿卡','蓝卡','普通紫卡','紫色节点','橙色节点'];
function render(){
 const batch=BIO_CARDS.slice(page*3,page*3+3);
 const options=Array.from({length:BIO_CARDS.length/3},(_,i)=>{
  const cards=BIO_CARDS.slice(i*3,i*3+3),tier='WGBPNO'.indexOf(cards[0].id[4]);
  return `<option value="${i}" ${i===page?'selected':''}>${labels[tier]} · ${cards.map(c=>c.name).join('／')}</option>`;
 }).join('');
 const views=batch.map(c=>({...bioCardView(c),action:'review-card',label:'查看详情'}));
 root.innerHTML=`<div class="reward-screen formal-intermission"><section class="intermission-screen bio-design"><header class="im-heading"><div class="im-title"><h1>生化协同</h1></div><select aria-label="选择卡牌组">${options}</select></header><div class="im-choice-grid" id="reward-cards">${views.map((c,i)=>referenceCard(c,i)).join('')}</div><footer class="im-footer"><button data-step="-1" class="game-button" ${page===0?'disabled':''}>上一组</button><output>${page+1} / 15</output><button data-step="1" class="game-button" ${page===14?'disabled':''}>下一组</button></footer></section></div>`;
 skin.refresh();
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-action="review-card"]'))button.textContent='查看详情';
 history.replaceState(null,'','?card='+batch[0].id);
}
root.addEventListener('change',e=>{const el=e.target;if(el instanceof HTMLSelectElement){page=Number(el.value);render();}});
root.addEventListener('click',e=>{const el=(e.target as Element).closest<HTMLElement>('button');if(!el)return;
 if(el.dataset.step){page+=Number(el.dataset.step);render();return;}
 if(el.dataset.action==='review-card')el.closest('.im-card')?.querySelector<HTMLButtonElement>('.imx-copy')?.click();
});
render();
