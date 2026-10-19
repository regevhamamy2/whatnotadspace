
import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { isAuthed } from '../../../lib/auth';
import { sb } from '../../../lib/supabase-rest';

export async function POST(request) {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slotId } = await request.json();

    if (!slotId || !/^[0-9a-f-]{36}$/i.test(slotId)) {
      return NextResponse.json(
        { error: 'Invalid sponsor slot.' },
        { status: 400 }
      );
    }

    const slots = await sb(
      `sponsor_slots?id=eq.${encodeURIComponent(slotId)}&select=id`
    );

    if (!slots?.length) {
      return NextResponse.json(
        { error: 'Sponsor slot not found.' },
        { status: 404 }
      );
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    await sb(
      `sponsor_slots?id=eq.${encodeURIComponent(slotId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          submission_token_hash: tokenHash,
          submission_token_created_at:
            new Date().toISOString()
        })
      }
    );

    const origin = new URL(request.url).origin;
    const link = `${origin}/sponsor/${token}`;

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Sponsor link generation failed:', error);

    return NextResponse.json(
      { error: 'Could not generate sponsor link.' },
      { status: 500 }
    );
  }
}
