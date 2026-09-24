import { NextResponse } from 'next/server';
import { isAuthed } from '../../../../lib/auth';
import { sb } from '../../../../lib/supabase-rest';

export async function PUT(req, { params }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { slots = [], ...showPatch } = body;
  await sb(`shows?id=eq.${params.id}`, { method: 'PATCH', body: JSON.stringify(showPatch) });
  for (const slot of slots) {
    const { id, ...patch } = slot;
    if (id) await sb(`sponsor_slots?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }
  const full = await sb(`shows?id=eq.${params.id}&select=*,sponsor_slots(*)`);
  return NextResponse.json(full[0]);
}

export async function DELETE(req, { params }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await sb(`shows?id=eq.${params.id}`, { method: 'DELETE' });
  return NextResponse.json({ ok: true });
}
