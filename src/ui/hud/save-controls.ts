import type {RunSession} from '../../app/run-session';
import {button,modal} from '../presentation/reference-primitives';
export class SaveControls {
 private exportFailed=false;
 constructor(private session:RunSession,private resume:()=>void,private update:()=>void){}
 get canResume(){return this.session.canResume;}
 get failed(){return !this.session.memoryOnly&&(this.session.saveFailed||/原文件已保留|停止覆盖|无法读取本地存档/.test(this.session.startupNotice));}
 status(_exportAvailable=false){return '';}
 private failureText(){
  const reason=this.session.message||this.session.startupNotice;
  if(/quota|空间|配额/i.test(reason))return '保存失败，存储空间不足。';
  if(/损坏|无法读取|不兼容|原文件已保留|停止覆盖/.test(reason))return '存档无法读取。';
  if(/另一|其他页面|已更新|冲突/.test(reason))return '存档已在其他页面更新。';
  return '保存失败，请重试。';
 }
 failureDialog(){return modal('存档','',`<p role="alert">${this.failureText()}</p>`,'pause-modal save-error-modal',button('重试','save-now','primary',this.session.busy?'disabled':'')+button('设置','settings'),null);}
 render(mode:'menu'|'pause'|'settings'|'reward'|'ended',ready=true){
  if(this.session.memoryOnly||mode!=='settings')return '';
  const s=this.session,canRead=s.world.phase==='menu';
  return `<div class="save-controls" aria-label="存档">${this.failed?`<p role="alert">${this.failureText()}</p>`:''}${this.exportFailed?'<p role="alert">导出失败，请重试。</p>':''}<div class="save-actions">${button('读取存档','menu-load-local','',canRead&&s.canResume&&ready?'':'disabled')}${button('保存进度','save-now','',s.busy?'disabled':'')}${button('导入存档','menu-load-file','',canRead?'':'disabled')}${button('导出存档','save-export')}</div></div>`;
 }
 handle(action:string){
  if(!action.startsWith('save-'))return false;
  if(this.session.memoryOnly&&action!=='save-continue')return true;
  if(action==='save-continue')this.resume();
  else if(action==='save-now')void this.session.saveNow().catch(()=>{});
  else if(action==='save-export'){try{const url=URL.createObjectURL(new Blob([this.session.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sc2-survivors-save-v2.json';a.click();this.exportFailed=false;setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{this.exportFailed=true;}}
  this.update();return true;
 }
}
