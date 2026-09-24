import { NextResponse } from 'next/server';
import { isAuthed } from '../../../../lib/auth';
import { sb } from '../../../../lib/supabase-rest';

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shows = await sb('shows?select=*,sponsor_slots(*)&order=starts_at.asc');
  return NextResponse.json(shows);
}

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const channel = body.channel_slug || process.env.CHANNEL_SLUG || 'discount-kicks';
  const created = await sb('shows', {
    method: 'POST',
    body: JSON.stringify({
      channel_slug: channel,
      title: body.title || 'Whatnot Live Show',
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      rotation_seconds: Number(body.rotation_seconds || 20),
      slot_price: Number(body.slot_price || 250),
      reach_low: Number(body.reach_low || 12000),
      reach_high: Number(body.reach_high || 15000),
      exclusive_price: Number(body.exclusive_price || 2000),
      status: 'scheduled'
    })
  });
  const show = created[0];
  const slots = Array.from({ length: 10 }, (_, i) => ({ show_id: show.id, position: i + 1, active: false, paid: false }));
  await sb('sponsor_slots', { method: 'POST', body: JSON.stringify(slots) });
  const full = await sb(`shows?id=eq.${show.id}&select=*,sponsor_slots(*)`);
  return NextResponse.json(full[0]);
}
