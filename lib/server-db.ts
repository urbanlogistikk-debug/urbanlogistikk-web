import { database } from './sqlite';
export { database };
import type { Inquiry, InquiryInput, InquiryStatus, CostingInput } from './contracts';
import { ApiError } from './server-http';

export function osloDay(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part=(name:string)=>parts.find(p=>p.type===name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export async function hashText(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function enforceRateLimit(request:Request, action:'inquiry'|'event') {
  if(!process.env.FORM_RATE_LIMIT_SECRET)throw new ApiError(503,'Tjenesten er ikke ferdig konfigurert. Kontakt oss på telefon eller e-post.');
  const now=Date.now(), bucket=Math.floor(now/3600000), ip=request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(process.env.FORM_RATE_LIMIT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${action}:${ip}:${bucket}`));
  const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const db=database();
  const result=await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now),
    db.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(id,(bucket+2)*3600000),
  ]);
  const count=Number((result[1].results?.[0] as {hits?:number})?.hits||0);
  const max=action==='inquiry'?(ip==='unknown'?100:20):(ip==='unknown'?1000:240);
  if(count>max)throw new ApiError(429,'For mange forespørsler. Vent en stund eller kontakt oss på telefon.');
}
export type InquiryRow = {
 id:string;request_key:string;reference:string;payload_hash:string;kind:string;source_label:string;search_text:string;
 data_json:string;status:InquiryStatus;notes:string;follow_up_date:string;costing_json:string|null;
 created_day:string;created_at:string;updated_at:string;
};
export function serializeInquiry(row:InquiryRow):Inquiry {
 const data=JSON.parse(row.data_json) as Omit<InquiryInput,'website'>;
 return {...data,id:row.id,requestKey:row.request_key,reference:row.reference,status:row.status,notes:row.notes,
 followUpDate:row.follow_up_date,costing:row.costing_json?JSON.parse(row.costing_json) as CostingInput:null,
 createdAt:row.created_at,updatedAt:row.updated_at};
}
