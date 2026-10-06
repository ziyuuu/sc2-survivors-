() => {
 const frame=document.querySelector('#game-frame'),modal=document.querySelector('.modal-window'),host=modal||document.querySelector('#scene'),fr=frame.getBoundingClientRect();
 const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
 const issues=[],scrollable=[],covered=[],small=[];
 const controls=[...host.querySelectorAll('button,select,input')].filter(visible);
 for(const e of controls){
  const r=e.getBoundingClientRect(),clip={left:fr.left,right:fr.right,top:fr.top,bottom:fr.bottom};let allowed=false;
  for(let a=e.parentElement;a&&a!==frame.parentElement;a=a.parentElement){
   const st=getComputedStyle(a),ar=a.getBoundingClientRect();
   if(['auto','scroll'].includes(st.overflowY)&&a.scrollHeight>a.clientHeight+2)allowed=true;
   if(['auto','scroll'].includes(st.overflowX)&&a.scrollWidth>a.clientWidth+2)allowed=true;
   if(/hidden|auto|scroll|clip/.test(st.overflowX+' '+st.overflowY)){clip.left=Math.max(clip.left,ar.left);clip.right=Math.min(clip.right,ar.right);clip.top=Math.max(clip.top,ar.top);clip.bottom=Math.min(clip.bottom,ar.bottom);}
  }
  const name=e.getAttribute('aria-label')||e.textContent.trim();
  const clipped=r.left<clip.left-2||r.right>clip.right+2||r.top<clip.top-2||r.bottom>clip.bottom+2;
  if(clipped)(allowed?scrollable:issues).push({name,rect:r.toJSON(),clip});
  if(!e.disabled&&!clipped){const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,hit=document.elementFromPoint(x,y);if(hit&&!e.contains(hit))covered.push({name,by:hit.tagName+'.'+hit.className});}
  if(r.width<43.5||r.height<43.5)small.push({name,width:r.width,height:r.height});
 }
 const images=[...host.querySelectorAll('img[src]')].filter(visible).filter(e=>!!e.getAttribute('src')).map(e=>({alt:e.alt,loaded:e.complete&&e.naturalWidth>0,embedded:e.src.startsWith('data:')}));
 const texts=[...host.querySelectorAll('.talent-map-node b,.offer-card h2,.talent-heading h1,.elite-option b')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({text:e.textContent,width:e.clientWidth,scrollWidth:e.scrollWidth}));
 const raw=host.innerText+' '+[...host.querySelectorAll('[aria-label],[data-copy]')].map(e=>(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('data-copy')||'')).join(' ');
 const forbidden=raw.match(/席位|名额|三种型号|产线|家族槽|发展窗口|预览反馈|floor\(|[RSAM]\d{2}满/g)||[];
 return {page:frame.dataset.page,modal:modal?.getAttribute('aria-label')||null,viewport:{width:innerWidth,height:innerHeight},frame:fr.toJSON(),controls:controls.length,issues,scrollable,covered,small,missing:images.filter(i=>!i.loaded),external:images.filter(i=>!i.embedded),textOverflow:texts,forbidden,treeNodes:host.querySelectorAll('.talent-map-node').length,armyRows:[...new Set([...host.querySelectorAll('.unit-portrait')].filter(visible).map(e=>Math.round(e.getBoundingClientRect().top)))],commandRows:[...new Set([...host.querySelectorAll('.command-key')].filter(visible).map(e=>Math.round(e.getBoundingClientRect().top)))],playfieldText:host.querySelector('.battle-playfield')?.innerText||''};
}
