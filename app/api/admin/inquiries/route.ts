import type { InquiryPage } from '@/lib/contracts';
import { inquiryListSchema } from '@/lib/server-validation';
import { apiJson, apiFailure } from '@/lib/server-http';
import { requireAdminRequest } from '@/lib/server-auth';
import { database, serializeInquiry, type InquiryRow } from '@/lib/server-db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  requireAdminRequest(request);
  const params=new URL(request.url).searchParams;
  const query=inquiryListSchema.parse({status:params.get('status')||'',kind:params.get('kind')||'',search:params.get('search')||'',page:params.get('page')||1});
  const parts:string[]=[],args:(string|number)[]=[];
  if(query.status){parts.push('status=?');args.push(query.status);}
  if(query.kind){parts.push('kind=?');args.push(query.kind);}
  if(query.search){parts.push("search_text LIKE ? ESCAPE '\\'");args.push(`%${query.search.toLocaleLowerCase('nb-NO').replace(/[\\%_]/g,'\\$&')}%`);}
  const where=parts.length?` WHERE ${parts.join(' AND ')}`:'';const db=database(),pageSize=50;
  const [rows,total]=await Promise.all([
   db.prepare(`SELECT * FROM inquiries${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...args,pageSize,(query.page-1)*pageSize).all<InquiryRow>(),
   db.prepare(`SELECT COUNT(*) AS count FROM inquiries${where}`).bind(...args).first<{count:number}>(),
  ]);
  const result:InquiryPage={items:rows.results.map(serializeInquiry),total:Number(total?.count||0),page:query.page,pageSize};
  return apiJson(result);
 }catch(error){return apiFailure(error);}
}
