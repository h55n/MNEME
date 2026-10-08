import assert from 'node:assert/strict';
assert.equal(process.env.SMOKE_ALLOW_WRITE, "1", "Set SMOKE_ALLOW_WRITE=1 only against a disposable test database");
const base = process.env.SMOKE_API_URL ?? 'http://127.0.0.1:3001';
async function call(path, method='GET', body, key) {
 const res = await fetch(base+path,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(key?{authorization:`Bearer ${key}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:res.status,body:await res.json(),headers:res.headers};
}
assert.equal((await call('/health')).status,200);
assert.equal((await call('/v1/docs')).status,404);
const create=await call('/v1/vaults','POST',{operatorAddress:'smoke-'+Date.now(),name:'Deployment smoke',network:'testnet'});
assert.equal(create.status,201);assert.equal(create.headers.get('cache-control'),'no-store');
const {vault,apiKey}=create.body.data;
const path=`/v1/vaults/${vault.id}`;
try {
 const write=await call(path+'/memories','POST',{content:'The deployment smoke test prefers TypeScript and concise responses.',type:'semantic',task_scope:'deployment'},apiKey);
 assert.equal(write.status,201,JSON.stringify(write.body));const id=write.body.data.memory.id;
 const recall=await call(path+'/memories/recall','POST',{query:'TypeScript responses',task_scope:'deployment',limit:5},apiKey);
 assert.equal(recall.status,200);assert.ok(recall.body.data.memories.some(m=>m.id===id));
 assert.equal((await call(path+'/memories','POST',{content:'unauthenticated'})).status,401);
 assert.equal((await call(path+'/memories/'+id,'DELETE',undefined,apiKey)).status,200);
 assert.equal((await call(path+'/memories/'+id,'DELETE',undefined,apiKey)).status,404);
 console.log('PASS production HTTP: health, docs disabled, signup, real embedding write/recall, unauthorized write, delete and repeated-delete');
} finally {
 const cleanup=await call(path,'DELETE',undefined,apiKey);assert.equal(cleanup.status,200,JSON.stringify(cleanup.body));
 console.log('PASS vault cleanup');
}
