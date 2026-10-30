import test from 'node:test';
import assert from 'node:assert/strict';
import {TelemetryClient,TELEMETRY_KEYS} from '../src/services/telemetry-client';
import {CONSENT_VERSION} from '../tools/backend/contracts.mjs';

const config={enabled:true,version:CONSENT_VERSION,operator:'test',contact:'test',backupDays:30,retention:{}};
function fixture(storage?:Storage){
 const requests:string[]=[],state={failPrivacy:false};
 const client=new TelemetryClient({storage,protocol:'https:',request:async url=>{
  const path=String(url);requests.push(path);if(path.startsWith('/api/privacy/')&&state.failPrivacy)throw Error('offline');
  return new Response(JSON.stringify(path==='/api/config'?config:{}));
 }});return {client,requests,state};
}

test('consent granted without browser storage can still be withdrawn at the service',async()=>{
 const {client,requests}=fixture();await client.initialize();await client.allow();assert.ok(client.active);
 await client.withdraw();assert.equal(client.active,false);assert.equal(client.sessionId,null);
 assert.equal(requests.filter(p=>p==='/api/privacy/withdraw').length,1);assert.equal(client.pendingPrivacy,false);
});

test('a storage-free failed deletion remains pending and cannot be replaced by reconsent',async()=>{
 const {client,requests,state}=fixture();await client.initialize();await client.allow();state.failPrivacy=true;
 await client.withdraw(true);assert.equal(client.active,false);assert.equal(client.pendingPrivacy,true);
 await assert.rejects(()=>client.allow(),/privacy_pending/);assert.equal(requests.filter(p=>p==='/api/telemetry/consent').length,1);
 await client.withdraw(false);state.failPrivacy=false;await client.retryPrivacy();
 assert.ok(requests.filter(p=>p==='/api/privacy/delete').length>=2);assert.equal(requests.includes('/api/privacy/withdraw'),false);
 assert.equal(client.pendingPrivacy,false);assert.equal(client.identity,null);
});

test('a failed revocation-storage write still sends the requested deletion and retries in memory',async()=>{
 const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{if(k===TELEMETRY_KEYS.revocation)throw Error('quota');map.set(k,v);},removeItem:(k:string)=>map.delete(k)} as unknown as Storage;
 const {client,requests,state}=fixture(storage);await client.initialize();await client.allow();state.failPrivacy=true;
 await client.withdraw(true);assert.equal(client.pendingPrivacy,true);assert.equal(map.has(TELEMETRY_KEYS.revocation),false);
 state.failPrivacy=false;await client.retryPrivacy();assert.equal(requests.filter(p=>p==='/api/privacy/delete').length,2);
 assert.equal(client.pendingPrivacy,false);assert.equal(client.identity,null);
});

test('a completed persisted withdrawal leaves no stale in-memory revocation after another tab reconsents',async()=>{
 const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)} as unknown as Storage;
 const a=fixture(storage),b=fixture(storage);await a.client.initialize();await b.client.initialize();await a.client.allow();await a.client.withdraw();await b.client.allow();a.client.synchronize();
 const count=a.requests.filter(p=>p.startsWith('/api/privacy/')).length;await a.client.retryPrivacy();assert.ok(a.client.active);assert.equal(a.requests.filter(p=>p.startsWith('/api/privacy/')).length,count);
});
