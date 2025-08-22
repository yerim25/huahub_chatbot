export async function sendChat({ message, userId, profile }) {
  const payload = { message, userId, profile };
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data; // { ok, text, cards, suggestions, raw }
}

export async function getProfile(userId) {
  const res = await fetch(`/api/profile/${encodeURIComponent(userId)}`);
  return res.json();
}

export async function saveProfile(userId, preferences) {
  const res = await fetch(`/api/profile/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences }),
  });
  return res.json();
}