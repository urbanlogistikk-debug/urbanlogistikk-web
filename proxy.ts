import { NextResponse, type NextRequest } from 'next/server';
import { apiFailure, ApiError, checkSameOrigin, readJsonBody } from './lib/server-http';
import { validAdmin } from './lib/admin-access';

const storageService = 'https://urbanlogistikk-web-73o7.onrender.com';
const publicPaths = new Set(['/api/inquiries', '/api/events', '/health']);

function isDocumentNavigation(request: NextRequest) {
  const mode = request.headers.get('sec-fetch-mode');
  const purpose = [request.headers.get('purpose'), request.headers.get('sec-purpose')].join(' ');
  return !(  request.headers.has('rsc')
    || request.headers.has('next-router-prefetch')
    || request.headers.has('next-router-segment-prefetch')
    || purpose.includes('prefetch')
    || (mode !== null && mode !== 'navigate'));
}

async function forwardPublic(request: NextRequest, path: string) {
  const isHealth = path === '/health';
  const allowed = isHealth ? ['GET', 'HEAD'] : ['POST'];
  if (!allowed.includes(request.method)) return new Response(null, {status: 405, headers: {Allow: allowed.join(', ')}});

  const headers = new Headers();
  let body: string | undefined;
  if (!isHealth) {
    checkSameOrigin(request);
    body = JSON.stringify(await readJsonBody(request, path === '/api/events' ? 1024 : 32768));
    headers.set('Content-Type', 'application/json');
    headers.set('Origin', storageService);
  }
  const upstream = await fetch(storageService + path, {
    method: request.method, headers, body, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000)
  });
  const type = upstream.headers.get('content-type') ?? '';
  if (!isHealth && upstream.status !== 204 && !type.startsWith('application/json')) {
    throw new ApiError(503, 'Tjenesten er midlertidig utilgjengelig.');
  }
  const responseHeaders = new Headers({'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
  if (type) responseHeaders.set('Content-Type', type);
  return new Response(upstream.body, {status: upstream.status, headers: responseHeaders});
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const bridge = process.env.URBAN_BACKEND_ORIGIN;
  if (bridge) {
    if (bridge !== storageService || process.env.RENDER_EXTERNAL_URL === storageService) {
      return new Response('Ugyldig oppsett.', {status: 503, headers: {'Cache-Control':'no-store'}});
    }
    if (publicPaths.has(path)) {
      try {
        return await forwardPublic(request, path);
      } catch (error) {
        return apiFailure(error instanceof ApiError ? error : new ApiError(503, 'Tjenesten er midlertidig utilgjengelig.'));
      }
    }
    if (path === '/admin' && request.method === 'GET' && isDocumentNavigation(request)) {
      return NextResponse.redirect(storageService + '/admin', {status: 303, headers: {'Cache-Control':'no-store'}});
    }
    return new Response(null, {status: 403, headers: {'Cache-Control': 'no-store'}});
  }
  if (publicPaths.has(path)) return NextResponse.next();
  if (validAdmin(request.headers.get('authorization'))) return NextResponse.next();

  const headers = new Headers({'Cache-Control': 'no-store'});
  if (request.method === 'GET' && request.nextUrl.pathname === '/admin' && isDocumentNavigation(request)) {
    headers.set('WWW-Authenticate', 'Basic realm="Urban Logistikk", charset="UTF-8"');
  }
  return new NextResponse('Innlogging kreves.', {status: 401, headers});
}

export const config = {matcher: ['/admin/:path*', '/api/admin/:path*', '/api/inquiries', '/api/events', '/health']};
