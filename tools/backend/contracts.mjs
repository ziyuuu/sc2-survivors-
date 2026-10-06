/** Shared transport contract. No browser identifiers are created by importing this module. */
export const CONSENT_VERSION='2026-10-06.1';
export const RETENTION={events:90,runs:180,visitors:365,daily:730,feedback:180,audit:90};
export const RACES=['terran','zerg','protoss'];
export const FAMILIES=['marine','marauder','reaper','hellion','tank','thor','viking','banshee','medivac','science_vessel','zergling','baneling','roach','ravager','hydralisk','queen','lurker','mutalisk','corruptor','ultralisk','zealot','adept','stalker','sentry','immortal','colossus','high_templar','phoenix','void_ray','carrier'];
export const HEROES=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser','kerrigan','zagara','dehaka','stukov','niadra','hots_leviathan','artanis','zeratul','alarak','fenix','vorazun','purifier_flagship'];
export const SUPPORT=['terran.ricochet','terran.bunker','terran.missiles','terran.overdrive','zerg.hatch','zerg.consume','zerg.parasite','zerg.evolve','protoss.reserve','protoss.counter','protoss.echo','protoss.prism',...RACES.flatMap(r=>['mines','bombardment','mutation','strategic'].map(c=>r+'.'+c))];
export const IDENTITIES=new Set([...FAMILIES,...FAMILIES.flatMap(f=>[1,2,3].map(v=>f+'.'+v)),...HEROES,...SUPPORT,'unattributed','natural_regeneration']);
export const EVENT_KINDS=['session_start','load','run_start','run_resume','stage_summary','run_end','heartbeat','card','fault'];
export const FEEDBACK_CATEGORIES=['problem','performance','balance','suggestion','other'];
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const SECRET=/^[A-Za-z0-9_-]{43,86}$/;
export class InputError extends Error {constructor(message='invalid_request'){super(message);this.code=message;this.status=400;}}
export function exact(o,keys){if(!o||Object.getPrototypeOf(o)!==Object.prototype||Object.keys(o).some(k=>!keys.includes(k)))throw new InputError();return o;}
export function textValue(v,min,max,pattern){if(typeof v!=='string'||v.length<min||v.length>max||pattern&&!pattern.test(v))throw new InputError();return v;}
export function numberValue(v,max=1e12,min=0){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new InputError();return v;}
export function oneOf(v,values){if(!values.includes(v))throw new InputError();return v;}
const integer=(v,max,min=0)=>{numberValue(v,max,min);if(!Number.isInteger(v))throw new InputError();return v;};
const boolean=v=>{if(typeof v!=='boolean')throw new InputError();return v;};
const build=v=>textValue(v,1,64,/^(?:[a-f0-9]{64}|development|local)$/);
export function validateSummary(value){const d=exact(value,['race','difficulty','stage','mode','playerLevel','seconds','runSeconds','damage','healed','shieldRestored','deaths','revivals','kills','status','partial','roster','contributions','talents','research','performance']);
 const out={race:oneOf(d.race,RACES),difficulty:oneOf(d.difficulty,['easy','normal','hard','hell']),stage:integer(d.stage,100000,1),mode:oneOf(d.mode,['campaign','endless']),playerLevel:integer(d.playerLevel,80),seconds:numberValue(d.seconds,86400*365),runSeconds:numberValue(d.runSeconds??d.seconds,86400*365),status:oneOf(d.status,['reached','cleared','failed','incomplete','won','evacuated']),partial:boolean(d.partial)};
 for(const k of ['damage','healed','shieldRestored','deaths','revivals','kills'])out[k]=numberValue(d[k]??0);
 for(const key of ['roster','contributions']){const list=d[key]??[];if(!Array.isArray(list)||list.length>160)throw new InputError();const ids=new Set();out[key]=list.map(row=>{exact(row,key==='roster'?['id','rank','count']:['id','damage','healed','shieldRestored','deaths','revivals']);if(!IDENTITIES.has(row.id)||ids.has(row.id))throw new InputError();ids.add(row.id);const r={id:row.id};if(key==='roster'){r.rank=integer(row.rank,7,1);r.count=integer(row.count,250);}else for(const n of ['damage','healed','shieldRestored','deaths','revivals'])r[n]=numberValue(row[n]??0);return r;});}
 for(const key of ['talents','research']){const dict=d[key]??{};if(!dict||Object.getPrototypeOf(dict)!==Object.prototype||Object.keys(dict).length>128)throw new InputError();out[key]={};for(const [id,n]of Object.entries(dict)){textValue(id,1,70,key==='talents'?/^[TZP]-[A-Z][0-9]{2}$/:/^research\.(barracks|factory|starport|zerg\.(basic|evolution|air)|gateway|robotics|stargate)\.(weapon|defense)$/);out[key][id]=integer(n,key==='talents'?10:3);}}
 const p=exact(d.performance??{},['p95','p99','longFrames','frames','peakUnits','backlogDelta']);out.performance={};for(const [k,n]of Object.entries(p))out.performance[k]=numberValue(n,k==='p95'||k==='p99'?60000:k==='backlogDelta'?86400:1e8);
 return out;
}
export function validateEvent(value,now=Date.now()){
 const e=exact(value,['id','sessionId','runId','kind','at','build','release','device','orientation','animation','diagnostic','data']);
 textValue(e.id,1,160,/^[a-f0-9-]{36}(?::(?:stage|start|end):(?:campaign|endless|new):[0-9]+:(?:reached|cleared|failed|incomplete|won|evacuated))?$/i);textValue(e.sessionId,36,36,UUID);if(e.runId!==null)textValue(e.runId,36,36,UUID);
 oneOf(e.kind,EVENT_KINDS);integer(e.at,now+300000,now-86400000);build(e.build);build(e.release);oneOf(e.device,['desktop','mobile']);oneOf(e.orientation,['portrait','landscape']);oneOf(e.animation,['complete','energy-saving']);boolean(e.diagnostic);
 let data;if(['run_start','run_resume','stage_summary','run_end','heartbeat'].includes(e.kind)){if(!e.runId)throw new InputError();data=validateSummary(e.data);}
 else if(e.kind==='session_start'){exact(e.data,[]);data={};}
 else if(e.kind==='load'){const d=exact(e.data,['cold','milliseconds','networkBytes','cacheHits','cacheMisses','failures','parseMs','gpuMs']);data={cold:boolean(d.cold)};for(const k of ['milliseconds','networkBytes','cacheHits','cacheMisses','failures','parseMs','gpuMs'])data[k]=numberValue(d[k]??0,k==='networkBytes'?2e10:1e8);}
 else if(e.kind==='fault'){const d=exact(e.data,['code']);data={code:oneOf(d.code,['asset_load','webgl_lost','save_failed','backend_unavailable','queue_dropped'])};}
 else {const d=exact(e.data,['id','action','quality','level','minerals','gas','mode','stage']);textValue(d.id,1,150,/^[A-Za-z0-9_.:-]+$/);data={id:d.id,action:oneOf(d.action,['shown','purchased','claimed','refreshed','trained','replaced','reinforced']),quality:oneOf(d.quality,['white','green','blue','purple','orange','none']),level:integer(d.level??0,80),minerals:numberValue(d.minerals??0,1e8),gas:numberValue(d.gas??0,1e8),...(d.mode===undefined?{}:{mode:oneOf(d.mode,['campaign','endless']),stage:integer(d.stage,100000,1)})};}
 return {...e,data};
}
export function validateFeedback(value){const d=exact(value,['id','receipt','category','text','contact','summary','consentVersion']);textValue(d.id,36,36,UUID);textValue(d.receipt,43,86,SECRET);oneOf(d.category,FEEDBACK_CATEGORIES);oneOf(d.consentVersion,[CONSENT_VERSION]);textValue(d.text,10,2000);textValue(d.text.trim(),10,2000);textValue(d.contact??'',0,200);let summary=null;
 if(d.summary){const s=exact(d.summary,['build','release','race','difficulty','stage','mode']);summary={build:build(s.build),release:build(s.release),race:oneOf(s.race,RACES),difficulty:oneOf(s.difficulty,['easy','normal','hard','hell']),stage:integer(s.stage,100000),mode:oneOf(s.mode,['campaign','endless'])};}return {...d,text:d.text.trim(),contact:d.contact?.trim()??'',summary};
}
