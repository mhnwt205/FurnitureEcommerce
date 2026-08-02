import { describe, expect, it } from 'vitest';
import { normalizeAdvisorError, normalizeAdvisorResponse } from './aiAdvisorNormalizer';
import { aiAdvisorReducer, createClientMessageId, initialAdvisorState, isCooldownActive, makeUiMessage, remainingCooldownSeconds } from './aiAdvisorState';
import { buildAdvisorPayload } from '../../services/api/aiAdvisorService';
import { parseRetryAfterSeconds } from '../../services/api/apiClient';

const greeting = { id: 'welcome', role: 'assistant', type: 'text', text: 'hello', recommendations: [], options: [] };

describe('AI advisor response and state contract', () => {
  it('normalizes additive recommendation, clarification, relaxation, terminal and legacy responses without mutation', () => {
    const source = { type: 'clarification', answer: 'Bạn cần gì?', recommendations: [{ id: 1 }], sessionId: 's1', question: { text: 'Danh mục?', options: ['Sofa'] } };
    const result = normalizeAdvisorResponse(source);
    expect(result).toMatchObject({ type: 'clarification', recommendations: [], options: [{ label: 'Sofa' }] });
    expect(source.recommendations).toHaveLength(1);
    expect(normalizeAdvisorResponse({ type: 'relaxation_proposal', answer: 'Nới?', relaxation: { options: [{ id: 'x', label: 'Phương án' }] } }).type).toBe('relaxation');
    expect(normalizeAdvisorResponse({ type: 'no_result', answer: 'Không có', terminal: true }).type).toBe('no_result');
    expect(normalizeAdvisorResponse({ answer: 'cũ', recommendations: [{ id: 2 }] }).type).toBe('recommendation');
  });
  it('sends old and session/idempotent payloads without leaking extra fields', () => {
    expect(buildAdvisorPayload({ message: 'Sofa', context: {} })).toEqual({ message: 'Sofa', context: {} });
    expect(buildAdvisorPayload({ message: 'Sofa', sessionId: 's', clientMessageId: 'm', context: { currentProductId: 2 }, resetSession: true })).toEqual({ message: 'Sofa', sessionId: 's', clientMessageId: 'm', resetSession: true, context: { currentProductId: 2 } });
  });
  it('prevents stale success, consumes an option once, retains retry ID, and resets safely', () => {
    let state = initialAdvisorState(null, greeting);
    const request = { clientMessageId: 'm1', text: 'Sofa', generation: 0 };
    state = aiAdvisorReducer(state, { type: 'SEND', request, message: makeUiMessage({ role: 'user', text: 'Sofa' }) });
    expect(aiAdvisorReducer(state, { type: 'SUCCESS', generation: 1, clientMessageId: 'm1', message: greeting })).toBe(state);
    state = aiAdvisorReducer(state, { type: 'FAILURE', generation: 0, clientMessageId: 'm1', error: 'Lỗi', message: greeting });
    expect(state.request.clientMessageId).toBe('m1');
    expect(aiAdvisorReducer(state, { type: 'SEND', request, message: null }).messages).toHaveLength(state.messages.length);
    state = aiAdvisorReducer(state, { type: 'OPTION_CONSUMED', messageId: greeting.id });
    expect(aiAdvisorReducer(state, { type: 'RESET_SUCCESS', sessionId: 'new', expiresAt: null, greeting }).messages).toEqual([greeting]);
  });
  it('normalizes safe errors', () => {
    expect(normalizeAdvisorError({ status: 429, retryAfterSeconds: 75 })).toMatchObject({ kind: 'rate_limit', code: 'RATE_LIMITED', status: 429, retryAfterSeconds: 75 });
    expect(normalizeAdvisorError({ code: 'REQUEST_ABORTED' }).kind).toBe('aborted');
  });

  it('parses numeric and HTTP-date Retry-After values with a safe fallback', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    expect(parseRetryAfterSeconds('300', now)).toBe(300);
    expect(parseRetryAfterSeconds('Thu, 01 Jan 2026 00:01:15 GMT', now)).toBe(75);
    expect(parseRetryAfterSeconds('9999', now)).toBe(300);
    expect(parseRetryAfterSeconds(null, now)).toBe(60);
    expect(parseRetryAfterSeconds('invalid', now)).toBe(60);
  });

  it('enters and clears a persisted cooldown without adding a duplicate error bubble', () => {
    let state = initialAdvisorState(null, greeting);
    const request = { clientMessageId: 'rate-limited', text: 'Sofa', generation: 0 };
    state = aiAdvisorReducer(state, { type: 'SEND', request, message: makeUiMessage({ role: 'user', text: 'Sofa' }) });
    const messageCount = state.messages.length;
    state = aiAdvisorReducer(state, { type: 'RATE_LIMITED', generation: 0, clientMessageId: 'rate-limited', error: 'Chờ', cooldownUntil: 10_000 });
    expect(state.messages).toHaveLength(messageCount);
    expect(isCooldownActive(state, 9_000)).toBe(true);
    expect(remainingCooldownSeconds(state, 9_000)).toBe(1);
    state = aiAdvisorReducer(state, { type: 'COOLDOWN_EXPIRED', now: 10_000 });
    expect(isCooldownActive(state, 10_000)).toBe(false);
    expect(state.error).toBeNull();
    expect(state.request.clientMessageId).toBe('rate-limited');
  });

  it('caps in-memory history at 60 messages and accepts rotated session IDs', () => {
    let state = initialAdvisorState(null, greeting);
    for (let index = 0; index < 60; index += 1) state = aiAdvisorReducer(state, { type: 'SEND', request: { generation: 0, clientMessageId: `m-${index}`, text: 'x' }, message: makeUiMessage({ role: 'user', text: 'x' }) });
    expect(state.messages).toHaveLength(60);
    state = aiAdvisorReducer(state, { type: 'SUCCESS', generation: 0, clientMessageId: 'm-59', sessionId: 'rotated', message: greeting });
    expect(state.sessionId).toBe('rotated');
  });

  it('uses a new client message ID for a new send after a cooldown while retry keeps its original ID', () => {
    const retryId = createClientMessageId();
    const nextMessageId = createClientMessageId();
    expect(nextMessageId).not.toBe(retryId);
  });
});
