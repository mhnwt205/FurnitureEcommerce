import { describe, expect, it } from 'vitest';
import { normalizeAdvisorError, normalizeAdvisorResponse } from './aiAdvisorNormalizer';
import { aiAdvisorReducer, initialAdvisorState, makeUiMessage } from './aiAdvisorState';
import { buildAdvisorPayload } from '../../services/api/aiAdvisorService';

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
    expect(normalizeAdvisorError({ status: 429 }).kind).toBe('rate_limit');
    expect(normalizeAdvisorError({ code: 'REQUEST_ABORTED' }).kind).toBe('aborted');
  });
});
