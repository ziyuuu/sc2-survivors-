import './ui/presentation/game-shell.css';
import './ui/presentation/world-labels.css';
import './ui/presentation/text-scale-reference.generated.css';
import {boot} from './app/bootstrap';
import {setTextScale,textScale} from './ui/text-scale';
setTextScale(textScale());
boot().catch(error=>{
 const root=document.querySelector('#interface')!;
 root.innerHTML='<section class="boot-error"><h1>战场载入失败</h1><p class="error-detail"></p><p>请使用支持 WebGL 2 的浏览器。</p></section>';
 root.querySelector('.error-detail')!.textContent=String(error);console.error(error);
});
