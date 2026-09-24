'use client';
import { useEffect, useRef, useState } from 'react';

export default function Overlay() {
  const [data,setData]=useState(null); const [idx,setIdx]=useState(0); const timer=useRef(null);
  const channel = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('channel') || 'discount-kicks' : 'discount-kicks';
  async function refresh(){ try { const r=await fetch(`/api/overlay/current?channel=${encodeURIComponent(channel)}`,{cache:'no-store'}); setData(await r.json()); } catch {} }
  useEffect(()=>{ refresh(); const t=setInterval(refresh,5000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ clearInterval(timer.current); const sec=data?.show?.rotation_seconds||20; timer.current=setInterval(()=>setIdx(i=>i+1),sec*1000); return()=>clearInterval(timer.current); },[data?.show?.rotation_seconds]);
  if(!data?.active) return null;
  const show=data.show;
  let item;
  if(show.exclusive_mode){ item={brand:show.exclusive_brand||'EXCLUSIVE SPONSOR',message:show.exclusive_message||'PRESENTING SPONSOR',logo_url:show.exclusive_logo_url}; }
  else {
    const paid=(show.sponsor_slots||[]).filter(s=>s.active && s.brand);
    const house={brand:'YOUR BRAND HERE',message:`${Number(show.reach_low).toLocaleString()}–${Number(show.reach_high).toLocaleString()} SHOW REACH • SPONSOR NEXT SHOW — $${show.slot_price} • ${Math.max(0,10-paid.length)} SPOTS LEFT`,house:true};
    const pool=paid.length<10?[...paid,house]:paid;
    item=pool[idx % Math.max(pool.length,1)] || house;
  }
  return <div className="overlayWrap"><div className="sponsorBar">
    <div className="eyebrow">{item.house?'SPONSOR THE NEXT SHOW':'THIS SHOW IS SPONSORED BY'}</div>
    <div className="brandBlock">{item.logo_url && <img src={item.logo_url} alt=""/>}<div><div className="brand">{item.brand}</div><div className="message">{item.message}</div></div></div>
    <div className="rightBadge">{show.exclusive_mode?'EXCLUSIVE':'LIVE SPONSOR'}</div>
  </div></div>;
}
