import type {AdminStats,InquiryStatus,InquiryKind} from '@/lib/contracts';
import { apiJson,apiFailure } from '@/lib/server-http';
import { requireAdminRequest } from '@/lib/server-auth';
import { database,osloDay } from '@/lib/server-db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  requireAdminRequest(request);const db=database(),today=osloDay(),month=today.slice(0,7)+'-01';
  const first=new Date(`${today}T12:00:00Z`);first.setUTCDate(first.getUTCDate()-13);const since=first.toISOString().slice(0,10);
  const [totals,views,statuses,sources,kinds,leadDays,viewDays]=await Promise.all([
   db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='ny' THEN 1 ELSE 0 END) AS new_count, SUM(CASE WHEN status IN ('ny','vurderes','tilbud_sendt') THEN 1 ELSE 0 END) AS awaiting_count, SUM(CASE WHEN follow_up_date <> '' AND follow_up_date < ? AND status IN ('ny','vurderes','tilbud_sendt') THEN 1 ELSE 0 END) AS overdue_count, SUM(CASE WHEN created_day >= ? THEN 1 ELSE 0 END) AS month_inquiries, SUM(CASE WHEN status='vunnet' THEN 1 ELSE 0 END) AS won_count FROM inquiries").bind(today,month).first<Record<string,number>>(),
   db.prepare('SELECT COALESCE(SUM(views),0) AS count FROM daily_page_views WHERE day>=?').bind(month).first<{count:number}>(),
   db.prepare('SELECT status,COUNT(*) AS count FROM inquiries GROUP BY status').all<{status:InquiryStatus;count:number}>(),
   db.prepare('SELECT source_label AS source,COUNT(*) AS count FROM inquiries GROUP BY source_label ORDER BY count DESC LIMIT 20').all<{source:string;count:number}>(),
   db.prepare('SELECT kind,COUNT(*) AS count FROM inquiries GROUP BY kind').all<{kind:InquiryKind;count:number}>(),
   db.prepare('SELECT created_day AS day,COUNT(*) AS count FROM inquiries WHERE created_day>=? GROUP BY created_day').bind(since).all<{day:string;count:number}>(),
   db.prepare('SELECT day,SUM(views) AS count FROM daily_page_views WHERE day>=? GROUP BY day').bind(since).all<{day:string;count:number}>(),
  ]);
  const recentDays=[];for(let i=0;i<14;i++){const date=new Date(first);date.setUTCDate(first.getUTCDate()+i);const day=date.toISOString().slice(0,10);recentDays.push({date:day,inquiries:Number(leadDays.results.find(r=>r.day===day)?.count||0),pageViews:Number(viewDays.results.find(r=>r.day===day)?.count||0)});}
  const result:AdminStats={total:Number(totals?.total||0),newCount:Number(totals?.new_count||0),awaitingCount:Number(totals?.awaiting_count||0),overdueCount:Number(totals?.overdue_count||0),monthInquiries:Number(totals?.month_inquiries||0),monthPageViews:Number(views?.count||0),wonCount:Number(totals?.won_count||0),byStatus:statuses.results,bySource:sources.results,byKind:kinds.results,recentDays};
  return apiJson(result);
 }catch(error){return apiFailure(error);}
}
