import { inquiryPatchSchema } from '@/lib/server-validation';
import { apiJson, apiFailure, ApiError, checkSameOrigin, readJsonBody } from '@/lib/server-http';
import { requireAdminRequest } from '@/lib/server-auth';
import { database, serializeInquiry, type InquiryRow } from '@/lib/server-db';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
async function selectedId(context:Context){const {id}=await context.params;if(!/^[a-f0-9-]{36}$/i.test(id))throw new ApiError(404,'Forespørselen finnes ikke.');return id;}
export async function GET(request:Request,context:Context) {
 try {requireAdminRequest(request);const id=await selectedId(context);const row=await database().prepare('SELECT * FROM inquiries WHERE id=?').bind(id).first<InquiryRow>();if(!row)throw new ApiError(404,'Forespørselen finnes ikke.');return apiJson(serializeInquiry(row));}catch(error){return apiFailure(error);}
}
export async function PATCH(request:Request,context:Context) {
 try {
  const user=requireAdminRequest(request);checkSameOrigin(request);const id=await selectedId(context);
  const patch=inquiryPatchSchema.parse(await readJsonBody(request));const db=database();
  const existing=await db.prepare('SELECT id FROM inquiries WHERE id=?').bind(id).first();if(!existing)throw new ApiError(404,'Forespørselen finnes ikke.');
  const updates:string[]=[],args:(string|null)[]=[];
  if(patch.status!==undefined){updates.push('status=?');args.push(patch.status);}
  if(patch.notes!==undefined){updates.push('notes=?');args.push(patch.notes);}
  if(patch.followUpDate!==undefined){updates.push('follow_up_date=?');args.push(patch.followUpDate);}
  if(patch.costing!==undefined){updates.push('costing_json=?');args.push(patch.costing?JSON.stringify(patch.costing):null);}
  const now=new Date().toISOString();updates.push('updated_at=?');args.push(now,id);
  await db.batch([
   db.prepare(`UPDATE inquiries SET ${updates.join(',')} WHERE id=?`).bind(...args),
   db.prepare('INSERT INTO inquiry_audit (id,inquiry_id,actor_id,changed_fields,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,user.userId,JSON.stringify(Object.keys(patch)),now),
  ]);
  const row=await db.prepare('SELECT * FROM inquiries WHERE id=?').bind(id).first<InquiryRow>();if(!row)throw new Error('missing_updated_inquiry');return apiJson(serializeInquiry(row));
 }catch(error){return apiFailure(error);}
}
