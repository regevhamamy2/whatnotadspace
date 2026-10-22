
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

 
  // FULL-WIDTH SPONSOR ARTWORK — TEST BANNER ONLY
  if (preview) {
    const eligible = (show.sponsor_slots || [])
      .filter(
        slot =>
          slot.active &&
          slot.paid &&
          slot.artwork_url
      )
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
            boxShadow: '0 7px 18px rgba(0,0,0,0.18)'
          }}
        >
          {selected ? (
            <img
              key={selected.artwork_url}
              src={selected.artwork_url}
              alt="Sponsor advertisement"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                color: '#142d4e',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 900,
                fontSize: 38
              }}
            >
              YOUR BRAND HERE
            </div>
          )}
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
