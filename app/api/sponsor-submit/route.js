
import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { sb } from '../../../lib/supabase-rest';

export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024;

const TYPES = {
  'image/png': { ext: 'png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  'image/jpeg': { ext: 'jpg', signature: [0xff, 0xd8, 0xff] },
  'image/webp': { ext: 'webp' }
};

function isValidImage(bytes, type) {
  const config = TYPES[type];
  if (!config) return false;

  if (type === 'image/webp') {
    return bytes.length >= 12 &&
      Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP';
  }

  return config.signature.every((value, index) => bytes[index] === value);
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const token = form.get('token');
    const file = form.get('file');

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid submission link.' },
        { status: 403 }
      );
    }

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Please select an image.' },
        { status: 400 }
      );
    }

    if (!TYPES[file.type] || file.size === 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Upload a PNG, JPG, or WEBP image smaller than 5 MB.' },
        { status: 400 }
      );
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const matches = await sb(
      `sponsor_slots?submission_token_hash=eq.${tokenHash}&select=id,show_id`
    );

    if (matches.length !== 1) {
      return NextResponse.json(
        { error: 'This submission link is invalid or has been replaced.' },
        { status: 403 }
      );
    }

    const slot = matches[0];
    const bytes = Buffer.from(await file.arrayBuffer());

    if (!isValidImage(bytes, file.type)) {
      return NextResponse.json(
        { error: 'The selected file is not a valid image.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!baseUrl || !key) {
      throw new Error('Supabase configuration is missing.');
    }

    const extension = TYPES[file.type].ext;
    const filename = `artwork/${slot.show_id}/${slot.id}/${randomUUID()}.${extension}`;

    const upload = await fetch(
      `${baseUrl}/storage/v1/object/sponsor-logos/${filename}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': file.type,
          'x-upsert': 'false'
        },
        body: bytes
      }
    );

    if (!upload.ok) {
      throw new Error(`Storage upload failed (${upload.status}).`);
    }

    const publicUrl =
      `${baseUrl}/storage/v1/object/public/sponsor-logos/${filename}`;

    await sb(
      `sponsor_slots?id=eq.${slot.id}&submission_token_hash=eq.${tokenHash}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          pending_artwork_url: publicUrl,
          artwork_status: 'pending'
        })
      }
    );

    return NextResponse.json({
      ok: true,
      message: 'Artwork submitted for approval.'
    });
  } catch (error) {
    console.error('Sponsor submission error:', error);

    return NextResponse.json(
      { error: 'Could not submit artwork. Please try again.' },
      { status: 500 }
    );
  }
}
