import { database } from '@/lib/sqlite';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    if (!process.env.FORM_RATE_LIMIT_SECRET || (process.env.ADMIN_PASSWORD?.length ?? 0) < 16) throw new Error();
    database().prepare('SELECT id FROM inquiries LIMIT 1').first();
    return new Response('ok', {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return new Response('unavailable', {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
