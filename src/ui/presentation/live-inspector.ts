/** Keep the reference window mounted while actual vitals/cooldowns change.
 * Recreating it every tick would restart the entrance animation indefinitely. */
export function updateLiveInspector(root:HTMLElement,html:string){
 const active=root.contains(document.activeElement)?document.activeElement as HTMLElement:null;
 const controls=[...root.querySelectorAll<HTMLElement>('button,summary,[tabindex]')],index=active?controls.indexOf(active):-1;
 const ability=active?.closest<HTMLElement>('[data-ability]')?.dataset.ability;
 const identity=active&&['data-inspect-tab','data-inspect-seat','data-inspect-neighbor','data-inspect-close'].find(key=>active.hasAttribute(key));
 const scroll=[...root.querySelectorAll<HTMLElement>('[data-inspector-scroll],.ui12-roster-list')].map(el=>({el,top:el.scrollTop,left:el.scrollLeft}));
 const current=root.querySelector<HTMLElement>('.ui12-window');
 if(!current||!html){root.innerHTML=html;return;}
 const template=document.createElement('template');template.innerHTML=html;
 const next=template.content.querySelector<HTMLElement>('.ui12-window');
 if(!next){root.innerHTML=html;return;}
 for(const key of ['kind','tab','unitIdentity','unitRank','unitKey'])current.dataset[key]=next.dataset[key];
 for(const selector of ['.ui12-header','.ui12-art','.ui12-vitals','.ui12-tabs','#ui12-tabpanel','.ui12-footer']){
  const a=current.querySelector<HTMLElement>(selector),b=next.querySelector<HTMLElement>(selector);
  if(a&&b&&a.innerHTML!==b.innerHTML)a.innerHTML=b.innerHTML;
 }
 if(active&&!active.isConnected){
  const replacement=ability?root.querySelector<HTMLElement>(`[data-ability="${CSS.escape(ability)}"] summary`):identity?root.querySelector<HTMLElement>(`[${identity}="${CSS.escape(active.getAttribute(identity)??'')}"]`):[...root.querySelectorAll<HTMLElement>('button,summary,[tabindex]')][index];
  (replacement??current).focus({preventScroll:true});
 }
 for(const saved of scroll){const el=saved.el.isConnected?saved.el:root.querySelector<HTMLElement>(saved.el.hasAttribute('data-inspector-scroll')?'[data-inspector-scroll]':'.ui12-roster-list');if(el){el.scrollTop=saved.top;el.scrollLeft=saved.left;}}
}
