import type {World} from '../world';
import type {HeroId} from '../../data/heroes';
import type {EliteId} from '../../data/elites';
import {applySupply} from '../progression/supply-cards';
import {collectMapReinforcement,draftContext} from '../expedition-economy';
import {canClaimTalentLoot} from '../progression/expedition-drafts';
import {acquireEliteImmediately} from '../elite-claim';
export function claimEquipmentCard(w:World,id:string,variant?:EliteId,targetId?:number){if(!['battle','reward'].includes(w.phase))return false;const card=w.starship.cards.find(c=>c.id===id);if(!card||!canClaimTalentLoot(draftContext(w),card.reward))return false;const effect=card.reward.expeditionEffect;let ok=false;
 if(effect.kind==='hero')ok=w.acquireHero(effect.heroId as HeroId);
 else if(effect.kind==='elite'){const selected=w.resolveEliteVariant(effect.family,variant??card.variant);ok=!!selected&&acquireEliteImmediately(w,selected,targetId);}
 else if(effect.kind==='supply')ok=applySupply(w,effect.family,effect.count,effect.mode,{minerals:0,gas:0});
 else ok=collectMapReinforcement(w,card.reward);
 if(ok){w.starship.cards=w.starship.cards.filter(c=>c!==card);w.changed();}return ok;
}
