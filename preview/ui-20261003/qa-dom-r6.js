() => {
 const page=document.querySelector('.battle-page'),frame=document.querySelector('#game-frame'),host=document.querySelector('.modal-window')||document.querySelector('#scene');
 const rect=e=>e?.getBoundingClientRect().toJSON();
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
 const controls=[...host.querySelectorAll('button,select,input')].filter(visible);
 const issues=[],covered=[],small=[],scrollable=[];
 for(const e of controls){
  const r=e.getBoundingClientRect(),fr=frame.getBoundingClientRect(),clip={left:fr.left,right:fr.right,top:fr.top,bottom:fr.bottom};let allowed=false;
  for(let a=e.parentElement;a&&a!==frame.parentElement;a=a.parentElement){
   const st=getComputedStyle(a),ar=a.getBoundingClientRect();
   if((['auto','scroll'].includes(st.overflowY)&&a.scrollHeight>a.clientHeight+2)||(['auto','scroll'].includes(st.overflowX)&&a.scrollWidth>a.clientWidth+2))allowed=true;
   if(/hidden|auto|scroll|clip/.test(st.overflowX+' '+st.overflowY)){clip.left=Math.max(clip.left,ar.left);clip.right=Math.min(clip.right,ar.right);clip.top=Math.max(clip.top,ar.top);clip.bottom=Math.min(clip.bottom,ar.bottom);}
  }
  const name=e.getAttribute('aria-label')||e.textContent.trim(),clipped=r.left<clip.left-2||r.right>clip.right+2||r.top<clip.top-2||r.bottom>clip.bottom+2;
  if(clipped)(allowed?scrollable:issues).push({name,rect:r.toJSON(),clip});
  if(!clipped&&!e.disabled){const hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);if(hit&&!e.contains(hit))covered.push({name,by:hit.tagName+'.'+hit.className});}
  if(r.width<43.5||r.height<43.5)small.push({name,width:r.width,height:r.height});
 }
 const bodies=[...document.querySelectorAll('.unit-portrait')].filter(visible),commands=[...document.querySelectorAll('.command-key')].filter(visible);
 const rows=elements=>[...new Set(elements.map(e=>Math.round(e.getBoundingClientRect().top)))];
 const field=document.querySelector('.battle-playfield'),map=document.querySelector('.battle-map-image');
 const images=[...host.querySelectorAll('img[src]')].filter(visible).filter(e=>e.getAttribute('src'));
 return {viewport:{width:innerWidth,height:innerHeight},page:frame.dataset.page,race:frame.dataset.race,folded:page?.classList.contains('console-folded'),frame:rect(frame),map:rect(map),playfield:rect(field),console:rect(document.querySelector('.battle-console')),armyRows:rows(bodies),commandRows:rows(commands),rowCount:rows([...bodies,...commands]).length,armyButtons:bodies.length,armyIdentities:bodies.map(e=>({unit:e.dataset.unit,name:e.getAttribute('aria-label')})),pager:document.querySelector('.roster-turn')?.getAttribute('aria-label'),foldButton:rect(document.querySelector('.console-fold')),bodyInert:document.querySelector('.console-body')?.inert,playfieldText:field?.innerText||'',rim:field?{padding:getComputedStyle(field).padding,background:getComputedStyle(field).backgroundImage}:null,controls:controls.length,issues,scrollable,covered,small,missing:images.filter(e=>!e.complete||e.naturalWidth===0).map(e=>e.alt),external:images.filter(e=>!e.src.startsWith('data:')).map(e=>e.alt),focused:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim()};
}
