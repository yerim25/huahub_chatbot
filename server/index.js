import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'https://api.dify.ai';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';
const DIFY_APP_ID = process.env.DIFY_APP_ID || process.env.DIFY_WORKFLOW_ID || '';

// Basic in-memory user profile store for prototype
const profiles = new Map();
// Store conversation IDs for each user to maintain chat context
const conversations = new Map();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: false }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Profile endpoints (prototype): store preferences
app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const data = profiles.get(userId) || {};
  res.json({ ok: true, data });
});

app.post('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const { preferences = {} } = req.body || {};
  profiles.set(userId, { ...(profiles.get(userId) || {}), ...preferences });
  res.json({ ok: true });
});

// Normalize Dify workflow response into { text, cards, suggestions, raw }
function normalizeDifyResponse(payload) {
  let text = '';
  let cards = [];
  let suggestions = [];

  // Try common shapes
  if (payload?.outputs) {
    // outputs can be object or array depending on workflow
    if (Array.isArray(payload.outputs)) {
      for (const o of payload.outputs) {
        if (typeof o === 'string') text += (text ? '\n' : '') + o;
        if (typeof o?.text === 'string') text += (text ? '\n' : '') + o.text;
        if (Array.isArray(o?.cards)) cards = cards.concat(o.cards);
        if (Array.isArray(o?.suggestions)) suggestions = suggestions.concat(o.suggestions);
      }
    } else if (typeof payload.outputs === 'object') {
      if (typeof payload.outputs.text === 'string') text = payload.outputs.text;
      if (Array.isArray(payload.outputs.cards)) cards = payload.outputs.cards;
      if (Array.isArray(payload.outputs.suggestions)) suggestions = payload.outputs.suggestions;
    }
  }

  // Some workflows return data/results
  if (!text && typeof payload?.result === 'string') text = payload.result;
  if (!text && typeof payload?.message === 'string') text = payload.message;
  if (!text && typeof payload?.answer === 'string') text = payload.answer;

  return { text, cards, suggestions, raw: payload };
}

// Chat endpoint -> call Dify RAG Workflow
app.post('/api/chat', async (req, res) => {
  try {
    const { message = '', language, userId = 'anonymous', profile = {} } = req.body || {};

    if (!DIFY_API_KEY || !DIFY_APP_ID || DIFY_APP_ID === 'your-workflow-id-here') {
      return res.status(500).json({ 
        ok: false, 
        error: 'Dify configuration missing or invalid', 
        detail: 'Please set valid DIFY_API_KEY and DIFY_APP_ID in .env file' 
      });
    }

    const url = `${DIFY_BASE_URL.replace(/\/$/, '')}/v1/chat-messages`;

    const inputs = { query: message, profile };
    if (typeof language === 'string' && language.trim()) {
      inputs.language = language.trim();
    }

    // Get existing conversation ID for this user, if any
    const conversationId = conversations.get(userId);
    
    const requestBody = {
      query: message,
      inputs,
      response_mode: 'blocking',
      user: userId,
    };
    
    // Include conversation_id if we have one for this user
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    const response = await axios.post(
      url,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('Dify API Response:', JSON.stringify(response.data, null, 2));
    
    // Store the conversation ID for future messages from this user
    if (response.data?.conversation_id) {
      conversations.set(userId, response.data.conversation_id);
    }
    
    const normalized = normalizeDifyResponse(response.data || {});
    console.log('Normalized Response:', normalized);
    res.json({ ok: true, ...normalized });
  } catch (err) {
    console.error('Dify API Error:', {
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
      url: err?.config?.url
    });
    const status = err?.response?.status || 500;
    const data = err?.response?.data;
    res.status(status).json({ ok: false, error: 'Dify request failed', detail: data || err?.message });
  }
});

// Serve frontend in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;