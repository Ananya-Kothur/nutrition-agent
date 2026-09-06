require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Config ────────────────────────────────────────────────────────────────────
const IBM_API_KEY     = process.env.IBM_API_KEY     || 'zuC1Sl033yKW9Np1f1iz03f0PYRf9rUDkvqEqSmPAjoU';
const WATSONX_URL     = process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29';
const PROJECT_ID      = process.env.IBM_PROJECT_ID  || '382b11a8-040a-4f20-855e-f45583d1ea47';
const MODEL_ID        = process.env.IBM_MODEL_ID    || 'ibm/granite-4-h-small';
const IAM_TOKEN_URL   = 'https://iam.cloud.ibm.com/identity/token';

// ── IAM Token Cache ───────────────────────────────────────────────────────────
let iamTokenCache = { token: null, expiresAt: 0 };

async function getIAMToken() {
  const now = Date.now();
  if (iamTokenCache.token && now < iamTokenCache.expiresAt) {
    return iamTokenCache.token;
  }

  const response = await axios.post(
    IAM_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: IBM_API_KEY,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, expires_in } = response.data;
  // Refresh 5 minutes before actual expiry
  iamTokenCache = {
    token: access_token,
    expiresAt: now + (expires_in - 300) * 1000,
  };
  return access_token;
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are NutriGuide, a warm, knowledgeable, and friendly AI nutrition coach powered by IBM Granite.

Your role is to help users plan personalised, balanced diets based on their:
- Age, gender, height, weight
- Health goals (weight loss, muscle gain, maintenance, managing conditions)
- Dietary preferences and restrictions (vegetarian, vegan, gluten-free, allergies, etc.)
- Activity level and lifestyle
- Food likes and dislikes
- Budget considerations

Guidelines for your responses:
1. Be conversational, encouraging, and non-judgmental.
2. Ask clarifying questions when needed before giving detailed plans.
3. Provide practical, actionable advice with real meal examples.
4. Include approximate calorie counts and macros when giving meal plans.
5. Mention hydration, meal timing, and portion guidance where relevant.
6. Always remind users to consult a registered dietitian or doctor for medical nutrition therapy.
7. Use emojis sparingly to keep the tone friendly (e.g., 🥗 🍎 💪).
8. Format meal plans clearly with breakfast, lunch, dinner, and snacks.
9. Explain the *why* behind your recommendations so users learn.
10. Keep responses clear and concise — avoid overwhelming the user.

Start by warmly greeting the user and asking for key details if not already provided.`;

// ── Chat Endpoint ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Sanitise: keep only valid roles with non-empty string content
  const VALID_ROLES = new Set(['user', 'assistant']);
  const cleanMessages = messages
    .filter(m => VALID_ROLES.has(m.role) && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.trim() }));

  if (cleanMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages provided' });
  }

  // Ensure the conversation ends with a user message (API requirement)
  if (cleanMessages[cleanMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from user' });
  }

  try {
    const token = await getIAMToken();

    const payload = {
      model_id: MODEL_ID,
      project_id: PROJECT_ID,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...cleanMessages,
      ],
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      },
    };

    console.log(`[chat] sending ${cleanMessages.length} message(s) to model`);

    const watsonResponse = await axios.post(WATSONX_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const choice = watsonResponse.data?.choices?.[0];
    if (!choice) {
      return res.status(500).json({ error: 'No response from model' });
    }

    const assistantMessage = choice.message?.content || choice.text || '';
    res.json({ reply: assistantMessage });
  } catch (err) {
    // Log the full IBM error body for diagnosis
    const ibmError = err?.response?.data;
    console.error('WatsonX error status:', err?.response?.status);
    console.error('WatsonX error body:', JSON.stringify(ibmError, null, 2));

    const status  = err?.response?.status || 500;
    const message = ibmError?.errors?.[0]?.message
                  || ibmError?.error
                  || ibmError?.message
                  || err.message
                  || 'Internal server error';
    res.status(status).json({ error: message });
  }
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: MODEL_ID, project: PROJECT_ID });
});

// ── Catch-all → serve frontend ────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🥗 NutriGuide server running at http://localhost:${PORT}\n`);
});
