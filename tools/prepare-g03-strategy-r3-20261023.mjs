import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out='reports/local/g03-farm-minor-20261023';
const diagnostic=JSON.parse(fs.readFileSync(out+'/diagnostic/after-spending-protoss-easy-graduation-529.json','utf8'));
for(const f of Object.keys(diagnostic.runtimeBinding.tools)){const dest=out+'/diagnostic/tools/'+f;fs.mkdirSync(path.dirname(dest),{recursive:true});assert(!fs.existsSync(dest));fs.copyFileSync(f,dest);}
let s=fs.readFileSync('tools/lib/g03-consumption-controller-r2.mts','utf8');
function replace(a,b){assert(s.includes(a),a);s=s.replace(a,b);}
replace("import {DEVELOPMENT,seatRecipe}","import {DEVELOPMENT,seatRecipe}");
s="import {productionQuote} from '../../src/simulation/expedition-production';\nimport {BUILDS} from '../qa-campaign-controller';\nimport {distance} from './g03-economy-runtime-tier-objectives-r2.mts';\n"+s;
replace('/** Repair-selection corrected measurement policy. All actions remain native; original policy is retained frozen. */','/** R3 measurement policy: one reinforcement reserve, essential development before optional buys, body diversification and paid-pod protection. Game values unchanged. */');
const start=s.indexOf(' function reserve(){'),end=s.indexOf(' function affordable(',start);assert(start>=0&&end>start);
s=s.slice(0,start)+` const build=BUILDS.find(b=>b.id===({terran:'bio',zerg:'entrench',protoss:'shield'}[race]))!;
 const realUnits=()=>w.allies().filter((u:any)=>!u.temporary&&!u.summonOwnerId&&!u.summonKind);
 const supports=['medivac','science_vessel','sentry','queen'];
 function reserve(){
  const families=[...new Set(Object.values(w.expedition.production).flatMap((p:any)=>p?.outputs??[]))] as any[];
  const pool=families.filter(f=>w.capacity(f)&&!supports.includes(f));
  const starter=race==='protoss'?'zealot':race==='zerg'?'zergling':'marine';
  const prices=(pool.length?pool:[starter]).map(f=>{const q=productionQuote(w,f),width=f==='zergling'?2:1;return {minerals:q.minerals*width,gas:q.gas*width};}).sort((a,b)=>a.minerals+a.gas-b.minerals-b.gas);
  return prices[0];
 }
 function configure(){
  prior.configure();if(!['menu','reward'].includes(w.phase))return;
  const b=w.expedition.building,low=realUnits().filter((u:any)=>!supports.includes(u.unitType)).length<4;
  const transitional=race==='protoss'&&!w.isFamilyAvailable('stalker')&&w.isFamilyAvailable('adept')?['adept']:[];
  const candidates=[...new Set([...build.families,...transitional,race==='zerg'?'zergling':race==='protoss'?'zealot':'marine'])];
  const count=(f:string)=>w.familyUnits(f).length+w.expedition.ledger.filter((j:any)=>j.family===f).reduce((n:number,j:any)=>n+j.passengers.filter((p:any)=>p.status==='waiting'&&p.purpose==='body').length,0);
  for(const g of b.groups){
   const pool=candidates.filter((f:any)=>r.canProduce(b,g,f,w.phase==='reward'?w.stage+1:w.stage)&&w.isFamilyAvailable(f)&&(!low||!supports.includes(f))&&(w.expedition.familySlots.includes(f)||w.expedition.familySlots.length<w.squadCap()||w.expedition.familySlots.some((x:any)=>!build.families.includes(x))));
   const choices=pool.sort((a:any,b:any)=>count(a)-count(b)||candidates.indexOf(a)-candidates.indexOf(b)).slice(0,2);
   assert.ok(w.setBuildingGroupOutputs(g.id,choices));
   for(const f of choices)assert.ok(w.setProductionEnabled(f,w.capacity(f)));
  }
  record('production-plan',{low,groups:structuredClone(b.groups),families:[...w.expedition.familySlots]});
 }
 let protectedPod:number|null=null,lastMove=-100,lastDistance=Infinity,progressAt=0,clearUntil=0;
 function protectDelivery(){
  if(w.specialStages.active||w.stage===18&&!w.endless||((w.difficulty==='hell'||w.endless)&&[...w.expansionHives.values()].some((h:any)=>h.hp>0)))return false;
  if(w.effects.some((e:any)=>e.kind==='bile'&&e.owner==='zerg'&&distance(e.end,w.anchor)<e.radius+1.5))return false;
  const available=w.pods.filter((p:any)=>p.hp>0&&['falling','active','opening'].includes(p.status)&&p.passengers.some((v:any)=>v.status==='waiting'));
  const pod=available.find((p:any)=>p.id===protectedPod)??available.sort((a:any,b:any)=>distance(a,w.anchor)-distance(b,w.anchor)||a.id-b.id)[0];
  if(!pod){protectedPod=null;return false;}
  const d=distance(pod,w.anchor);
  if(protectedPod!==pod.id){protectedPod=pod.id;lastDistance=d;progressAt=w.time;record('protect-pod',{id:pod.id,family:pod.unitType,job:pod.jobId,distance:d});}
  if(d<lastDistance-.5){lastDistance=d;progressAt=w.time;}
  const visible=[...w.entities.values()].filter((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran'));
  const threats=visible.filter((e:any)=>pod.guardianIds.has(e.id)||distance(e,pod)<6+e.unitRadius);
  const fighters=realUnits().filter((u:any)=>u.weaponDamage>0);
  const ready=fighters.filter((u:any)=>threats.some((e:any)=>w.canFireAt(u,e,0)));
  if(threats.length){for(let slot=0;slot<3;slot++)if(w.castHeroSlot(slot))record('pod-hero-skill',slot);if(w.stage>=10&&w.castDetection())record('pod-scan',true);}
  const hold=()=>{if(w.order)w.cancelOrder();};
  if(w.time<clearUntil||ready.length>=Math.max(1,Math.ceil(fighters.length*.6))||d<2.5){hold();return true;}
  if(w.time-progressAt>1.5&&fighters.some((u:any)=>visible.some((e:any)=>w.canFireAt(u,e,0)))){clearUntil=w.time+1;progressAt=clearUntil;hold();record('clear-pod-lane',{id:pod.id});return true;}
  const point={x:pod.x+(w.anchor.x-pod.x)/(d||1)*2,z:pod.z+(w.anchor.z-pod.z)/(d||1)*2};
  if(w.time-lastMove>=.2&&(!w.order||distance(w.order.point,point)>.75)){w.setFamilyMode('tank','tank');w.setFamilyMode('lurker','lurker');if(w.issueMove(point))lastMove=w.time;}
  return true;
 }
`+s.slice(end);
replace("if(e.kind==='funShop')return 500;return 200;", "if(e.kind==='funShop')return core.some(id=>!completed(id))?0:500;return 200;");
replace("if(w.rewardRound==='building')development(keep);shopping(keep);setTarget();prior.configure();", "if(w.rewardRound==='building')development(keep);\n  const next=legalProjects(true)[0],shopKeep=next?{minerals:Math.max(keep.minerals,next.minerals),gas:Math.max(keep.gas,next.gas)}:keep;\n  record('shop-development-reserve',{keep:shopKeep,next:next?.id??null});shopping(shopKeep);setTarget();configure();");
replace("return {...prior,events,prior,initialize:()=>{prior.initialize();setTarget();},intermission,development,shopping,score,reserve};", "return {...prior,events,prior,configure,protectDelivery,initialize:()=>{prior.initialize();setTarget();configure();},intermission,development,shopping,score,reserve};");
assert(!fs.existsSync('tools/lib/g03-consumption-controller-r3.mts'));
fs.writeFileSync('tools/lib/g03-consumption-controller-r3.mts',s);
