
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { isAuthed } from '../../../../lib/auth';
import { sb } from '../../../../lib/supabase-rest';

export const runtime = 'nodejs';

const CHANNEL = 'discount-kicks';
const MAX_SIZE = 5 * 1024 * 1024;
const WIDTH = 1020;
const HEIGHT = 260;

const TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

function imageDimensions(bytes, type) {
  try {
    if (type === 'image/png') {
      if (
        bytes.length < 24 ||
        bytes.toString('hex', 0, 8) !==
          '89504e470d0a1a0a' ||
        bytes.toString('ascii', 12, 16) !== 'IHDR'
      ) return null;

      return {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20)
      };
    }

    if (type === 'image/jpeg') {
      if (
        bytes.length < 4 ||
        bytes[0] !== 0xff ||
        bytes[1] !== 0xd8 ||
        bytes[2] !== 0xff
      ) return null;

      let offset = 2;

      while (offset + 4 <= bytes.length) {
        if (bytes[offset] !== 0xff) return null;

        while (
          offset < bytes.length &&
          bytes[offset] === 0xff
        ) offset++;

        if (offset >= bytes.length) return null;

        const marker = bytes[offset++];

        if (marker === 0xd9 || marker === 0xda) break;

        if (
          marker === 0x01 ||
          (marker >= 0xd0 && marker <= 0xd7)
        ) continue;

        if (offset + 2 > bytes.length) return null;

        const length = bytes.readUInt16BE(offset);

        if (
          length < 2 ||
          offset + length > bytes.length
        ) return null;

        if ([
          0xc0, 0xc1, 0xc2, 0xc3,
          0xc5, 0xc6, 0xc7,
          0xc9, 0xca, 0xcb,
          0xcd, 0xce, 0xcf
        ].includes(marker)) {
          if (length < 7) return null;

          return {
            height: bytes.readUInt16BE(offset + 3),
            width: bytes.readUInt16BE(offset + 5)
          };
        }

        offset += length;
      }

      return null;
    }

    if (type === 'image/webp') {
      if (
        bytes.length < 30 ||
        bytes.toString('ascii', 0, 4) !== 'RIFF' ||
        bytes.toString('ascii', 8, 12) !== 'WEBP'
      ) return null;

      const chunk = bytes.toString('ascii', 12, 16);

      if (chunk === 'VP8X') {
        return {
          width: 1 + bytes.readUIntLE(24, 3),
          height: 1 + bytes.readUIntLE(27, 3)
        };
      }

      if (chunk === 'VP8L') {
        if (bytes[20] !== 0x2f) return null;

        return {
          width:
            1 + (((bytes[22] & 0x3f) << 8) | bytes[21]),
          height:
            1 + (
              ((bytes[24] & 0x0f) << 10) |
              (bytes[23] << 2) |
              ((bytes[22] & 0xc0) >> 6)
            )
        };
      }

      if (chunk === 'VP8 ') {
        if (
          bytes[23] !== 0x9d ||
          bytes[24] !== 0x01 ||
          bytes[25] !== 0x2a
        ) return null;

        return {
          width: bytes.readUInt16LE(26) & 0x3fff,
          height: bytes.readUInt16LE(28) & 0x3fff
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    if (!await isAuthed()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const form = await request.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Please select an image.' },
        { status: 400 }
      );
    }

    if (
      !TYPES[file.type] ||
      file.size === 0 ||
      file.size > MAX_SIZE
    ) {
      return NextResponse.json(
        {
          error: 'Upload a PNG, JPG, or WEBP image up to 5 MB.'
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dimensions = imageDimensions(bytes, file.type);

    if (!dimensions) {
      return NextResponse.json(
        { error: 'Invalid or unsupported image file.' },
        { status: 400 }
      );
    }

    if (
      dimensions.width !== WIDTH ||
      dimensions.height !== HEIGHT
    ) {
      return NextResponse.json(
        {
          error:
            `Image is ${dimensions.width} x ${dimensions.height}. ` +
            `Required: ${WIDTH} x ${HEIGHT} pixels.`
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.SUPABASE_URL
      ?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!baseUrl || !key) {
      throw new Error('Supabase configuration missing.');
    }

    const filename =
      `house-ads/${CHANNEL}/${randomUUID()}.${TYPES[file.type]}`;

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
      throw new Error(`Storage upload failed: ${upload.status}`);
    }

    const publicUrl =
      `${baseUrl}/storage/v1/object/public/` +
      `sponsor-logos/${filename}`;

    const updated = await sb(
      `house_ads?channel_slug=eq.${CHANNEL}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          artwork_url: publicUrl,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updated?.length) {
      throw new Error('House ad database record not found.');
    }

    return NextResponse.json({
      ok: true,
      house_ad: updated[0]
    });

  } catch (error) {
    console.error('House ad upload failed:', error);

    return NextResponse.json(
      { error: 'Could not upload house advertisement.' },
      { status: 500 }
    );
  }
}
