import {DOOMSDAY_CARD_BY_ID,type DoomsdayId} from '../../src/data/terran-doomsday';
import {RARITIES} from '../../src/data/rewards';
import {applyDoomsdayPurchase} from '../../src/simulation/combat/doomsday';
import {pendingBuildChoice,prepareArmedChoices,applyArmedPurchase} from '../../src/simulation/combat/armed-support';
import {draftContext} from '../../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectShopWeights,type ExpeditionDraftContext} from '../../src/simulation/progression/expedition-drafts';
import type {World} from '../../src/simulation/world';
import {isDoomsdayId} from '../../src/data/terran-doomsday';
import type {BuildCardId} from '../../src/simulation/progression/build-progress';

function preparePurchases(w:World,ids:readonly BuildCardId[]){
  for(const id of ids){
    const receipt='shop-preview:'+id;
    const ok=isDoomsdayId(id)?applyDoomsdayPurchase(w,id,receipt):applyArmedPurchase(w,id,receipt);
    if(!ok)throw Error('无法准备普通牌 '+id);
  }
  prepareArmedChoices(w);
}

const warmup={
  doomsday:['M-W03','M-B03','M-P01','M-B01','M-W06','M-G02','M-G04','M-W07','M-W02'],
  armed:['W02','W03','W05','W06','W07','W08','W09','G03','G04'],
} as const;
function prepareThreeClaims(w:World,branch:ShopBranch){
  for(let i=0;i<9;i+=3){
    preparePurchases(w,warmup[branch].slice(i,i+3));
    const m=pendingBuildChoice(w);
    if(!m||!w.claimBuildChoice(m.id,w.expedition.shopRevision,m.offers[0]))throw Error('无法准备已领的紫节点');
  }
}

const branchShelves={
  armed:['armed.W01','armed.W04','armed.G01'],
  doomsday:['doomsday.M-W01','doomsday.M-W05','doomsday.M-G01'],
} as const;
export type ShopBranch=keyof typeof branchShelves;

// Steer just the requested branch-card slots. The production shop quotes the entire shelf.
function selectDraws(ctx:ExpeditionDraftContext,ids:readonly string[]){
  const tiers=Object.keys(RARITIES);
  const groups=new Set<string>();
  const draws=ids.map((id,i)=>{
    const pool=inspectShopWeights(ctx,i===0).filter(c=>c.weight>0&&!groups.has(c.group))
      .sort((a,b)=>tiers.indexOf(a.rarity)-tiers.indexOf(b.rarity));
    const at=pool.findIndex(c=>c.id===id);
    if(at<0)throw Error('当前队伍无法取得 '+id);
    groups.add(pool[at].group);
    const sum=(items:typeof pool)=>items.reduce((n,c)=>n+c.weight,0);
    return (sum(pool.slice(0,at))+pool[at].weight/2)/sum(pool);
  });
  const normalDraw=ctx.random;
  ctx.random=()=>draws.shift()??normalDraw();
}

export function prepareShop(w:World,id:DoomsdayId|ShopBranch,afterThreeClaims=false){
  w.start();
  w.missions.enabled=w.encounters.enabled=false;
  const roster=['marine','tank','thor','science_vessel','medivac','hellion','viking','banshee'] as const;
  roster.forEach((type,i)=>w.addUnit(type,'terran',w.anchor.x+(i%4)*1.5,w.anchor.z+2+Math.floor(i/4)*1.5,5));
  w.acquireHero('raynor');
  w.endStage();
  w.wallet={minerals:100000,gas:100000};
  w.rewardRound='random';
  w.expedition.developmentBought=true;
  w.expedition.freePurchasesRemaining=0;
  const branch=id==='armed'||id==='doomsday';
  const purchase=branch?null:DOOMSDAY_CARD_BY_ID[id].purchase;
  if(purchase==='orange'||branch&&afterThreeClaims)prepareThreeClaims(w,branch?id:'doomsday');
  const ctx=draftContext(w);
  const targets=branch?branchShelves[id]:purchase==='node'||purchase==='orange'?[]:['doomsday.'+id];
  if(targets.length)selectDraws(ctx,targets);
  const shelf=drawExpeditionReinforcements(ctx,true);
  if(targets.some((target,i)=>shelf[i]?.id!==target))throw Error('货架未出现指定卡牌');
  w.rewards=shelf;
  if(purchase==='node'||purchase==='orange'){
    preparePurchases(w,['M-W01','M-W05','M-G01']);
    const m=pendingBuildChoice(w);
    if(!m||branch)throw Error('缺少免费节点');
    if(!m.offers.includes(id))m.offers[0]=id;
  }
  w.changed();
}
