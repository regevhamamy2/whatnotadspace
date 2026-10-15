
'use client';

import { useEffect, useRef, useState } from 'react';

export default function Overlay() {
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  const channel =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('channel') ||
        'discount-kicks'
      : 'discount-kicks';

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

  if (show.exclusive_mode) {
    item = {
      brand: show.exclusive_brand || 'EXCLUSIVE SPONSOR',
      message: show.exclusive_message || 'PRESENTING SPONSOR',
      logo_url: show.exclusive_logo_url
    };
  } else {
    const paid = (show.sponsor_slots || []).filter(
      s => s.active && s.brand
    );

    const house = {
      brand: 'YOUR BRAND HERE',
      message: `${Number(show.reach_low || 12000).toLocaleString()}–${Number(show.reach_high || 15000).toLocaleString()} SHOW REACH • $${show.slot_price || 250} PER SLOT • ${Math.max(0, 10 - paid.length)} SPOTS LEFT`,
      house: true
    };

    const pool = paid.length < 10 ? [...paid, house] : paid;
    item = pool[idx % pool.length] || house;
  }

  const brand = item.brand || 'YOUR BRAND HERE';
  const message = item.message || 'VISIT OUR SPONSOR';
  const isHouse = Boolean(item.house);

  return (
    <div className="dkOverlay">
      <div className="dkBanner">
        <div className="dkLeft">
          <div>THIS SHOW</div>
          <div className="dkGold">IS SPONSORED BY</div>
        </div>

        <div className="dkCenter">
          <div className="dkLogoCircle">
            {item.logo_url ? (
              <img src={item.logo_url} alt="" />
            ) : (
              <div className="dkLogoLetters">
                {isHouse ? '★' : brand.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="dkBrandInfo">
            <div className="dkBrand">{brand}</div>
            <div className="dkTagline">
              {isHouse
                ? 'YOUR NEXT SPONSORSHIP'
                : 'FEATURED SHOW SPONSOR'}
            </div>
          </div>
        </div>

        <div className="dkRight">
          <div className="dkShopLabel">
            {isHouse ? 'ADVERTISE WITH US' : 'SPONSOR MESSAGE'}
          </div>
          <div className="dkMessageBox">{message}</div>
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
