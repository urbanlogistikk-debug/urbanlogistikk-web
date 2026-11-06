import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { validAdmin } from './admin-access';
import { ApiError } from './server-http';

export function requireAdminRequest(request: Request) {
  if (!validAdmin(request.headers.get('authorization'))) throw new ApiError(401, 'Innlogging kreves.');
  return {userId: process.env.ADMIN_USERNAME || 'operator'};
}

export async function requireAdminPage() {
  if (!validAdmin((await headers()).get('authorization'))) notFound();
}
