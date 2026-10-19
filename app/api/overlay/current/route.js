
import { NextResponse } from 'next/server';
import { sb } from '../../../../lib/supabase-rest';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const channel =
      searchParams.get('channel') ||
      process.env.CHANNEL_SLUG ||
      'discount-kicks';

    if (
      channel.length > 100 ||
      !/^[a-zA-Z0-9_-]+$/.test(channel)
    ) {
      return NextResponse.json(
        { error: 'Invalid channel.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Explicitly select public show fields.
    // Never return the complete database record.
    const showFields = [
      'id',
      'title',
      'starts_at',
      'ends_at',
      'channel_slug',
      'rotation_seconds',
      'slot_price',
      'exclusive_mode',
      'exclusive_brand',
      'exclusive_message',
      'exclusive_logo_url'
    ];

    // Keep legacy fields for the existing OBS overlay.
    // Include approved artwork for the new overlay.
    // Never expose pending artwork or token hashes.
    const slotFields = [
      'id',
      'position',
      'brand',
      'message',
      'logo_url',
      'active',
      'paid',
      'artwork_url'
    ];

    const selection =
      `${showFields.join(',')},` +
      `sponsor_slots(${slotFields.join(',')})`;

    const query = new URLSearchParams();

    query.set('channel_slug', `eq.${channel}`);
    query.set('starts_at', `lte.${now}`);
    query.set('ends_at', `gte.${now}`);
    query.set('select', selection);
    query.set('order', 'starts_at.desc');
    query.set('limit', '1');

    const rows = await sb(`shows?${query.toString()}`);

    if (!rows?.length) {
      return NextResponse.json({
        active: false,
        channel
      });
    }

    const show = rows[0];

    show.sponsor_slots = (
      show.sponsor_slots || []
    ).sort(
      (a, b) => Number(a.position) - Number(b.position)
    );

    return NextResponse.json(
      {
        active: true,
        channel,
        show
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );

  } catch (error) {
    console.error('Public overlay API error:', error);

    return NextResponse.json(
      {
        error: 'Unable to load current sponsorship.'
      },
      { status: 500 }
    );
  }
}
