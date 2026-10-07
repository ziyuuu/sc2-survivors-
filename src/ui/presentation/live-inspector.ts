/** Keep the reference window mounted while actual vitals/cooldowns change.
 * Recreating it every tick would restart the entrance animation indefinitely. */
export function updateLiveInspector(root:HTMLElement,html:string){
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
}
