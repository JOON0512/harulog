import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db';
import { ensureProfile,readDay } from '@/lib/store';
import { koreaToday } from '@/lib/harulog';
import { daySchema,taskCreateSchema,taskUpdateSchema,idSchema,profileSchema,friendSchema } from '@/lib/validation';
import { ZodError } from 'zod';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
type Context={params:Promise<{resource:string}>};

async function handle(request:Request,context:Context){
  try {
    const {resource}=await context.params;
    if(!['day','tasks','friends','profile'].includes(resource))throw new ApiError(404,'찾을 수 없는 요청이에요.');
    const user=await getChatGPTUser();
    if(!user)throw new ApiError(401,'로그인이 필요해요. 다시 로그인해 주세요.');
    const db=database();
    if(request.method==='GET'){
      if(resource!=='day')throw new ApiError(405,'지원하지 않는 요청이에요.');
      const date=daySchema.parse(new URL(request.url).searchParams.get('date')??koreaToday());
      return json(await readDay(user.userId,date));
    }
    const origin=request.headers.get('origin');
    if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))throw new ApiError(403,'현재 화면에서 다시 시도해 주세요.');
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'요청 형식을 확인해 주세요.');
    if(Number(request.headers.get('content-length')??0)>4096)throw new ApiError(413,'입력 내용이 너무 길어요.');
    const text=await request.text();
    if(text.length>4096)throw new ApiError(413,'입력 내용이 너무 길어요.');
    let body:unknown;try{body=JSON.parse(text)}catch{throw new ApiError(400,'입력 내용을 확인해 주세요.')}
    await ensureProfile(user.userId);
    if(resource==='profile'&&request.method==='PATCH'){
      const {nickname}=profileSchema.parse(body);
      await db.prepare('UPDATE profiles SET nickname=? WHERE id=?').bind(nickname,user.userId).run();
      return json({ok:true});
    }
    if(resource==='tasks'){
      if(request.method==='POST'){
        const v=taskCreateSchema.parse(body);const now=Date.now();
        await db.prepare('INSERT INTO tasks(id,owner_id,title,task_date,category,visibility,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,0,?,?) ON CONFLICT(id) DO NOTHING').bind(v.id,user.userId,v.title,v.date,v.category,v.visibility,now,now).run();
        const stored=await db.prepare('SELECT id FROM tasks WHERE id=? AND owner_id=?').bind(v.id,user.userId).first();
        if(!stored)throw new ApiError(409,'다시 시도해 주세요.');
        return json({ok:true,id:v.id},201);
      }
      if(request.method==='PATCH'){
        const v=taskUpdateSchema.parse(body);
        const result=await db.prepare('UPDATE tasks SET title=COALESCE(?,title),task_date=COALESCE(?,task_date),category=COALESCE(?,category),visibility=COALESCE(?,visibility),completed=COALESCE(?,completed),updated_at=? WHERE id=? AND owner_id=?').bind(v.title??null,v.date??null,v.category??null,v.visibility??null,v.completed===undefined?null:Number(v.completed),Date.now(),v.id,user.userId).run();
        if(!result.meta.changes)throw new ApiError(404,'할 일을 찾을 수 없어요. 새로고침해 주세요.');
        return json({ok:true});
      }
      if(request.method==='DELETE'){
        const {id}=idSchema.parse(body);
        const result=await db.prepare('DELETE FROM tasks WHERE id=? AND owner_id=?').bind(id,user.userId).run();
        if(!result.meta.changes)throw new ApiError(404,'할 일을 찾을 수 없어요.');
        return json({ok:true});
      }
    }
    if(resource==='friends'){
      if(request.method==='POST'){
        const {code}=friendSchema.parse(body);
        const other=await db.prepare('SELECT id FROM profiles WHERE friend_code=?').bind(code).first<{id:string}>();
        if(!other)throw new ApiError(404,'친구 코드를 다시 확인해 주세요. 친구가 먼저 로그인해야 해요.');
        if(other.id===user.userId)throw new ApiError(400,'내 코드는 친구에게 전달해 주세요.');
        const [a,b]=[user.userId,other.id].sort();
        const existing=await db.prepare('SELECT status FROM friendships WHERE user_a=? AND user_b=?').bind(a,b).first<{status:string}>();
        if(existing)throw new ApiError(409,existing.status==='accepted'?'이미 친구로 연결되어 있어요.':'이미 친구 요청이 있어요. 받은 요청을 확인해 주세요.');
        await db.prepare('INSERT INTO friendships(id,user_a,user_b,requested_by,status,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_a,user_b) DO NOTHING').bind(crypto.randomUUID(),a,b,user.userId,'pending',Date.now()).run();
        return json({ok:true},201);
      }
      if(request.method==='PATCH'){
        const {id}=idSchema.parse(body);
        const result=await db.prepare("UPDATE friendships SET status='accepted' WHERE id=? AND status='pending' AND requested_by<>? AND (user_a=? OR user_b=?)").bind(id,user.userId,user.userId,user.userId).run();
        if(!result.meta.changes)throw new ApiError(404,'수락할 요청을 찾을 수 없어요.');
        return json({ok:true});
      }
      if(request.method==='DELETE'){
        const {id}=idSchema.parse(body);
        const result=await db.prepare('DELETE FROM friendships WHERE id=? AND (user_a=? OR user_b=?)').bind(id,user.userId,user.userId).run();
        if(!result.meta.changes)throw new ApiError(404,'친구 연결을 찾을 수 없어요.');
        return json({ok:true});
      }
    }
    throw new ApiError(405,'지원하지 않는 요청이에요.');
  }catch(error){
    if(error instanceof ApiError)return json({error:error.message},error.status);
    if(error instanceof ZodError)return json({error:'입력 내용을 확인해 주세요. 할 일은 160자, 닉네임은 20자까지 적을 수 있어요.'},400);
    console.error('Harulog request failed',error);
    return json({error:'저장소에 연결하지 못했어요. 입력한 내용은 그대로 두고 잠시 후 다시 시도해 주세요.'},503);
  }
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
