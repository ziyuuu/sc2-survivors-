import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {catalogueCards,offerView,restCards,IntermissionNavigation,renderIntermission} from '../src/ui/presentation/intermission';
import {gameText} from '../src/ui/presentation/game-copy';import {MVP_TALENTS} from '../src/data/mvp-talents';import {ELITES} from '../src/data/elites';import {HEROES,type HeroId} from '../src/data/heroes';import {heroAbilityCopy} from '../src/ui/presentation/ability-copy';
import {readArchive} from '../src/persistence/archive';import {encodeGraph} from '../src/persistence/graph-codec';
import {campaignTerrain} from '../src/data/campaign-map';
const out='reports/local/ui-fidelity-round-20261006';
const texts:{id:string;text:string}[]=[];const add=(id:string,text:string)=>texts.push({id,text});
let w=new World({sandbox:true,waves:false,terrain:false});w.start();const frozen=JSON.stringify(encodeGraph(w.captureRun()));
for(const c of catalogueCards(w))add('catalogue:'+c.id,[c.name,c.kicker,c.flavour,c.stat,c.detail].join(' '));
for(const t of MVP_TALENTS)add('talent:'+t.id,gameText(t.description));
for(const [id,e]of Object.entries(ELITES))add('elite:'+id,gameText(e.name+' '+e.description));
for(const id of Object.keys(HEROES)as HeroId[]){const c=heroAbilityCopy(id);add('hero:'+id,gameText(c.active+' '+c.passive));}
assert.equal(JSON.stringify(encodeGraph(w.captureRun())),frozen);
for(const name of ['terran-development','terran-shop','zerg-shop','protoss-shop']){
 const r=readArchive(await fs.readFile('reports/local/ui-fidelity-round-20261006/fixtures/'+name+'.json','utf8')).bundle.run!;w=new World({race:r.config.race,terrain:campaignTerrain(r.config.campaignMap!)});w.restoreRun(r);const before=JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()}));
 for(const q of w.rewards){const c=offerView(w,q);add('offer:'+name+':'+q.offerId,[c.name,c.kicker,c.flavour,c.stat,c.detail].join(' '));}
 for(const c of restCards(w))add('rest:'+name+':'+c.id,[c.name,c.kicker,c.flavour,c.stat,c.detail].join(' '));
 const nav=new IntermissionNavigation();for(const page of ['root','production','rest','heroes','contracts','catalog'] as const){nav.reset();if(page!=='root')nav.push({page});add('screen:'+name+':'+page,renderIntermission(w,'',nav).replace(/<[^>]*>/g,' '));}
 assert.equal(JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),before);
}
const forbidden=/席位|家族槽|三种型号|MVP|TAL-[A-Z]\d|\b[TZP]-[RSAM]\d{2}\b|已批准|静态预览|设计稿|占位|Schema|maprecipe/i;
const findings=texts.filter(x=>forbidden.test(x.text));await fs.writeFile(out+'/player-copy-inventory.json',JSON.stringify(texts,null,2));const result={checked:texts.length,talents:MVP_TALENTS.length,elites:Object.keys(ELITES).length,heroes:Object.keys(HEROES).length,findings,worldAndProfileUnchanged:true};await fs.writeFile(out+'/copy-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(findings.length,0);
