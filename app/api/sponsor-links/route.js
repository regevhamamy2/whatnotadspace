
import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { isAuthed } from '../../../lib/auth';
import { sb } from '../../../lib/supabase-rest';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const slotId = body?.slotId;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof slotId !== 'string' ||
      !uuidPattern.test(slotId)
    ) {
      return NextResponse.json(
        { error: 'Invalid sponsor slot.' },
        { status: 400 }
      );
    }

    const slots = await sb(
      `sponsor_slots?id=eq.${slotId}&select=id`
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

    const updated = await sb(
      `sponsor_slots?id=eq.${slotId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          submission_token_hash: tokenHash,
          submission_token_created_at:
            new Date().toISOString()
        })
      }
    );

    if (!updated?.length) {
      throw new Error('Could not save submission token.');
    }

    const origin = new URL(request.url).origin;

    return NextResponse.json({
      link: `${origin}/sponsor/${token}`
    });

  } catch (error) {
    console.error('Sponsor link generation failed:', error);

    return NextResponse.json(
      { error: 'Could not generate sponsor link.' },
      { status: 500 }
    );
  }
}
