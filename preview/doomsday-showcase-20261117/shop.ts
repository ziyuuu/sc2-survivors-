import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/render/scene/battle-distress.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import '../../src/ui/hud/special-stages.css';
import {boot} from '../../src/app/bootstrap';
import {isDoomsdayId} from '../../src/data/terran-doomsday';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {applyDisplayPreferences} from '../../src/ui/display-preferences';
import {finishOpening} from '../../src/ui/presentation/opening';
import {starshipImage} from '../../src/ui/starship/runtime-art';
import {prepareShop} from './shop-fixture';

async function openShop(){
  const query=new URLSearchParams(location.search);
  const id=query.get('card')??query.get('branch')??'doomsday';
  if(id!=='armed'&&id!=='doomsday'&&!isDoomsdayId(id))throw Error('未找到这个货架。');
  applyDisplayPreferences();
  const seed=171145;
  const {world,hud}=await boot({seed,equipmentAccount:newEquipmentAccount(seed),starship:{resolveImage:starshipImage}});
  prepareShop(world,id,query.get('after')==='9');
  hud.update();
}

openShop().catch(error=>{
  finishOpening();
  const root=document.querySelector<HTMLElement>('#interface')!;
  root.innerHTML='<section class="boot-error"><h1>战备补给载入失败</h1><p></p><a href="/preview/doomsday-showcase-20261117/shops.html">返回卡牌目录</a></section>';
  root.querySelector('p')!.textContent=String(error);
});
