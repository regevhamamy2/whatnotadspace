
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const BANNER_WIDTH = 1020;
const BANNER_HEIGHT = 260;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function SponsorUploadPage() {
  const params = useParams();
  const token = params.token;

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function selectFile(event) {
    const selected = event.target.files?.[0];

    setFile(null);
    setPreview('');
    setMessage('');
    setSuccess(false);

    if (!selected) return;

    const allowed = [
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    if (!allowed.includes(selected.type)) {
      setMessage(
        'Please select a PNG, JPG, or WEBP image.'
      );
      event.target.value = '';
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setMessage(
        'The image must be smaller than 5 MB.'
      );
      event.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(selected);

    try {
      const dimensions = await new Promise(
        (resolve, reject) => {
          const image = new Image();

          image.onload = () => {
            resolve({
              width: image.naturalWidth,
              height: image.naturalHeight
            });
          };

          image.onerror = () => {
            reject(new Error('Could not read image.'));
          };

          image.src = imageUrl;
        }
      );

      if (
        dimensions.width !== BANNER_WIDTH ||
        dimensions.height !== BANNER_HEIGHT
      ) {
        URL.revokeObjectURL(imageUrl);

        setMessage(
          `Incorrect dimensions: ${dimensions.width} × ` +
          `${dimensions.height} pixels. ` +
          `Your banner must be exactly ` +
          `${BANNER_WIDTH} × ${BANNER_HEIGHT} pixels.`
        );

        event.target.value = '';
        return;
      }

      setFile(selected);
      setPreview(imageUrl);
    } catch (error) {
      URL.revokeObjectURL(imageUrl);
      setMessage(
        'We could not read your image. Please try another file.'
      );
      event.target.value = '';
    }
  }

  async function submit(event) {
    event.preventDefault();

    if (!file || uploading) return;

    setUploading(true);
    setMessage('');

    try {
      const form = new FormData();

      form.append('file', file);
      form.append('token', token);

      const response = await fetch(
        '/api/sponsor-submit',
        {
          method: 'POST',
          body: form
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Upload failed.'
        );
      }

      setSuccess(true);
      setMessage(
        'Your advertisement was submitted successfully ' +
        'and is awaiting approval.'
      );
    } catch (error) {
      setMessage(
        error.message || 'Something went wrong.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f2f5fa',
        padding: '40px 16px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 16,
          padding: 'clamp(16px, 4vw, 36px)',
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.08)'
        }}
      >
        <h1
          style={{
            color: '#102b4e',
            marginTop: 0,
            fontSize: 'clamp(24px, 4vw, 32px)'
          }}
        >
          Sponsor Advertisement Submission
        </h1>

        <p
          style={{
            color: '#555',
            lineHeight: 1.6
          }}
        >
          Upload your completed sponsor advertisement
          for review. Your artwork will not appear on
          the livestream until approved.
        </p>

        <form onSubmit={submit}>
          <div style={{ marginTop: 28 }}>
            <label
              htmlFor="sponsor-file"
              style={{
                display: 'block',
                fontWeight: 'bold',
                color: '#102b4e',
                marginBottom: 12
              }}
            >
              Choose Your Advertisement File
            </label>

            <input
              id="sponsor-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectFile}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 12,
                border: '1px solid #d1d9e5',
                borderRadius: 8
              }}
            />
          </div>

          {/* ARTWORK INSTRUCTIONS */}
          <section
            style={{
              marginTop: 24,
              marginBottom: 28,
              padding: 'clamp(14px, 3vw, 24px)',
              borderRadius: 12,
              background: '#eef3fa',
              border: '1px solid #d7e2ef'
            }}
          >
            <h2
              style={{
                color: '#102b4e',
                fontSize: 21,
                marginTop: 0
              }}
            >
              Sponsor Artwork Requirements
            </h2>

            <p
              style={{
                color: '#34465d',
                lineHeight: 1.6
              }}
            >
              Design one complete advertisement
              that fills the entire banner from
              edge to edge. The overall appearance
              is entirely up to you.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 22
              }}
            >
              {[
                '1020 × 260 pixels',
                'PNG / JPG / WEBP',
                'Maximum 5 MB'
              ].map(item => (
                <div
                  key={item}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d1d9e5',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#102b4e',
                    fontWeight: 'bold',
                    fontSize: 14
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <h3
              style={{
                color: '#102b4e',
                marginBottom: 12
              }}
            >
              Banner Layout Guide
            </h3>

            {/* EXACT 5.1:1 BANNER PROPORTIONS */}
            <div
              style={{
                width: '100%',
                aspectRatio: '1020 / 260',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box',
                background:
                  'linear-gradient(115deg, #123b78, #245fb8 55%, #102b4e)',
                borderRadius: 8,
                border: '1px solid #8ca6c9'
              }}
            >
              {/* REQUIRED TOP-LEFT PLACEMENT */}
              <div
                style={{
                  position: 'absolute',
                  top: '9%',
                  left: '2%',
                  width: '21%',
                  height: '35%',
                  border: '2px dashed #ffffff',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 3
                }}
              >
                <span
                  style={{
                    color: '#ffffff',
                    fontSize:
                      'clamp(7px, 1.35vw, 15px)',
                    fontWeight: 900,
                    textAlign: 'center',
                    lineHeight: 1.1
                  }}
                >
                  SPONSORED BY
                </span>
              </div>

              {/* OPEN CREATIVE SPACE */}
              <div
                style={{
                  position: 'absolute',
                  left: '28%',
                  right: '3%',
                  top: '22%',
                  bottom: '18%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div
                    style={{
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize:
                        'clamp(10px, 2.1vw, 25px)',
                      letterSpacing: 0.5
                    }}
                  >
                    YOUR CREATIVE DESIGN
                  </div>

                  <div
                    style={{
                      color: '#d8e9ff',
                      fontSize:
                        'clamp(7px, 1.1vw, 14px)',
                      marginTop: 5
                    }}
                  >
                    Your logo, message, photos and branding
                  </div>
                </div>
              </div>
            </div>

            <p
              style={{
                color: '#52637a',
                fontSize: 13,
                marginTop: 10,
                lineHeight: 1.5
              }}
            >
              The dashed box shows where to place
              the words SPONSORED BY. Do not include
              the dashed outline in your finished
              advertisement.
            </p>

            <div
              style={{
                marginTop: 20,
                color: '#24384f',
                lineHeight: 1.8
              }}
            >
              <strong>
                Your completed banner must:
              </strong>

              <ul
                style={{
                  paddingLeft: 24,
                  marginBottom: 0
                }}
              >
                <li>
                  Include SPONSORED BY in the
                  upper-left corner.
                </li>
                <li>
                  Include your company logo or
                  clearly visible brand name.
                </li>
                <li>
                  Include a short promotional message.
                </li>
                <li>
                  Fill the entire 1020 × 260 canvas
                  without empty margins.
                </li>
                <li>
                  Keep all important text clearly
                  readable at a small size.
                </li>
                <li>
                  Use your own creative design,
                  colors, images and typography.
                </li>
              </ul>
            </div>

            <p
              style={{
                color: '#52637a',
                fontSize: 13,
                marginBottom: 0,
                marginTop: 18
              }}
            >
              All advertisements are subject
              to approval before appearing
              on the livestream.
            </p>
          </section>

          {/* UPLOADED IMAGE PREVIEW */}
          {preview && (
            <div
              style={{
                marginBottom: 24
              }}
            >
              <h3
                style={{
                  color: '#102b4e'
                }}
              >
                Your Artwork Preview
              </h3>

              <div
                style={{
                  width: '100%',
                  aspectRatio: '1020 / 260',
                  border: '1px solid #d1d9e5',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                <img
                  src={preview}
                  alt="Advertisement preview"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>

              <p
                style={{
                  color: '#52637a',
                  fontSize: 13
                }}
              >
                This preview shows how your
                advertisement will fit inside
                the livestream banner.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading || success}
            style={{
              width: '100%',
              padding: '16px 20px',
              background:
                !file || uploading || success
                  ? '#8292a6'
                  : '#102b4e',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 'bold',
              fontSize: 16,
              cursor:
                !file || uploading || success
                  ? 'not-allowed'
                  : 'pointer'
            }}
          >
            {uploading
              ? 'Uploading...'
              : success
                ? 'Submitted Successfully'
                : 'Submit for Approval'}
          </button>
        </form>

        {message && (
          <p
            role="status"
            style={{
              marginTop: 20,
              color: success
                ? '#16703b'
                : '#b42318',
              fontWeight: 'bold',
              lineHeight: 1.5
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
