import { NextResponse, type NextRequest } from 'next/server';
import { validAdmin } from './lib/admin-access';

export function proxy(request: NextRequest) {
  if (validAdmin(request.headers.get('authorization'))) return NextResponse.next();

  const headers = new Headers({'Cache-Control': 'no-store'});
  const mode = request.headers.get('sec-fetch-mode');
  const purpose = [request.headers.get('purpose'), request.headers.get('sec-purpose')].join(' ');
  const isBackground = request.headers.has('rsc')
    || request.headers.has('next-router-prefetch')
    || request.headers.has('next-router-segment-prefetch')
    || purpose.includes('prefetch')
    || (mode !== null && mode !== 'navigate');
  if (request.method === 'GET' && request.nextUrl.pathname === '/admin' && !isBackground) {
    headers.set('WWW-Authenticate', 'Basic realm="Urban Logistikk", charset="UTF-8"');
  }
  return new NextResponse('Innlogging kreves.', {status: 401, headers});
}

export const config = {matcher: ['/admin/:path*', '/api/admin/:path*']};
