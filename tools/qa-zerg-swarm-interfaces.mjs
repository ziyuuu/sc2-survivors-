/** Reproducible documentation/source-declaration audit; this does not run the game. */
import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest=JSON.parse(readFileSync(resolve(root,'docs/project/zerg-swarm-interface-map-20261120.json'),'utf8'));
const read=path=>readFileSync(resolve(root,path),'utf8');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const issues=[];
const requireCondition=(ok,message)=>{if(!ok)issues.push(message);};
const review=read(manifest.review), spec=read(manifest.spec);
const headings=[...review.matchAll(/^### ([WGBPNO]\d{2}) (.+)$/gm)];
const expected={W:9,G:9,B:9,P:6,N:9,O:3};
const distribution={};
const sourceKeys=new Set(manifest.sources.map(source=>source.key));
const scenarios=new Set([...spec.matchAll(/^\| (S\d{2}) \|/gm)].map(match=>match[1]));
const anchorLocations=[];
let nonOrangeTierRows=0, declarationCount=0;

requireCondition(manifest.cards.length===45,'Manifest must contain 45 cards');
requireCondition(new Set(manifest.cards.map(card=>card.id)).size===45,'Duplicate card IDs');
requireCondition(headings.length===45,'Review must contain 45 card sections');
requireCondition(manifest.approval.values==='confirmed'&&review.includes('已确认'),'Approval record missing');
requireCondition(review.includes('物理普攻主目标命中'),'W03 physical hit correction missing');
const physical=manifest.physicalWeaponPolicy;
requireCondition(manifest.approval.physicalBoundary==='confirmed-physical-weapons-only','Physical weapon boundary must be confirmed');
requireCondition(!Object.hasOwn(manifest.approval,'workingAssumption'),'Obsolete physical classification assumption remains');
requireCondition(manifest.approval.userPhysicalClarification==='仅爪击、骨刺等物理武器；酸液／毒液普攻也排除','User physical clarification missing');
requireCondition(physical?.status==='specified-not-wired','Physical policy must not claim runtime wiring');
requireCondition(physical?.defaultEligible===false&&physical?.acidPoisonBasicAttackEligible===false,'Unknown or acid/poison weapon eligibility is not excluded');
requireCondition(physical?.weaponKeySnapshot==='at-launch','Weapon identity must be frozen at launch');
requireCondition(Array.isArray(physical?.allowedWeaponKeys)&&physical.allowedWeaponKeys.length>0,'Physical weapon whitelist missing');
for(const key of physical?.allowedWeaponKeys??[])requireCondition(spec.includes('`'+key+'`'),'Undocumented physical weapon key '+key);
for(const key of physical?.explicitlyExcludedWeaponKeys??[]){
 requireCondition(!physical?.allowedWeaponKeys?.includes(key),'Weapon allowed and excluded '+key);
 requireCondition(spec.includes('`'+key+'`'),'Undocumented excluded weapon key '+key);
}
requireCondition(physical?.explicitlyExcludedWeaponKeys?.includes('queen/AcidSpines'),'Queen acid weapon exclusion missing');
requireCondition(JSON.stringify(physical?.passiveCards)==='["W03","B03","N05"]','Passive spores must share eligibility');
requireCondition(JSON.stringify(physical?.explicitSporeCards)==='["G07","P05"]','Explicit spore cast exceptions missing');
requireCondition(physical?.deathHatchRequiresPhysicalKillingBlow===false,'Marked enemy death must not require a physical killing blow');
requireCondition(review.includes('酸液／毒液普攻不触发')&&spec.includes('酸液／毒液普攻也排除'),'Acid/poison exclusion missing from documents');
requireCondition(manifest.branch==='zerg-swarm'&&manifest.runtimePath==='expedition.zergSwarm','Branch namespace collision');
requireCondition(scenarios.size===42,'Expected 42 future runtime acceptance scenarios');
requireCondition(sourceKeys.size===manifest.sources.length,'Duplicate source anchor keys');

for(const source of manifest.sources){
 if(!existsSync(resolve(root,source.path))){issues.push('Missing source: '+source.path);continue;}
 const content=read(source.path);
 for(const symbol of source.symbols??[]){
  const pattern=new RegExp('^(?:export\\s+)?(?:(?:declare|abstract)\\s+)?(?:class|interface|type|function|const|let|enum)\\s+'+escape(symbol)+'\\b','m');
  const match=pattern.exec(content);
  requireCondition(!!match,'Missing declaration '+source.path+' :: '+symbol);
  if(match){declarationCount++;anchorLocations.push({source:source.key,symbol,line:content.slice(0,match.index).split('\n').length});}
 }
 for(const member of source.members??[]){
  const pattern=new RegExp('^[ \\t]*(?:(?:private|public|protected|static|async|override)\\s+)*'+escape(member)+'\\s*(?:\\(|=)','m');
  const match=pattern.exec(content);
  requireCondition(!!match,'Missing member '+source.path+' :: '+member);
  if(match){declarationCount++;anchorLocations.push({source:source.key,symbol:member,line:content.slice(0,match.index).split('\n').length});}
 }
}

for(const card of manifest.cards){
 const index=headings.findIndex(match=>match[1]===card.localId);
 if(index<0){issues.push('Missing review card '+card.localId);continue;}
 const heading=headings[index];
 const section=review.slice(heading.index,headings[index+1]?.index??review.length);
 const name=heading[2].replace(/\s*★\s*$/,'').trim();
 requireCondition(name===card.name,'Name mismatch '+card.localId);
 requireCondition(card.id===manifest.prefix+card.localId,'ID prefix mismatch '+card.localId);
 const kind=card.localId[0];distribution[kind]=(distribution[kind]??0)+1;
 if(kind==='O'){
  requireCondition(card.maxRank===1&&section.includes('不可复选'),'Orange repeat rule '+card.localId);
 }else{
  const levels=[...section.matchAll(/^\| ([123]) \|/gm)].map(match=>+match[1]);
  nonOrangeTierRows+=levels.length;
  requireCondition(card.maxRank===3&&JSON.stringify(levels)==='[1,2,3]','Three tiers missing '+card.localId);
 }
 requireCondition(section.includes('CD')&&section.includes('军衔')&&(section.includes('寿命')||section.includes('持续')),'Incomplete card fields '+card.localId);
 requireCondition(card.ports.length>0&&card.ports.every(port=>sourceKeys.has(port)),'Unknown source port '+card.localId);
 requireCondition(card.plannedHandlers.length>0&&card.plannedHandlers.every(handler=>spec.includes('`'+handler+'`')),'Undocumented planned handler '+card.localId);
 requireCondition(card.acceptance.length>0&&card.acceptance.every(id=>scenarios.has(id)),'Unknown acceptance case '+card.localId);
 requireCondition(new RegExp('^\\| '+escape(card.localId)+' \\|','m').test(spec),'Missing implementation mapping row '+card.localId);
}
for(const [kind,count] of Object.entries(expected))requireCondition(distribution[kind]===count,'Quality count '+kind);
requireCondition(nonOrangeTierRows===126,'Expected 126 non-orange final tier rows');
requireCondition(headings.filter(match=>match[2].includes('★')).length===25,'Expected 25 added cards');
requireCondition(manifest.sharedAcceptance.every(id=>scenarios.has(id)),'Unknown shared acceptance case');

const runSource=read('src/simulation/persistence/run-snapshot.ts');
const currentRunSchema=Number(/export const RUN_SCHEMA\s*=\s*(\d+)/.exec(runSource)?.[1]);
requireCondition(currentRunSchema===manifest.reviewedRunSchema,'Run schema changed; re-review the migration plan');

const result={kind:'static-source-and-document-audit',gameplayImplemented:false,gameplayTested:false,
 cards:manifest.cards.length,distribution,nonOrangeTierRows,orangeSingle:3,
 sourceFiles:manifest.sources.length,sourceDeclarations:declarationCount,futureRuntimeCases:scenarios.size,
 currentRunSchema,plannedRunSchema:manifest.plannedRunSchema,
 physicalBoundary:manifest.approval.physicalBoundary,physicalWeaponKeys:physical?.allowedWeaponKeys?.length??0,issues};
if(process.argv.includes('--anchors'))result.anchors=anchorLocations;
console.log(JSON.stringify(result,null,2));
if(issues.length)process.exitCode=1;
