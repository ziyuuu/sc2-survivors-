import '../../src/ui/presentation/game-shell.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import '../../src/ui/intermission-skin/skin.css';
import '../../src/ui/intermission-skin/card-material.css';
import '../../src/ui/intermission-skin/refinements.css';
import '../../src/ui/intermission-skin/adaptive-layout.css';
import './review.css';
import {configurePlatformAssetUrl} from '../../src/assets/manifest';
import {referenceCard} from '../../src/ui/presentation/reference-card';
import {glyph,money,button,esc} from '../../src/ui/presentation/reference-primitives';
import {ARMED_CARDS,armedDetail,type ArmedCard} from '../../src/data/terran-armed-support';
import {paintedArt} from '../../src/ui/presentation/painted-art';
import {REVIEW_ART} from './art';
declare const __ARMED_ASSETS__: Record<string,string>;
configurePlatformAssetUrl(id=>__ARMED_ASSETS__[id]??null);
const artUrl=__ARMED_ASSETS__['ui.intermission.objects-terran'];
const bg=__ARMED_ASSETS__['ui.intermission.background-terran'];
const labels={W:'白卡',G:'绿卡',B:'蓝卡',P:'普通紫',N:'紫节点',O:'橙节点'};
const kind=(c:ArmedCard)=>c.purchase==='node'?'武装支援 · 紫色节点':c.purchase==='orange'?'武装支援 · 橙色节点':c.quality==='purple'?'武装支援 · 普通紫卡':'武装支援';
const doc=document;
if(doc.body.dataset.page==='shelf'){
 doc.title='武装支援 · 卡槽样张';
 const ids=new URLSearchParams(location.search).get('ids')?.split(',')??['W01','W02','P01'];
 const cards=ids.map(id=>ARMED_CARDS.find(c=>c.id===id)).filter((c):c is ArmedCard=>!!c).slice(0,3);
 const nodeOnly=cards.every(c=>c.purchase==='node'),orangeOnly=cards.every(c=>c.purchase==='orange');
 const root=doc.createElement('div');root.id='interface';root.className='game-frame';
 root.innerHTML=`<div id="overlay" class="imx" data-imx-race="terran"><div class="reference-page"><div class="reward-screen formal-intermission"><section class="intermission-screen"><header class="im-heading"><div class="im-title"><div><span class="im-eyebrow">第 6 关完成 · 人族</span><h1>${nodeOnly?'武装支援':orangeOnly?'终极支援':'战备补给'}</h1></div></div><div class="im-wallet" aria-label="现有资源">${money(465,1149)}</div></header><nav class="im-steps" aria-label="关间整备"><span><b>${glyph('check')}</b>基地建设</span><i></i><span aria-current="step"><b>02</b>战备补给</span><i></i><span><b>03</b>返回前线</span></nav><div class="im-choice-grid" id="reward-cards" aria-label="${nodeOnly?'紫节点选项':'商店选项'}">${cards.map((c,i)=>referenceCard({id:c.id,race:'terran',rarity:c.quality,name:c.name,kicker:kind(c),flavour:'',stat:c.brief,detail:armedDetail(c),art:'support',icon:'ui.intermission.objects-terran',minerals:c.price[0],gas:c.price[1],free:c.purchase==='node',label:c.purchase==='node'?'免费领取':'购买'},i)).join('')}</div><footer class="im-footer">${button(nodeOnly?'稍后领取':orangeOnly?'稍后购买':'返回前线','sample-return','primary')}</footer></section></div></div></div>`;
 doc.body.append(root);
 const overlay=root.querySelector<HTMLElement>('#overlay')!;
 overlay.style.setProperty('--imx-background',`url('${bg}')`);
 // Same body structure as mountIntermissionSkin; original referenceCard owns the
 // slot, quality, price and action. Only candidate art/copy is injected here.
 for(const c of cards){const el=root.querySelector<HTMLElement>(`[data-card-id="${c.id}"]`)!;
  const face=el.querySelector('.im-card-face')!,body=doc.createElement('div');body.className='imx-card-body';
  const composition=REVIEW_ART[c.id];const art=composition?paintedArt(composition.identity,c.name,composition.bodies,'armed-review-'+c.id,composition.identities):`<div class="imx-object" role="img" aria-label="${esc(c.visual)}" style="background-image:url('${artUrl}');background-position:${(c.sprite%4)/3*100}% ${Math.floor(c.sprite/4)/3*100}%"></div>`;
  body.innerHTML=`<div class="imx-art">${art}${c.purchase==='node'?`<svg class="armed-node-symbol" viewBox="0 0 40 40" aria-label="联动节点"><path d="M9 8v12h22V8M20 20v12"/><circle cx="9" cy="8" r="4"/><circle cx="31" cy="8" r="4"/><circle cx="20" cy="32" r="4"/></svg>`:''}<div class="imx-badges"><b>${c.purchase==='white-rank'||c.purchase==='rank'?'I':''}</b><strong></strong></div></div><h2 class="imx-name">${esc(c.name)}</h2><p class="imx-kind">${kind(c)}</p><button class="imx-copy" type="button" data-imx-flip="${c.id}" aria-label="${c.name}：查看详情" aria-expanded="false"><span>${esc(c.brief)}</span><i aria-hidden="true">${glyph('refresh')}</i></button>`;
  face.replaceWith(body);el.dataset.imxCard='true';el.classList.add('imx-retained');
  if(!el.querySelector('.im-card-status'))el.insertAdjacentHTML('beforeend','<span class="im-card-status" aria-hidden="true"></span>');
 }
 root.addEventListener('click',e=>{const toggle=(e.target as Element).closest<HTMLButtonElement>('[data-imx-flip]');if(!toggle)return;
  const c=cards.find(c=>c.id===toggle.dataset.imxFlip)!,expand=toggle.getAttribute('aria-expanded')!=='true';
  toggle.setAttribute('aria-expanded',String(expand));toggle.setAttribute('aria-label',`${c.name}：${expand?'切回简要':'查看详情'}`);toggle.querySelector('span')!.textContent=expand?armedDetail(c):c.brief;
 });
 const resize=()=>{const width=innerWidth,height=innerHeight;
  overlay.dataset.layout=width<height&&width<700?'portrait':'landscape';
  root.style.setProperty('--ui-layout-width',width+'px');root.style.setProperty('--ui-layout-height',height+'px');
  root.style.setProperty('--text-scale','1');overlay.style.width=width+'px';overlay.style.height=height+'px';
 };addEventListener('resize',resize);resize();
}else{
 doc.title='武装支援 · 45 张卡面审阅';doc.body.className='review';
 doc.body.innerHTML=`<header class="review-heading"><h1>武装支援 · 45 张卡面</h1><p>R3 设计审阅 · 卡槽样张，尚未接入战斗</p><a href="完整卡面设计.md">完整文案与效果设计</a> · <a href="资源盘点.json">本地资源盘点</a></header><div class="review-grid"><aside><div class="review-actions"><button data-set="W01,W02,P01">正式／临援与普通紫</button><button data-set="P01,N05,P02">普通紫／紫节点对照</button><button data-set="N01,N05">紫节点二选一</button><button data-set="O01,O02,O03">橙色三选一</button></div><label>查找卡名或编号<input id="search" type="search" placeholder="W01 或 临援仓"></label><nav id="catalog" aria-label="45 张卡牌"></nav></aside><main><div class="review-controls"><label>视口<select id="viewport"><option value="1440,900">桌面 1440×900</option><option value="844,390">手机横屏 844×390</option><option value="390,844">手机竖屏 390×844</option></select></label><a id="open" href="卡槽.html?ids=W01,W02,P01" target="_blank">独立打开卡槽</a><span id="sample-kind"></span></div><div class="frame-scroll"><iframe id="sample" title="真实卡槽样张"></iframe></div><article id="copy"></article></main></div>`;
 const frame=doc.querySelector<HTMLIFrameElement>('#sample')!,view=doc.querySelector<HTMLSelectElement>('#viewport')!;
 const open=doc.querySelector<HTMLAnchorElement>('#open')!;let active='W01';
 function show(ids:string){frame.src='卡槽.html?ids='+ids;open.href=frame.src;const cards=ids.split(',').map(id=>ARMED_CARDS.find(c=>c.id===id)!);
  doc.querySelector('#sample-kind')!.textContent=cards.some(c=>c.purchase==='node')&&!cards.every(c=>c.purchase==='node')?'跨获取场景的样式对照；正式游戏分别购买／领取':'';
 }
 function details(id:string){active=id;const c=ARMED_CARDS.find(c=>c.id===id)!;doc.querySelector('#copy')!.innerHTML=`<h2>${c.id} ${c.name}</h2><p class="card-meta">${kind(c)} · ${c.purchase==='node'?'免费领取':c.price[0]+' 矿／'+c.price[1]+' 气（基础价）'}</p><h3>详情</h3>${armedDetail(c).split('\n\n').map(t=>`<p>${esc(t)}</p>`).join('')}<h3>图标／主视觉方案</h3><p>${esc(c.visual)}</p><h3>普通镜头下的效果</h3><p>${esc(c.effect)}</p>`;
  doc.querySelectorAll('[data-card]').forEach(b=>b.setAttribute('aria-current',String((b as HTMLElement).dataset.card===id)));
 }
 function catalog(query=''){doc.querySelector('#catalog')!.innerHTML=Object.entries(labels).map(([prefix,label])=>{const cards=ARMED_CARDS.filter(c=>c.id.startsWith(prefix)&&(c.id+c.name).toLowerCase().includes(query.toLowerCase()));return cards.length?`<h2>${label} · ${cards.length}</h2>${cards.map(c=>`<button data-card="${c.id}" aria-current="${c.id===active}"><span>${c.id}</span>${c.name}</button>`).join('')}`:'';}).join('');}
 doc.addEventListener('click',e=>{const b=(e.target as Element).closest<HTMLElement>('[data-card],[data-set]');if(!b)return;
  if(b.dataset.set){show(b.dataset.set);details(b.dataset.set.split(',')[0]);return;}
  const c=ARMED_CARDS.find(c=>c.id===b.dataset.card)!;const siblings=ARMED_CARDS.filter(s=>s.id[0]===c.id[0]);const at=siblings.findIndex(s=>s.id===c.id);let group=[c,...siblings.filter(s=>s!==c).slice(at,at+2)];if(group.length<3)group=[c,...siblings.filter(s=>s!==c).slice(0,2)];if(c.id[0]==='N')group=group.slice(0,2);show(group.map(c=>c.id).join(','));details(c.id);
 });
 view.addEventListener('change',()=>{const [w,h]=view.value.split(',');frame.style.width=w+'px';frame.style.height=h+'px';});
 doc.querySelector('#search')!.addEventListener('input',e=>catalog((e.target as HTMLInputElement).value));
 catalog();show('W01,W02,P01');details('W01');view.dispatchEvent(new Event('change'));
}
