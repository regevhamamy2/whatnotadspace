
import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { sb } from '../../../lib/supabase-rest';

export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024;
const REQUIRED_WIDTH = 1020;
const REQUIRED_HEIGHT = 200;

const TYPES = {
  'image/png': {
    ext: 'png',
    signature: [
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a
    ]
  },
  'image/jpeg': {
    ext: 'jpg',
    signature: [0xff, 0xd8, 0xff]
  },
  'image/webp': {
    ext: 'webp'
  }
};

function isValidImage(bytes, type) {
  const config = TYPES[type];

  if (!config) return false;

  if (type === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  return (
    bytes.length >= config.signature.length &&
    config.signature.every(
      (value, index) => bytes[index] === value
    )
  );
}

function getPngDimensions(bytes) {
  if (bytes.length < 24) return null;

  if (bytes.toString('ascii', 12, 16) !== 'IHDR') {
    return null;
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function getJpegDimensions(bytes) {
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }

    while (
      offset < bytes.length &&
      bytes[offset] === 0xff
    ) {
      offset++;
    }

    if (offset >= bytes.length) return null;

    const marker = bytes[offset++];

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (marker === 0x01 || (
      marker >= 0xd0 && marker <= 0xd7
    )) {
      continue;
    }

    if (offset + 2 > bytes.length) return null;

    const length = bytes.readUInt16BE(offset);

    if (
      length < 2 ||
      offset + length > bytes.length
    ) {
      return null;
    }

    const isStartOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3,
      0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf
    ].includes(marker);

    if (isStartOfFrame) {
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

function getWebpDimensions(bytes) {
  if (bytes.length < 30) return null;

  const chunk = bytes.toString('ascii', 12, 16);

  if (chunk === 'VP8X') {
    return {
      width:
        1 +
        bytes.readUIntLE(24, 3),
      height:
        1 +
        bytes.readUIntLE(27, 3)
    };
  }

  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null;

    const b1 = bytes[21];
    const b2 = bytes[22];
    const b3 = bytes[23];
    const b4 = bytes[24];

    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height:
        1 +
        (((b4 & 0x0f) << 10) |
          (b3 << 2) |
          ((b2 & 0xc0) >> 6))
    };
  }

  if (chunk === 'VP8 ') {
    if (
      bytes[23] !== 0x9d ||
      bytes[24] !== 0x01 ||
      bytes[25] !== 0x2a
    ) {
      return null;
    }

    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff
    };
  }

  return null;
}

function getImageDimensions(bytes, type) {
  try {
    if (type === 'image/png') {
      return getPngDimensions(bytes);
    }

    if (type === 'image/jpeg') {
      return getJpegDimensions(bytes);
    }

    if (type === 'image/webp') {
      return getWebpDimensions(bytes);
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const token = form.get('token');
    const file = form.get('file');

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
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

    if (
      !TYPES[file.type] ||
      file.size === 0 ||
      file.size > MAX_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            'Upload a PNG, JPG, or WEBP image smaller than 5 MB.'
        },
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
        {
          error:
            'This submission link is invalid or has been replaced.'
        },
        { status: 403 }
      );
    }

    const slot = matches[0];
    const bytes = Buffer.from(
      await file.arrayBuffer()
    );

    if (!isValidImage(bytes, file.type)) {
      return NextResponse.json(
        {
          error:
            'The selected file is not a valid image.'
        },
        { status: 400 }
      );
    }

    // SERVER-SIDE IMAGE DIMENSION VALIDATION
    const dimensions = getImageDimensions(
      bytes,
      file.type
    );

    if (!dimensions) {
      return NextResponse.json(
        {
          error:
            'Could not verify image dimensions. Please use a valid PNG, JPG, or WEBP image.'
        },
        { status: 400 }
      );
    }

    if (
      dimensions.width !== REQUIRED_WIDTH ||
      dimensions.height !== REQUIRED_HEIGHT
    ) {
      return NextResponse.json(
        {
          error:
            `Incorrect image dimensions: ` +
            `${dimensions.width} × ${dimensions.height}. ` +
            `Advertisements must be exactly ` +
            `${REQUIRED_WIDTH} × ${REQUIRED_HEIGHT} pixels.`
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.SUPABASE_URL
      ?.replace(/\/$/, '');

    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!baseUrl || !key) {
      throw new Error(
        'Supabase configuration is missing.'
      );
    }

    const extension = TYPES[file.type].ext;

    const filename =
      `artwork/${slot.show_id}/${slot.id}/` +
      `${randomUUID()}.${extension}`;

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
      throw new Error(
        `Storage upload failed (${upload.status}).`
      );
    }

    const publicUrl =
      `${baseUrl}/storage/v1/object/public/` +
      `sponsor-logos/${filename}`;

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
    console.error(
      'Sponsor submission error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Could not submit artwork. Please try again.'
      },
      { status: 500 }
    );
  }
}
