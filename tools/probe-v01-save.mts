import fs from 'node:fs/promises';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository} from '../src/persistence/save-repository';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {campaignTerrain} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {BUILDS,createCampaignController} from './qa-campaign-controller';
const base='reports/local/v01-20261024',raw=await fs.readFile(base+'/save-probe-r1/current.json','utf8'),bundle=readArchive(raw).bundle,snap=bundle.run!;
const world=new World({seed:529,race:'terran',terrain:campaignTerrain(snap.config.campaignMap!),endlessTerrain:new FlatTerrain(),equipmentAccount:structuredClone(bundle.equipment!)});world.permanentProfile.importJSON(bundle.profile);
const backend={slots:[raw,null,null] as (string|null)[],async read(){return this.slots;},async commit(value:string){this.slots=[value,this.slots[0],this.slots[1]];}},repo=new SaveRepository(backend);await repo.load();
const session=new RunSession(world,repo,{run:snap,savedAt:0,notice:'',progress:bundle.shopProgress,management:bundle.management});if(!session.resume())throw Error('Unable to resume');
const report:any={before:{wallet:world.wallet,round:world.rewardRound,stage:world.stage},failures:[]};
const failure=(session as any).recordSaveFailure.bind(session);(session as any).recordSaveFailure=(error:Error)=>{report.failures.push({message:error.message,stack:error.stack});return failure(error);};
const old=JSON.parse(await fs.readFile(base+'/pilot-terran-r2/report.json','utf8')),events=old.cycles[0].stages[1].events,completedActions=events.filter((e:any)=>e.kind==='development').length;
const controller=createCampaignController(world,BUILDS.find(b=>b.id==='bio')!,undefined,{advanceIntermission:false,completedActions});controller.intermission();
try{await session.saveNow();report.saved=true;}catch(error){report.error=String((error as Error).stack);}
report.completedActions=completedActions;report.actions=controller.events;report.after={wallet:world.wallet,round:world.rewardRound,save:session.report(),paused:world.interfacePaused};
try{const value=session.exportJSON();await fs.writeFile(base+'/save-failure-raw.json',value);readArchive(value);report.readable=true;}catch(error){report.readError=String((error as Error).stack);}
await fs.writeFile(base+'/save-repro.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
