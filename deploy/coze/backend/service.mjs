import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from './database.mjs';
import {Repository,ApiError} from './repository.mjs';
import {configFromEnv,RateLimiter,boundedPasswordWork,csvCell} from './security.mjs';
import {CONSENT_VERSION,RETENTION,UUID,SECRET,InputError,exact,textValue,oneOf,FEEDBACK_CATEGORIES} from './contracts.mjs';
import {metrics,parseFilters,refreshDaily,archivedDaily} from './metrics.mjs';
const adminRoot=fileURLToPath(new URL('./admin/',import.meta.url));
const ADMIN_PATH='/sc2-ops-7f3k9m2q',API_PATH='/api/sc2-ops-7f3k9m2q';
const uuid=v=>textValue(v,36,36,UUID),secret=v=>textValue(v,43,86,SECRET);
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
const cookie=(value,secure,clear=false)=>`sc2_admin=${value}; Path=${API_PATH}; HttpOnly; SameSite=Strict; ${secure?'Secure; ':''}Max-Age=${clear?0:28800}`;
const session=req=>String(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sc2_admin='))?.slice(10)??'';
async function body(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new ApiError(415,'json_required');if(Number(req.headers['content-length'])>65536)throw new ApiError(413,'batch_too_large');let size=0;const parts=[];for await(const chunk of req){size+=chunk.length;if(size>65536)throw new ApiError(413,'batch_too_large');parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new InputError();}}
function feedbackFilters(params){const f={};for(const [key,allowed]of [['category',FEEDBACK_CATEGORIES],['status',['new','reviewing','planned','resolved','closed']]])if(params.get(key))f[key]=oneOf(params.get(key),allowed);if(params.get('build'))f.build=textValue(params.get('build'),1,64,/^(?:[a-f0-9]{64}|local|development)$/);for(const key of ['from','to'])if(params.get(key)){const d=textValue(params.get(key),10,10,/^\d{4}-\d{2}-\d{2}$/),t=Date.parse(d+'T00:00:00+08:00');if(!Number.isFinite(t))throw new InputError();f[key]=new Date(t+(key==='to'?86400000:0));}return f;}
function tableCSV(rows){if(!rows.length)return '\uFEFF';const keys=Object.keys(rows[0]);return '\uFEFF'+[keys.map(csvCell).join(','),...rows.map(r=>keys.map(k=>csvCell(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n');}
/** Starts independently of the static game. Unavailable analytics never prevents a game response. */
export function createBackend({config,repository,maintenance=true}={}){
 let cfg,error=false,repo=repository,closed=false,timer,busy=false;const limiter=new RateLimiter();
 try{cfg=config??configFromEnv();}catch{cfg={enabled:false};error=true;}
 const ready=cfg.enabled?(async()=>{if(!repo){const db=await openDatabase(cfg);repo=new Repository(db,{backupDays:cfg.backupDays,journal:cfg.journal});}if(maintenance)await maintain();return true;})().catch((e)=>{error=true;console.error('backend init failed:',e&&(e.stack||e.message||e));return false;}):Promise.resolve(false);
 async function maintain(){if(busy||!repo||closed)return;busy=true;try{await refreshDaily(repo);await repo.maintenance();}finally{busy=false;}}
 if(cfg.enabled&&maintenance){timer=setInterval(()=>{void ready.then(ok=>ok&&maintain()).catch(()=>{});},3600000);timer.unref?.();}
 function publicConfig(){return {enabled:!!cfg.enabled&&!error,version:CONSENT_VERSION,operator:cfg.enabled?cfg.operator:'',contact:cfg.enabled?cfg.contact:'',backupDays:cfg.enabled?cfg.backupDays:null,retention:RETENTION};}
 async function route(req,res,url){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  const name=url.pathname;
  if(name==='/api/config'&&req.method==='GET'){await ready;json(res,200,publicConfig());return;}
  if(name===ADMIN_PATH||name.startsWith(ADMIN_PATH+'/')){
   if(!['GET','HEAD'].includes(req.method))throw new ApiError(405,'method_not_allowed');const file={[ADMIN_PATH]:'index.html',[ADMIN_PATH+'/']:'index.html',[ADMIN_PATH+'/app.js']:'app.js',[ADMIN_PATH+'/style.css']:'style.css'}[name];if(!file)throw new ApiError(404,'not_found');
   res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");const bytes=await fs.readFile(path.join(adminRoot,file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:bytes);return;
  }
  if(!await ready)throw new ApiError(503,'service_unavailable');
  if(!['GET','POST'].includes(req.method))throw new ApiError(405,'method_not_allowed');
  if(req.headers.origin&&req.headers.origin!==cfg.origin||req.headers['sec-fetch-site']==='cross-site')throw new ApiError(403,'origin_rejected');
  const mutation=req.method==='POST';
  if(mutation&&(req.headers.origin!==cfg.origin||req.headers['x-sc2-client']!=='1'))throw new ApiError(403,'origin_rejected');
  const address=req.socket.remoteAddress??'unknown';if(!limiter.allow('all:'+address,300,60000))throw new ApiError(429,'rate_limited');
  const d=mutation?await body(req):null;
  if(name==='/api/telemetry/consent'&&mutation){exact(d,['visitorId','privacySecret','consentId','uploadToken','version']);uuid(d.visitorId);uuid(d.consentId);secret(d.privacySecret);secret(d.uploadToken);textValue(d.version,1,40);if(!limiter.allow('consent:'+address,20,60000))throw new ApiError(429,'rate_limited');json(res,200,await repo.grant(d));return;}
  if(name==='/api/telemetry/batch'&&mutation){exact(d,['events']);const upload=secret(String(req.headers['x-sc2-token']??''));if(!limiter.allow('events:'+upload,20,60000))throw new ApiError(429,'rate_limited');json(res,200,await repo.batch(upload,d.events));return;}
  if(['/api/privacy/withdraw','/api/privacy/delete'].includes(name)&&mutation){exact(d,['visitorId','privacySecret']);uuid(d.visitorId);secret(d.privacySecret);json(res,200,await repo.privacy(d.visitorId,d.privacySecret,name.endsWith('/delete')));return;}
  if(name==='/api/feedback'&&mutation){if(!limiter.allow('feedback:'+address,10,60000))throw new ApiError(429,'rate_limited');json(res,200,await repo.submitFeedback(d));return;}
  if(['/api/feedback/receipt','/api/feedback/delete'].includes(name)&&mutation){exact(d,['id','receipt']);uuid(d.id);secret(d.receipt);json(res,200,await repo.feedbackForReceipt(d.id,d.receipt,name.endsWith('/delete')));return;}
  if(name===API_PATH+'/login'&&mutation){exact(d,['username','password']);textValue(d.username,3,40,/^[a-z0-9][a-z0-9._-]+$/i);textValue(d.password,1,256);if(!limiter.allow('login:'+address,10,900000))throw new ApiError(429,'login_limited');const login=await boundedPasswordWork(()=>repo.login(d.username,d.password));res.setHeader('Set-Cookie',cookie(login.session,cfg.secure));json(res,200,{csrf:login.csrf,user:login.user});return;}
  if(name.startsWith(API_PATH+'/')){
   const user=await repo.admin(session(req),String(req.headers['x-csrf-token']??''),mutation);
   if(name===API_PATH+'/me'&&!mutation){json(res,200,{user});return;}
   if(name===API_PATH+'/logout'&&mutation){exact(d,[]);await repo.logout(session(req),user);res.setHeader('Set-Cookie',cookie('',cfg.secure,true));json(res,200,{loggedOut:true});return;}
   if(name===API_PATH+'/metrics'&&!mutation){json(res,200,await metrics(repo,parseFilters(url.searchParams,repo.now())));return;}
   if(name===API_PATH+'/archive'&&!mutation){json(res,200,{rows:await archivedDaily(repo,parseFilters(url.searchParams,repo.now(),730))});return;}
   if(name===API_PATH+'/feedback'&&!mutation){json(res,200,{rows:await repo.feedbackList(feedbackFilters(url.searchParams))});return;}
   if(name===API_PATH+'/feedback'&&mutation){exact(d,['id','status','priority','tags','note']);uuid(d.id);oneOf(d.status,['new','reviewing','planned','resolved','closed']);oneOf(d.priority,[0,1,2,3]);textValue(d.note,0,2000);if(!Array.isArray(d.tags)||d.tags.length>8)throw new InputError();d.tags.forEach(t=>textValue(t,1,30));json(res,200,await repo.updateFeedback(d.id,d,user));return;}
   if(name===API_PATH+'/export'&&mutation){exact(d,['kind','filters','ids']);oneOf(d.kind,['daily','funnel','usage','builds','cards','load','performance','feedback','contacts','archive']);textValue(d.filters??'',0,2000);let rows;
    if(d.kind==='contacts'){if(!Array.isArray(d.ids)||d.ids.length>500)throw new InputError();d.ids.forEach(uuid);rows=await repo.contacts(d.ids,user);}
    else if(d.kind==='feedback')rows=await repo.feedbackList(feedbackFilters(new URLSearchParams(d.filters)));
    else if(d.kind==='archive')rows=(await archivedDaily(repo,parseFilters(new URLSearchParams(d.filters),repo.now(),730))).map(r=>({...r,scope:'Asia/Shanghai; per-day per-build browser sample; do not sum unique browsers across days/builds'}));
    else {const report=await metrics(repo,parseFilters(new URLSearchParams(d.filters),repo.now()));rows=report[d.kind].map(r=>({...r,sample_runs:report.sampleRuns,scope:report.notes,filters:d.filters??''}));}
    if(d.kind!=='contacts')await repo.audit(user.id,'csv_export',{kind:d.kind,count:rows.length,filters:d.filters??''});res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="sc2-${d.kind}.csv"`});res.end(tableCSV(rows));return;
   }
  }
  throw new ApiError(404,'not_found');
 }
 return {ready,publicConfig,get repository(){return repo;},handle(req,res){let url;try{url=new URL(req.url,'http://localhost');}catch{return false;}if(!url.pathname.startsWith('/api/')&&url.pathname!==ADMIN_PATH&&!url.pathname.startsWith(ADMIN_PATH+'/'))return false;void route(req,res,url).catch(e=>{if(res.headersSent){res.end();return;}const status=Number.isInteger(e.status)?e.status:503;json(res,status,{error:status===503?'service_unavailable':e.code??'invalid_request'});});return true;},async close(){closed=true;if(timer)clearInterval(timer);await ready;if(!repository&&repo)await repo.db.close();}};
}
