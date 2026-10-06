import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
let js=await fs.readFile(new URL('card-ui-r9.mjs',root),'utf8');
js=js.replace("available:'待选择',selected:'已选中',sold:'已获得',short:'资源不足',locked:'尚未解锁',owned:'已达上限'","available:'待选择',selected:'已选中',pending:'正在集结',sold:'已获得',short:'资源不足',locked:'尚未解锁',owned:'已达上限',discount15:'优惠 15%',discount30:'优惠 30%',discount50:'优惠 50%',free:'免费领取'");
js=js.replace(" const footer=button('返回','modal-close','secondary')+(!catalog?", " const footer=button('返回','modal-close','secondary')+(!catalog?");
js=js.replace("const catalog=S.detailFlow==='catalogue',sold=S.bought.has(c.id)||S.built&&S.detailFlow==='development',can=affordable(c)&&!sold;", "const catalog=S.detailFlow==='catalogue',sold=S.bought.has(c.id)||S.builtCard===c.id&&S.detailFlow==='development',closed=S.built&&S.detailFlow==='development'&&S.builtCard!==c.id,stageLocked=S.detailFlow==='development'&&c.afterStage>6,can=affordable(c)&&!sold&&!closed&&!stageLocked;");
js=js.replace("c.subtype==='eliteOffer'?'挑选精锐':sold?'已获得':affordable(c)?", "c.subtype==='eliteOffer'?'挑选精锐':closed?'本轮已整备':stageLocked?'第 '+c.afterStage+' 关开放':sold?'已获得':affordable(c)?");
js=js.replace("if(!c||!affordable(c)||S.bought.has(c.id)||b.dataset.flow==='development'&&S.built)","if(!c||!affordable(c)||S.bought.has(c.id)||b.dataset.flow==='development'&&(S.built||c.afterStage>6))");
js=js.replace(" return {development,shop,heroes,library,services,details,elitePreview,handle,change};",` function keydown(e){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return false;
  const active=document.activeElement,group=active?.closest('[role=radiogroup]');
  if(!group||!active.matches('[data-action=im-variant]'))return false;
  const buttons=[...group.querySelectorAll('[data-action=im-variant]')],index=buttons.indexOf(active),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1,next=buttons[(index+delta+buttons.length)%buttons.length];
  e.preventDefault();handle('im-variant',next);frame.querySelector('[data-action=im-variant][data-value="'+next.dataset.value+'"]')?.focus({preventScroll:true});return true;
 }
 function configure(params){S.libraryRace=Object.hasOwn(raceNames,params.get('race'))?params.get('race'):state.race;S.group=Object.hasOwn(groupNames,params.get('group'))?params.get('group'):'all';S.query=params.get('query')||'';}
 return {development,shop,heroes,library,services,details,elitePreview,handle,change,keydown,configure};`);
await fs.writeFile(new URL('card-ui-r9.mjs',root),js);
let app=await fs.readFile(new URL('app.mjs',root),'utf8');
app=app.replace("document.addEventListener('keydown',e=>{", "document.addEventListener('keydown',e=>{\n if(intermissionUI.keydown(e))return;");
app=app.replace("go(location.hash.slice(1)||'home',{record:false});", "intermissionUI.configure(params);\ngo(location.hash.slice(1)||'home',{record:false});");
await fs.writeFile(new URL('app.mjs',root),app);
console.log('Updated card state previews and radio keyboard navigation');
