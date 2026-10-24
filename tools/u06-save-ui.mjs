import fs from 'node:fs';
const p='src/ui/hud/save-controls.ts';
fs.writeFileSync(p,`import type {RunSession} from '../../app/run-session';
import {button,modal} from '../presentation/reference-primitives';
export class SaveControls {
 private exportFailed=false;
 constructor(private session:RunSession,private resume:()=>void,private update:()=>void){}
 get canResume(){return this.session.canResume;}
 get failed(){return !this.session.memoryOnly&&this.session.saveFailed;}
 status(_exportAvailable=false){return '';}
 failureDialog(){return modal('进度未保存','', '<p>暂时无法保存，当前进度仍在本页。</p>','save-error-modal',button('重试','save-now','primary',this.session.busy?'disabled':'')+button('设置','settings'),null);}
 render(mode:'menu'|'pause'|'settings'|'reward'|'ended',ready=true){
  if(this.session.memoryOnly||mode!=='settings')return '';
  const s=this.session;
  return '<div class="save-controls" aria-label="存档">'+(this.failed?'<p role="alert">暂时无法保存，当前进度仍在本页。</p>':'')+(this.exportFailed?'<p role="alert">暂时无法导出，请重试。</p>':'')+'<div class="save-actions">'+button('读取存档','menu-load-local','',s.world.phase==='menu'&&s.canResume&&ready?'':'disabled')+button('保存进度','save-now','',s.busy?'disabled':'')+button('导出存档','save-export')+button('导入存档','menu-load-file','',s.world.phase==='menu'?'':'disabled')+'</div>'+(s.world.phase==='menu'?'':'<p>返回标题后可读取或导入存档。</p>')+'</div>';
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
`);
