import type { Profile, Friend, Task, DayData } from './harulog';
import { database } from '@/db';

export async function ensureProfile(id:string):Promise<Profile>{
  const db=database();
  let profile=await db.prepare('SELECT id,nickname,friend_code FROM profiles WHERE id=?').bind(id).first<Profile>();
  if(profile)return profile;
  const code=crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
  await db.prepare('INSERT INTO profiles(id,nickname,friend_code,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,'',code,Date.now()).run();
  profile=await db.prepare('SELECT id,nickname,friend_code FROM profiles WHERE id=?').bind(id).first<Profile>();
  if(!profile)throw new Error('Profile could not be created');
  return profile;
}

export async function readDay(userId:string,date:string):Promise<DayData>{
  const db=database();
  const profile=await ensureProfile(userId);
  const [own,relations,shared]=await db.batch([
    db.prepare('SELECT id,title,task_date,category,visibility,completed,created_at,updated_at FROM tasks WHERE owner_id=? AND task_date=? ORDER BY created_at,id').bind(userId,date),
    db.prepare(`SELECT p.id,p.nickname,f.id AS relation_id,f.status,f.requested_by FROM friendships f JOIN profiles p ON p.id=CASE WHEN f.user_a=? THEN f.user_b ELSE f.user_a END WHERE f.user_a=? OR f.user_b=? ORDER BY f.created_at DESC`).bind(userId,userId,userId),
    db.prepare(`SELECT t.id,t.owner_id,t.title,t.task_date,t.category,t.visibility,t.completed,t.created_at,t.updated_at FROM tasks t WHERE t.task_date=? AND t.visibility='friends' AND EXISTS (SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.user_a=? AND f.user_b=t.owner_id) OR (f.user_b=? AND f.user_a=t.owner_id))) ORDER BY t.created_at,t.id`).bind(date,userId,userId),
  ]);
  const sharedTasks=shared.results as (Task&{owner_id:string})[];
  const friends=(relations.results as Omit<Friend,'tasks'>[]).map(f=>({...f,tasks:sharedTasks.filter(t=>t.owner_id===f.id).map(({owner_id,...t})=>t)}));
  return {profile,tasks:own.results as Task[],friends,date};
}
