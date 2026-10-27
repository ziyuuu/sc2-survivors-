import {eliteGrowth,type Difficulty} from './stages';
import {bossFor,type SpecialType,type EnemyTier} from './enemies';

/** R2, approved 2026-10-16. These replace the former chapter/rank multipliers. */
export const CAMPAIGN_QUANTITY:Record<Difficulty,readonly number[]>={
 easy:[1.35,1.35,1.35,1.35,1.35,1.35],normal:[1.35,1.4,1.45,1.5,1.55,1.6],
 hard:[1.7,1.85,2.05,2.25,2.45,2.65],hell:[2.1,2.35,2.65,2.95,3.25,3.6],
};
export const CAMPAIGN_WAVES:Record<Difficulty,readonly number[]>={
 easy:[6,8,10,12,14,18],normal:[6,9,11,13,15,19],hard:[8,10,12,15,18,23],hell:[9,12,15,18,21,27],
};
export type EnemyDensity=1|0.3|0.5;
/** The scheduled birth, not the eventual admission time. Kept on queued and living bodies. */
export interface EnemySpawnStamp {stage:number;progress:number;endlessSeconds?:number;density:EnemyDensity}
export interface EnemyResourceScale {minerals:number;gas:number}
/** Density companions only yield scaled resources; they never feed kill rewards or growth. */
export const isDensityCompanion=(body:{enemySpawn?:EnemySpawnStamp})=>(body.enemySpawn?.density??1)<1;
export const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
export const linear=(a:number,b:number,p:number)=>a+(b-a)*p;
export const geometric=(a:number,b:number,p:number)=>a*(b/a)**p;
export const campaignProgress=(stage:number,elapsed:number,duration:number)=>clamp01((stage-1+clamp01(elapsed/duration))/18);
export const endlessFrequency=(seconds:number)=>1+.04*Math.min(5,Math.max(0,seconds)/60);
/** Numerical safety ceiling only; no spawn-serial or previous-enemy input. */
export function continuousEndlessGrowth(seconds=0){const x=Math.max(0,seconds)/60;return {health:Math.min(1e100,1.22**x),damage:Math.min(1e100,1.1**x),attackSpeed:Math.min(1.25,1.025**x)};}
export const ORDINARY_CURVES={
 easy:{health:[.8,1.8],damage:[1,1.6],attackSpeed:[1,1.2]},
 normal:{health:[1.1,3.4],damage:[1.05,3.2],attackSpeed:[1.02,1.45]},
 hard:{health:[2,13.52],damage:[1.35,6],attackSpeed:[1.02,1.456]},
 hell:{health:[4,31.2],damage:[2,150/13],attackSpeed:[1.08,1.625]},
} as const;
/** Naked normal opening: the first three stages are a learning window. Restore
 * the existing curve continuously across stages 4–6, without a stage-4 jump.
 * Wave count, density and rewards stay unchanged. */
