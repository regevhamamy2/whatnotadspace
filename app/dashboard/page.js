'use client';
import { useEffect, useMemo, useState } from 'react';

const emptyForm = { title:'Whatnot Live Show', starts_at:'', ends_at:'', rotation_seconds:20, slot_price:250, reach_low:12000, reach_high:15000, exclusive_price:2000 };

export default function Dashboard() {
  const [authed, setAuthed] = useState(null);
  const [password, setPassword] = useState('');
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');

  async function load() {
    const r = await fetch('/api/shows');
    if (r.status === 401) { setAuthed(false); return; }
    setAuthed(true); setShows(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function login(e) {
    e.preventDefault();
    const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    if (r.ok) { setAuthed(true); load(); } else alert('Wrong password');
  }

  async function createShow(e) {
    e.preventDefault(); setBusy(true);
    const payload = { ...form, starts_at:new Date(form.starts_at).toISOString(), ends_at:new Date(form.ends_at).toISOString() };
    const r = await fetch('/api/shows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!r.ok) alert(await r.text()); else { setForm(emptyForm); await load(); }
    setBusy(false);
  }

  async function save(show) {
    setBusy(true);
    const r = await fetch(`/api/shows/${show.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(show)});
    if (!r.ok) alert(await r.text()); else await load();
    setBusy(false);
  }

  function patchShow(id, patch) { setShows(s => s.map(x => x.id===id ? {...x,...patch} : x)); }
  function patchSlot(showId, slotId, patch) { setShows(s => s.map(x => x.id!==showId ? x : {...x,sponsor_slots:x.sponsor_slots.map(sl=>sl.id===slotId?{...sl,...patch}:sl)})); }

  async function uploadLogo(showId, slotId, file) {
    if (!file) return;
    const key = `${showId}:${slotId}`;
    setUploading(key);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload-logo', { method:'POST', body:fd });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) alert(data.error || 'Logo upload failed');
    else patchSlot(showId, slotId, { logo_url:data.url });
    setUploading('');
  }

  if (authed === null) return <main className="center"><div className="card">Loading…</div></main>;
  if (!authed) return <main className="center"><form className="card" onSubmit={login}><h1>Admin Login</h1><input type="password" placeholder="Dashboard password" value={password} onChange={e=>setPassword(e.target.value)} /><button>Log in</button></form></main>;

  return <main className="dash">
    <header><div><h1>Sponsor Dashboard</h1><p>Schedule shows, sell 10 rotating slots, or switch to an exclusive takeover.</p></div><button className="ghost" onClick={async()=>{await fetch('/api/logout',{method:'POST'});location.reload();}}>Log out</button></header>

    <section className="card">
      <h2>Create upcoming show</h2>
      <form className="grid" onSubmit={createShow}>
        <label>Show title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label>Start<input type="datetime-local" required value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label>
        <label>End<input type="datetime-local" required value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></label>
        <label>Seconds per sponsor<input type="number" min="5" value={form.rotation_seconds} onChange={e=>setForm({...form,rotation_seconds:e.target.value})}/></label>
        <label>Slot price<input type="number" value={form.slot_price} onChange={e=>setForm({...form,slot_price:e.target.value})}/></label>
        <label>Exclusive price<input type="number" value={form.exclusive_price} onChange={e=>setForm({...form,exclusive_price:e.target.value})}/></label>
        <button disabled={busy}>Create show + 10 slots</button>
      </form>
    </section>

    {shows.map(show => {
      const sold = show.sponsor_slots?.filter(s=>s.active).length || 0;
      const revenue = show.exclusive_mode ? Number(show.exclusive_price||0) : (show.sponsor_slots||[]).filter(s=>s.active&&s.paid).length * Number(show.slot_price||0);
      return <section className="card show" key={show.id}>
        <div className="showTop"><div><h2>{show.title}</h2><p>{new Date(show.starts_at).toLocaleString()} → {new Date(show.ends_at).toLocaleString()}</p></div><div className="metrics"><b>{sold}/10 active</b><span>${revenue.toLocaleString()} tracked</span></div></div>
        <div className="inline">
          <label>Rotation seconds<input type="number" value={show.rotation_seconds} onChange={e=>patchShow(show.id,{rotation_seconds:Number(e.target.value)})}/></label>
          <label><input type="checkbox" checked={!!show.exclusive_mode} onChange={e=>patchShow(show.id,{exclusive_mode:e.target.checked})}/> Exclusive takeover</label>
          <label>Exclusive brand<input value={show.exclusive_brand||''} onChange={e=>patchShow(show.id,{exclusive_brand:e.target.value})} placeholder="Brand name"/></label>
          <label>Exclusive message<input value={show.exclusive_message||''} onChange={e=>patchShow(show.id,{exclusive_message:e.target.value})} placeholder="Tagline / message"/></label>
        </div>
        <div className="slots">
          {(show.sponsor_slots||[]).sort((a,b)=>a.position-b.position).map(slot => <div className="slot" key={slot.id}>
            <div className="slotNum">{slot.position}</div>
            <input placeholder="Sponsor brand" value={slot.brand||''} onChange={e=>patchSlot(show.id,slot.id,{brand:e.target.value})}/>
            <input placeholder="Message" value={slot.message||''} onChange={e=>patchSlot(show.id,slot.id,{message:e.target.value})}/>
            <div className="logoUpload">
              {slot.logo_url ? <img className="logoThumb" src={slot.logo_url} alt="Sponsor logo" /> : <span className="noLogo">No logo</span>}
              <label className="uploadButton">{uploading===`${show.id}:${slot.id}` ? 'Uploading…' : 'Upload logo'}<input className="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={!!uploading} onChange={e=>uploadLogo(show.id,slot.id,e.target.files?.[0])}/></label>
              {slot.logo_url && <button type="button" className="removeLogo" onClick={()=>patchSlot(show.id,slot.id,{logo_url:null})}>Remove</button>}
            </div>
            <label><input type="checkbox" checked={!!slot.active} onChange={e=>patchSlot(show.id,slot.id,{active:e.target.checked})}/> Active</label>
            <label><input type="checkbox" checked={!!slot.paid} onChange={e=>patchSlot(show.id,slot.id,{paid:e.target.checked})}/> Paid</label>
          </div>)}
        </div>
        <button disabled={busy} onClick={()=>save(show)}>Save show</button>
      </section>
    })}
  </main>;
}
