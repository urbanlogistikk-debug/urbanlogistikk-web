import { createHash, timingSafeEqual } from 'node:crypto';

export function validAdmin(header: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 16 || !header?.startsWith('Basic ')) return false;
  const account = process.env.ADMIN_USERNAME || 'operator';
  const expected = Buffer.from(account + ':' + password);
  const presented = Buffer.from(header.slice(6), 'base64');
  const digest = (input: Buffer) => createHash('sha256').update(input).digest();
  return timingSafeEqual(digest(expected), digest(presented));
}
