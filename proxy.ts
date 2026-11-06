import { NextResponse, type NextRequest } from 'next/server';
import { validAdmin } from './lib/admin-access';

export function proxy(request: NextRequest) {
  if (validAdmin(request.headers.get('authorization'))) return NextResponse.next();
  return new NextResponse('Innlogging kreves.', {
    status: 401,
    headers: {'WWW-Authenticate': 'Basic realm="Urban Logistikk", charset="UTF-8"', 'Cache-Control': 'no-store'}
  });
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
