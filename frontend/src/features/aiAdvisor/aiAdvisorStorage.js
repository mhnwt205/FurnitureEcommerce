export const AI_ADVISOR_STORAGE_KEY = 'ai-advisor-session-v1';
const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const safeMessages = (messages = []) => messages.slice(-MAX_MESSAGES).map((message) => ({
  id: String(message.id).slice(0, 100), role: message.role === 'user' ? 'user' : 'assistant',
  type: message.type || 'text', text: String(message.text || '').slice(0, MAX_TEXT_LENGTH),
  recommendations: Array.isArray(message.recommendations) ? message.recommendations.slice(0, 5).map((item) => ({ ...item })) : [],
  options: Array.isArray(message.options) ? message.options.slice(0, 6).map((item) => ({ label: String(item.label || '').slice(0, 160), value: String(item.value || item.label || '').slice(0, 160) })) : [],
  createdAt: message.createdAt || new Date().toISOString()
}));

export const loadAdvisorPersistence = (storage = window.localStorage, now = Date.now()) => {
  try {
    const value = JSON.parse(storage.getItem(AI_ADVISOR_STORAGE_KEY) || 'null');
    if (!value || typeof value.sessionId !== 'string' || !value.updatedAt) return null;
    const expired = value.expiresAt ? Date.parse(value.expiresAt) <= now : now - Date.parse(value.updatedAt) > DAY_MS;
    if (expired) { storage.removeItem(AI_ADVISOR_STORAGE_KEY); return null; }
    return { sessionId: value.sessionId, expiresAt: value.expiresAt || null, messages: safeMessages(value.messages), updatedAt: value.updatedAt };
  } catch { return null; }
};

export const saveAdvisorPersistence = ({ sessionId, expiresAt = null, messages = [] }, storage = window.localStorage, now = new Date().toISOString()) => {
  if (!sessionId) return;
  try { storage.setItem(AI_ADVISOR_STORAGE_KEY, JSON.stringify({ sessionId, expiresAt, messages: safeMessages(messages), updatedAt: now })); } catch { /* Storage is optional UI convenience. */ }
};

export const clearAdvisorPersistence = (storage = window.localStorage) => { try { storage.removeItem(AI_ADVISOR_STORAGE_KEY); } catch { /* no-op */ } };
