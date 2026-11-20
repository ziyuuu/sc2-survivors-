/** Reproducible representative render captures after native scenario advancement. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-integration-20261119',base=process.env.SC2_QA_URL??'http://127.0.0.1:15319';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:1440,height:900}}),report={captures:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});page.on('console',m=>{if(m.type()==='error'&&/Shader Error|GL_INVALID_OPERATION/.test(m.text()))report.errors.push(m.text());});
try{
 await page.goto(base+'/preview/bio-synergy-20261118/',{timeout:180000});await page.waitForFunction(()=>window.bioShowcase?.report().ready||window.bioShowcase?.report().error,null,{timeout:300000});
 for(const [id,seconds] of [['BIO-W01',2],['BIO-G05',2],['BIO-B04',7],['BIO-B05',2],['BIO-N02',1.7],['BIO-O01',12],['BIO-O02',3],['BIO-O03',3]]){
  const result=await page.evaluate(async({id,seconds})=>{await window.bioShowcase.load(id,1);return window.bioShowcase.advance(seconds);},{id,seconds});assert.equal(result.error,'');assert.deepEqual(result.models,[]);await page.screenshot({path:out+'/'+id+'.png'});report.captures.push({id,seconds,damage:result.damage,healed:result.healed,units:result.units.map(u=>({type:u.unit,hero:u.hero,role:u.role,hp:u.hp}))});
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}finally{await browser.close();await fs.writeFile(out+'/visual.json',JSON.stringify(report,null,2));console.log(JSON.stringify({captures:report.captures.length,errors:report.errors,failure:report.failure}));}
