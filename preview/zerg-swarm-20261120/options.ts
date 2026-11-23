import {ZERG_SWARM_BY_ID,isZswId,type ZswCardId} from '../../src/data/zerg-swarm';
import {HERO_IDS_BY_RACE,type HeroId} from '../../src/data/heroes';

export const cardGroups={W:'白卡',G:'绿卡',B:'蓝卡',P:'普通紫卡',N:'紫色节点',O:'橙色节点'} as const;
export const heroOptions:readonly HeroId[]=HERO_IDS_BY_RACE.zerg;
export const rankName=(rank:number)=>['基础对照','Ⅰ档','Ⅱ档','Ⅲ档'][rank];

export interface ShowcaseOption {
 id:ZswCardId;
 rank:number;
 hero:HeroId;
 cargo:'delivery'|'overflow';
}

export function readOption(query:URLSearchParams):ShowcaseOption{
 const choice=query.get('card'),id=isZswId(choice)?choice:'ZSW-W02';
 const rank=Number(query.get('rank')??1);
 const hero=heroOptions.find(id=>id===query.get('hero'))??heroOptions[0];
 return {id,rank:Number.isInteger(rank)&&rank>=0&&rank<=ZERG_SWARM_BY_ID[id].maxRank?rank:1,
  hero,cargo:query.get('cargo')==='overflow'?'overflow':'delivery'};
}

export function optionQuery(id:ZswCardId,rank:number,extra?:Partial<ShowcaseOption>){
 const query=new URLSearchParams({card:id,rank:String(rank)});
 if(id==='ZSW-O01'&&extra?.hero)query.set('hero',extra.hero);
 if(id==='ZSW-G01'&&extra?.cargo)query.set('cargo',extra.cargo);
 return '?'+query;
}
