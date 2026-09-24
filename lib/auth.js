import { cookies } from 'next/headers';

export function isAuthed() {
  return cookies().get('wk_admin')?.value === process.env.ADMIN_PASSWORD;
}
