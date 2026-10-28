// Recover a Sites update exceeding the per-push limit without rewriting history.
// Run in the Site checkout; pass credentials only through hidden stdin.
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const [target,base,statePath]=process.argv.slice(2);
if(!target||!base||!path.isAbsolute(statePath??''))throw Error('Provide target SHA, remote baseline SHA and absolute local state path');
const raw=await new Promise(resolve=>{let input='';if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stderr.write('Ready for Site credential JSON on stdin (input is hidden).\n');process.stdin.setEncoding('utf8');process.stdin.on('data',s=>{input+=s;if(/[\r\n]/.test(input)){if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(input.trim());}});process.stdin.resume();});
const credential=JSON.parse(raw),ref='refs/heads/'+credential.branch,indexPath=statePath+'.index';
function git(args,{network=false,index=false,input}={}){
 const env={...process.env,GIT_TERMINAL_PROMPT:'0'};delete env.GIT_INDEX_FILE;
 if(index)env.GIT_INDEX_FILE=indexPath;
 for(const key of Object.keys(env))if(key.startsWith('GIT_TRACE')||key==='GIT_CURL_VERBOSE')delete env[key];
 const auth=[];
 if(network){auth.push('-c','credential.helper=','-c','http.extraHeader=','-c','http.followRedirects=false');if(credential.auth_mode==='http_extra_header'){env.SITES_GIT_AUTHORIZATION='Authorization: Bearer '+credential.token;auth.push('--config-env=http.'+credential.remote_url+'.extraHeader=SITES_GIT_AUTHORIZATION');}}
 const result=spawnSync('git',[...auth,...args],{env,input,encoding:'utf8',maxBuffer:8*1024*1024});
 if(result.status!==0)throw Error((result.stderr||'Git failed').split(credential.token||'\0').join('[redacted]'));
 return result.stdout.trim();
}
try{
 if(git(['status','--porcelain']))throw Error('Preserve existing modifications; Site checkout must be clean');
 let state;
 if(existsSync(statePath)){state=JSON.parse(readFileSync(statePath,'utf8'));if(state.target!==target||state.base!==base)throw Error('Batch state does not match this update');}
 else{
  const remote=git(['ls-remote','--heads',credential.remote_url,ref],{network:true}).split(/\s+/)[0];
  if(remote!==base)throw Error('Remote baseline changed; reconcile before creating batches');
  const added=new Set(git(['diff','--diff-filter=A','--name-only',base,target,'--','public']).split('\n').filter(Boolean));
  const entries=git(['ls-tree','-r','-l',target,'--','public']).split('\n').map(line=>{const [meta,name]=line.split('\t');const [mode,,sha,size]=meta.trim().split(/\s+/);return{mode,sha,size:Number(size),name};}).filter(e=>added.has(e.name));
  const batches=[];let batch=[],bytes=0;
  for(const entry of entries){if(entry.size>35*1024*1024)throw Error('Individual asset exceeds batching budget');if(batch.length&&bytes+entry.size>35*1024*1024){batches.push(batch);batch=[];bytes=0;}batch.push(entry);bytes+=entry.size;}if(batch.length)batches.push(batch);
  let parent=base;const commits=[];git(['read-tree',base],{index:true});
  for(let i=0;i<batches.length;i++){
   git(['update-index','--index-info'],{index:true,input:batches[i].map(e=>`${e.mode} ${e.sha}\t${e.name}\n`).join('')});
   const tree=git(['write-tree'],{index:true});parent=git(['-c','user.name=Sites','-c','user.email=sites@users.noreply.openai.com','commit-tree',tree,'-p',parent,'-m',`Stage quality resource batch ${i+1}/${batches.length}`]);commits.push(parent);
  }
  const tree=git(['rev-parse',target+'^{tree}']);
  const final=git(['-c','user.name=Sites','-c','user.email=sites@users.noreply.openai.com','commit-tree',tree,'-p',target,'-p',parent,'-m','Complete quality update after batched resource upload']);
  state={target,base,commits,final,tree};writeFileSync(statePath,JSON.stringify(state,null,2));
 }
 let remote=git(['ls-remote','--heads',credential.remote_url,ref],{network:true}).split(/\s+/)[0];
 const chain=[state.base,...state.commits,state.final],position=chain.indexOf(remote);if(position<0)throw Error('Unexpected remote revision; preserve changes and reconcile');
 for(let i=position+1;i<chain.length;i++){git(['push',credential.remote_url,chain[i]+':'+ref],{network:true});console.log(`Uploaded source step ${i}/${chain.length-1}`);}
 if(git(['rev-parse','HEAD'])===target)git(['merge','--ff-only',state.final]);
 if(git(['rev-parse','HEAD'])!==state.final||git(['rev-parse','HEAD^{tree}'])!==state.tree)throw Error('Final checkout identity mismatch');
 console.log(JSON.stringify({commit_sha:state.final,sourceTreeUnchanged:true,batches:state.commits.length}));
 process.exitCode=0;
}catch(error){console.error(String(error));process.exitCode=1;}
finally{process.stdin.destroy();}
