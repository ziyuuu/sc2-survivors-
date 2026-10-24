import fs from 'node:fs';
import assert from 'node:assert/strict';
import {growthRuntime,OUT} from './lib/g03-growth-runtime.mts';
const mode=process.argv[2]??'original';
const {consumptionController}=await import(mode==='original'?'./lib/g03-consumption-controller.mts':'./lib/g03-consumption-controller-r2.mts');
const r=await growthRuntime('after'),rows:any[]=[];
for(const race of ['terran','zerg','protoss']){
 const w=new r.World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:r.newEquipmentAccount(529)});
 const g=r.grantEquipment(w.starship.account,{template:'module.loan.4',race,slot:'gathering'},'repair-probe',{kind:'warehouse'});assert.ok(g.ok);assert.ok(w.equipItem(g.value.id,'gathering').ok);
 const p=consumptionController(w,r,race,{advance:false});p.initialize();w.start();const permanent=w.allies().find((u:any)=>!u.temporary&&!u.summonOwnerId)!;permanent.hp=permanent.maxHp*.5;
 const temporary=w.addUnit(permanent.unitType,'terran',4,0);temporary.temporary=true;temporary.hp=temporary.maxHp*.5;
 w.endStage();const before={wallet:{...w.wallet},hp:permanent.hp,maxHp:permanent.maxHp},allQuote=w.previewRepair([permanent.id,temporary.id]),legalQuote=w.previewRepair([permanent.id]);
 p.intermission();const repair=p.events.find((e:any)=>e.kind==='repair'&&e.data.ok);
 const pass=!!repair&&repair.data.quote.targetIds.includes(permanent.id)&&!repair.data.quote.targetIds.includes(temporary.id);
 rows.push({race,pass,before,allQuote,legalQuote,repair,after:{wallet:{...w.wallet},hp:permanent.hp,maxHp:permanent.maxHp}});
}
fs.writeFileSync(OUT+'/repair-selection-'+mode+'.json',JSON.stringify({mode,fixture:'Controlled permanent and temporary injured allied units; native repair quotes and purchases, native loan equipment funds. Not a natural campaign result.',rows},null,2));
console.log(JSON.stringify(rows.map(({race,pass,allQuote,legalQuote})=>({race,pass,allQuote,legalQuote})),null,2));if(rows.some(r=>!r.pass))process.exitCode=1;
