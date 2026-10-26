import type {World} from '../../src/simulation/world';
import type {Entity} from '../../src/simulation/types';
import type {FamilyId} from '../../src/data/races';
import {currentFamilyMode} from '../../src/simulation/combat/family-actions';

/** Enter an alternate form with the real command and simulation before observation. */
export function prepareActorMode(w:World,u:Entity,mode:string,step=()=>w.step()){
 const before={time:w.time,tick:w.tick,mode:currentFamilyMode(u)},paused=w.paused;
 w.expedition.tech['unlock.hellion']=1;w.paused=false;
 try{
  if(!w.setFamilyMode(u.unitType as FamilyId,mode))throw Error('原生形态准备被拒绝：'+mode);
  let steps=0;
  while(currentFamilyMode(u)!==mode||u.modeTimer>0||u.nativeModeUntil!==undefined){
   if(++steps>600)throw Error('原生形态准备超时：'+mode);step();
   if(w.phase!=='battle'||u.hp<=0)throw Error('原生形态准备中战局结束');
  }
  return {scope:'载入前以原生命令完成变形；本条观察变形后的动作，变形过程另有独立用例。',before,after:{time:w.time,tick:w.tick,mode:currentFamilyMode(u)},steps};
 }finally{w.paused=paused;}
}
