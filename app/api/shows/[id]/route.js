
import { NextResponse } from 'next/server';
import { isAuthed } from '../../../../lib/auth';
import { sb } from '../../../../lib/supabase-rest';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SHOW_FIELDS = [
  'title',
  'starts_at',
  'ends_at',
  'channel_slug',
  'rotation_seconds',
  'slot_price',
  'reach_low',
  'reach_high',
  'exclusive_price',
  'exclusive_mode',
  'exclusive_brand',
  'exclusive_message',
  'exclusive_logo_url'
];

const SLOT_FIELDS = [
  'brand',
  'active',
  'paid'
];

function pickFields(source, allowed) {
  const result = {};

  for (const field of allowed) {
    if (
      Object.prototype.hasOwnProperty.call(source, field) &&
      source[field] !== undefined
    ) {
      result[field] = source[field];
    }
  }

  return result;
}

async function getShowId(context) {
  const params = await context.params;
  return params?.id;
}

export async function PUT(request, context) {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const showId = await getShowId(context);

    if (!UUID_PATTERN.test(showId || '')) {
      return NextResponse.json(
        { error: 'Invalid show ID.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const slotRows = Array.isArray(body.sponsor_slots)
      ? body.sponsor_slots
      : Array.isArray(body.slots)
        ? body.slots
        : [];

    const existing = await sb(
      `shows?id=eq.${showId}&select=id,sponsor_slots(id)`
    );

    if (!existing?.length) {
      return NextResponse.json(
        { error: 'Show not found.' },
        { status: 404 }
      );
    }

    const validSlotIds = new Set(
      (existing[0].sponsor_slots || []).map(slot => slot.id)
    );

    for (const slot of slotRows) {
      if (
        !slot ||
        !UUID_PATTERN.test(slot.id || '') ||
        !validSlotIds.has(slot.id)
      ) {
        return NextResponse.json(
          { error: 'A sponsor slot does not belong to this show.' },
          { status: 400 }
        );
      }
    }

    const showPatch = pickFields(body, SHOW_FIELDS);

    if (Object.keys(showPatch).length > 0) {
      await sb(
        `shows?id=eq.${showId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(showPatch)
        }
      );
    }

    for (const slot of slotRows) {
      const patch = pickFields(slot, SLOT_FIELDS);

      if (Object.keys(patch).length === 0) {
        continue;
      }

      await sb(
        `sponsor_slots?id=eq.${slot.id}&show_id=eq.${showId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch)
        }
      );
    }

    const updated = await sb(
      `shows?id=eq.${showId}&select=*,sponsor_slots(*)`
    );

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('Show update failed:', error);

    return NextResponse.json(
      { error: 'Could not save show.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const showId = await getShowId(context);

    if (!UUID_PATTERN.test(showId || '')) {
      return NextResponse.json(
        { error: 'Invalid show ID.' },
        { status: 400 }
      );
    }

    await sb(
      `shows?id=eq.${showId}`,
      { method: 'DELETE' }
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Show deletion failed:', error);

    return NextResponse.json(
      { error: 'Could not delete show.' },
      { status: 500 }
    );
  }
}
