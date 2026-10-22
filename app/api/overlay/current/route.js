
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

    const selection = [
      ...showFields,
      `sponsor_slots(${slotFields.join(',')})`
    ].join(',');

    const query =
      `shows?channel_slug=eq.${encodeURIComponent(channel)}` +
      `&starts_at=lte.${encodeURIComponent(now)}` +
      `&ends_at=gte.${encodeURIComponent(now)}` +
      `&select=${selection}` +
      `&order=starts_at.desc` +
      `&limit=1`;

    const [rows, houseRows] = await Promise.all([
      sb(query),
      sb(
        `house_ads?channel_slug=eq.${encodeURIComponent(channel)}` +
        `&select=enabled,artwork_url`
      )
    ]);

    const houseAd = houseRows?.[0] || {
      enabled: false,
      artwork_url: null
    };

    if (!rows?.length) {
      return NextResponse.json(
        {
          active: false,
          channel,
          house_ad: houseAd
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      );
    }

    const show = rows[0];

    show.sponsor_slots = (
      show.sponsor_slots || []
    ).sort(
      (a, b) =>
        Number(a.position) - Number(b.position)
    );

    return NextResponse.json(
      {
        active: true,
        channel,
        show,
        house_ad: houseAd
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
