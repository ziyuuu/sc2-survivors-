import type {World} from '../../world';
import type {Entity,Body,Point} from '../../types';
import {distance} from '../../movement/steering';
import {meleeApproachGoal,approachRoute,approachSearches} from '../../movement/melee-approach';
import {tacticalIntent} from './intent';

export function attackPosition(w:World,u:Entity,target:Body):{point:Point;arrival:number;ready:boolean}|undefined{
 if(w.canFireAt(u,target))return {point:{x:u.x,z:u.z},arrival:0,ready:true};
 if(!tacticalIntent(w,u).mayPursue)return;
 const goal=w.combatSlots.goal(u,target,w.combatAllies,w.anchor,w.time,w.mapHalf,w.obstacles,w.terrain);
 if(w.combatSlots.unavailable(u.id,target.id,w.time))return;
 if(u.attackRange>=1.5||u.flying)return {point:goal,arrival:distance(u,goal)/Math.max(.01,u.moveSpeed),ready:false};
 const next=meleeApproachGoal(w,u,target,goal),route=approachRoute(w,u);
 if(distance(next,u)<.005&&!route){if(approachSearches(w)<8)w.combatSlots.defer(u.id,target.id,w.time);return;}
 return {point:route?.point??goal,arrival:(route?.length??distance(u,goal))/Math.max(.01,u.moveSpeed),ready:false};
}
