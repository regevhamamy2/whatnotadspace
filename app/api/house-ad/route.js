
import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { sb } from '../../../lib/supabase-rest';

export const dynamic = 'force-dynamic';

const CHANNEL = 'discount-kicks';

export async function GET() {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rows = await sb(
      `house_ads?channel_slug=eq.${CHANNEL}&select=*`
    );

    return NextResponse.json(
      rows?.[0] || {
        channel_slug: CHANNEL,
        enabled: true,
        artwork_url: null
      },
      {
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch (error) {
    console.error('House ad GET failed:', error);
    return NextResponse.json(
      { error: 'Could not load house ad.' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.enabled !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid house ad settings.' },
        { status: 400 }
      );
    }

    const rows = await sb(
      `house_ads?channel_slug=eq.${CHANNEL}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: body.enabled,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!rows?.length) {
      return NextResponse.json(
        { error: 'House ad record not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('House ad PUT failed:', error);
    return NextResponse.json(
      { error: 'Could not update house ad.' },
      { status: 500 }
    );
  }
}
