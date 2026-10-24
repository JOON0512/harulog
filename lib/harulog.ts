export const categories = {
  focus:{name:'집중하는 시간',short:'집중',color:'work'},
  life:{name:'나를 돌보는 시간',short:'일상',color:'life'},
  other:{name:'하고 싶은 일',short:'기타',color:'other'},
} as const;
export type Category = keyof typeof categories;
export type Task = {id:string; title:string; task_date:string; category:Category; visibility:'private'|'friends'; completed:number; created_at:number; updated_at:number};
export type Profile = {id:string; nickname:string; friend_code:string};
export type Friend = {id:string; nickname:string; relation_id:string; status:'pending'|'accepted'; requested_by:string; tasks:Task[]};
export type DayData = {profile:Profile; tasks:Task[]; friends:Friend[]; date:string};
export const weekdays = ['월','화','수','목','금','토','일'];
export function koreaToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function dateObject(date:string){return new Date(date+'T12:00:00Z')}
export function isoDate(d:Date){return d.toISOString().slice(0,10)}
export function shiftDay(date:string,offset:number){const d=dateObject(date); d.setUTCDate(d.getUTCDate()+offset); return isoDate(d)}
export function weekDates(date:string){const d=dateObject(date); const monday=shiftDay(date,-((d.getUTCDay()+6)%7)); return Array.from({length:7},(_,i)=>shiftDay(monday,i))}
export function displayDate(date:string){return new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',month:'long',day:'numeric',weekday:'long'}).format(dateObject(date))}
