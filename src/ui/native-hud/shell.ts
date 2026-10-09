import type {World} from '../../simulation/world';
import type {HudMode} from './frames';
import {mapFrame,controlFrame} from './frames';
import {activeSkin,nativeArt} from './skins';
import {glyph,image} from '../presentation/reference-primitives';
export class NativeHudShell {
 private key='';private frame:HTMLElement;private utilities:HTMLElement;
 constructor(private root:HTMLElement,private map:HTMLElement,private world:World){
  root.classList.add('native-hud');document.body.classList.add('native-hud');
  this.frame=document.createElement('div');this.frame.className='native-map-frame';map.prepend(this.frame);
  this.utilities=document.createElement('nav');this.utilities.className='native-map-utilities';this.utilities.setAttribute('aria-label','战场功能');
  this.utilities.innerHTML=[['settings','设置',glyph('gear')],['battle-progress','强化一览',image('tech.attack')],['battle-base','生产管理',image('building.barracks')],['battle-talents','本局天赋',glyph('hex')]].map(([action,label,art])=>`<button data-action="${action}" aria-label="${label}" title="${label}"><span class="native-control-frame"></span><span class="native-utility-icon">${art}</span><span class="native-utility-label">${label}</span></button>`).join('');map.append(this.utilities);
 }
 update(mode:HudMode){const w=this.world,s=activeSkin(w.permanentProfile,w.phase==='menu'?w.permanentProfile.activeRace:w.expedition.race),key=mode+'/'+s.id;this.root.dataset.hudMode=mode;this.root.dataset.hudSkin=s.id;if(this.key===key)return;this.key=key;this.frame.innerHTML=mapFrame(s,mode);this.root.style.setProperty('--hud-accent',s.accent);this.root.style.setProperty('--native-command-art',`url('${nativeArt('ui_console_commandbutton_normal_default'+s.race)}')`);this.root.style.setProperty('--native-health-art',`url('${nativeArt('ui_ingame_lotv_healthbar')}')`);this.root.style.setProperty('--native-energy-art',`url('${nativeArt('ui_ingame_lotv_energybar')}')`);for(const frame of this.utilities.querySelectorAll('.native-control-frame'))frame.innerHTML=controlFrame(s);}
}
