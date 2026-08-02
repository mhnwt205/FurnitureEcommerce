import { describe, expect, it } from 'vitest';
import { AI_ADVISOR_STORAGE_KEY, clearAdvisorPersistence, loadAdvisorPersistence, saveAdvisorPersistence } from './aiAdvisorStorage';

const store = () => { const data = new Map(); return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key), data }; };
describe('AI advisor bounded persistence', () => {
  it('persists bounded safe history and clears expired sessions', () => {
    const storage = store(); const messages = Array.from({ length: 65 }, (_, index) => ({ id: index, role: 'user', text: 'x'.repeat(1200), recommendations: [] }));
    saveAdvisorPersistence({ sessionId: 'session', expiresAt: new Date(Date.now() + 1000).toISOString(), messages }, storage, new Date().toISOString());
    expect(loadAdvisorPersistence(storage)?.messages).toHaveLength(60);
    expect(loadAdvisorPersistence(storage)?.messages[0].text).toHaveLength(1000);
    storage.setItem(AI_ADVISOR_STORAGE_KEY, JSON.stringify({ sessionId: 'old', updatedAt: new Date(0).toISOString(), messages: [] }));
    expect(loadAdvisorPersistence(storage, Date.now())).toBeNull();
    clearAdvisorPersistence(storage); expect(storage.getItem(AI_ADVISOR_STORAGE_KEY)).toBeNull();
  });

  it('persists an active cooldown and clears an expired one during hydration', () => {
    const storage = store(); const now = Date.parse('2026-01-01T00:00:00.000Z');
    saveAdvisorPersistence({ sessionId: 'session', expiresAt: new Date(now + 10_000).toISOString(), messages: [], cooldownUntil: now + 5_000 }, storage, new Date(now).toISOString());
    expect(loadAdvisorPersistence(storage, now)?.cooldownUntil).toBe(now + 5_000);
    expect(loadAdvisorPersistence(storage, now + 5_001)?.cooldownUntil).toBeNull();
  });

  it('persists a cooldown before a session exists so reload cannot bypass the UI guard', () => {
    const storage = store(); const now = Date.parse('2026-01-01T00:00:00.000Z');
    saveAdvisorPersistence({ sessionId: null, messages: [], cooldownUntil: now + 5_000 }, storage, new Date(now).toISOString());
    expect(loadAdvisorPersistence(storage, now)).toMatchObject({ sessionId: null, cooldownUntil: now + 5_000 });
  });
});
