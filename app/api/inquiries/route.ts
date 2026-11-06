import { inquirySchema } from '@/lib/server-validation';
import { apiJson, apiFailure, ApiError, checkSameOrigin, readJsonBody } from '@/lib/server-http';
import { database, enforceRateLimit, hashText, osloDay } from '@/lib/server-db';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
 try {
  checkSameOrigin(request);
  const input=inquirySchema.parse(await readJsonBody(request));
  if(input.website)throw new ApiError(400,'Forespørselen kunne ikke godtas. Kontakt oss på telefon.');
  const {website:_honeypot,...data}=input;
  const dataJson=JSON.stringify(data),payloadHash=await hashText(dataJson),db=database();
  const existing=await db.prepare('SELECT reference,created_at,payload_hash FROM inquiries WHERE request_key=?').bind(data.requestKey).first<{reference:string;created_at:string;payload_hash:string}>();
  if(existing){if(existing.payload_hash!==payloadHash)throw new ApiError(409,'Denne forespørselen er allerede registrert med andre opplysninger. Last siden på nytt for å sende en ny.');return apiJson({reference:existing.reference,receivedAt:existing.created_at});}
  await enforceRateLimit(request,'inquiry');
  const now=new Date().toISOString(), day=osloDay(),id=crypto.randomUUID();
  const reference=`UL-${day.replaceAll('-','')}-${crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase()}`;
  const source=data.source||data.referrerDomain||'Direkte / ukjent';
  const search=[data.company,data.name,data.email,data.phone,data.pickup,data.deliveryArea,reference].join(' ').toLocaleLowerCase('nb-NO');
  const saved=await db.prepare('INSERT INTO inquiries (id,request_key,reference,payload_hash,kind,source_label,search_text,data_json,status,notes,follow_up_date,costing_json,created_day,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING RETURNING reference,created_at,payload_hash').bind(id,data.requestKey,reference,payloadHash,data.kind,source,search,dataJson,'ny','','',null,day,now,now).first<{reference:string;created_at:string;payload_hash:string}>();
  const result=saved||await db.prepare('SELECT reference,created_at,payload_hash FROM inquiries WHERE request_key=?').bind(data.requestKey).first<{reference:string;created_at:string;payload_hash:string}>();
  if(!result)throw new Error('missing_saved_inquiry');
  if(result.payload_hash!==payloadHash)throw new ApiError(409,'Denne forespørselen er allerede registrert med andre opplysninger.');
  return apiJson({reference:result.reference,receivedAt:result.created_at},saved?201:200);
 }catch(error){return apiFailure(error);}
}
