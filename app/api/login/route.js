import { NextResponse } from 'next/server';
export async function POST(req) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('wk_admin', password, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  return res;
}
