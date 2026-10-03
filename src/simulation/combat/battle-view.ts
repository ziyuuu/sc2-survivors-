import type {Point,Body} from '../types';
export interface BattleView {ground:Point[];air:Point[];occludedGround:Point[][];occludedAir:Point[][]}
const polygon=(p:Point[])=>Array.isArray(p)&&p.length===4&&p.every(v=>Number.isFinite(v?.x)&&Number.isFinite(v?.z))&&Math.abs(p.reduce((a,v,i)=>a+v.x*p[(i+1)%4].z-v.z*p[(i+1)%4].x,0))>1e-6;
export function validBattleView(v:BattleView|undefined):v is BattleView{return !!v&&polygon(v.ground)&&polygon(v.air)&&[v.occludedGround,v.occludedAir].every(list=>Array.isArray(list)&&list.length<=32&&list.every(polygon));}
function contains(p:Point[],a:Point){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i].z>a.z)!==(p[j].z>a.z)&&a.x<(p[j].x-p[i].x)*(a.z-p[i].z)/(p[j].z-p[i].z)+p[i].x)inside=!inside;}return inside;}
export function pointInBattleView(v:BattleView,b:Pick<Body,'x'|'z'|'flying'>){return contains(b.flying?v.air:v.ground,b)&&!(b.flying?v.occludedAir:v.occludedGround).some(p=>contains(p,b));}
