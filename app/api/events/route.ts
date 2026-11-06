import { eventSchema } from '@/lib/server-validation';
import { apiFailure, checkSameOrigin, readJsonBody } from '@/lib/server-http';
import { database, enforceRateLimit, osloDay } from '@/lib/server-db';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
 try {
  checkSameOrigin(request);const {path}=eventSchema.parse(await readJsonBody(request,1024));
  await enforceRateLimit(request,'event');const day=osloDay();
  await database().prepare('INSERT INTO daily_page_views (key,day,path,views) VALUES (?,?,?,1) ON CONFLICT(key) DO UPDATE SET views=views+1').bind(`${day}:${path}`,day,path).run();
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch(error){return apiFailure(error);}
}
