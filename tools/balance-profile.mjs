/** REVIEW DRAFT. Analysis inputs only; not imported by the game. All values here are Survivors proposals. */
export const BALANCE_VERSION='review-v1-2026-09-21';
export const ECONOMY={start:{minerals:50,gas:0},passive:{minerals:2.5,gas:.6},perScv:{minerals:.4,gas:.1},podArmor:2,landingSeconds:3.266,rescueServiceSeconds:[6,7,8,14,15,16,19,23,21,24,26,28],approachSeconds:[3,3,3,5,5,5,6,6,6,7,7,7]};
export const DROPS={ambient:{zergling:[3,0],roach:[6,3],baneling:[4,2],ravager:[10,5],drone:[30,15]},guard:{zergling:[1,0],roach:[2,1],baneling:[1,1],ravager:[3,2]}};
const stage=(id,name,lingHp,speed,width,waves,ambient,guards,reward,egg,drones,goal)=>({id,name,lingHp,speed,width,waves,ambient,guards,reward,egg,drones,goal,guardRadius:id<=3?4:id<=8?6:8,podHp:[600,900,1200,1500,1800,2100,2400,2400,2400,2400,2400,2400][id-1]});
// Counts are TOTAL per stage, except guards which are per production pod. L/R/B/V order.
export const PROPOSED_STAGES=[
 stage(1,'边境警报',18,1,28,3,[3,0,0,0],[2,0,0,0],[80,30],1,0,'认识射程，救出第一批枪兵'),
 stage(2,'双向夹击',24,1,36,4,[8,0,0,0],[3,0,0,0],[250,125],1,1,'双向交替接敌，选择重工厂'),
 stage(3,'代谢加速',30,1.1,44,5,[15,0,0,0],[5,0,0,0],[300,150],0,1,'速度压力入门，准备医疗线'),
 stage(4,'酸液装甲',35,1.1,52,5,[20,3,0,0],[6,1,0,0],[250,150],1,1,'让恶火或坦克到位再接重甲'),
 stage(5,'地面虫潮',35,1.12,60,6,[32,5,0,0],[8,1,0,0],[250,150],1,1,'穿通道前收拢车队'),
 stage(6,'爆虫冲锋',35,1.12,68,6,[36,6,4,0],[10,1,1,0],[250,175],0,2,'看见爆虫提前分散'),
 stage(7,'孤立降落区',35,1.15,76,6,[42,8,5,0],[12,2,1,0],[200,175],1,2,'舍弃远仓比全队绕图更合理'),
 stage(8,'重甲围攻',35,1.15,84,6,[48,12,6,0],[14,3,1,0],[200,200],1,2,'蟑螂增多，坦克需要前排'),
 stage(9,'离心钩',35,1.18,92,7,[55,12,12,0],[16,3,2,0],[200,200],0,2,'爆虫独立加速，提前转向'),
 stage(10,'腐蚀胆汁',35,1.18,100,7,[60,12,10,4],[18,3,2,1],[225,225],1,2,'躲落点并带走架炮坦克'),
 stage(11,'全兵种虫潮',35,1.2,104,8,[72,16,12,6],[20,4,2,1],[250,225],1,3,'混合夹击中保持医疗距离'),
 stage(12,'摧毁虫巢',35,1.2,112,8,[80,18,16,8],[22,4,3,2],[300,250],0,3,'60 秒内摧毁 2000 HP / 1 护甲虫巢'),
];
export const CARDS={
 shield:{kind:'tech',m:75,g:25},factory:{kind:'build',m:150,g:100,time:60/1.4},starport:{kind:'build',m:150,g:100,time:50/1.4},
 infantry1:{kind:'tech',m:125,g:50},vehicle1:{kind:'tech',m:150,g:50},stim:{kind:'tech',m:150,g:50},discount:{kind:'tech',m:200,g:75},
 infantry2:{kind:'tech',m:250,g:75},medivac:{kind:'tech',m:200,g:75},vehicle2:{kind:'tech',m:300,g:100},infantry3:{kind:'tech',m:350,g:125},
 gas:{kind:'economy',m:25,g:0,gainM:0,gainG:50},minerals:{kind:'economy',m:25,g:0,gainM:100,gainG:0},bundle:{kind:'economy',m:50,g:0,gainM:75,gainG:25},
};
export const CARD_ROUTE=['shield','factory','starport','infantry1','vehicle1','stim','discount','infantry2','medivac','vehicle2','infantry3'];
export const DISCOUNTS=[{off:0,weight:50},{off:.15,weight:30},{off:.30,weight:15},{off:.50,weight:5}];
// Budget sensitivity assumptions, NOT predictions of player win rate. Card draws fixed to compare economy without lucky discounts.
export const BUDGET_SCENARIOS=[
 {id:'careful',kill:.9,pickup:.9,rescue:.85,serviceMultiplier:1,scv:.8,drone:.8,rerolls:0,lossStages:[6,9]},
 {id:'learning',kill:.75,pickup:.8,rescue:.7,serviceMultiplier:1.2,scv:.6,drone:.6,rerolls:0,lossStages:[4,6,8,10,11]},
 {id:'wasteful',kill:.75,pickup:.8,rescue:.5,serviceMultiplier:1.4,scv:.4,drone:.6,rerolls:2,lossStages:[4,6,8,10,11]},
];

// Explicit wave construction preserves exact per-stage budgets and delays new threat introductions.
export function wavePlan(s){
 const times=s.id===1?[8,28,48]:s.id===2?[6,22,38,42]:Array.from({length:s.waves},(_,i)=>Math.round((6+48*i/(s.waves-1))*10)/10);
 const rows=times.map(at=>({at,counts:[0,0,0,0]}));
 s.ambient.forEach((count,type)=>{const first=s.id===4&&type===1?2:s.id===6&&type===2?2:s.id===10&&type===3?2:0;for(let i=0;i<count;i++)rows[first+i%(rows.length-first)].counts[type]++;});
 return rows;
}
