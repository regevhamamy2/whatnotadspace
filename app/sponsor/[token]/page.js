
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function SponsorUploadPage() {
  const params = useParams();
  const token = params.token;

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  function selectFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const allowed = [
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    if (!allowed.includes(selected.type)) {
      setMessage('Please select a PNG, JPG, or WEBP image.');
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setMessage('The image must be smaller than 5 MB.');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setMessage('');
    setSuccess(false);
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

      const response = await fetch('/api/sponsor-submit', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed.');
      }

      setSuccess(true);
      setMessage(
        'Your advertisement was submitted successfully and is awaiting approval.'
      );
    } catch (error) {
      setMessage(error.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f2f5fa',
      padding: '50px 20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: 650,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        padding: 30,
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ color: '#102b4e', marginTop: 0 }}>
          Sponsor Advertisement Submission
        </h1>

        <p style={{ color: '#555', lineHeight: 1.6 }}>
          Upload your completed sponsor advertisement for
          review. Your artwork will not appear on the
          livestream until approved.
        </p>

        <div style={{
          background: '#eef3fa',
          borderRadius: 10,
          padding: 16,
          margin: '20px 0'
        }}>
          <strong>Artwork requirements</strong>
          <p style={{ marginBottom: 0 }}>
            PNG, JPG, or WEBP. Maximum file size: 5 MB.
            Use a wide, horizontal design with important
            text clearly readable.
          </p>
        </div>

        <form onSubmit={submit}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={selectFile}
            style={{ marginBottom: 20, width: '100%' }}
          />

          {preview && (
            <div style={{ marginBottom: 20 }}>
              <p><strong>Artwork preview</strong></p>
              <img
                src={preview}
                alt="Advertisement preview"
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid #ddd'
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            style={{
              width: '100%',
              padding: '15px 20px',
              background: '#102b4e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            {uploading ? 'Uploading...' : 'Submit for Approval'}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: 20,
            color: success ? '#16703b' : '#b42318',
            fontWeight: 'bold'
          }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
