import type {BioCard} from '../../data/terran-bio';
import type {CardView} from './reference-card';

export function bioCardView(c:BioCard):CardView{
 const free=c.purchase==='orange'||c.purchase==='node';
 const kind=c.purchase==='orange'?' · 橙色节点':c.purchase==='node'?' · 紫色节点':c.quality==='purple'?' · 普通紫卡':'';
 return {id:'terran:bio.'+c.id,bioId:c.id,race:'terran',ordinaryBranch:free?undefined:'bio',name:c.name,
  rarity:c.quality,kicker:'生化协同'+kind,flavour:'',stat:c.brief,detail:c.detail,icon:'tech.heal',art:'support',
  minerals:c.price[0],gas:c.price[1],free};
}
