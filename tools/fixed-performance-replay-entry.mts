import {World} from '../src/simulation/world';
import {readArchive} from '../src/persistence/archive';
import {encodeGraph} from '../src/persistence/graph-codec';
export function loadWorld(text:string){const b=readArchive(text).bundle,w=new World({race:b.run!.config.race});w.permanentProfile.importJSON(b.profile);w.restoreRun(b.run!);w.paused=false;return w;}
export function advance(w:World,tick:number){
 w.input={x:tick%240<60?.35:tick%240>=120&&tick%240<180?-.35:0,z:tick%240>=60&&tick%240<120?.35:tick%240>=180?-.35:0};
 if(tick%180===0){const polygon=[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}],view={ground:polygon,air:polygon,occludedGround:[],occludedAir:[]};for(const id of w.heroes.keys())w.castHero(id,view);}
 w.step();
}
export function state(w:World){const run=w.captureRun();return JSON.stringify(encodeGraph({config:run.config,map:run.map,state:run.state,profile:w.permanentProfile.exportJSON()}));}
