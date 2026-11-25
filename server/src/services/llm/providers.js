import axios from 'axios';

const defs = {
  openai: { defaultModel: 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions' },
  gemini: { defaultModel: 'gemini-2.0-flash', url: 'https://generativelanguage.googleapis.com/v1beta/models' },
  anthropic: { defaultModel: 'claude-3-5-haiku-latest', url: 'https://api.anthropic.com/v1/messages' },
};
export const maskApiKey = (key) => `${key.slice(0, Math.min(3, Math.max(1, key.length - 4)))}...${key.slice(-4)}`;
function safeError(err) {
  const status = err.response?.status;
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return ['The AI provider timed out. Please try again.', 504, 'AI_TIMEOUT'];
  if (status === 401 || status === 403) return ['The API key was rejected. Check it and try again.', 400, 'AI_INVALID_KEY'];
  if (status === 429) return ['The AI provider rate limit or quota was exceeded. Try again later.', 429, 'AI_QUOTA'];
  return ['The AI provider is temporarily unavailable. Please try again later.', 502, 'AI_PROVIDER_DOWN'];
}
async function complete(provider, key, model, messages) {
  const timeout = 20_000;
  try {
    if (provider === 'openai') {
      const { data } = await axios.post(defs.openai.url, { model, messages }, { timeout, headers: { Authorization: `Bearer ${key}` } });
      return data.choices?.[0]?.message?.content ?? '';
    }
    if (provider === 'gemini') {
      const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const system = messages.find((m) => m.role === 'system')?.content;
      const { data } = await axios.post(`${defs.gemini.url}/${model}:generateContent`, { ...(system && { systemInstruction: { parts: [{ text: system }] } }), contents }, { timeout, headers: { 'x-goog-api-key': key } });
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    }
    const system = messages.find((m) => m.role === 'system')?.content;
    const { data } = await axios.post(defs.anthropic.url, { model, max_tokens: 1200, ...(system && { system }), messages: messages.filter((m) => m.role !== 'system') }, { timeout, headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
    return data.content?.map((p) => p.text).join('') ?? '';
  } catch (err) {
    const [message, statusCode, code] = safeError(err);
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    throw error;
  }
}
export const providers = Object.fromEntries(Object.entries(defs).map(([id, def]) => [id, { defaultModel: def.defaultModel, complete: (key, model, messages) => complete(id, key, model, messages), validate: async (key, model) => complete(id, key, model, [{ role: 'user', content: 'Reply OK.' }]) }]));
export const getProvider = (id) => providers[id];
