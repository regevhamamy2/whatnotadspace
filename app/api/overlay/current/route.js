import { NextResponse } from 'next/server';
import { sb } from '../../../../lib/supabase-rest';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') || process.env.CHANNEL_SLUG || 'discount-kicks';
  const now = new Date().toISOString();
  const q = `shows?channel_slug=eq.${encodeURIComponent(channel)}&starts_at=lte.${encodeURIComponent(now)}&ends_at=gte.${encodeURIComponent(now)}&select=*,sponsor_slots(*)&order=starts_at.desc&limit=1`;
  const rows = await sb(q);
  if (!rows?.length) return NextResponse.json({ active: false, channel });
  const show = rows[0];
  show.sponsor_slots = (show.sponsor_slots || []).sort((a,b) => a.position - b.position);
  return NextResponse.json({ active: true, show });
}
