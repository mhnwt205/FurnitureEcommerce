import { AI_SESSION_TTL_MS, AI_SESSION_ID_PATTERN, createSession } from './conversation.types.js';
import { aiTelemetry } from '../telemetry/telemetry.service.js';
const DEFAULT_MAX = 1000;
const readCap = () => { const value = Number(process.env.AI_ADVISOR_MAX_SESSIONS); return Number.isInteger(value) && value >= 1 && value <= 10000 ? value : DEFAULT_MAX; };
export class AiConversationSessionStore {
  constructor({ now = () => new Date(), maxSessions = readCap(), receiptTtlMs = 900000, cleanupIntervalMs = 300000, startCleanup = true, telemetry = null } = {}) { this.now = now; this.maxSessions = maxSessions; this.receiptTtlMs = receiptTtlMs; this.telemetry = telemetry; this.sessions = new Map(); this.queues = new Map(); this.resetReceipts = new Map(); if (startCleanup) { this.cleanupTimer = setInterval(() => this.sweep(), cleanupIntervalMs); this.cleanupTimer.unref(); } }
  emitEviction(session, sessionAction) { try { this.telemetry?.emit('ai_session_evicted', { sessionId: session?.id || null, userId: Number.isInteger(session?.ownerUserId) && session.ownerUserId > 0 ? session.ownerUserId : null, ownerType: session?.ownerUserId === null ? 'guest' : 'authenticated', metadata: { sessionAction } }); } catch {} }
  isValidId(id) { return typeof id === 'string' && AI_SESSION_ID_PATTERN.test(id); }
  isExpired(session) { return !session || session.expiresAt.getTime() <= this.now().getTime(); }
  isCurrent(session) { return this.sessions.get(session?.id)?.generation === session?.generation; }
  get(id) { const session = this.sessions.get(id); if (this.isExpired(session)) { if (session) { this.sessions.delete(id); this.emitEviction(session, 'expired'); } return null; } return session || null; }
  key(owner, id, messageId) { return `${owner ?? 'guest'}:${id}:${messageId}`; }
  getResetReceipt(owner, id, messageId) { const key = this.key(owner, id, messageId); const item = this.resetReceipts.get(key); if (!item || item.expiresAt <= this.now().getTime()) { this.resetReceipts.delete(key); return null; } return structuredClone(item.response); }
  setResetReceipt(owner, id, messageId, response) { this.sweep(); this.resetReceipts.set(this.key(owner, id, messageId), { response: structuredClone(response), expiresAt: this.now().getTime() + this.receiptTtlMs }); while (this.resetReceipts.size > this.maxSessions) this.resetReceipts.delete(this.resetReceipts.keys().next().value); }
  sweep() { for (const [id, item] of this.sessions) if (this.isExpired(item) && !this.queues.has(id)) { this.sessions.delete(id); this.emitEviction(item, 'expired'); } for (const [key, item] of this.resetReceipts) if (item.expiresAt <= this.now().getTime()) this.resetReceipts.delete(key); }
  create(ownerUserId = null) { this.sweep(); while (this.sessions.size >= this.maxSessions) { const oldest = [...this.sessions.values()].filter((item) => !this.queues.has(item.id)).sort((a, b) => a.updatedAt - b.updatedAt)[0]; if (!oldest) throw new Error('AI conversation session capacity is busy'); this.sessions.delete(oldest.id); this.emitEviction(oldest, 'capacity'); } const session = createSession({ ownerUserId, now: this.now() }); this.sessions.set(session.id, session); return session; }
  delete(id) { this.sessions.delete(id); }
  cloneSessionForWork(session) { return structuredClone(session); }
  prepareSessionForCommit(session) { const now = this.now(); session.updatedAt = now; session.expiresAt = new Date(now.getTime() + AI_SESSION_TTL_MS); return session; }
  commitSession({ expectedSession, nextSession }) { if (!this.isCurrent(expectedSession) || expectedSession.id !== nextSession.id || expectedSession.generation !== nextSession.generation) return null; this.sessions.set(nextSession.id, nextSession); return nextSession; }
  touch(session) { if (!this.isCurrent(session)) return false; const now = this.now(); session.updatedAt = now; session.expiresAt = new Date(now.getTime() + AI_SESSION_TTL_MS); return true; }
  async enqueue(id, task) { const previous = this.queues.get(id) || Promise.resolve(); let release; const next = new Promise((resolve) => { release = resolve; }); const tail = previous.then(() => next); this.queues.set(id, tail); await previous; try { return await task(); } finally { release(); tail.finally(() => { if (this.queues.get(id) === tail) this.queues.delete(id); }); } }
  shutdown() { if (this.cleanupTimer) clearInterval(this.cleanupTimer); this.sessions.clear(); this.queues.clear(); this.resetReceipts.clear(); }
}
export const aiConversationSessionStore = new AiConversationSessionStore({ telemetry: aiTelemetry });
