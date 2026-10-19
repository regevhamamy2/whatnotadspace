
import { NextResponse } from 'next/server';
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

    const { slotId, action } = await request.json();

    if (
      typeof slotId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slotId)
    ) {
      return NextResponse.json(
        { error: 'Invalid sponsor slot.' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid approval action.' },
        { status: 400 }
      );
    }

    const slots = await sb(
      `sponsor_slots?id=eq.${slotId}&select=id,pending_artwork_url,artwork_status`
    );

    const slot = slots?.[0];

    if (!slot || !slot.pending_artwork_url) {
      return NextResponse.json(
        { error: 'No pending artwork found.' },
        { status: 404 }
      );
    }

    if (slot.artwork_status !== 'pending') {
      return NextResponse.json(
        { error: 'Artwork is not awaiting approval.' },
        { status: 409 }
      );
    }

    const patch = action === 'approve'
      ? {
          artwork_url: slot.pending_artwork_url,
          pending_artwork_url: null,
          artwork_status: 'approved'
        }
      : {
          pending_artwork_url: null,
          artwork_status: 'rejected'
        };

    const updated = await sb(
      `sponsor_slots?id=eq.${slotId}&artwork_status=eq.pending&pending_artwork_url=eq.${encodeURIComponent(slot.pending_artwork_url)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      }
    );

    if (!updated?.length) {
      return NextResponse.json(
        { error: 'Artwork changed. Please refresh and try again.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      slot: updated[0]
    });

  } catch (error) {
    console.error('Sponsor approval failed:', error);

    return NextResponse.json(
      { error: 'Could not update artwork approval.' },
      { status: 500 }
    );
  }
}
