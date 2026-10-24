/**
 * Run against a LOCAL built Worker only, after building and applying local migrations:
 * HARULOG_TEST_URL=http://127.0.0.1:8787 node tests/api-security.mjs
 *
 * The local Worker has no Sites gateway, so this test supplies gateway identity headers
 * for three synthetic accounts. In production only the Sites gateway may supply them.
 * No real identities or production records are used.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base=new URL(process.env.HARULOG_TEST_URL??'http://127.0.0.1:8787');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Tests only run on loopback');
const namespace='test_'+randomUUID();const a=namespace+'_a',b=namespace+'_b',c=namespace+'_c';const date='2026-09-20';
let assertions=0;
function ok(value,message){assert.ok(value,message);assertions++}
function eq(actual,expected,message){assert.deepEqual(actual,expected,message);assertions++}
async function api(user,resource,method='GET',body,extra={}){
  const headers={...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'}:{}),...(body?{'Content-Type':'application/json','Origin':base.origin}:{}),...extra};
  const response=await fetch(new URL('/api/'+resource,base),{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();return {status:response.status,data,headers:response.headers};
}
const day=user=>api(user,'day?date='+date);
const makeTask=(title,visibility='private',taskDate=date)=>({id:randomUUID(),title,visibility,category:'focus',date:taskDate});
const missing=await day(null);eq(missing.status,401,'Anonymous read blocked');
eq((await api(null,'tasks','POST',makeTask('anonymous'))).status,401,'Anonymous write blocked');
eq((await api(null,'day','GET',undefined,{'oai-authenticated-user-id':a})).status,401,'Incomplete identity rejected');
const A=(await day(a)).data.profile;const B=(await day(b)).data.profile;await day(c);
ok(A.friend_code!==B.friend_code,'Distinct friend codes');
eq((await api(a,'profile','PATCH',{nickname:'검증 계정 A'})).status,200,'Nickname can be updated');
const priv=makeTask('A의 비공개 기록');const shared=makeTask('A의 친구 공개 기록','friends');const tomorrow=makeTask('다음 날 기록','friends','2026-09-21');
for(const task of [priv,shared,tomorrow])eq((await api(a,'tasks','POST',task)).status,201,'Task created');
eq((await api(a,'tasks','POST',priv)).status,201,'Retried create is idempotent');
eq((await day(a)).data.tasks.length,2,'Date filter and idempotency');
eq((await day(b)).data.tasks.length,0,'Other account sees no owner tasks');
eq((await api(b,'tasks','PATCH',{id:priv.id,title:'unauthorized'})).status,404,'Cross-account edit denied');
eq((await api(b,'tasks','DELETE',{id:priv.id})).status,404,'Cross-account deletion denied');
eq((await api(a,'tasks','POST',{...makeTask(''),ownerId:b})).status,400,'Unknown ownership input rejected');
eq((await api(a,'tasks','POST',makeTask('x'.repeat(161)))).status,400,'Length validation');
eq((await api(a,'tasks','POST',makeTask('Invalid date','private','2026-02-30'))).status,400,'Invalid calendar date rejected');
eq((await api(a,'day?date=invalid')).status,400,'Invalid date query rejected');
eq((await api(a,'tasks','POST',makeTask('Cross site'),{'Origin':'https://untrusted.example'})).status,403,'Cross-origin write blocked');
eq((await api(a,'tasks','POST',makeTask('Cross site'),{'Sec-Fetch-Site':'cross-site'})).status,403,'Cross-site write blocked');
eq((await api(a,'tasks','POST',makeTask('Wrong type'),{'Content-Type':'text/plain'})).status,415,'Non-JSON write blocked');
eq((await api(a,'friends','POST',{code:A.friend_code})).status,400,'Self invitation blocked');
eq((await api(a,'friends','POST',{code:B.friend_code})).status,201,'Friend request sent');
eq((await api(a,'friends','POST',{code:B.friend_code})).status,409,'Duplicate friend request blocked');
let bd=(await day(b)).data;eq(bd.friends[0].tasks.length,0,'Pending friendship cannot read shared tasks');
const relation=bd.friends[0].relation_id;
eq((await api(a,'friends','PATCH',{id:relation})).status,404,'Sender cannot accept own request');
eq((await api(c,'friends','PATCH',{id:relation})).status,404,'Stranger cannot accept request');
eq((await api(c,'friends','DELETE',{id:relation})).status,404,'Stranger cannot remove relation');
eq((await api(b,'friends','PATCH',{id:relation})).status,200,'Recipient can accept request');
bd=(await day(b)).data;eq(bd.friends[0].tasks.map(t=>t.id),[shared.id],'Accepted friend sees only shared records for selected day');
ok(!JSON.stringify(bd).includes(priv.title),'Private text absent from entire friend response');
eq((await day(c)).data.friends.length,0,'Stranger has no access to friendship or shared tasks');
eq((await api(a,'tasks','PATCH',{id:shared.id,completed:true})).status,200,'Complete task');
eq((await day(b)).data.friends[0].tasks[0].completed,1,'Friend sees persisted completion');
eq((await api(a,'tasks','PATCH',{id:shared.id,visibility:'private'})).status,200,'Change to private');
eq((await day(b)).data.friends[0].tasks.length,0,'Privacy change immediately revokes reads');
await api(a,'tasks','PATCH',{id:shared.id,visibility:'friends',title:'수정한 공개 기록'});
eq((await day(b)).data.friends[0].tasks[0].title,'수정한 공개 기록','Edited title persists');
eq((await api(b,'friends','DELETE',{id:relation})).status,200,'Friend can remove connection');
eq((await day(b)).data.friends.length,0,'Removing friend revokes shared-record access');
for(const task of [priv,shared,tomorrow])eq((await api(a,'tasks','DELETE',{id:task.id})).status,200,'Owner can delete task');
eq((await day(a)).data.tasks.length,0,'Owner deletions persisted');
ok((await day(a)).headers.get('cache-control')?.includes('no-store'),'Personal data responses are not cached');
console.log(`PASS: ${assertions} authentication, privacy, friendship, validation, and persistence assertions`);
