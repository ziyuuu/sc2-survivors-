import type {RunSession} from '../../app/run-session';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class SaveControls {
 constructor(private session:RunSession,private resume:()=>void,private update:()=>void){}
 get canResume(){return this.session.canResume;}
 render(mode:'menu'|'pause'|'settings'|'reward'|'ended',ready=true){
  const s=this.session,menu=mode==='menu',stamp=s.savedAt?new Date(s.savedAt).toLocaleString('zh-CN',{hour12:false}):'尚未保存';
  const base=`<div class="save-controls" aria-label="存档"><div class="save-actions">${menu&&s.canResume?`<button class="primary" data-action="save-continue" ${ready?'':'disabled'}>继续战局 · ${escape(s.summary)}</button>`:''}${!menu?`<button data-action="save-now" ${s.busy?'disabled':''}>${s.busy?'保存中…':'保存进度'}</button>`:''}<button data-action="save-export">导出完整存档</button>${menu?'<button data-action="save-import">导入完整存档</button>':''}</div><small>最近保存：${escape(stamp)}</small>${s.message?`<p role="status">${escape(s.message)}</p>`:''}</div>`;return base;
 }
 handle(action:string){
  if(!action.startsWith('save-'))return false;
  if(action==='save-continue')this.resume();
  else if(action==='save-now')void this.session.saveNow().catch(()=>{});
  else if(action==='save-export'){try{const url=URL.createObjectURL(new Blob([this.session.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sc2-survivors-save-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){this.session.message=String((e as Error).message);}}
  else if(action==='save-import'){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>32*1024*1024)throw Error('存档文件过大');this.session.importJSON(await file.text());}catch(e){this.session.message=String((e as Error).message);}this.update();});input.click();}
  this.update();return true;
 }
}
