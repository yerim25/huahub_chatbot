const DIFY_API_KEY = 'app-Ej7Ej8Ej7Ej8Ej7Ej8Ej7Ej8Ej7Ej8';
const DIFY_BASE_URL = 'https://api.dify.ai/v1';
const DIFY_APP_ID = 'c0j9vlWsJ2AMy4zN';

const conversations = new Map();

export async function sendChat({ message, userId, profile }) {
  const conversationId = conversations.get(userId);
  
  const payload = {
    inputs: {},
    query: message,
    response_mode: 'blocking',
    user: userId,
    ...(conversationId && { conversation_id: conversationId })
  };

  const res = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  // Store conversation_id for future messages
  if (data.conversation_id) {
    conversations.set(userId, data.conversation_id);
  }

  return {
    ok: true,
    text: data.answer || '',
    cards: [],
    suggestions: [],
    raw: data
  };
}

export async function getProfile(userId) {
  const profile = localStorage.getItem(`profile_${userId}`);
  return profile ? JSON.parse(profile) : { preferences: {} };
}

export async function saveProfile(userId, preferences) {
  localStorage.setItem(`profile_${userId}`, JSON.stringify({ preferences }));
  return { ok: true };
}