
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

  const preview = params.get('preview') === 'red1';

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

        if (!cancelled) setData(result);
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

  if (!data?.active || !data.show) return null;

  const show = data.show;
  let item;

  if (preview) {
    // Preview uses approved artwork only.
    // Unapproved submissions are never displayed.
    const approved = (show.sponsor_slots || [])
      .filter(slot =>
        slot.active &&
        slot.artwork_url &&
        (slot.artwork_status === 'approved' ||
          !('artwork_status' in slot))
      )
      .sort((a, b) => a.position - b.position);

    // The public API intentionally does not expose
    // artwork_status. artwork_url is populated only
    // by the administrator approval endpoint.
    const eligible = (show.sponsor_slots || [])
      .filter(slot => slot.active && slot.artwork_url)
      .sort((a, b) => a.position - b.position);

    const pool = show.exclusive_mode
      ? []
      : eligible;

    const selected = pool.length
      ? pool[idx % pool.length]
      : null;

    const isHouse = !selected;

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          background: 'transparent',
          pointerEvents: 'none',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 30,
            width: 1020,
            height: 200,
            display: 'flex',
            overflow: 'hidden',
            boxSizing: 'border-box',
            background: '#ffffff',
            border: '3px solid #142d4e',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 200,
              minWidth: 200,
              height: '100%',
              background: '#142d4e',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: '20px 22px',
              zIndex: 2
            }}
          >
            <div
              style={{
                fontSize: 23,
                fontWeight: 900,
                lineHeight: 1.25,
                letterSpacing: 1.3,
                textAlign: 'center'
              }}
            >
              SPONSORED
              <div
                style={{
                  fontSize: 28,
                  marginTop: 5
                }}
              >
                BY
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: -15,
                top: 0,
                height: '100%',
                width: 30,
                background: '#142d4e',
                transform: 'skewX(-9deg)',
                zIndex: -1
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: '12px 22px 12px 28px',
              position: 'relative'
            }}
          >
            {selected ? (
              <img
                key={selected.artwork_url}
                src={selected.artwork_url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: '#142d4e'
                }}
              >
                <div
                  style={{
                    fontSize: 39,
                    fontWeight: 900,
                    letterSpacing: 2
                  }}
                >
                  YOUR BRAND HERE
                </div>
                <div
                  style={{
                    fontSize: 19,
                    marginTop: 12,
                    letterSpacing: 1.5
                  }}
                >
                  ADVERTISE WITH DISCOUNT KICKS
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 12,
              height: '100%',
              background:
                'repeating-linear-gradient(135deg,#142d4e 0px,#142d4e 5px,#dbe3ed 5px,#dbe3ed 11px)'
            }}
          />
        </div>
      </div>
    );
  }

  // ORIGINAL PRODUCTION BANNER:
  // Keep this unchanged until preview is approved.

  if (show.exclusive_mode) {
    item = {
      brand: show.exclusive_brand || 'EXCLUSIVE SPONSOR',
      message:
        show.exclusive_message || 'PRESENTING SPONSOR',
      logo_url: show.exclusive_logo_url
    };
  } else {
    const paid = (show.sponsor_slots || []).filter(
      slot => slot.active && slot.brand
    );

    const house = {
      brand: 'YOUR BRAND HERE',
      message:
        `ADVERTISE WITH US • $${show.slot_price || 250} PER SLOT`,
      house: true
    };

    const pool =
      paid.length < 10 ? [...paid, house] : paid;

    item = pool[idx % pool.length] || house;
  }

  const brand = item.brand || 'YOUR BRAND HERE';
  const message =
    item.message || 'CHECK OUT OUR SPONSOR';
  const isHouse = Boolean(item.house);

  return (
    <div className="dkOverlay">
      <div className="dkBanner">
        <div className="dkLeft">
          <div>THIS SHOW</div>
          <div className="dkGold">
            IS SPONSORED BY
          </div>
        </div>

        <div className="dkCenter">
          <div className="dkLogoCircle">
            {item.logo_url ? (
              <img src={item.logo_url} alt="" />
            ) : (
              <div className="dkLogoLetters">
                {isHouse
                  ? '★'
                  : brand.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="dkBrandInfo">
            <div className="dkBrand">
              {brand}
            </div>
            <div className="dkTagline">
              {isHouse
                ? 'YOUR NEXT SPONSORSHIP'
                : 'FEATURED SHOW SPONSOR'}
            </div>
          </div>
        </div>

        <div className="dkRight">
          <div className="dkShopLabel">
            {isHouse
              ? 'ADVERTISE WITH US'
              : 'SPONSOR MESSAGE'}
          </div>

          <div className="dkMessageBox">
            {message}
          </div>

          <div className="dkFooter">
            {show.exclusive_mode
              ? 'EXCLUSIVE SHOW SPONSOR'
              : isHouse
                ? 'LIMITED SPONSOR SPOTS'
                : 'PROUD SHOW SPONSOR'}
          </div>
        </div>
      </div>
    </div>
  );
}
