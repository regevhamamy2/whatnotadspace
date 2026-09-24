const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertConfig() {
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export async function sb(path, options = {}) {
  assertConfig();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Supabase error ${res.status}`);
  return text ? JSON.parse(text) : null;
}
