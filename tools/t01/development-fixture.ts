import type {World} from '../../src/simulation/world';
import type {BuildingState} from '../../src/simulation/building/rules';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {beginExpeditionWindow,drawExpeditionDevelopment,type ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import {draftContext} from '../../src/simulation/expedition-economy';
import {syncBuildingViews,syncBuildingWindow} from '../../src/simulation/building/expedition';
export type DevelopmentFixture={state:BuildingState;project:string|null;target?:string;expected:string;provenance:unknown};
export function prepareDevelopment(w:World,data:DevelopmentFixture){
 const b=structuredClone(data.state);w.resetRun('normal');w.starship.account=newEquipmentAccount(529);w.selectRace(b.race);if(!w.start())throw Error('Development scene start');
 w.stage=b.stage;if(b.stage===18){w.phase='won';if(!w.beginEndlessPreparation())throw Error('Endless preparation fixture unavailable');}
 w.phase='reward';w.rewardRound='building';w.wallet={minerals:1e6,gas:1e6};w.paused=true;w.expedition.tech=b.tech;
 beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId);w.expedition.building=b;syncBuildingWindow(w.expedition,b);syncBuildingViews(w.expedition);w.expedition.developmentBought=false;
 // Pin the requested eligible project through the production frozen-target
 // selector; quote generation, prices and purchase validation stay native.
 w.expedition.frozenDevelopmentTarget=data.project;b.frozenTarget=data.project;b.offers={};b.quotes={};
 if(!data.project){w.rewards=[];return null;}
 const quotes=drawExpeditionDevelopment(draftContext(w)) as ExpeditionReward[];w.rewards=quotes;const quote=quotes.find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===data.project);
 if(!quote)throw Error('Current native development quote absent: '+data.expected);return quote;
}
