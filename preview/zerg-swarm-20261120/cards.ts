import '../../src/ui/presentation/game-shell.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import '../bio-synergy-20261118/cards.css';
import './cards.css';
import {ASSETS,assetUrl,configurePlatformAssetUrl} from '../../src/assets/manifest';
import {HEROES} from '../../src/data/heroes';
import {ZERG_SWARM_BY_ID,ZERG_SWARM_CARDS,isZswId,type ZswCard} from '../../src/data/zerg-swarm';
import {swarmCardCopy} from '../../src/data/zerg-swarm-copy';
import {World} from '../../src/simulation/world';
import {applyDisplayPreferences} from '../../src/ui/display-preferences';
import {mountIntermissionSkin} from '../../src/ui/intermission-skin/skin';
import {mountOverlayLayout} from '../../src/ui/presentation/overlay-layout';
import {referenceCard} from '../../src/ui/presentation/reference-card';
import {esc} from '../../src/ui/presentation/reference-primitives';
import {cardGroups,heroOptions,optionQuery,rankName} from './options';
import {swarmCardArt} from './card-art';

const publicRoot=new URL(import.meta.env.BASE_URL,location.origin);
configurePlatformAssetUrl(id=>{
 const asset=ASSETS.get(id);
 return asset?.status==='available'?new URL(asset.url,publicRoot).href:null;
});
applyDisplayPreferences();
document.body.dataset.uiPhase='reward';
const host=document.querySelector<HTMLElement>('#interface')!,root=document.querySelector<HTMLElement>('#overlay')!;
host.dataset.device=matchMedia('(pointer:coarse)').matches?'mobile':'desktop';
host.dataset.race='zerg';
const world=new World({race:'zerg',seed:201120,waves:false,terrain:false,obstacles:[]});
world.start();world.endStage();
mountOverlayLayout(root,host);
const skin=mountIntermissionSkin(root,()=>world,{assets:{resolve:key=>assetUrl('ui.intermission.'+key)}});
const dialog=document.querySelector<HTMLDialogElement>('#card-details')!;
const query=new URLSearchParams(location.search),requested=query.get('card');
const groups=Array.from({length:Math.ceil(ZERG_SWARM_CARDS.length/3)},(_,i)=>ZERG_SWARM_CARDS.slice(i*3,i*3+3));
groups.push([ZERG_SWARM_BY_ID['ZSW-G08'],ZERG_SWARM_BY_ID['ZSW-B09'],ZERG_SWARM_BY_ID['ZSW-N07']]);
const groupCount=groups.length;
let page=query.get('group')==='density'?groupCount-1:isZswId(requested)?Math.floor(ZERG_SWARM_CARDS.findIndex(c=>c.id===requested)/3):0;

const groupLabel=(c:ZswCard)=>cardGroups[c.short[0] as keyof typeof cardGroups];
const optionName=(c:ZswCard,rank:number)=>c.purchase==='orange'?'查看实机':rankName(rank);
function battleLink(c:ZswCard,rank:number,label=optionName(c,rank),extra?:Parameters<typeof optionQuery>[2]){
 return `<a href="./${optionQuery(c.id,rank,extra).replaceAll('&','&amp;')}" data-trial="${c.id}" data-rank="${rank}" aria-label="${esc(c.name+' '+label)}">${esc(label)}</a>`;
}
function showDetail(c:ZswCard){
 dialog.querySelector('h2')!.textContent=c.name;
 const copy=swarmCardCopy(c.short);
 dialog.querySelector('ol')!.innerHTML=copy.effects.map((text,i)=>`<li><p>${esc(text)}</p>${battleLink(c,i+1)}</li>`).join('');
 const notes=dialog.querySelector<HTMLParagraphElement>('.swarm-notes')!;
 notes.hidden=!copy.notes;notes.textContent=copy.notes??'';
 const extras=c.short==='O01'?heroOptions.map(hero=>battleLink(c,1,HEROES[hero].name,{hero})):
  c.short==='G01'?[battleLink(c,1,'正式新兵',{cargo:'delivery'}),battleLink(c,1,'满员投放',{cargo:'overflow'})]:[];
 const nav=dialog.querySelector('nav')!;nav.hidden=!extras.length;nav.innerHTML=extras.join('');
 dialog.showModal();
}
function render(){
 const batch=groups[page];
 const options=Array.from({length:groupCount},(_,i)=>{
  const cards=groups[i];
  return `<option value="${i}" ${i===page?'selected':''}>${i===groupCount-1?'新卡':groupLabel(cards[0])} · ${cards.map(c=>c.name).join('／')}</option>`;
 }).join('');
 const cards=batch.map((c,i)=>{
  const attrs=`data-id="${c.id}"`,copy=swarmCardCopy(c.short);
  const view={id:c.id,race:'zerg' as const,rarity:c.quality,name:c.name,kicker:groupLabel(c),flavour:'',
   stat:copy.brief,detail:copy.detail,art:'support',icon:'tech.attack',minerals:c.price[0],gas:c.price[1],
   action:'review-card',detailAction:'review-card',attrs,detailAttrs:attrs,label:'查看详情'};
  const links=`<nav class="swarm-trial-links" aria-label="${esc(c.name)}档位">${copy.effects.map((_,r)=>battleLink(c,r+1)).join('')}</nav>`;
  return referenceCard(view,i).replace('</article>',links+'</article>');
 }).join('');
 root.innerHTML=`<div class="reward-screen formal-intermission"><section class="intermission-screen bio-design swarm-design"><header class="im-heading"><div class="im-title"><h1>虫群增殖</h1></div><select aria-label="选择卡牌组">${options}</select></header><div class="im-choice-grid" id="reward-cards">${cards}</div><footer class="im-footer"><button data-step="-1" class="game-button" ${page===0?'disabled':''}>上一组</button><output>${page+1} / ${groupCount}</output><button data-step="1" class="game-button" ${page===groupCount-1?'disabled':''}>下一组</button></footer></section></div>`;
 skin.refresh();
 for(const c of batch){
  const slot=root.querySelector('[data-card-id="'+c.id+'"] .imx-art'),art=swarmCardArt(c);
  if(slot&&art){slot.querySelector('.imx-object')?.remove();slot.insertAdjacentHTML('afterbegin',art);}
 }
 history.replaceState(null,'',page===groupCount-1?'?group=density':'?card='+batch[0].id);
}
root.addEventListener('change',e=>{
 if(e.target instanceof HTMLSelectElement){page=Number(e.target.value);render();root.querySelector('select')?.focus();}
});
root.addEventListener('click',e=>{
 const target=(e.target as Element).closest<HTMLElement>('[data-step],[data-action="review-card"]');
 if(!target)return;
 if(target.dataset.step){
  const step=target.dataset.step;page+=Number(step);render();
  (root.querySelector<HTMLButtonElement>('[data-step="'+step+'"]:enabled')??root.querySelector('select'))?.focus();
  return;
 }
 const id=target.dataset.id??target.closest<HTMLElement>('[data-card-id]')?.dataset.cardId;
 if(isZswId(id))showDetail(ZERG_SWARM_BY_ID[id]);
});
render();
if(query.get('detail')==='1'&&isZswId(requested))showDetail(ZERG_SWARM_BY_ID[requested]);
