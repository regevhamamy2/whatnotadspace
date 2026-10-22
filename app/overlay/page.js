
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

  // WHITE-AND-NAVY TEST BANNER ONLY
  if (preview) {
    const eligible = (show.sponsor_slots || [])
      .filter(slot => slot.active && slot.artwork_url)
      .sort((a, b) => a.position - b.position);

    const selected = show.exclusive_mode
      ? null
      : eligible.length
        ? eligible[idx % eligible.length]
        : null;

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
            alignItems: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
            background: '#ffffff',
            borderRadius: 15,
            border: '2px solid #dce5ef',
            boxShadow: '0 7px 18px rgba(0,0,0,0.18)'
          }}
        >
          {/* Left navy accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 13,
              height: '100%',
              background: '#142d4e',
              zIndex: 2
            }}
          />

          {/* Permanent SPONSORED BY label */}
          <div
            style={{
              width: 235,
              minWidth: 235,
              height: '100%',
              boxSizing: 'border-box',
              padding: '0 24px 0 38px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff'
            }}
          >
            <div
              style={{
                color: '#142d4e',
                fontSize: 24,
                fontWeight: 900,
                fontStyle: 'italic',
                letterSpacing: 0.8,
                lineHeight: 1.15,
                textAlign: 'center'
              }}
            >
              SPONSORED
              <div>BY</div>
            </div>

            <div
              style={{
                width: 150,
                height: 3,
                background: '#142d4e',
                marginTop: 15
              }}
            />
          </div>

          {/* Full-size sponsor artwork area */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff'
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
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 26px',
                  textAlign: 'center',
                  color: '#142d4e'
                }}
              >
                <div
                  style={{
                    fontSize: 39,
                    fontWeight: 900,
                    letterSpacing: 0.5
                  }}
                >
                  YOUR BRAND HERE
                </div>

                <div
                  style={{
                    background: '#142d4e',
                    color: '#ffffff',
                    borderRadius: 24,
                    padding: '9px 18px',
                    marginTop: 12,
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 0.5
                  }}
                >
                  ADVERTISE WITH US • $250 PER SLOT
                </div>
              </div>
            )}
          </div>

          {/* Right navy accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 13,
              height: '100%',
              background: '#142d4e',
              zIndex: 2
            }}
          />
        </div>
      </div>
    );
  }

  // ORIGINAL PRODUCTION BANNER — UNCHANGED

  let item;

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
