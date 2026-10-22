
'use client';

import { useEffect, useRef, useState } from 'react';

export default function Overlay() {
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const channel =
    params.get('channel') || 'discount-kicks';

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(
          `/api/overlay/current?channel=${encodeURIComponent(channel)}`,
          { cache: 'no-store' }
        );

        if (!response.ok) return;

        const result = await response.json();

        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        console.error('Overlay refresh failed', error);
      }
    }

    refresh();

    const poll = setInterval(refresh, 5000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [channel]);

  useEffect(() => {
    clearInterval(timer.current);

    const seconds = Math.max(
      1,
      Number(data?.show?.rotation_seconds) || 20
    );

    timer.current = setInterval(() => {
      setIdx(i => i + 1);
    }, seconds * 1000);

    return () => clearInterval(timer.current);
  }, [data?.show?.rotation_seconds]);

  if (!data?.active || !data.show) {
    return null;
  }

  const show = data.show;

  // ACTIVE + PAID + APPROVED ARTWORK ONLY
  const eligible = (show.sponsor_slots || [])
    .filter(
      slot =>
        slot.active &&
        slot.paid &&
        slot.artwork_url
    )
    .sort(
      (a, b) =>
        Number(a.position || 0) -
        Number(b.position || 0)
    );

  // PERMANENT DISCOUNT KICKS HOUSE AD
  const houseSettings = data.house_ad || {};

  const houseEnabled =
    houseSettings.enabled === true &&
    !!houseSettings.artwork_url;

  const house = {
    house: true,
    artwork_url: houseSettings.artwork_url
  };

  let selected = null;

  if (show.exclusive_mode) {
    selected = {
      exclusive: true,
      brand:
        show.exclusive_brand || 'EXCLUSIVE SPONSOR',
      message:
        show.exclusive_message || 'PRESENTING SPONSOR',
      logo_url: show.exclusive_logo_url
    };
  } else {
    // HOUSE AD ONLY WHEN FEWER THAN 10
    // ELIGIBLE PAID SPONSORS ARE AVAILABLE
    const pool =
      eligible.length < 10 && houseEnabled
        ? [...eligible, house]
        : eligible;

    selected =
      pool.length > 0
        ? pool[idx % pool.length]
        : null;
  }

  // NOTHING TO DISPLAY
  if (!selected) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 1080,
        height: 1920,
        background: 'transparent',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 30,
          width: 1020,
          height: 200,
          overflow: 'hidden',
          boxSizing: 'border-box',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow:
            '0 7px 18px rgba(0,0,0,0.18)'
        }}
      >
        {selected.artwork_url ? (
          <img
            key={selected.artwork_url}
            src={selected.artwork_url}
            alt={
              selected.house
                ? 'Discount Kicks house advertisement'
                : 'Sponsor advertisement'
            }
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        ) : selected.exclusive ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 30,
              boxSizing: 'border-box',
              padding: 24,
              background: '#102b4e',
              color: '#ffffff',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            {selected.logo_url && (
              <img
                src={selected.logo_url}
                alt=""
                style={{
                  maxWidth: 180,
                  maxHeight: 145,
                  objectFit: 'contain'
                }}
              />
            )}

            <div
              style={{
                textAlign: 'center',
                minWidth: 0
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  marginBottom: 10
                }}
              >
                SPONSORED BY
              </div>

              <div
                style={{
                  fontSize: 38,
                  fontWeight: 900
                }}
              >
                {selected.brand}
              </div>

              <div
                style={{
                  fontSize: 20,
                  marginTop: 8
                }}
              >
                {selected.message}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
