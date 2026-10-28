
'use client';

import { useEffect, useState } from 'react';

const emptyForm = {
  title: 'Whatnot Live Show',
  starts_at: '',
  ends_at: '',
  rotation_seconds: 20,
  slot_price: 250,
  reach_low: 12000,
  reach_high: 15000,
  exclusive_price: 2000
};

export default function Dashboard() {
  const [authed, setAuthed] = useState(null);
  const [password, setPassword] = useState('');
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [slotBusy, setSlotBusy] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState({});
  const [houseAd, setHouseAd] = useState(null);
  const [houseBusy, setHouseBusy] = useState(false);
  const [houseFile, setHouseFile] = useState(null);
  const [houseMessage, setHouseMessage] = useState('');

  async function load() {
    try {
      const r = await fetch('/api/shows', {
        cache: 'no-store'
      });

      if (r.status === 401) {
        setAuthed(false);
        return;
      }

      if (!r.ok) throw new Error(await r.text());

      const result = await r.json();
      setAuthed(true);
      setShows(Array.isArray(result) ? result : []);

      const h = await fetch('/api/house-ad', {
        cache: 'no-store'
      });

      if (h.ok) {
        setHouseAd(await h.json());
      } else {
        setHouseMessage('Could not load house ad settings.');
      }
    } catch (error) {
      alert(`Could not load dashboard: ${error.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function login(e) {
    e.preventDefault();

    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!r.ok) {
        alert('Wrong password');
        return;
      }

      setPassword('');
      setAuthed(true);
      await load();
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  }

  async function createShow(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const start = new Date(form.starts_at);
      const end = new Date(form.ends_at);

      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start
      ) {
        throw new Error(
          'Enter valid dates. End must be after start.'
        );
      }

      const payload = {
        ...form,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        rotation_seconds: Number(form.rotation_seconds),
        slot_price: Number(form.slot_price),
        exclusive_price: Number(form.exclusive_price)
      };

      const r = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error(await r.text());

      setForm({ ...emptyForm });
      await load();
    } catch (error) {
      alert(`Could not create show: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function patchShow(id, patch) {
    setShows(current =>
      current.map(show =>
        show.id === id ? { ...show, ...patch } : show
      )
    );
  }

  function patchSlot(showId, slotId, patch) {
    setShows(current =>
      current.map(show =>
        show.id !== showId
          ? show
          : {
              ...show,
              sponsor_slots: (show.sponsor_slots || []).map(
                slot =>
                  slot.id === slotId
                    ? { ...slot, ...patch }
                    : slot
              )
            }
      )
    );
  }

  async function save(show) {
    setBusy(true);

    try {
      const payload = {
        title: show.title,
        starts_at: show.starts_at,
        ends_at: show.ends_at,
        channel_slug: show.channel_slug,
        rotation_seconds: Number(show.rotation_seconds),
        slot_price: Number(show.slot_price),
        reach_low: Number(show.reach_low),
        reach_high: Number(show.reach_high),
        exclusive_price: Number(show.exclusive_price),
        exclusive_mode: !!show.exclusive_mode,
        exclusive_brand: show.exclusive_brand || '',
        exclusive_message: show.exclusive_message || '',
        exclusive_logo_url: show.exclusive_logo_url || null,
        sponsor_slots: (show.sponsor_slots || []).map(
          slot => ({
            id: slot.id,
            brand: slot.brand || '',
            active: !!slot.active,
            paid: !!slot.paid
          })
        )
      };

      const r = await fetch(`/api/shows/${show.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error(await r.text());

      await load();
      alert('Show saved.');
    } catch (error) {
      alert(`Could not save show: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateLink(showId, slotId) {
    setSlotBusy(slotId);

    try {
      const r = await fetch('/api/sponsor-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId })
      });

      const result = await r.json().catch(() => ({}));

      if (!r.ok || !result.link) {
        throw new Error(
          result.error || 'Could not generate link.'
        );
      }

      setGeneratedLinks(current => ({
        ...current,
        [slotId]: result.link
      }));

      alert(
        'Private link created. Copy and save it now. ' +
        'Regenerating invalidates the previous link.'
      );

      await load();
    } catch (error) {
      alert(error.message);
    } finally {
      setSlotBusy('');
    }
  }

  async function copyLink(slotId) {
    const link = generatedLinks[slotId];
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      alert('Sponsor link copied.');
    } catch {
      window.prompt('Copy sponsor link:', link);
    }
  }

  async function decideArtwork(slotId, action) {
    setSlotBusy(slotId);

    try {
      const r = await fetch('/api/sponsor-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, action })
      });

      const result = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(
          result.error || 'Could not update artwork.'
        );
      }

      await load();

      alert(
        action === 'approve'
          ? 'Artwork approved.'
          : 'Submission rejected.'
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setSlotBusy('');
    }
  }

  // SLOT 11 - ENABLE OR DISABLE

  async function saveHouseEnabled(enabled) {
    if (!houseAd || houseBusy) return;

    setHouseBusy(true);
    setHouseMessage('');

    try {
      const r = await fetch('/api/house-ad', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      const result = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(
          result.error || 'Could not update house ad.'
        );
      }

      setHouseAd(result);
      setHouseMessage(
        enabled ? 'House ad enabled.' : 'House ad disabled.'
      );
    } catch (error) {
      setHouseMessage(error.message);
    } finally {
      setHouseBusy(false);
    }
  }

  // SLOT 11 - UPLOAD ARTWORK

  async function uploadHouseArtwork() {
    if (!houseFile || houseBusy) return;

    setHouseBusy(true);
    setHouseMessage('');

    try {
      const allowed = [
        'image/png',
        'image/jpeg',
        'image/webp'
      ];

      if (
        !allowed.includes(houseFile.type) ||
        houseFile.size === 0 ||
        houseFile.size > 5 * 1024 * 1024
      ) {
        throw new Error(
          'Choose a PNG, JPG, or WEBP image up to 5 MB.'
        );
      }

      const dimensions = await new Promise(
        (resolve, reject) => {
          const url = URL.createObjectURL(houseFile);
          const img = new Image();

          img.onload = () => {
            const result = {
              width: img.naturalWidth,
              height: img.naturalHeight
            };
            URL.revokeObjectURL(url);
            resolve(result);
          };

          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image.'));
          };

          img.src = url;
        }
      );

      if (
        dimensions.width !== 1020 ||
        dimensions.height !== 260
      ) {
        throw new Error(
          `Image is ${dimensions.width} x ` +
          `${dimensions.height}. Required: 1020 x 200.`
        );
      }

      const data = new FormData();
      data.append('file', houseFile);

      const r = await fetch('/api/house-ad/upload', {
        method: 'POST',
        body: data
      });

      const result = await r.json().catch(() => ({}));

      if (!r.ok || !result.house_ad) {
        throw new Error(
          result.error || 'Upload failed.'
        );
      }

      setHouseAd(result.house_ad);
      setHouseFile(null);
      setHouseMessage('House advertisement uploaded successfully.');

      const input = document.getElementById(
        'house-ad-file'
      );

      if (input) input.value = '';
    } catch (error) {
      setHouseMessage(error.message);
    } finally {
      setHouseBusy(false);
    }
  }

  if (authed === null) {
    return (
      <main className="center">
        <div className="card">Loading...</div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="center">
        <form className="card" onSubmit={login}>
          <h1>Admin Login</h1>
          <input
            type="password"
            placeholder="Dashboard password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button>Log in</button>
        </form>
      </main>
    );
  }

  return (
    <main className="dash">
      <header>
        <div>
          <h1>Sponsor Dashboard</h1>
          <p>
            Manage 10 sponsor slots and your permanent
            Discount Kicks house advertisement.
          </p>
        </div>

        <button
          className="ghost"
          onClick={async () => {
            await fetch('/api/logout', {
              method: 'POST'
            });
            location.reload();
          }}
        >
          Log out
        </button>
      </header>

      {/* SLOT 11 HOUSE AD PANEL */}

      <section className="card">
        <h2>Slot 11 - Discount Kicks House Ad</h2>

        <p>
          Permanent advertisement for all Discount Kicks
          shows. Displays only when fewer than 10 eligible
          paid sponsor banners are available and exclusive
          takeover is off.
        </p>

        {houseAd ? (
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20
              }}
            >
              <input
                type="checkbox"
                checked={!!houseAd.enabled}
                disabled={houseBusy}
                onChange={e =>
                  saveHouseEnabled(e.target.checked)
                }
              />
              House advertisement enabled
            </label>

            {houseAd.artwork_url ? (
              <div style={{ marginBottom: 20 }}>
                <strong>Current house advertisement</strong>

                <div style={{ marginTop: 10 }}>
                  <a
                    href={houseAd.artwork_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={houseAd.artwork_url}
                      alt="Discount Kicks house advertisement"
                      style={{
                        width: '100%',
                        maxWidth: 1020,
                        height: 'auto',
                        borderRadius: 8
                      }}
                    />
                  </a>
                </div>
              </div>
            ) : (
              <p>No house advertisement uploaded yet.</p>
            )}

            <div style={{ marginBottom: 15 }}>
              <label>
                Upload new 1020 x 200 banner
                <input
                  id="house-ad-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={houseBusy}
                  onChange={e =>
                    setHouseFile(
                      e.target.files?.[0] || null
                    )
                  }
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!houseFile || houseBusy}
              onClick={uploadHouseArtwork}
            >
              {houseBusy
                ? 'Working...'
                : 'Upload / Replace House Ad'}
            </button>
          </div>
        ) : (
          <p>Loading house advertisement settings...</p>
        )}

        {houseMessage && (
          <p
            role="status"
            style={{
              marginTop: 15,
              fontWeight: 'bold'
            }}
          >
            {houseMessage}
          </p>
        )}
      </section>

      {/* CREATE SHOW */}

      <section className="card">
        <h2>Create upcoming show</h2>

        <form className="grid" onSubmit={createShow}>
          <label>
            Show title
            <input
              value={form.title}
              onChange={e =>
                setForm({
                  ...form,
                  title: e.target.value
                })
              }
            />
          </label>

          <label>
            Start
            <input
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={e =>
                setForm({
                  ...form,
                  starts_at: e.target.value
                })
              }
            />
          </label>

          <label>
            End
            <input
              type="datetime-local"
              required
              value={form.ends_at}
              onChange={e =>
                setForm({
                  ...form,
                  ends_at: e.target.value
                })
              }
            />
          </label>

          <label>
            Seconds per sponsor
            <input
              type="number"
              min="5"
              value={form.rotation_seconds}
              onChange={e =>
                setForm({
                  ...form,
                  rotation_seconds: e.target.value
                })
              }
            />
          </label>

          <label>
            Slot price
            <input
              type="number"
              min="0"
              value={form.slot_price}
              onChange={e =>
                setForm({
                  ...form,
                  slot_price: e.target.value
                })
              }
            />
          </label>

          <label>
            Exclusive price
            <input
              type="number"
              min="0"
              value={form.exclusive_price}
              onChange={e =>
                setForm({
                  ...form,
                  exclusive_price: e.target.value
                })
              }
            />
          </label>

          <button disabled={busy}>
            Create show + 10 slots
          </button>
        </form>
      </section>

      {/* EXISTING SHOWS */}

      {shows.map(show => {
        const slots = show.sponsor_slots || [];

        const sold = slots.filter(
          slot => slot.active
        ).length;

        const revenue = show.exclusive_mode
          ? Number(show.exclusive_price || 0)
          : slots.filter(
              slot => slot.active && slot.paid
            ).length * Number(show.slot_price || 0);

        return (
          <section
            className="card show"
            key={show.id}
          >
            <div className="showTop">
              <div>
                <h2>{show.title}</h2>
                <p>
                  {new Date(show.starts_at).toLocaleString()}
                  {' → '}
                  {new Date(show.ends_at).toLocaleString()}
                </p>
              </div>

              <div className="metrics">
                <b>{sold}/10 active</b>
                <span>
                  ${revenue.toLocaleString()} tracked
                </span>
              </div>
            </div>

            <div className="inline">
              <label>
                Rotation seconds
                <input
                  type="number"
                  min="5"
                  value={show.rotation_seconds}
                  onChange={e =>
                    patchShow(show.id, {
                      rotation_seconds:
                        Number(e.target.value)
                    })
                  }
                />
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={!!show.exclusive_mode}
                  onChange={e =>
                    patchShow(show.id, {
                      exclusive_mode: e.target.checked
                    })
                  }
                />
                {' '}Exclusive takeover
              </label>

              <label>
                Exclusive brand
                <input
                  value={show.exclusive_brand || ''}
                  onChange={e =>
                    patchShow(show.id, {
                      exclusive_brand: e.target.value
                    })
                  }
                  placeholder="Brand name"
                />
              </label>

              <label>
                Exclusive message
                <input
                  value={show.exclusive_message || ''}
                  onChange={e =>
                    patchShow(show.id, {
                      exclusive_message: e.target.value
                    })
                  }
                  placeholder="Legacy exclusive tagline"
                />
              </label>
            </div>

            <p style={{ fontSize: 13, opacity: 0.75 }}>
              Sponsor artwork is submitted through private
              links and requires approval. Company names
              are for your records.
            </p>

            <div className="slots">
              {[...slots]
                .sort(
                  (a, b) =>
                    Number(a.position) -
                    Number(b.position)
                )
                .map(slot => {
                  const working = !!slotBusy;

                  const pending =
                    slot.artwork_status === 'pending' &&
                    !!slot.pending_artwork_url;

                  return (
                    <div
                      className="slot"
                      key={slot.id}
                      style={{
                        alignItems: 'start',
                        gap: 12
                      }}
                    >
                      <div className="slotNum">
                        {slot.position}
                      </div>

                      <div
                        style={{
                          minWidth: 180,
                          flex: '1 1 180px'
                        }}
                      >
                        <label>
                          Company name
                          <input
                            placeholder="Sponsor company name"
                            value={slot.brand || ''}
                            onChange={e =>
                              patchSlot(
                                show.id,
                                slot.id,
                                { brand: e.target.value }
                              )
                            }
                          />
                        </label>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12
                          }}
                        >
                          Artwork status:{' '}
                          <strong>
                            {pending
                              ? 'Pending approval'
                              : slot.artwork_url
                                ? 'Approved artwork on file'
                                : 'No approved artwork'}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: 220,
                          flex: '2 1 220px'
                        }}
                      >
                        <button
                          type="button"
                          disabled={working}
                          onClick={() =>
                            generateLink(
                              show.id,
                              slot.id
                            )
                          }
                        >
                          {slotBusy === slot.id
                            ? 'Working...'
                            : generatedLinks[slot.id]
                              ? 'Regenerate Link'
                              : 'Generate Sponsor Link'}
                        </button>

                        {generatedLinks[slot.id] && (
                          <div style={{ marginTop: 8 }}>
                            <input
                              readOnly
                              aria-label="Sponsor submission link"
                              value={generatedLinks[slot.id]}
                              style={{
                                width: '100%',
                                fontSize: 12
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                copyLink(slot.id)
                              }
                            >
                              Copy Link
                            </button>
                          </div>
                        )}

                        {slot.submission_token_created_at &&
                          !generatedLinks[slot.id] && (
                            <p
                              style={{
                                fontSize: 12,
                                opacity: 0.75
                              }}
                            >
                              A link was previously generated.
                              Generate a replacement if you
                              no longer have it.
                            </p>
                          )}
                      </div>

                      <div
                        style={{
                          minWidth: 180,
                          flex: '2 1 180px'
                        }}
                      >
                        {slot.artwork_url && (
                          <div style={{ marginBottom: 8 }}>
                            <strong
                              style={{ fontSize: 12 }}
                            >
                              Approved artwork
                            </strong>

                            <a
                              href={slot.artwork_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={slot.artwork_url}
                                alt="Approved sponsor artwork"
                                style={{
                                  maxWidth: 260,
                                  width: '100%',
                                  height: 'auto',
                                  border: '1px solid #ddd'
                                }}
                              />
                            </a>
                          </div>
                        )}

                        {pending && (
                          <div>
                            <strong
                              style={{ fontSize: 12 }}
                            >
                              New submission - review
                            </strong>

                            <a
                              href={slot.pending_artwork_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={slot.pending_artwork_url}
                                alt="Pending sponsor artwork"
                                style={{
                                  maxWidth: 260,
                                  width: '100%',
                                  height: 'auto',
                                  border: '1px solid #ddd'
                                }}
                              />
                            </a>

                            <div
                              style={{
                                display: 'flex',
                                gap: 8,
                                marginTop: 8,
                                flexWrap: 'wrap'
                              }}
                            >
                              <button
                                type="button"
                                disabled={working}
                                onClick={() =>
                                  decideArtwork(
                                    slot.id,
                                    'approve'
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                className="ghost"
                                disabled={working}
                                onClick={() =>
                                  decideArtwork(
                                    slot.id,
                                    'reject'
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={!!slot.active}
                            onChange={e =>
                              patchSlot(
                                show.id,
                                slot.id,
                                { active: e.target.checked }
                              )
                            }
                          />
                          {' '}Active
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={!!slot.paid}
                            onChange={e =>
                              patchSlot(
                                show.id,
                                slot.id,
                                { paid: e.target.checked }
                              )
                            }
                          />
                          {' '}Paid
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>

            <button
              disabled={busy}
              onClick={() => save(show)}
            >
              Save show
            </button>
          </section>
        );
      })}
    </main>
  );
}