export function normalIntroPressure(progress:number){const stage=clamp01(progress)*18;return stage<=3?{health:linear(.35,.55,stage/3),damage:linear(.18,.3,stage/3)}:{health:linear(.55,1,clamp01((stage-3)/3)),damage:linear(.3,1,clamp01((stage-3)/3))};}
export function continuousOrdinaryGrowth(difficulty:Difficulty,progress:number,endlessSeconds=0){
 const p=clamp01(progress),c=ORDINARY_CURVES[difficulty],f=difficulty==='normal'?linear:geometric,g=continuousEndlessGrowth(endlessSeconds);
 const intro=difficulty==='normal'?normalIntroPressure(p):{health:1,damage:1};
 return {health:f(c.health[0],c.health[1],p)*g.health*intro.health,damage:f(c.damage[0],c.damage[1],p)*g.damage*intro.damage,attackSpeed:linear(c.attackSpeed[0],c.attackSpeed[1],p)*g.attackSpeed,armor:difficulty==='easy'?0:Math.min(1,1.5*p),move:difficulty==='easy'?1:linear(difficulty==='normal'?1:1.05,difficulty==='hard'?1.12:difficulty==='hell'?1.18:1,p)};
}
export const continuousLingHp=(p:number)=>18*(35/18)**Math.min(1,6*clamp01(p));
export const continuousMainHiveHp=(difficulty:Difficulty,p:number)=>(difficulty==='easy'?9000:12000)*(difficulty==='hard'?geometric(2,5.2,clamp01(p)):difficulty==='hell'?geometric(4,12,clamp01(p)):1);
export const ENDLESS_BOSS_HP:Record<SpecialType,number>={queen:18000,lurker:21600,mutalisk:18000,corruptor:20000,ultralisk:28800,zergling:18000,roach:24000,hydralisk:20000,ravager:24000};
export const ENDLESS_ELITE_HP:Partial<Record<SpecialType,number>>={zergling:1600,roach:4200,hydralisk:2400,ravager:3000};
/** Independent special-role curves. Ordinary rank/health is never multiplied into these. */
export function continuousSpecialProfile(difficulty:Difficulty,type:SpecialType,tier:EnemyTier,stamp:EnemySpawnStamp,base:{hp:number;damage:number;period:number;armor:number}):{hp:number;damage:number;period:number;armor:number;skillDamage:number;level:number;move:number}{
 const p=clamp01(stamp.progress),g=continuousEndlessGrowth(stamp.endlessSeconds),easy=difficulty==='easy',f=difficulty==='normal'||easy?linear:geometric;
 const intro=difficulty==='normal'?normalIntroPressure(p):{health:1,damage:1};
 const hpPressure=(easy?linear(1,1.35,p):f(difficulty==='normal'?1.05:difficulty==='hard'?2:4,difficulty==='normal'?1.3:difficulty==='hard'?5.2:12,p))*intro.health;
 const damagePressure=(easy?linear(1,1.3,p):f(difficulty==='normal'?1.05:difficulty==='hard'?1.35:2,difficulty==='normal'?1:difficulty==='hard'?2.6:5,p))*intro.damage;
 const speedPressure=easy?linear(1,1.12,p):linear(difficulty==='hell'?1.08:1.02,difficulty==='normal'?1:difficulty==='hard'?1.12:1.25,p);
 const boss=tier!=='elite',lord=tier==='lord',data=bossFor(type);
 if(boss){
  const hpBase=linear(data.hp*(easy?.5:.9),ENDLESS_BOSS_HP[type]*(easy?5/9:1),p**(easy?2:3));
  const damage=(easy?1:linear(1,1.2,p))*damagePressure*g.damage*(lord?1.15:1);
  return {hp:Math.min(1e100,hpBase*hpPressure*g.health*(lord?1.3:1)),damage:base.damage*2*damage,period:Math.max(1/60,base.period/((easy?1:linear(1,1.2,p))*speedPressure*g.attackSpeed)),armor:data.armor,skillDamage:damage,level:eliteGrowth(difficulty,stamp.stage).level,move:1};
 }
 const hpStart=(type==='zergling'?18:base.hp)*(type==='roach'?5:3),hpEnd=(ENDLESS_ELITE_HP[type]??base.hp*3*2.1*3.4)*(easy?.5:1);
 const damage=linear(1.3,easy?1.225*1.3*2:1.45*1.3*3,p)*damagePressure*g.damage;
 const speed=linear(1.1,easy?1.1*1.1*1.24:1.2*1.1*1.48,p)*speedPressure*g.attackSpeed;
 const bossProfile=continuousSpecialProfile(difficulty,type,'boss',stamp,base);
 // Elites are short encounters, never miniature bosses with higher sustained output.
 return {hp:Math.min(bossProfile.hp*.3,linear(hpStart,hpEnd,p)*hpPressure*g.health),damage:Math.min(base.damage*damage,bossProfile.damage*.6),period:Math.max(bossProfile.period,base.period/speed),armor:Math.min(data.armor,base.armor+(type==='roach'?3:1)+linear(0,easy?1:2,p)),skillDamage:Math.min(damage,bossProfile.skillDamage*.6),level:eliteGrowth(difficulty,stamp.stage).level,move:type==='zergling'?1.2:type==='roach'?.9:1};
}

/** Structures use their own role, never ordinary density/rank multipliers. */
export function continuousExpansionHp(progress:number,endlessSeconds=0){
 const points=[{p:3/18,hp:3600},{p:6/18,hp:6000},{p:9/18,hp:10000},{p:12/18,hp:16000},{p:1,hp:24000}],p=clamp01(progress);
 let hp=points[0].hp;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(p>=a.p)hp=geometric(a.hp,b.hp,clamp01((p-a.p)/(b.p-a.p)));}
 return Math.min(1e100,hp*continuousEndlessGrowth(endlessSeconds).health);
}
