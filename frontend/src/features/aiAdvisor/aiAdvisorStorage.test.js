import { describe, expect, it } from 'vitest';
import { AI_ADVISOR_STORAGE_KEY, clearAdvisorPersistence, loadAdvisorPersistence, saveAdvisorPersistence } from './aiAdvisorStorage';

const store = () => { const data = new Map(); return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key), data }; };
describe('AI advisor bounded persistence', () => {
  it('persists bounded safe history and clears expired sessions', () => {
    const storage = store(); const messages = Array.from({ length: 25 }, (_, index) => ({ id: index, role: 'user', text: 'x'.repeat(1200), recommendations: [] }));
    saveAdvisorPersistence({ sessionId: 'session', expiresAt: new Date(Date.now() + 1000).toISOString(), messages }, storage, new Date().toISOString());
    expect(loadAdvisorPersistence(storage)?.messages).toHaveLength(20);
    expect(loadAdvisorPersistence(storage)?.messages[0].text).toHaveLength(1000);
    storage.setItem(AI_ADVISOR_STORAGE_KEY, JSON.stringify({ sessionId: 'old', updatedAt: new Date(0).toISOString(), messages: [] }));
    expect(loadAdvisorPersistence(storage, Date.now())).toBeNull();
    clearAdvisorPersistence(storage); expect(storage.getItem(AI_ADVISOR_STORAGE_KEY)).toBeNull();
  });
});
