import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';

export async function POST(request) {
  try {
    if (!isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No logo file provided.' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Please upload a PNG, JPG, WEBP, or GIF image.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Logo must be smaller than 5 MB.' },
        { status: 400 }
      );
    }

    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'png';

    const filename =
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!baseUrl || !serviceKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    const uploadResponse = await fetch(
      `${baseUrl}/storage/v1/object/sponsor-logos/${filename}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': file.type,
          'x-upsert': 'false'
        },
        body: buffer
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Supabase upload failed: ${errorText}`);
    }

    const publicUrl =
      `${baseUrl}/storage/v1/object/public/sponsor-logos/${filename}`;

    return NextResponse.json({
      url: publicUrl
    });

  } catch (error) {
    console.error('Logo upload failed:', error);

    return NextResponse.json(
      { error: error.message || 'Logo upload failed.' },
      { status: 500 }
    );
  }
}
